import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.models import Friendship, LocalUser
from utils.presence import get_effective_online_for_user


def _notify_user(user_id, payload):
    """Envoie une notification WS à un utilisateur spécifique (user_<id>)."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'user_{user_id}',
                {'type': 'notification', 'data': payload},
            )
    except Exception:
        pass


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


def _friendship_to_contact(friendship, current_user, active_games=None):
    other = friendship.to_user if friendship.from_user_id == current_user.id else friendship.from_user
    active_game_id = (active_games or {}).get(other.id)
    return {
        'friendship_id': friendship.id,
        'user': {
            'id': other.id,
            'username': other.username,
            'avatar': other.get_avatar_url(),
            'coalition': other.coalition,
            'is_online': get_effective_online_for_user(other),
            'elo_rapid': other.elo_rapid,
            'elo_blitz': other.elo_blitz,
            'active_game_id': active_game_id,
        },
        'status': friendship.status,
        'is_sender': friendship.from_user_id == current_user.id,
        'blocked_by_id': friendship.blocked_by_id,
        'blocked_by_me': friendship.blocked_by_id == current_user.id,
        'created_at': friendship.created_at.isoformat(),
    }


@csrf_exempt
def friends_list(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    status_filter = request.GET.get('status', '')

    qs = Friendship.objects.filter(
        Q(from_user=user) | Q(to_user=user)
    ).select_related('from_user', 'to_user')

    if status_filter:
        qs = qs.filter(status=status_filter)

    friendships = list(qs.order_by('-updated_at'))

    # Enrich accepted friends with active-game info from Redis
    active_games = {}
    try:
        from game.services.active_game import get_active_game_sync
        for f in friendships:
            if f.status == 'accepted':
                other = f.to_user if f.from_user_id == user.id else f.from_user
                game_id = get_active_game_sync(other.id)
                if game_id:
                    active_games[other.id] = game_id
    except Exception:
        pass

    contacts = [_friendship_to_contact(f, user, active_games) for f in friendships]
    return JsonResponse({'friends': contacts})


@csrf_exempt
def friend_request(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    target_id = payload.get('user_id')
    if not target_id:
        return JsonResponse({'error': 'user_id requis'}, status=400)

    if int(target_id) == user.id:
        return JsonResponse({'error': 'Tu ne peux pas t\'ajouter toi-meme'}, status=400)

    try:
        target = LocalUser.objects.get(id=target_id)
    except LocalUser.DoesNotExist:
        return JsonResponse({'error': 'Utilisateur introuvable'}, status=404)

    existing = Friendship.objects.filter(
        Q(from_user=user, to_user=target) | Q(from_user=target, to_user=user)
    ).first()

    if existing:
        if existing.status == 'blocked':
            return JsonResponse({'error': 'Relation bloquee'}, status=403)
        if existing.status == 'accepted':
            return JsonResponse({'error': 'Deja amis'}, status=409)
        if existing.status == 'pending':
            if existing.to_user_id == user.id:
                existing.status = 'accepted'
                existing.save(update_fields=['status', 'updated_at'])
                return JsonResponse(_friendship_to_contact(existing, user), status=200)
            return JsonResponse({'error': 'Demande deja envoyee'}, status=409)

    friendship = Friendship.objects.create(from_user=user, to_user=target, status='pending')
    _notify_user(target.id, {
        'action': 'friend_request',
        'from_user': {
            'id': user.id,
            'username': user.username,
            'avatar': user.get_avatar_url(),
        },
    })
    return JsonResponse(_friendship_to_contact(friendship, user), status=201)


@csrf_exempt
def friend_action(request, friendship_id):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        friendship = Friendship.objects.select_related('from_user', 'to_user').get(id=friendship_id)
    except Friendship.DoesNotExist:
        return JsonResponse({'error': 'Relation introuvable'}, status=404)

    if friendship.from_user_id != user.id and friendship.to_user_id != user.id:
        return JsonResponse({'error': 'Non autorise'}, status=403)

    if request.method == 'PUT':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        action = payload.get('action', '')

        if action == 'accept':
            if friendship.to_user_id != user.id or friendship.status != 'pending':
                return JsonResponse({'error': 'Impossible d\'accepter cette demande'}, status=400)
            friendship.status = 'accepted'
            friendship.save(update_fields=['status', 'updated_at'])
            _notify_user(friendship.from_user_id, {
                'action': 'friend_accepted',
                'by_user': {
                    'id': user.id,
                    'username': user.username,
                    'avatar': user.get_avatar_url(),
                },
            })

        elif action == 'block':
            friendship.status = 'blocked'
            friendship.blocked_by = user
            friendship.save(update_fields=['status', 'blocked_by_id', 'updated_at'])

        elif action == 'unblock':
            if friendship.status != 'blocked' or friendship.blocked_by_id != user.id:
                return JsonResponse({'error': 'Impossible de debloquer'}, status=400)
            friendship.delete()
            return JsonResponse({'ok': True})

        else:
            return JsonResponse({'error': 'Action invalide'}, status=400)

        return JsonResponse(_friendship_to_contact(friendship, user))

    elif request.method == 'DELETE':
        friendship.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)
