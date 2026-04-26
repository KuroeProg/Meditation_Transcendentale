import os

from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django_redis import get_redis_connection

from accounts.models import LocalUser


PRESENCE_CONNECTIONS_PREFIX = 'presence:connections'
PRESENCE_HEARTBEAT_PREFIX = 'presence:last_seen'
PRESENCE_HEARTBEAT_TTL_SECONDS = int(os.environ.get('PRESENCE_HEARTBEAT_TTL_SECONDS', '90'))


def _connections_key(user_id: int) -> str:
    return f'{PRESENCE_CONNECTIONS_PREFIX}:{int(user_id)}'


def _heartbeat_key(user_id: int) -> str:
    return f'{PRESENCE_HEARTBEAT_PREFIX}:{int(user_id)}'


def _get_redis_connection_safe():
    try:
        return get_redis_connection('default')
    except (ImproperlyConfigured, Exception):
        return None


def user_has_active_presence_heartbeat(user_id: int) -> bool:
    """Client a récemment pingé (clé Redis TTL) — plus fiable que seul is_online en BDD."""
    redis_conn = _get_redis_connection_safe()
    if redis_conn is None:
        return False
    try:
        return redis_conn.exists(_heartbeat_key(int(user_id))) > 0
    except (TypeError, ValueError, Exception):
        return False


def get_effective_online_for_user(user: LocalUser) -> bool:
    """Préfère Redis (heartbeat ~90s) ; si Redis dispo et pas de heartbeat, hors ligne (évite is_online BDD collé)."""
    if user_has_active_presence_heartbeat(user.id):
        return True
    if _get_redis_connection_safe() is not None:
        return False
    return bool(getattr(user, 'is_online', False))


def _set_presence_in_db(user_id: int, online: bool, now=None) -> bool:
    now = now or timezone.now()
    previous_online = LocalUser.objects.filter(id=user_id).values_list('is_online', flat=True).first()
    LocalUser.objects.filter(id=user_id).update(is_online=online, last_seen=now)
    return bool(previous_online is not None and previous_online != online)


def mark_user_presence_heartbeat(user_id: int):
    now = timezone.now()
    redis_conn = _get_redis_connection_safe()
    if redis_conn is not None:
        redis_conn.setex(_heartbeat_key(user_id), PRESENCE_HEARTBEAT_TTL_SECONDS, str(int(now.timestamp())))

    changed = _set_presence_in_db(user_id, online=True, now=now)
    return {'online': True, 'changed': changed}


def mark_user_presence_connected(user_id: int):
    now = timezone.now()
    redis_conn = _get_redis_connection_safe()

    if redis_conn is not None:
        redis_conn.incr(_connections_key(user_id))
        redis_conn.setex(_heartbeat_key(user_id), PRESENCE_HEARTBEAT_TTL_SECONDS, str(int(now.timestamp())))

    changed = _set_presence_in_db(user_id, online=True, now=now)
    return {'online': True, 'changed': changed}


def mark_user_presence_disconnected(user_id: int):
    now = timezone.now()
    redis_conn = _get_redis_connection_safe()

    should_be_online = True
    if redis_conn is None:
        should_be_online = False
    else:
        conn_key = _connections_key(user_id)
        heartbeat_key = _heartbeat_key(user_id)

        remaining = redis_conn.decr(conn_key)
        if remaining <= 0:
            redis_conn.delete(conn_key)
            heartbeat_alive = redis_conn.exists(heartbeat_key) > 0
            should_be_online = heartbeat_alive

    changed = _set_presence_in_db(user_id, online=should_be_online, now=now)
    return {'online': should_be_online, 'changed': changed}


def mark_user_presence_logged_out(user_id: int):
    now = timezone.now()
    redis_conn = _get_redis_connection_safe()

    if redis_conn is not None:
        redis_conn.delete(_connections_key(user_id), _heartbeat_key(user_id))

    changed = _set_presence_in_db(user_id, online=False, now=now)
    return {'online': False, 'changed': changed}
