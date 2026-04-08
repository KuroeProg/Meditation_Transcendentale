import json

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from accounts.models import LocalUser
from game.services.rating import get_rating_field, normalize_time_category


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


@csrf_exempt
def update_profile(request):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    update_fields = []
    allowed = {
        'first_name': 150,
        'last_name': 150,
        'bio': 1000,
        'username': 150,
    }

    for field, max_len in allowed.items():
        value = payload.get(field)
        if value is not None:
            value = str(value).strip()[:max_len]
            if field == 'username' and value:
                if LocalUser.objects.filter(username=value).exclude(id=user.id).exists():
                    return JsonResponse({'error': 'Ce nom d\'utilisateur est deja pris'}, status=409)
            setattr(user, field, value)
            update_fields.append(field)

    if update_fields:
        user.save(update_fields=update_fields)

    return JsonResponse(user.to_public_dict())


@csrf_exempt
def upload_avatar(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    avatar_file = request.FILES.get('avatar')
    if not avatar_file:
        return JsonResponse({'error': 'Aucun fichier avatar fourni'}, status=400)

    if avatar_file.size > 5 * 1024 * 1024:
        return JsonResponse({'error': 'Le fichier est trop volumineux (max 5 Mo)'}, status=400)

    allowed_types = ('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    if avatar_file.content_type not in allowed_types:
        return JsonResponse({'error': 'Format non supporte (JPEG, PNG, GIF, WebP)'}, status=400)

    if user.avatar:
        user.avatar.delete(save=False)

    user.avatar = avatar_file
    user.save(update_fields=['avatar'])

    return JsonResponse(user.to_public_dict())


@require_GET
def leaderboard(request):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    category = normalize_time_category(request.GET.get('category') or request.GET.get('time_category'))
    rating_field = get_rating_field(category)
    top_players = LocalUser.objects.order_by(f'-{rating_field}')[:20]
    result = []
    for i, player in enumerate(top_players, 1):
        result.append({
            'rank': i,
            'id': player.id,
            'username': player.username,
            'avatar': player.get_avatar_url(),
            'coalition': player.coalition,
            'elo_rapid': player.elo_rapid,
            'elo_blitz': player.elo_blitz,
            'elo_bullet': player.elo_bullet,
            'games_played': player.games_played,
            'games_won': player.games_won,
            'is_online': player.is_online,
            'rating_field': rating_field,
            'selected_rating': getattr(player, rating_field),
        })

    current_rank = None
    for entry in result:
        if entry['id'] == user.id:
            current_rank = entry['rank']
            break

    if current_rank is None:
        all_ids = list(LocalUser.objects.order_by(f'-{rating_field}').values_list('id', flat=True))
        try:
            current_rank = all_ids.index(user.id) + 1
        except ValueError:
            current_rank = len(all_ids) + 1

    return JsonResponse({
        'category': category,
        'rating_field': rating_field,
        'leaderboard': result,
        'current_user_rank': current_rank,
    })


@require_GET
def search_users(request):
    user, err = _get_authenticated_user(request)
    if err:
        return err

    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return JsonResponse({'users': []})

    users = LocalUser.objects.filter(
        username__icontains=query
    ).exclude(id=user.id)[:15]

    return JsonResponse({
        'users': [
            {
                'id': u.id,
                'username': u.username,
                'avatar': u.get_avatar_url(),
                'coalition': u.coalition,
                'is_online': u.is_online,
            }
            for u in users
        ]
    })


@csrf_exempt
def presence_ping(request):
    """Marque l'utilisateur connecté comme en ligne (heartbeat app, toutes les ~45s)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    LocalUser.objects.filter(id=user.id).update(is_online=True, last_seen=timezone.now())
    return JsonResponse({'ok': True})
