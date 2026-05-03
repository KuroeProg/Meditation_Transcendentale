import json
import secrets
import time
from datetime import timedelta

import chess
import redis
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from accounts.models import Friendship, LocalUser
from chat.invite_payload import build_game_invite_content_dict
from chat.models import Conversation, GameInvite, Message
from game.services.active_game import get_active_game_sync
from chat.services.invitation import create_game_invite


INVITE_TTL_MINUTES = 5


def _parse_request_json(request):
    try:
        return json.loads(request.body.decode('utf-8')), None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({'error': 'Invalid JSON'}, status=400)


def _get_other_participant(conversation, current_user):
    return conversation.participants.exclude(id=current_user.id).first()


def _format_time_control_label(seconds):
    seconds = int(seconds)
    if seconds % 60 == 0:
        return f'{seconds // 60} min'
    return f'{seconds}s'


def _infer_time_category(time_control, increment=0):
    seconds = int(time_control)
    inc = int(increment)
    estimated_time = seconds + 40 * inc
    
    if estimated_time < 180:
        return 'bullet'
    if estimated_time < 480:
        return 'blitz'
    if seconds >= 86400:
        return 'correspondence'
    return 'rapid'
def _check_blocked(user, other_user):
    """Returns an error message (str) if blocked, else None."""
    if not other_user:
        return None
    from accounts.models import Friendship
    friendship = Friendship.objects.filter(
        Q(from_user=user, to_user=other_user, status='blocked') |
        Q(from_user=other_user, to_user=user, status='blocked')
    ).first()
    if friendship:
        if friendship.blocked_by_id == user.id:
            return "Tu as bloque ce joueur."
        return "Ce joueur t'a bloque."
    return None


def _create_online_game_for_invite(invite):
    game_id = f"friend_{int(timezone.now().timestamp() * 1000)}_{secrets.token_hex(4)}"

    board = chess.Board()
    now_ts = time.time()
    time_control = int(invite.time_control_seconds or 600)
    increment = int(invite.increment_seconds or 0)
    is_competitive = bool(invite.competitive)

    sender = LocalUser.objects.filter(id=invite.sender_id).first()
    receiver = LocalUser.objects.filter(id=invite.receiver_id).first()

    white_coalition = str(sender.coalition) if sender and sender.coalition else 'feu'
    black_coalition = str(receiver.coalition) if receiver and receiver.coalition else 'feu'
    white_profile = sender.to_public_dict() if sender else None
    black_profile = receiver.to_public_dict() if receiver else None

    game_state = {
        'fen': board.fen(),
        'status': 'active',
        'white_player_id': invite.sender_id,
        'black_player_id': invite.receiver_id,
        'white_player_coalition': white_coalition,
        'black_player_coalition': black_coalition,
        'white_player_profile': white_profile,
        'black_player_profile': black_profile,
        'white_time_left': time_control,
        'black_time_left': time_control,
        'time_control_seconds': time_control,
        'increment': increment,
        'increment_seconds': increment,
        'time_category': _infer_time_category(time_control, increment),
        'is_competitive': is_competitive,
        'is_rated': is_competitive,
        'game_mode': 'standard',
        'last_move_timestamp': now_ts,
        'start_timestamp': now_ts,
        'draw_offer_from_player_id': None,
        'moves': [],
    }

    redis_client = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
    redis_client.set(game_id, json.dumps(game_state))
    return game_id


def _notify_user(user_id, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f'user_{int(user_id)}',
        {
            'type': 'notification',
            'data': payload,
        },
    )


def _invite_event_payload(action, invite):
    payload = {
        'action': action,
        'invite': invite.to_dict(),
    }
    return payload


def _broadcast_invite_event(action, invite):
    payload = _invite_event_payload(action, invite)
    _notify_user(invite.sender_id, payload)
    _notify_user(invite.receiver_id, payload)


def _broadcast_game_ready(invite):
    if not invite.game_id:
        return
    payload = {
        'action': 'game_ready',
        'invite_id': invite.id,
        'game_id': invite.game_id,
        'sender_id': invite.sender_id,
        'receiver_id': invite.receiver_id,
    }
    _notify_user(invite.sender_id, payload)
    _notify_user(invite.receiver_id, payload)


