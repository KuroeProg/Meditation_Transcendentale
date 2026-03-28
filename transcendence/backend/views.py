import os
import string
import secrets
import json
import unicodedata
import requests
from django.conf import settings
from django.core import signing
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views import View
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.utils.decorators import method_decorator
from urllib.parse import urlencode

from accounts.models import LocalUser
from utils.two_factor import (
    generate_2fa_code,
    verify_2fa_code,
    send_2fa_email,
    is_user_blocked,
)


def _normalize_label(value):
    text = str(value or '').strip().lower()
    if not text:
        return ''
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def _map_42_coalition_to_local(value):
    normalized = _normalize_label(value)
    if not normalized:
        return None

    if any(token in normalized for token in ('feu', 'fire', 'blaze')):
        return 'feu'
    if any(token in normalized for token in ('eau', 'water', 'flood')):
        return 'eau'
    if any(token in normalized for token in ('terre', 'earth', 'faction')):
        return 'terre'
    if any(token in normalized for token in ('air', 'wind', 'assembly')):
        return 'air'
    return None


def _extract_coalition_from_items(items):
    if not isinstance(items, list):
        return None
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in ('slug', 'name'):
            mapped = _map_42_coalition_to_local(item.get(key))
            if mapped:
                return mapped
    return None


def _fetch_user_coalition_from_42(access_token, user_data):
    headers = {'Authorization': f'Bearer {access_token}'}

    # 1) Certaines reponses /v2/me peuvent deja contenir la coalition.
    embedded = _extract_coalition_from_items(user_data.get('coalitions'))
    if embedded:
        return embedded

    # 2) Endpoint dedie coalition pour l'utilisateur connecte.
    try:
        coalition_res = requests.get(
            'https://api.intra.42.fr/v2/me/coalitions',
            headers=headers,
            timeout=10,
        )
        if coalition_res.ok:
            parsed = coalition_res.json()
            direct = _extract_coalition_from_items(parsed)
            if direct:
                return direct
    except (requests.RequestException, ValueError):
        pass

    # 3) Fallback explicite via l'id utilisateur si endpoint /me/coalitions indisponible.
    user_id = user_data.get('id')
    if user_id is None:
        return None

    try:
        fallback_res = requests.get(
            f'https://api.intra.42.fr/v2/users/{user_id}/coalitions',
            headers=headers,
            timeout=10,
        )
        if fallback_res.ok:
            parsed = fallback_res.json()
            return _extract_coalition_from_items(parsed)
    except (requests.RequestException, ValueError):
        return None

    return None


def _extract_42_avatar_url(user_data):
    image_data = user_data.get('image')
    if isinstance(image_data, dict):
        versions = image_data.get('versions')
        if isinstance(versions, dict):
            for key in ('medium', 'small', 'large', 'micro'):
                candidate = versions.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    return candidate.strip()

        direct = image_data.get('link')
        if isinstance(direct, str) and direct.strip():
            return direct.strip()

    if isinstance(image_data, str) and image_data.strip():
        return image_data.strip()

    fallback = user_data.get('image_url')
    if isinstance(fallback, str) and fallback.strip():
        return fallback.strip()

    return ''

def _oauth_redirect_uri(request):
    env_uri = os.environ.get('FORTYTWO_REDIRECT_URI')
    if env_uri:
        return env_uri
    return request.build_absolute_uri('/api/auth/42/callback/')


def _frontend_dashboard_url():
    return os.environ.get('FRONTEND_DASHBOARD_URL', 'https://localhost/dashboard')


class Auth42View(View):
    def get(self, request):
        client_id = os.environ.get('FORTYTWO_CLIENT_ID')
        if not client_id:
            return JsonResponse({'error': 'FORTYTWO_CLIENT_ID manquant'}, status=500)

        state = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        request.session['oauth_state'] = state

        params = {
            'client_id': client_id,
            'redirect_uri': _oauth_redirect_uri(request),
            'response_type': 'code',
            'state': state,
        }
        auth_url = f"https://api.intra.42.fr/oauth/authorize?{urlencode(params)}"
        return redirect(auth_url)


