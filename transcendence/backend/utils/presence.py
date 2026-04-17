"""
Utilities for managing user presence/online status.
"""
from accounts.models import LocalUser


def mark_user_presence_connected(user_id):
    """
    Mark a user as connected and return presence state.
    
    Returns:
        dict: {'changed': bool, 'online': bool}
    """
    try:
        user = LocalUser.objects.get(id=user_id)
        was_online = user.is_online
        user.is_online = True
        user.save(update_fields=['is_online'])
        
        return {
            'changed': not was_online,  # Changed if was offline before
            'online': True,
        }
    except LocalUser.DoesNotExist:
        return {'changed': False, 'online': False}


def mark_user_presence_disconnected(user_id):
    """
    Mark a user as disconnected and return presence state.
    
    Returns:
        dict: {'changed': bool, 'online': bool}
    """
    try:
        user = LocalUser.objects.get(id=user_id)
        was_online = user.is_online
        user.is_online = False
        user.save(update_fields=['is_online'])
        
        return {
            'changed': was_online,  # Changed if was online before
            'online': False,
        }
    except LocalUser.DoesNotExist:
        return {'changed': False, 'online': False}
