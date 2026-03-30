import json
import logging
import os

from django.conf import settings
from django.core import signing
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views import View
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from django.utils.decorators import method_decorator

from accounts.models import LocalUser
from utils.two_factor import (
    generate_2fa_code,
    is_user_blocked,
    send_2fa_email,
    verify_2fa_code,
)


def _read_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


PRE_AUTH_TOKEN_SALT = 'preauth-2fa'
PRE_AUTH_TOKEN_MAX_AGE_SECONDS = 300
TRUSTED_2FA_COOKIE_NAME = 'trusted_2fa_device'
TRUSTED_2FA_COOKIE_SALT = 'trusted-2fa-device'
TRUSTED_2FA_MAX_AGE_SECONDS = int(os.environ.get('TRUSTED_2FA_MAX_AGE_SECONDS', '31536000'))


def _issue_pre_auth_token(user_id: int, flow: str = 'login'):
    payload = {'user_id': int(user_id), 'flow': flow}
    return signing.dumps(payload, salt=PRE_AUTH_TOKEN_SALT)


def _read_pre_auth_token(token: str):
    try:
        payload = signing.loads(
            str(token),
            salt=PRE_AUTH_TOKEN_SALT,
            max_age=PRE_AUTH_TOKEN_MAX_AGE_SECONDS,
        )
        return payload
    except signing.BadSignature:
        return None


def _build_trusted_2fa_token(user):
    payload = {
        'user_id': int(user.id),
        'password_fingerprint': str(user.password_hash or '')[-24:],
    }
    return signing.dumps(payload, salt=TRUSTED_2FA_COOKIE_SALT)


def _is_trusted_2fa_cookie_valid(request, user):
    token = request.COOKIES.get(TRUSTED_2FA_COOKIE_NAME)
    if not token:
        return False

    try:
        payload = signing.loads(
            str(token),
            salt=TRUSTED_2FA_COOKIE_SALT,
            max_age=TRUSTED_2FA_MAX_AGE_SECONDS,
        )
    except signing.BadSignature:
        return False

    if payload.get('user_id') != int(user.id):
        return False

    expected_fingerprint = str(user.password_hash or '')[-24:]
    return payload.get('password_fingerprint') == expected_fingerprint


def _set_trusted_2fa_cookie(response, user):
    token = _build_trusted_2fa_token(user)
    response.set_cookie(
        TRUSTED_2FA_COOKIE_NAME,
        token,
        max_age=TRUSTED_2FA_MAX_AGE_SECONDS,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path='/',
    )


@require_GET
@ensure_csrf_cookie
def auth_csrf(request):
    return JsonResponse({'ok': True})


def auth_login_db(request):
    if request.method == 'GET':
        return redirect('/auth')
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    payload = _read_json_body(request)
    email = str(payload.get('email', '')).strip()
    password = str(payload.get('password', ''))

    if not email or not password:
        return JsonResponse({'error': 'Email et mot de passe requis'}, status=400)

    users = LocalUser.objects.filter(email__iexact=email)
    if not users.exists():
        return JsonResponse({'error': 'Identifiants invalides'}, status=401)

    if users.count() > 1:
        return JsonResponse({'error': 'Plusieurs comptes utilisent cet email. Contacte le support.'}, status=409)

    user = users.first()

    if not user.check_password(password):
        return JsonResponse({'error': 'Identifiants invalides'}, status=401)

    if user.is_2fa_enabled:
        if _is_trusted_2fa_cookie_valid(request, user):
            request.session['local_user_id'] = user.id
            request.session.modified = True
            return JsonResponse({'status': 'authenticated', 'user': user.to_public_dict()})

        if is_user_blocked(user.id, purpose='login'):
            return JsonResponse({
                'error': 'Too many failed attempts. Please try again later.'
            }, status=429)

        code = generate_2fa_code(user.id, purpose='login')
        if not code:
            return JsonResponse({'error': 'Failed to generate verification code'}, status=500)

        email_sent = send_2fa_email(user.email, code)
        if not email_sent:
            return JsonResponse({'error': 'Failed to send verification code'}, status=500)

        pre_auth_token = _issue_pre_auth_token(user.id, flow='login')
        return JsonResponse({
            'status': '2fa_required',
            'user_id': user.id,
            'pre_auth_token': pre_auth_token,
            'message': 'Code sent to email',
            'email': user.email,
        }, status=200)

    request.session['local_user_id'] = user.id
    return JsonResponse({'user': user.to_public_dict()})