def _broadcast_chat_message(conversation_id, message_dict):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f'chat_{int(conversation_id)}',
        {
            'type': 'chat_message',
            'message': message_dict,
        },
    )


def _get_authenticated_user(request):
    user_id = request.session.get('local_user_id')
    if not user_id:
        return None, JsonResponse({'error': 'Non authentifie', 'authenticated': False}, status=200)
    try:
        user = LocalUser.objects.get(id=user_id)
        return user, None
    except LocalUser.DoesNotExist:
        request.session.pop('local_user_id', None)
        return None, JsonResponse({'error': 'Session invalide', 'authenticated': False}, status=200)


@require_GET
def conversation_list(request):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    # Exclude in-game conversations from the inbox; they are fetched via game-conversation
    conversations = Conversation.objects.filter(
        participants=user,
    ).exclude(type='game').prefetch_related('participants', 'messages__sender')

    return JsonResponse({
        'conversations': [c.to_dict(current_user=user) for c in conversations]
    })


@require_GET
def pending_outgoing_invite(request):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    now = timezone.now()
    pending = GameInvite.objects.filter(
        sender=user,
        status=GameInvite.STATUS_PENDING,
    ).order_by('-created_at').first()

    if pending and pending.expires_at and pending.expires_at <= now:
        pending.status = GameInvite.STATUS_EXPIRED
        pending.cancel_reason = 'system'
        pending.responded_at = now
        pending.save(update_fields=['status', 'cancel_reason', 'responded_at', 'updated_at'])
        _sync_source_message_status(pending)
        _broadcast_invite_event('invite_updated', pending)
        pending = None

    return JsonResponse({'invite': pending.to_dict() if pending else None})


