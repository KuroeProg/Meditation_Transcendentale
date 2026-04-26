from django.urls import path

from . import views


def with_optional_trailing_slash(route, view_callable, name=None):
    patterns = [path(route, view_callable, name=name)]
    slash_route = route if route.endswith('/') else f'{route}/'
    if slash_route != route:
        patterns.append(path(slash_route, view_callable))
    return patterns


urlpatterns = [
    # Traditional authentication
    *with_optional_trailing_slash('login', views.auth_login_db, name='auth_login_db'),
    *with_optional_trailing_slash('logout', views.auth_logout, name='auth_logout'),
    *with_optional_trailing_slash('forgot-password', views.auth_forgot_password, name='auth_forgot_password'),
    *with_optional_trailing_slash('reset-password', views.auth_reset_password, name='auth_reset_password'),
    *with_optional_trailing_slash('me', views.auth_me, name='auth_me'),
    *with_optional_trailing_slash('users/<int:user_id>', views.auth_user_by_id, name='auth_user_by_id'),
    *with_optional_trailing_slash('csrf', views.auth_csrf, name='auth_csrf'),
    *with_optional_trailing_slash('seed-users', views.auth_seed_users, name='auth_seed_users'),

    # Two-Factor Authentication (2FA)
    *with_optional_trailing_slash('register', views.RegisterView.as_view(), name='register'),
    *with_optional_trailing_slash('verify-2fa', views.Verify2FAView.as_view(), name='verify_2fa'),
    *with_optional_trailing_slash('resend-code', views.ResendVerificationCodeView.as_view(), name='resend_code'),

    # Profile
    *with_optional_trailing_slash('me/update', views.update_profile, name='update_profile'),
    *with_optional_trailing_slash('me/presence', views.presence_ping, name='presence_ping'),
    *with_optional_trailing_slash('me/avatar', views.upload_avatar, name='upload_avatar'),
    *with_optional_trailing_slash('me/client-settings', views.client_settings, name='client_settings'),
    *with_optional_trailing_slash('me/delete-data', views.delete_account_data, name='delete_account_data'),
    *with_optional_trailing_slash('leaderboard', views.leaderboard, name='leaderboard'),
    *with_optional_trailing_slash('search', views.search_users, name='search_users'),

    # Friends
    *with_optional_trailing_slash('friends', views.friends_list, name='friends_list'),
    *with_optional_trailing_slash('friends/request', views.friend_request, name='friend_request'),
    *with_optional_trailing_slash('friends/<int:friendship_id>', views.friend_action, name='friend_action'),
]