@require_GET
def auth_me(request):
    user_id = request.session.get('local_user_id')
    if not user_id:
        return JsonResponse({'error': 'Non authentifie'}, status=401)

    try:
        user = LocalUser.objects.get(id=user_id)
    except LocalUser.DoesNotExist:
        request.session.pop('local_user_id', None)
        return JsonResponse({'error': 'Session invalide'}, status=401)

    return JsonResponse(user.to_public_dict())


@require_GET
def auth_user_by_id(request, user_id):
    current_user_id = request.session.get('local_user_id')
    if not current_user_id:
        return JsonResponse({'error': 'Non authentifie'}, status=401)

    try:
        user = LocalUser.objects.get(id=user_id)
    except LocalUser.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur introuvable'}, status=404)

    return JsonResponse(user.to_public_dict())


@require_POST
def auth_logout(request):
    request.session.pop('local_user_id', None)
    return JsonResponse({'ok': True})


@require_POST
def auth_seed_users(request):
    seeds = [
        {
            'username': 'white_player',
            'password': 'white1234',
            'first_name': 'White',
            'last_name': 'Player',
            'email': 'white@transcendence.local',
            'coalition': 'feu',
        },
        {
            'username': 'black_player',
            'password': 'black1234',
            'first_name': 'Black',
            'last_name': 'Player',
            'email': 'black@transcendence.local',
            'coalition': 'eau',
        },
    ]

    created = []
    for item in seeds:
        user, was_created = LocalUser.objects.get_or_create(
            username=item['username'],
            defaults={
                'first_name': item['first_name'],
                'last_name': item['last_name'],
                'email': item['email'],
                'coalition': item['coalition'],
                'password_hash': '',
            },
        )
        user.first_name = item['first_name']
        user.last_name = item['last_name']
        user.email = item['email']
        user.coalition = item['coalition']
        user.set_password(item['password'])
        user.save()
        if was_created:
            created.append(user.username)

    return JsonResponse({'ok': True, 'created': created})


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(View):
    def post(self, request):
        payload = _read_json_body(request)

        username = str(payload.get('username', '')).strip()
        password = str(payload.get('password', '')).strip()
        email = str(payload.get('email', '')).strip()
        first_name = str(payload.get('first_name', '')).strip()
        last_name = str(payload.get('last_name', '')).strip()

        if not username or not password or not email:
            return JsonResponse({
                'error': 'Username, password, and email are required'
            }, status=400)

        if LocalUser.objects.filter(username=username).exists():
            return JsonResponse({
                'error': 'Username already taken'
            }, status=409)

        if LocalUser.objects.filter(email=email).exists():
            return JsonResponse({
                'error': 'Email already registered'
            }, status=409)

        try:
            user = LocalUser.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                coalition='feu',
                is_2fa_enabled=True,
                is_2fa_verified=False,
            )
            user.set_password(password)
            user.save()

            code = generate_2fa_code(user.id, purpose='registration')
            if not code:
                user.delete()
                return JsonResponse({
                    'error': 'Failed to generate verification code'
                }, status=500)

            email_sent = send_2fa_email(email, code)
            if not email_sent:
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to send 2FA email to {email} for user {user.id}")

            return JsonResponse({
                'status': '2fa_pending',
                'user_id': user.id,
                'message': f'Verification code sent to {email}. Check your email.'
            }, status=201)

        except Exception as exc:
            logger = logging.getLogger(__name__)
            logger.error(f"Registration error: {exc}")
            return JsonResponse({
                'error': 'Registration failed. Please try again.'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class Verify2FAView(View):
    def post(self, request):
        payload = _read_json_body(request)

        user_id = payload.get('user_id')
        code = str(payload.get('code', '')).strip()
        pre_auth_token = str(payload.get('pre_auth_token', '')).strip()
        remember_device = bool(payload.get('remember_device', True))
        is_login_flow = False

        if pre_auth_token:
            token_payload = _read_pre_auth_token(pre_auth_token)
            if not token_payload:
                return JsonResponse({'error': 'Invalid or expired pre-auth token'}, status=401)
            if token_payload.get('flow') != 'login':
                return JsonResponse({'error': 'Invalid pre-auth token flow'}, status=401)
            user_id = token_payload.get('user_id')
            is_login_flow = True

        if not user_id or not code:
            return JsonResponse({
                'error': 'user_id and code are required'
            }, status=400)

        try:
            user = LocalUser.objects.get(id=user_id)
        except LocalUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found'
            }, status=404)

        if not is_login_flow and user.is_2fa_verified:
            return JsonResponse({
                'error': 'User already verified. Please login instead.'
            }, status=400)

        if is_login_flow and not user.is_2fa_enabled:
            return JsonResponse({'error': '2FA is not enabled for this user'}, status=400)

        purpose = 'login' if is_login_flow else 'registration'

        if is_user_blocked(user_id, purpose=purpose):
            return JsonResponse({
                'error': 'Too many failed attempts. Please try again later.'
            }, status=429)

        result = verify_2fa_code(user_id, code, purpose=purpose)

        if not result['valid']:
            error_msg = result.get('error', 'Verification failed')
            status_code = 429 if result.get('blocked') else 400
            return JsonResponse({
                'error': error_msg
            }, status=status_code)

        if not is_login_flow:
            user.is_2fa_verified = True
            user.save(update_fields=['is_2fa_verified'])

        request.session['local_user_id'] = user.id
        request.session.modified = True

        logger = logging.getLogger(__name__)
        if is_login_flow:
            logger.info(f"User {user.id} ({user.username}) successfully completed 2FA login")
            response = JsonResponse({
                'status': 'authenticated',
                'user': user.to_public_dict(),
                'message': 'Login complete.'
            }, status=200)
            if remember_device:
                _set_trusted_2fa_cookie(response, user)
            return response

        logger.info(f"User {user.id} ({user.username}) successfully completed 2FA registration")
        return JsonResponse({
            'status': 'registered',
            'user': user.to_public_dict(),
            'message': 'Registration complete. Welcome!'
        }, status=200)