def create_conversation(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    participant_id = payload.get('participant_id')
    conv_type = payload.get('type', 'private')
    game_id = payload.get('game_id')

    if not participant_id:
        return JsonResponse({'error': 'participant_id requis'}, status=400)

    try:
        other_user = LocalUser.objects.get(id=participant_id)
    except LocalUser.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur introuvable'}, status=404)

    block_err = _check_blocked(user, other_user)
    if block_err:
        return JsonResponse({'error': block_err}, status=200)

    if conv_type == 'private':
        existing = Conversation.objects.filter(
            type='private',
            participants=user,
        ).filter(
            participants=other_user,
        ).first()
        if existing:
            return JsonResponse(existing.to_dict(current_user=user))

    conversation = Conversation.objects.create(type=conv_type, game_id=game_id)
    conversation.participants.add(user, other_user)

    return JsonResponse(conversation.to_dict(current_user=user), status=201)


@require_GET
def conversation_messages(request, conversation_id):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation introuvable'}, status=404)

    if not conversation.participants.filter(id=user.id).exists():
        return JsonResponse({'error': 'Non autorise'}, status=403)

    offset = int(request.GET.get('offset', 0))
    limit = min(int(request.GET.get('limit', 50)), 100)

    messages = conversation.messages.select_related('sender').prefetch_related('read_by')
    total = messages.count()

    if offset > 0:
        messages = messages.order_by('-created_at')[offset:offset + limit]
        messages = list(reversed(messages))
    else:
        messages = messages.order_by('-created_at')[:limit]
        messages = list(reversed(messages))

    return JsonResponse({
        'messages': [m.to_dict() for m in messages],
        'total': total,
        'offset': offset,
        'limit': limit,
    })


def send_message(request, conversation_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation introuvable'}, status=404)

    if not conversation.participants.filter(id=user.id).exists():
        return JsonResponse({'error': 'Non autorise'}, status=403)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    content = str(payload.get('content', '')).strip()
    msg_type = payload.get('message_type', 'text')
    if not content:
        return JsonResponse({'error': 'Contenu requis'}, status=400)

    other_user = _get_other_participant(conversation, user)
    block_err = _check_blocked(user, other_user)
    if block_err:
        return JsonResponse({'error': block_err}, status=200)

    msg = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
        message_type=msg_type,
    )
    msg.read_by.add(user)
    conversation.save()

    return JsonResponse(msg.to_dict(), status=201)


def send_game_invite(request, conversation_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation introuvable'}, status=404)

    if not conversation.participants.filter(id=user.id).exists():
        return JsonResponse({'error': 'Non autorise'}, status=403)

    payload, parse_err = _parse_request_json(request)
    if parse_err:
        return parse_err

    result = create_game_invite(user, conversation, payload)
    
    if 'error' in result:
        status = result.pop('status', 400)
        return JsonResponse(result, status=status)

    # Note: the service already created the invite and message.
    # We broadcast events here as in the original view.
    from chat.models import GameInvite
    try:
        invite = GameInvite.objects.get(id=result['invite']['id'])
        _broadcast_invite_event('invite_created', invite)
        _broadcast_chat_message(conversation.id, result['message'])
    except GameInvite.DoesNotExist:
        pass

    return JsonResponse(result, status=201)


def respond_game_invite(request, invite_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    payload, parse_err = _parse_request_json(request)
    if parse_err:
        return parse_err

    action = str(payload.get('action', '')).strip().lower()
    if action not in {'accept', 'decline'}:
        return JsonResponse({'error': 'Action invalide'}, status=400)

    accept_blocked = None
    with transaction.atomic():
        try:
            invite = GameInvite.objects.select_for_update().select_related('conversation', 'sender', 'receiver').get(id=invite_id)
        except GameInvite.DoesNotExist:
            return JsonResponse({'error': 'Invitation introuvable'}, status=404)

        if invite.receiver_id != user.id:
            return JsonResponse({'error': 'Operation non autorisee'}, status=403)

        block_err = _check_blocked(user, invite.sender)
        if block_err:
            return JsonResponse({'error': block_err}, status=200)

        now = timezone.now()
        if invite.status == GameInvite.STATUS_PENDING and invite.expires_at and invite.expires_at <= now:
            invite.status = GameInvite.STATUS_EXPIRED
            invite.cancel_reason = 'system'
            invite.responded_at = now
            invite.save(update_fields=['status', 'cancel_reason', 'responded_at', 'updated_at'])
            _sync_source_message_status(invite)

        if invite.status != GameInvite.STATUS_PENDING:
            return JsonResponse(
                {
                    'code': 'already_processed',
                    'invite': invite.to_dict(),
                },
                status=200,
            )

        if action == 'accept':
            if get_active_game_sync(invite.sender_id):
                accept_blocked = 'sender_in_game'
            elif get_active_game_sync(invite.receiver_id):
                accept_blocked = 'receiver_in_game'

        if action == 'accept' and not accept_blocked:
            invite.status = GameInvite.STATUS_ACCEPTED
            invite.game_id = _create_online_game_for_invite(invite)
            invite.responded_at = now
            invite.cancel_reason = None
        elif action == 'accept' and accept_blocked:
            invite.status = GameInvite.STATUS_DECLINED
            invite.game_id = None
            invite.responded_at = now
            invite.cancel_reason = accept_blocked
        else:
            invite.status = GameInvite.STATUS_DECLINED
            invite.game_id = None
            invite.responded_at = now
            invite.cancel_reason = None
        invite.save(update_fields=['status', 'game_id', 'responded_at', 'cancel_reason', 'updated_at'])
        _sync_source_message_status(invite)

    _broadcast_invite_event('invite_updated', invite)
    if invite.status == GameInvite.STATUS_ACCEPTED:
        _broadcast_game_ready(invite)

    if action == 'accept' and accept_blocked:
        err_msg = (
            'L’expéditeur est déjà en partie. L’invitation a été annulée.'
            if accept_blocked == 'sender_in_game'
            else 'Tu es déjà en partie. L’invitation a été annulée.'
        )
        return JsonResponse(
            {
                'error': err_msg,
                'code': accept_blocked,
                'invite': invite.to_dict(),
            },
            status=409,
        )

    return JsonResponse({'invite': invite.to_dict()}, status=200)


def cancel_game_invite(request, invite_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    payload, parse_err = _parse_request_json(request)
    if parse_err:
        return parse_err

    cancel_reason = str(payload.get('reason', 'manual_cancel') or 'manual_cancel').strip()[:40]

    with transaction.atomic():
        try:
            invite = GameInvite.objects.select_for_update().get(id=invite_id)
        except GameInvite.DoesNotExist:
            return JsonResponse({'error': 'Invitation introuvable'}, status=404)

        if invite.sender_id != user.id:
            return JsonResponse({'error': 'Operation non autorisee'}, status=403)

        now = timezone.now()
        if invite.status == GameInvite.STATUS_PENDING and invite.expires_at and invite.expires_at <= now:
            invite.status = GameInvite.STATUS_EXPIRED
            invite.cancel_reason = 'system'
            invite.responded_at = now
            invite.save(update_fields=['status', 'cancel_reason', 'responded_at', 'updated_at'])
            _sync_source_message_status(invite)

        if invite.status != GameInvite.STATUS_PENDING:
            return JsonResponse(
                {
                    'code': 'already_processed',
                    'invite': invite.to_dict(),
                },
                status=200,
            )

        invite.status = GameInvite.STATUS_CANCELLED
        invite.cancel_reason = cancel_reason or 'manual_cancel'
        invite.responded_at = now
        invite.save(update_fields=['status', 'cancel_reason', 'responded_at', 'updated_at'])
        _sync_source_message_status(invite)

    _broadcast_invite_event('invite_updated', invite)
    return JsonResponse({'invite': invite.to_dict()}, status=200)


@require_GET
def game_conversation(request):
    """Get-or-create the chat conversation for an active game.

    The caller must be one of the two players of the game.
    Returns the existing conversation or creates a new one.
    Query param: game_id (required).
    """
    user, err = _get_authenticated_user(request)
    if err:
        return err

    game_id = request.GET.get('game_id', '').strip()
    if not game_id:
        return JsonResponse({'error': 'game_id requis'}, status=400)

    # Verify the requesting user is a player in this game (Redis check)
    try:
        import redis
        from django.conf import settings
        r = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])
        raw = r.get(game_id)
        if raw is None:
            return JsonResponse({'error': 'Partie introuvable'}, status=404)

        import json as _json
        game_state = _json.loads(raw)
        white_id = str(game_state.get('white_player_id', ''))
        black_id = str(game_state.get('black_player_id', ''))
        if str(user.id) not in (white_id, black_id):
            return JsonResponse({'error': 'Non autorisé'}, status=403)

        # Determine the opponent
        opponent_id = int(black_id) if str(user.id) == white_id else int(white_id)
        try:
            opponent = LocalUser.objects.get(id=opponent_id)
        except LocalUser.DoesNotExist:
            return JsonResponse({'error': 'Adversaire introuvable'}, status=404)
    except Exception as e:
        return JsonResponse({'error': 'Erreur serveur', 'detail': str(e)}, status=500)

    # Find existing game conversation or create one
    existing = Conversation.objects.filter(
        type='game',
        game_id=game_id,
    ).filter(participants=user).first()

    if existing:
        return JsonResponse(existing.to_dict(current_user=user))

    # Create a new game conversation (idempotent: game_id + participants)
    is_blocked = Q(from_user=user, to_user=opponent, status='blocked') | Q(from_user=opponent, to_user=user, status='blocked')
    from accounts.models import Friendship as _Friendship
    if _Friendship.objects.filter(is_blocked).exists():
        return JsonResponse({'error': 'Relation bloquée'}, status=403)

    conversation = Conversation.objects.create(type='game', game_id=game_id)
    conversation.participants.add(user, opponent)
    return JsonResponse(conversation.to_dict(current_user=user), status=201)


def _sync_source_message_status(invite):
    msg = invite.source_message
    if msg is None:
        return

    try:
        content_obj = json.loads(msg.content)
    except (TypeError, ValueError, json.JSONDecodeError):
        content_obj = {}

    content_obj['invite_status'] = invite.status
    content_obj['invite_id'] = invite.id
    content_obj['cancel_reason'] = invite.cancel_reason
    content_obj['game_id'] = invite.game_id
    content_obj['expires_at'] = invite.expires_at.isoformat() if invite.expires_at else None
    content_obj['responded_at'] = invite.responded_at.isoformat() if invite.responded_at else None
    msg.content = json.dumps(content_obj)
    msg.save(update_fields=['content'])
