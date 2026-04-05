import json

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from accounts.models import Friendship, LocalUser
from chat.models import Conversation, Message


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

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    invite_data = json.dumps({
        'time_control': payload.get('time_control', '10 min'),
        'competitive': payload.get('competitive', False),
        'sender_username': user.username,
    })

    msg = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=invite_data,
        message_type='game_invite',
    )
    msg.read_by.add(user)
    conversation.save()

    return JsonResponse(msg.to_dict(), status=201)