@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationCodeView(View):
    def post(self, request):
        payload = _read_json_body(request)

        user_id = payload.get('user_id')
        email = str(payload.get('email', '')).strip()
        pre_auth_token = str(payload.get('pre_auth_token', '')).strip()
        is_login_flow = False

        if pre_auth_token:
            token_payload = _read_pre_auth_token(pre_auth_token)
            if not token_payload:
                return JsonResponse({'error': 'Invalid or expired pre-auth token'}, status=401)
            if token_payload.get('flow') != 'login':
                return JsonResponse({'error': 'Invalid pre-auth token flow'}, status=401)
            user_id = token_payload.get('user_id')
            is_login_flow = True

        if not user_id or not email:
            return JsonResponse({
                'error': 'user_id and email are required'
            }, status=400)

        try:
            user = LocalUser.objects.get(id=user_id)
        except LocalUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found'
            }, status=404)

        if user.email != email:
            return JsonResponse({
                'error': 'Email does not match'
            }, status=400)

        if not is_login_flow and user.is_2fa_verified:
            return JsonResponse({
                'error': 'User already verified'
            }, status=400)

        if is_login_flow and not user.is_2fa_enabled:
            return JsonResponse({'error': '2FA is not enabled for this user'}, status=400)

        purpose = 'login' if is_login_flow else 'registration'
        code = generate_2fa_code(user.id, purpose=purpose)
        if not code:
            return JsonResponse({
                'error': 'Failed to generate verification code'
            }, status=500)

        email_sent = send_2fa_email(email, code)
        if not email_sent:
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to resend 2FA email to {email}")

        return JsonResponse({
            'status': '2fa_required' if is_login_flow else '2fa_pending',
            'message': 'Verification code sent. Check your email.'
        }, status=200)
