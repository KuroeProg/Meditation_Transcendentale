from django.urls import path

from views import auth_login_db, auth_logout, auth_me, auth_seed_users, auth_csrf, auth_user_by_id


urlpatterns = [
    path('login', auth_login_db, name='auth_login_db'),
    path('logout', auth_logout, name='auth_logout'),
    path('me', auth_me, name='auth_me'),
    path('users/<int:user_id>', auth_user_by_id, name='auth_user_by_id'),
    path('csrf', auth_csrf, name='auth_csrf'),
    path('seed-users', auth_seed_users, name='auth_seed_users'),
]
