import json
from datetime import timedelta
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.db.models import Q
from accounts.models import Friendship, LocalUser
from chat.invite_payload import build_game_invite_content_dict
from chat.models import Conversation, GameInvite, Message
from game.services.active_game import get_active_game_sync

INVITE_TTL_MINUTES = 5

def create_game_invite(user, conversation, payload):
    """
    Creates a GameInvite and the associated Message.
    Returns (message_dict, invite_dict) or raises an exception with error info.
    """
    receiver = conversation.participants.exclude(id=user.id).first()
    if receiver is None:
        return {'error': 'Conversation invalide pour invitation', 'status': 400}

    # Block check
    friendship = Friendship.objects.filter(
        Q(from_user=user, to_user=receiver, status='blocked') |
        Q(from_user=receiver, to_user=user, status='blocked')
    ).first()
    if friendship:
        if friendship.blocked_by_id == user.id:
            return {'error': "Tu as bloque ce joueur.", 'status': 200}
        return {'error': "Ce joueur t'a bloque.", 'status': 200}

    # Active game checks
    if get_active_game_sync(user.id):
        return {'error': "Tu es déjà en partie. Termine ou quitte la partie avant d'inviter.", 'status': 200}
    if get_active_game_sync(receiver.id):
        return {'error': "Ce joueur est déjà en partie.", 'status': 200}

    # Time control parsing
    try:
        time_seconds = int(payload.get('time_seconds', 600) or 600)
    except (TypeError, ValueError):
        time_seconds = 600
    try:
        increment = int(payload.get('increment', 0) or 0)
    except (TypeError, ValueError):
        increment = 0

    if time_seconds < 60:
        time_seconds = 60
    if increment < 0:
        increment = 0

    competitive = bool(payload.get('competitive', False))

    # Existing pending invite check
    existing_pending = GameInvite.objects.filter(
        sender=user,
        status=GameInvite.STATUS_PENDING,
    ).first()
    if existing_pending:
        return {
            'error': 'Une invitation est deja en attente',
            'code': 'sender_already_has_pending',
            'invite': existing_pending.to_dict(),
            'status': 409,
        }

    expires_at = timezone.now() + timedelta(minutes=INVITE_TTL_MINUTES)

    def _format_time_label(seconds, inc):
        seconds = int(seconds)
        inc = int(inc)
        mins = seconds // 60
        secs = seconds % 60
        base = f"{mins} min" if secs == 0 else f"{mins}m{secs}s"
        return f"{base} +{inc}" if inc > 0 else base

    invite_obj = build_game_invite_content_dict(
        {
            'time_control': payload.get('time_control') or _format_time_label(time_seconds, increment),
            'competitive': competitive,
            'time_seconds': time_seconds,
            'increment': increment,
        }
    )
    invite_obj['sender_username'] = user.username
    invite_obj['invite_status'] = GameInvite.STATUS_PENDING
    invite_obj['expires_at'] = expires_at.isoformat()

    try:
        with transaction.atomic():
            msg = Message.objects.create(
                conversation=conversation,
                sender=user,
                content=json.dumps(invite_obj),
                message_type='game_invite',
            )
            msg.read_by.add(user)

            invite = GameInvite.objects.create(
                conversation=conversation,
                source_message=msg,
                sender=user,
                receiver=receiver,
                time_control_seconds=time_seconds,
                increment_seconds=increment,
                competitive=competitive,
                status=GameInvite.STATUS_PENDING,
                expires_at=expires_at,
            )

            invite_obj['invite_id'] = invite.id
            msg.content = json.dumps(invite_obj)
            msg.save(update_fields=['content'])
            conversation.save()
            
            return {
                'message': msg.to_dict(),
                'invite': invite.to_dict(),
                'status': 201
            }
    except IntegrityError:
        pending = GameInvite.objects.filter(
            sender=user,
            status=GameInvite.STATUS_PENDING,
        ).first()
        return {
            'error': 'Une invitation est deja en attente',
            'code': 'sender_already_has_pending',
            'invite': pending.to_dict() if pending else None,
            'status': 409,
        }
