import os
import string
import secrets
import requests
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import redirect
from django.conf import settings
from urllib.parse import urlencode

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