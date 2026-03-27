import os
import string
import secrets
import json
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from urllib.parse import urlencode

from accounts.models import LocalUser

def login_42(request):
    # 1. Cyber: Generate a random state for CSRF protection
    state = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    request.session['oauth_state'] = state

    # 2. Build the URL with query parameters
    params = {
        'client_id': os.environ.get('FORTY_TWO_CLIENT_ID'),
        'redirect_uri': os.environ.get('FORTY_TWO_REDIRECT_URI'),
        'response_type': 'code',
        'state': state,
    }
    
    auth_url = f"https://api.intra.42.fr/oauth/authorize?{urlencode(params)}"
    return redirect(auth_url)

def callback_42(request):
    import requests

    # 1. Verify state to prevent CSRF
    stored_state = request.session.get('oauth_state')
    returned_state = request.GET.get('state')
    
    if not returned_state or returned_state != stored_state:
        return JsonResponse({'error': 'Invalid state parameter'}, status=400)

    # 2. Get the code
    code = request.GET.get('code')
    
    # 3. Exchange code for token
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': os.environ.get('FORTY_TWO_CLIENT_ID'),
        'client_secret': os.environ.get('FORTY_TWO_CLIENT_SECRET'),
        'code': code,
        'redirect_uri': os.environ.get('FORTY_TWO_REDIRECT_URI'),
    }
    
    token_response = requests.post("https://api.intra.42.fr/oauth/token", data=token_data)
    access_token = token_response.json().get('access_token')

    # 4. Get User Info from 42 API
    user_info_res = requests.get(
        "https://api.intra.42.fr/v2/me", 
        headers={'Authorization': f'Bearer {access_token}'}
    )
    user_data = user_info_res.json()

    # 5. Logic 'get_or_create'
    user, created = User.objects.get_or_create(
        username=user_data['login'],
        defaults={'email': user_data['email']}
    )

    # 6. Auth Logic (If 2FA is active, redirect to 2FA page instead of login)
    # For now, we do a standard login:
    login(request, user)
    
    return redirect('http://localhost:5173/dashboard')


def _read_json_body(request):
    try:
        return json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}


@require_GET
@ensure_csrf_cookie
def auth_csrf(request):
    return JsonResponse({'ok': True})


@require_POST
def auth_login_db(request):
    payload = _read_json_body(request)
    username = str(payload.get('username', '')).strip()
    password = str(payload.get('password', ''))

    if not username or not password:
        return JsonResponse({'error': 'Username et mot de passe requis'}, status=400)

    try:
        user = LocalUser.objects.get(username=username)
    except LocalUser.DoesNotExist:
        return JsonResponse({'error': 'Identifiants invalides'}, status=401)

    if not user.check_password(password):
        return JsonResponse({'error': 'Identifiants invalides'}, status=401)

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