import json

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.models import Friendship, LocalUser


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


def _friendship_to_contact(friendship, current_user):
    other = friendship.to_user if friendship.from_user_id == current_user.id else friendship.from_user
    return {
        'friendship_id': friendship.id,
        'user': {
            'id': other.id,
            'username': other.username,
            'avatar': other.get_avatar_url(),
            'coalition': other.coalition,
            'is_online': other.is_online,
        },
        'status': friendship.status,
        'is_sender': friendship.from_user_id == current_user.id,
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

    contacts = [_friendship_to_contact(f, user) for f in qs.order_by('-updated_at')]

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

        elif action == 'block':
            friendship.status = 'blocked'
            friendship.from_user = user
            friendship.to_user = (
                friendship.to_user if friendship.from_user_id == user.id
                else friendship.from_user
            )
            friendship.save(update_fields=['status', 'from_user_id', 'to_user_id', 'updated_at'])

        elif action == 'unblock':
            if friendship.from_user_id != user.id or friendship.status != 'blocked':
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
