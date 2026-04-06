from .auth import (
    RegisterView,
    ResendVerificationCodeView,
    Verify2FAView,
    auth_csrf,
    auth_login_db,
    auth_logout,
    auth_me,
    auth_seed_users,
    auth_user_by_id,
)
from .oauth import Auth42View, Callback42View
from .profile import leaderboard, presence_ping, search_users, update_profile, upload_avatar
from .friends import friend_action, friend_request, friends_list

__all__ = [
    'Auth42View',
    'Callback42View',
    'RegisterView',
    'ResendVerificationCodeView',
    'Verify2FAView',
    'auth_csrf',
    'auth_login_db',
    'auth_logout',
    'auth_me',
    'auth_seed_users',
    'auth_user_by_id',
    'update_profile',
    'upload_avatar',
    'leaderboard',
    'presence_ping',
    'search_users',
    'friend_action',
    'friend_request',
    'friends_list',
]
