import json
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from accounts.models import Friendship, LocalUser
from chat.invite_payload import build_game_invite_content_dict
from chat.models import Conversation, GameInvite, Message


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


def _get_authenticated_user(request):
    user_id = request.session.get('local_user_id')
    if not user_id:
        return None, JsonResponse({'error': 'Non authentifie'}, status=401)
    try:
        user = LocalUser.objects.get(id=user_id)
        return user, None
    except LocalUser.DoesNotExist:
        request.session.pop('local_user_id', None)
        return None, JsonResponse({'error': 'Session invalide'}, status=401)


@require_GET
def conversation_list(request):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    conversations = Conversation.objects.filter(
        participants=user
    ).prefetch_related('participants', 'messages__sender')

    return JsonResponse({
        'conversations': [c.to_dict(current_user=user) for c in conversations]
    })


@csrf_exempt
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

    is_blocked = Friendship.objects.filter(
        Q(from_user=user, to_user=other_user, status='blocked') |
        Q(from_user=other_user, to_user=user, status='blocked')
    ).exists()
    if is_blocked:
        return JsonResponse({'error': 'Relation bloquee'}, status=403)

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


@csrf_exempt
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

    msg = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
        message_type=msg_type,
    )
    msg.read_by.add(user)
    conversation.save()

    return JsonResponse(msg.to_dict(), status=201)


@csrf_exempt
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

    receiver = _get_other_participant(conversation, user)
    if receiver is None:
        return JsonResponse({'error': 'Conversation invalide pour invitation'}, status=400)

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

    existing_pending = GameInvite.objects.filter(
        sender=user,
        status=GameInvite.STATUS_PENDING,
    ).select_related('conversation').first()
    if existing_pending:
        return JsonResponse(
            {
                'error': 'Une invitation est deja en attente',
                'code': 'sender_already_has_pending',
                'invite': existing_pending.to_dict(),
            },
            status=409,
        )

    expires_at = timezone.now() + timedelta(minutes=INVITE_TTL_MINUTES)

    invite_obj = build_game_invite_content_dict(
        {
            'time_control': payload.get('time_control') or _format_time_control_label(time_seconds),
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
    except IntegrityError:
        pending = GameInvite.objects.filter(
            sender=user,
            status=GameInvite.STATUS_PENDING,
        ).first()
        return JsonResponse(
            {
                'error': 'Une invitation est deja en attente',
                'code': 'sender_already_has_pending',
                'invite': pending.to_dict() if pending else None,
            },
            status=409,
        )

    return JsonResponse(
        {
            'message': msg.to_dict(),
            'invite': invite.to_dict(),
        },
        status=201,
    )


@csrf_exempt
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

    with transaction.atomic():
        try:
            invite = GameInvite.objects.select_for_update().select_related('conversation', 'sender', 'receiver', 'source_message').get(id=invite_id)
        except GameInvite.DoesNotExist:
            return JsonResponse({'error': 'Invitation introuvable'}, status=404)

        if invite.receiver_id != user.id:
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

        invite.status = GameInvite.STATUS_ACCEPTED if action == 'accept' else GameInvite.STATUS_DECLINED
        invite.responded_at = now
        invite.cancel_reason = None
        invite.save(update_fields=['status', 'responded_at', 'cancel_reason', 'updated_at'])
        _sync_source_message_status(invite)

    return JsonResponse({'invite': invite.to_dict()}, status=200)


@csrf_exempt
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
            invite = GameInvite.objects.select_for_update().select_related('source_message').get(id=invite_id)
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

    return JsonResponse({'invite': invite.to_dict()}, status=200)


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