class Callback42View(View):
    def get(self, request):
        stored_state = request.session.get('oauth_state')
        returned_state = request.GET.get('state')
        if not returned_state or returned_state != stored_state:
            return JsonResponse({'error': 'Invalid state parameter'}, status=400)

        code = request.GET.get('code')
        if not code:
            return JsonResponse({'error': 'Code OAuth manquant'}, status=400)

        client_id = os.environ.get('FORTYTWO_CLIENT_ID')
        client_secret = os.environ.get('FORTYTWO_CLIENT_SECRET')
        if not client_id or not client_secret:
            return JsonResponse({'error': 'Configuration OAuth 42 incomplete'}, status=500)

        token_data = {
            'grant_type': 'authorization_code',
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'redirect_uri': _oauth_redirect_uri(request),
        }

        try:
            token_response = requests.post(
                'https://api.intra.42.fr/oauth/token',
                data=token_data,
                timeout=10,
            )
            token_response.raise_for_status()
            token_payload = token_response.json()
        except requests.RequestException:
            return JsonResponse({'error': 'Impossible de recuperer le token OAuth 42'}, status=502)
        except ValueError:
            return JsonResponse({'error': 'Reponse token OAuth invalide'}, status=502)

        access_token = token_payload.get('access_token')
        if not access_token:
            return JsonResponse({'error': 'access_token absent de la reponse OAuth'}, status=502)

        try:
            user_info_res = requests.get(
                'https://api.intra.42.fr/v2/me',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            user_info_res.raise_for_status()
            user_data = user_info_res.json()
        except requests.RequestException:
            return JsonResponse({'error': 'Impossible de recuperer le profil 42'}, status=502)
        except ValueError:
            return JsonResponse({'error': 'Reponse profil 42 invalide'}, status=502)

        login_42 = str(user_data.get('login', '')).strip()
        if not login_42:
            return JsonResponse({'error': 'Profil 42 sans login exploitable'}, status=502)

        email = user_data.get('email') or ''
        first_name = user_data.get('first_name') or ''
        last_name = user_data.get('last_name') or ''
        image_url = _extract_42_avatar_url(user_data)
        coalition = _fetch_user_coalition_from_42(access_token, user_data) or 'feu'

        user, _created = LocalUser.objects.get_or_create(
            username=login_42,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'image_url': image_url,
                'coalition': coalition,
                'password_hash': '',
            },
        )

        changed = False
        if email and user.email != email:
            user.email = email
            changed = True
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if image_url and user.image_url != image_url:
            user.image_url = image_url
            changed = True
        if coalition and user.coalition != coalition:
            user.coalition = coalition
            changed = True
        if changed:
            user.save(update_fields=['email', 'first_name', 'last_name', 'image_url', 'coalition'])

        request.session['local_user_id'] = user.id
        request.session.pop('oauth_state', None)
        request.session.modified = True

        return redirect(_frontend_dashboard_url())


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
        # Invalidate trusted-device token when password changes.
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


