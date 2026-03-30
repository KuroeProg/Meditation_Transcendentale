"""Player profile and coalition fetching from database with async-to-sync bridging."""
from channels.db import database_sync_to_async

from accounts.models import LocalUser


@database_sync_to_async
def fetch_user_coalition(player_id):
	"""Fetch player's coalition from database (defaults to 'feu' if not found)."""
	if player_id is None:
        return 'feu'
    try:
        user = LocalUser.objects.filter(id=player_id).only('coalition').first()
        if user and user.coalition:
            return str(user.coalition)
    except Exception:
        pass
    return 'feu'


@database_sync_to_async
def fetch_user_public_profile(player_id):
	"""Fetch player's public profile dict from database (None if not found)."""
	if player_id is None:
        return None
    try:
        user = LocalUser.objects.filter(id=player_id).first()
        if user is not None:
            return user.to_public_dict()
    except Exception:
        pass
    return None
