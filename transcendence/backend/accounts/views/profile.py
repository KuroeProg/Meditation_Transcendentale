import json
import logging
import uuid

from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from accounts.models import LocalUser
from game.services.rating import get_rating_field, normalize_time_category
from utils.presence import get_effective_online_for_user, mark_user_presence_heartbeat


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

    # Coalition : réservée aux comptes locaux (OAuth 42 garde la synchro intra).
    if payload.get('coalition') is not None:
        if (user.password_hash or '').strip():
            c = str(payload.get('coalition')).strip().lower()
            if c in ('feu', 'eau', 'terre', 'air') and user.coalition != c:
                user.coalition = c
                update_fields.append('coalition')

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
            'is_online': get_effective_online_for_user(player),
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

    mark_user_presence_heartbeat(user.id)
    return JsonResponse({'ok': True})


# ── Client preferences ────────────────────────────────────────────────────────

# Allowed top-level keys that can be persisted
_ALLOWED_PREF_KEYS = frozenset({
    # UI prefs (from uiPrefs.js)
    'reduceMotion', 'lightMode', 'showScrollbars', 'hideInviteToasts',
    # Audio prefs (from gameAudioPrefs.js)
    'gameBgmVolume', 'gameBgmMuted', 'homeBgmVolume', 'homeBgmMuted',
    'sfxVolume', 'sfxMuted', 'gameBgmTrackMode', 'gameBgmFixedTrack',
})


@csrf_exempt
def client_settings(request):
    """GET or PATCH the user's persistent client preferences."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    if request.method == 'GET':
        return JsonResponse({'prefs': user.client_prefs or {}})

    if request.method == 'PATCH':
        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not isinstance(payload, dict):
            return JsonResponse({'error': 'Object expected'}, status=400)

        current = dict(user.client_prefs or {})
        for key, value in payload.items():
            if key in _ALLOWED_PREF_KEYS:
                current[key] = value

        user.client_prefs = current
        user.save(update_fields=['client_prefs'])
        return JsonResponse({'prefs': current})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@require_GET
def export_account_data(request):
    """RGPD — export JSON des données personnelles (portabilité)."""
    from game.models import Game

    from chat.models import Conversation, GameInvite, Message

    log = logging.getLogger('transcendence')
    user, err = _get_authenticated_user(request)
    if err:
        return err

    log.info('rgpd_export', extra={'action': 'rgpd_export', 'user_id': user.id})

    profile = user.to_public_dict()
    games = []
    for g in Game.objects.filter(Q(player_white=user) | Q(player_black=user)).order_by('-started_at')[:800]:
        games.append({
            'id': g.id,
            'player_white_id': g.player_white_id,
            'player_black_id': g.player_black_id,
            'winner_id': g.winner_id,
            'termination_reason': g.termination_reason,
            'time_category': g.time_category,
            'is_competitive': g.is_competitive,
            'started_at': g.started_at.isoformat() if g.started_at else None,
            'duration_seconds': g.duration_seconds,
        })

    invites = [inv.to_dict() for inv in GameInvite.objects.filter(Q(sender=user) | Q(receiver=user)).order_by('-created_at')[:500]]

    conversations_out = []
    max_messages = 4000
    msg_count = 0
    messages_truncated = False
    for conv in Conversation.objects.filter(participants=user).order_by('-updated_at'):
        other_ids = list(conv.participants.exclude(id=user.id).values_list('id', flat=True))
        entry = {
            'id': conv.id,
            'type': conv.type,
            'game_id': conv.game_id,
            'other_participant_ids': other_ids,
            'messages': [],
        }
        for msg in Message.objects.filter(conversation=conv).order_by('created_at'):
            if msg_count >= max_messages:
                messages_truncated = True
                break
            entry['messages'].append(msg.to_dict())
            msg_count += 1
        conversations_out.append(entry)
        if msg_count >= max_messages:
            break

    body = {
        'export_version': 1,
        'exported_at': timezone.now().isoformat(),
        'profile': profile,
        'client_prefs': user.client_prefs or {},
        'games': games,
        'game_invites': invites,
        'conversations': conversations_out,
        'messages_truncated': messages_truncated,
    }

    response = HttpResponse(
        json.dumps(body, ensure_ascii=False, indent=2),
        content_type='application/json; charset=utf-8',
    )
    response['Content-Disposition'] = f'attachment; filename="transcendence-export-user-{user.id}.json"'
    return response


@csrf_exempt
def delete_account_data(request):
    """RGPD — anonymise the account, delete personal data, invalidate the session.

    Keeps the LocalUser row (and Game rows pointing to it via SET_NULL-compatible FKs)
    to preserve match history integrity. Also clears Redis presence / active_game markers,
    removes read_by rows for this user, removes the user from conversation participants,
    then removes avatar, PII fields, sent messages, game invites, and friendships.
    The session is flushed so the user is logged out immediately. Logged as rgpd_delete.
    """
    if request.method not in ('DELETE', 'POST'):
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    user, err = _get_authenticated_user(request)
    if err:
        return err

    if request.method == 'POST':
        try:
            body = json.loads(request.body.decode('utf-8') or '{}')
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        if not body.get('confirm'):
            return JsonResponse({'error': 'Requiert {"confirm": true}'}, status=400)

    log = logging.getLogger('transcendence')
    log.info('rgpd_delete', extra={'action': 'rgpd_delete', 'user_id': user.id})

    from chat.models import Conversation, Message, GameInvite
    from game.services.active_game import delete_active_game_marker_sync
    from utils.presence import clear_user_presence_redis

    delete_active_game_marker_sync(user.id)
    clear_user_presence_redis(user.id)

    try:
        Message.read_by.through.objects.filter(localuser=user).delete()
    except Exception:
        pass

    for conv in Conversation.objects.filter(participants=user):
        conv.participants.remove(user)

    anon_tag = uuid.uuid4().hex[:12]

    # Delete avatar file from storage
    if user.avatar:
        try:
            user.avatar.delete(save=False)
        except Exception:
            pass

    # Anonymise personal fields in-place (keep same PK so Game FKs stay valid)
    user.username = f'deleted_{anon_tag}'
    user.email = f'deleted_{anon_tag}@invalid.local'
    user.first_name = ''
    user.last_name = ''
    user.bio = ''
    user.avatar = None
    user.image_url = ''
    user.password_hash = ''
    user.client_prefs = {}
    user.is_online = False
    user.save(update_fields=[
        'username', 'email', 'first_name', 'last_name', 'bio',
        'avatar', 'image_url', 'password_hash', 'client_prefs', 'is_online',
    ])

    # Delete sent messages and invites
    try:
        Message.objects.filter(sender=user).delete()
        GameInvite.objects.filter(sender=user).delete()
        GameInvite.objects.filter(receiver=user).delete()
    except Exception:
        pass

    # Delete friendships explicitly (CASCADE fires only on row delete, not anonymise)
    from accounts.models import Friendship  # noqa: PLC0415

    Friendship.objects.filter(Q(from_user=user) | Q(to_user=user)).delete()

    # Flush session → user is logged out
    request.session.flush()

    return JsonResponse({'ok': True, 'message': 'Données supprimées et compte anonymisé. Vous avez été déconnecté.'})
