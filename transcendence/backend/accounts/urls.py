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
    *with_optional_trailing_slash('me', views.auth_me, name='auth_me'),
    *with_optional_trailing_slash('users/<int:user_id>', views.auth_user_by_id, name='auth_user_by_id'),
    *with_optional_trailing_slash('csrf', views.auth_csrf, name='auth_csrf'),
    *with_optional_trailing_slash('seed-users', views.auth_seed_users, name='auth_seed_users'),

    # Two-Factor Authentication (2FA)
    *with_optional_trailing_slash('register', views.RegisterView.as_view(), name='register'),
    *with_optional_trailing_slash('verify-2fa', views.Verify2FAView.as_view(), name='verify_2fa'),
    *with_optional_trailing_slash('resend-code', views.ResendVerificationCodeView.as_view(), name='resend_code'),
]
