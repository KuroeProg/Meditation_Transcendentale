"""Redis markers: which game_id a user is currently playing (HTTP / chat guards)."""
from django.conf import settings

ACTIVE_GAME_KEY_PREFIX = 'active_game:'
ACTIVE_GAME_TTL = 7200  # 2 h safety TTL (aligned with GameConsumer)


def get_active_game_sync(user_id: int) -> str | None:
	"""Return active game_id for user, or None if not in a game / Redis unavailable."""
	try:
		import redis as _redis_sync

		r = _redis_sync.from_url(settings.CACHES['default']['LOCATION'])
		val = r.get(f'{ACTIVE_GAME_KEY_PREFIX}{int(user_id)}')
		return val.decode() if val else None
	except Exception:
		return None


def delete_active_game_marker_sync(user_id: int) -> None:
	"""Remove active_game key for user (e.g. RGPD erasure). Best-effort."""
	try:
		import redis as _redis_sync

		r = _redis_sync.from_url(settings.CACHES['default']['LOCATION'])
		r.delete(f'{ACTIVE_GAME_KEY_PREFIX}{int(user_id)}')
	except Exception:
		pass