# ============================================================================
# Two-Factor Authentication (2FA) Views
# ============================================================================


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(View):
    """
    Handle user registration with 2FA flow.
    
    POST /api/auth/register/
    Body: {
        "username": "john_doe",
        "password": "securepass123",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
    }
    
    Returns 2FA pending status with user_id for subsequent verification.
    """
    
    def post(self, request):
        payload = _read_json_body(request)
        
        # Validate input
        username = str(payload.get('username', '')).strip()
        password = str(payload.get('password', '')).strip()
        email = str(payload.get('email', '')).strip()
        first_name = str(payload.get('first_name', '')).strip()
        last_name = str(payload.get('last_name', '')).strip()
        
        # Required fields
        if not username or not password or not email:
            return JsonResponse({
                'error': 'Username, password, and email are required'
            }, status=400)
        
        # Check if username already exists
        if LocalUser.objects.filter(username=username).exists():
            return JsonResponse({
                'error': 'Username already taken'
            }, status=409)
        
        # Check if email already exists
        if LocalUser.objects.filter(email=email).exists():
            return JsonResponse({
                'error': 'Email already registered'
            }, status=409)
        
        try:
            # Create user with is_2fa_verified=False
            user = LocalUser.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                coalition='feu',  # Default coalition
                is_2fa_enabled=True,
                is_2fa_verified=False,
            )
            user.set_password(password)
            user.save()
            
            # Generate 2FA code
            code = generate_2fa_code(user.id, purpose='registration')
            if not code:
                # Rollback user creation if code generation fails
                user.delete()
                return JsonResponse({
                    'error': 'Failed to generate verification code'
                }, status=500)
            
            # Send 2FA code via email
            email_sent = send_2fa_email(email, code)
            if not email_sent:
                # Log warning but continue - user can request new code
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to send 2FA email to {email} for user {user.id}")
            
            return JsonResponse({
                'status': '2fa_pending',
                'user_id': user.id,
                'message': f'Verification code sent to {email}. Check your email.'
            }, status=201)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Registration error: {e}")
            return JsonResponse({
                'error': 'Registration failed. Please try again.'
            }, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class Verify2FAView(View):
    """
    Verify 2FA code and finalize registration.
    
    POST /api/auth/verify-2fa/
    Body: {
        "user_id": 123,
        "code": "123456"
    }
    
    Returns user data and establishes session on success.
    """
    
    def post(self, request):
        payload = _read_json_body(request)
        
        # Validate input
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
        
        # Get user
        try:
            user = LocalUser.objects.get(id=user_id)
        except LocalUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found'
            }, status=404)
        
        # Registration flow should only verify not-yet-verified accounts.
        if not is_login_flow and user.is_2fa_verified:
            return JsonResponse({
                'error': 'User already verified. Please login instead.'
            }, status=400)

        if is_login_flow and not user.is_2fa_enabled:
            return JsonResponse({'error': '2FA is not enabled for this user'}, status=400)
        
        # Check if use is rate-limited
        purpose = 'login' if is_login_flow else 'registration'

        if is_user_blocked(user_id, purpose=purpose):
            return JsonResponse({
                'error': 'Too many failed attempts. Please try again later.'
            }, status=429)
        
        # Verify code
        result = verify_2fa_code(user_id, code, purpose=purpose)
        
        if not result['valid']:
            error_msg = result.get('error', 'Verification failed')
            status_code = 429 if result.get('blocked') else 400
            return JsonResponse({
                'error': error_msg
            }, status=status_code)
        
        # Success: registration marks account verified; login just confirms second factor.
        if not is_login_flow:
            user.is_2fa_verified = True
            user.save(update_fields=['is_2fa_verified'])
        
        # Create session
        request.session['local_user_id'] = user.id
        request.session.modified = True
        
        import logging
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
    """
    Resend 2FA verification code (for users who didn't receive email).
    
    POST /api/auth/resend-code/
    Body: {
        "user_id": 123,
        "email": "user@example.com"
    }
    
    Returns new code generation status.
    """
    
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
        
        # Get user
        try:
            user = LocalUser.objects.get(id=user_id)
        except LocalUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found'
            }, status=404)
        
        # Verify email matches
        if user.email != email:
            return JsonResponse({
                'error': 'Email does not match'
            }, status=400)
        
        # Check if already verified
        if not is_login_flow and user.is_2fa_verified:
            return JsonResponse({
                'error': 'User already verified'
            }, status=400)

        if is_login_flow and not user.is_2fa_enabled:
            return JsonResponse({'error': '2FA is not enabled for this user'}, status=400)
        
        # Generate new code (replaces old one)
        purpose = 'login' if is_login_flow else 'registration'
        code = generate_2fa_code(user.id, purpose=purpose)
        if not code:
            return JsonResponse({
                'error': 'Failed to generate verification code'
            }, status=500)
        
        # Send email
        email_sent = send_2fa_email(email, code)
        if not email_sent:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to resend 2FA email to {email}")
        
        return JsonResponse({
            'status': '2fa_required' if is_login_flow else '2fa_pending',
            'message': 'Verification code sent. Check your email.'
        }, status=200)