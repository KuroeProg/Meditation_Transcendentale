import os
import secrets
import string
import unicodedata
from urllib.parse import urlencode

import requests
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views import View

from accounts.models import LocalUser


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

    embedded = _extract_coalition_from_items(user_data.get('coalitions'))
    if embedded:
        return embedded

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
    app_origin = (os.environ.get('APP_ORIGIN') or '').rstrip('/')
    if app_origin:
        return f'{app_origin}/api/auth/42/callback/'
    return request.build_absolute_uri('/api/auth/42/callback/')


def _frontend_dashboard_url():
    explicit = os.environ.get('FRONTEND_DASHBOARD_URL')
    if explicit:
        return explicit
    app_origin = (os.environ.get('APP_ORIGIN') or '').rstrip('/')
    if app_origin:
        return f'{app_origin}/dashboard'
    return 'https://localhost/dashboard'


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
