"""REST views for game history, replay, and legacy /api/history compatibility."""
import chess
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import LocalUser
from game.models import Game, Move

HISTORY_FILTERS = {
    'formats': [
        {'id': 'all', 'label': 'Tous'},
        {'id': 'bullet', 'label': 'Bullet'},
        {'id': 'blitz', 'label': 'Blitz'},
        {'id': 'rapid', 'label': 'Rapide'},
    ],
    'results': [
        {'id': 'all', 'label': 'Tous'},
        {'id': 'win', 'label': 'Victoires'},
        {'id': 'loss', 'label': 'Défaites'},
        {'id': 'draw', 'label': 'Nuls'},
    ],
    'modes': [
        {'id': 'all', 'label': 'Tous'},
        {'id': 'ranked', 'label': 'Classé'},
        {'id': 'casual', 'label': 'Amical'},
    ],
}

COMMUNITY_PANEL = {
    'coalitionRank': 1,
    'globalRank': 1,
    'trophies': [
        {'id': 'first-win', 'label': 'Première victoire (mock)', 'icon': 'ri-trophy-line', 'earned': True},
        {'id': 'ten-wins', 'label': '10 victoires (mock)', 'icon': 'ri-sword-line', 'earned': True},
        {'id': 'blitz-king', 'label': 'Roi du Blitz (mock)', 'icon': 'ri-flashlight-line', 'earned': False},
        {'id': 'analyst', 'label': 'Analyste expert (mock)', 'icon': 'ri-bar-chart-2-line', 'earned': False},
        {'id': 'tournament', 'label': 'Champion tournoi (mock)', 'icon': 'ri-medal-line', 'earned': False},
    ],
    'activityFeed': [
        {
            'id': 1,
            'type': 'win',
            'username': 'Système',
            'coalition': 'feu',
            'text': "Bienvenue dans l'arène (mock)",
            'time': "À l'instant",
        },
    ],
    'rivalryRank': {
        'enemyCoalition': 'eau',
        'position': 1,
        'wins': 0,
        'losses': 0,
        'draws': 0,
    },
}

PUZZLE_RECOMMENDATIONS = [
    {'id': 'p1', 'theme': 'Fourchette (mock)', 'difficulty': 'Intermédiaire', 'icon': 'ri-crosshair-line'},
    {'id': 'p2', 'theme': 'Clouage (mock)', 'difficulty': 'Facile', 'icon': 'ri-lock-line'},
]


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


def _result_for_user(game: Game, user: LocalUser) -> str:
    if game.winner_id is None:
        return 'draw'
    return 'win' if game.winner_id == user.id else 'loss'


def _score_str(game: Game, user: LocalUser) -> str:
    if game.winner_id is None:
        return '½-½'
    if game.winner_id == user.id:
        return '1-0' if game.player_white_id == user.id else '0-1'
    return '0-1' if game.player_white_id == user.id else '1-0'


def _opponent_of(game: Game, user: LocalUser):
    return game.player_black if game.player_white_id == user.id else game.player_white


def _clock_format_meta(game: Game, user: LocalUser):
    """Bullet / blitz / rapid from estimated clock (aligned with legacy UI)."""
    seconds = game.time_control_seconds or game.time_control or 0
    inc = game.increment_seconds or game.increment or 0
    est = seconds + (40 * inc)
    if est < 180:
        return 'bullet', 'Bullet', 'elo_bullet'
    if est < 480:
        return 'blitz', 'Blitz', 'elo_blitz'
    return 'rapid', 'Rapide', 'elo_rapid'


def _short_pgn_preview(game: Game) -> str:
    moves = list(game.moves.all().order_by('move_number')[:10])
    parts = []
    try:
        for i in range(0, len(moves), 2):
            turn_num = (i // 2) + 1
            white_san = moves[i].san_notation
            black_san = moves[i + 1].san_notation if i + 1 < len(moves) else ''
            if black_san:
                parts.append(f'{turn_num}.{white_san} {black_san}')
            else:
                parts.append(f'{turn_num}.{white_san}')
    except (IndexError, AttributeError):
        return '…'
    return ' '.join(parts) if parts else '…'


def _duration_display(game: Game) -> str:
    if not game.duration_seconds:
        return '0:00'
    m = int(game.duration_seconds) // 60
    s = int(game.duration_seconds) % 60
    return f'{m}:{s:02d}'


def _game_to_list_item(game: Game, user: LocalUser) -> dict:
    opponent = _opponent_of(game, user)
    _, _, elo_attr = _clock_format_meta(game, user)
    is_white = game.player_white_id == user.id
    elo_change = game.elo_delta_white if is_white else game.elo_delta_black
    player_elo = getattr(user, elo_attr, 1500)

    opp_dict = {
        'id': opponent.id if opponent else None,
        'username': opponent.username if opponent else 'Inconnu',
        'avatar': opponent.get_avatar_url() if opponent else '',
        'coalition': opponent.coalition if opponent else None,
        'elo': getattr(opponent, elo_attr, None) if opponent else None,
        'isBot': False,
    }

    seconds = game.time_control_seconds or game.time_control or 0
    inc = game.increment_seconds or game.increment or 0

    return {
        'id': game.id,
        'result': _result_for_user(game, user),
        'score': _score_str(game, user),
        'format': game.time_category or fmt_val or 'rapid',
        'formatLabel': (game.time_category or fmt_val or 'rapid').capitalize(),
        'date': game.started_at.isoformat() if game.started_at else None,
        'relativeDate': game.started_at.strftime('%d %b %Y') if game.started_at else 'Inconnu',
        'opponent': opp_dict,
        'moveCount': game.moves.count(),
        'duration': game.duration_seconds,
        'durationDisplay': _duration_display(game),
        'competitive': game.is_competitive,
        'gameMode': game.game_mode or 'standard',
        'termination_reason': game.termination_reason,
        'time_control_seconds': game.time_control_seconds,
        'increment_seconds': game.increment_seconds,
        'timeControl': f'{seconds}+{inc}',
        'shortPgn': _short_pgn_preview(game),
        'analysisStatus': 'pending',
        'player': {
            'username': user.username,
            'coalition': getattr(user, 'coalition', None),
            'eloAfter': player_elo,
            'eloChange': elo_change,
        },
    }


def _move_to_dict(move: Move, color: str) -> dict:
    return {
        'move_number': move.move_number,
        'uci': move.san_notation,
        'piece_played': move.piece_played,
        'time_taken_ms': move.time_taken_ms,
        'material_advantage': move.material_advantage,
        'player_id': move.player_id,
        'color': color,
    }


def _build_positions(moves_qs, white_id):
    board = chess.Board()
    positions = [board.fen()]
    for move in moves_qs:
        try:
            board.push_uci(move.san_notation)
            positions.append(board.fen())
        except Exception:
            positions.append(positions[-1])
    return positions


@require_GET
def game_history(request):
    """List finished games (+ filters payload) for the authenticated user."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    qs = Game.objects.filter(
        Q(player_white=user) | Q(player_black=user)
    ).select_related('player_white', 'player_black', 'winner')

    result_filter = request.GET.get('result')
    format_filter = request.GET.get('format')
    mode_filter = request.GET.get('mode')

    if format_filter:
        qs = qs.filter(time_category=format_filter)
    if mode_filter == 'ranked':
        qs = qs.filter(is_competitive=True)
    elif mode_filter == 'casual':
        qs = qs.filter(is_competitive=False)

    limit = min(int(request.GET.get('limit', 50)), 100)
    offset = int(request.GET.get('offset', 0))
    total = qs.count()
    games = list(qs[offset : offset + limit])

    items = [_game_to_list_item(g, user) for g in games]

    if result_filter in ('win', 'loss', 'draw'):
        items = [i for i in items if i['result'] == result_filter]

    return JsonResponse(
        {
            'games': items,
            'total': total,
            'limit': limit,
            'offset': offset,
            'filters': HISTORY_FILTERS,
            'player': {
                'username': user.username,
                'coalition': getattr(user, 'coalition', None),
                'elo_bullet': user.elo_bullet,
                'elo_blitz': user.elo_blitz,
                'elo_rapid': user.elo_rapid,
            },
            'communityPanel': COMMUNITY_PANEL,
            'puzzleRecommendations': PUZZLE_RECOMMENDATIONS,
        }
    )


@require_GET
def history_view(request):
    """Legacy alias: same payload as game_history (e.g. fetch /api/history/)."""
    return game_history(request)


@require_GET
def game_replay(request, pk):
    """Full replay data for a single finished game."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        game = Game.objects.select_related('player_white', 'player_black', 'winner').get(pk=pk)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partie introuvable'}, status=404)

    if game.player_white_id != user.id and game.player_black_id != user.id:
        return JsonResponse({'error': 'Accès non autorisé'}, status=403)

    white = game.player_white
    black = game.player_black
    white_id = white.id if white else None

    moves_qs = list(game.moves.select_related('player').order_by('move_number'))
    positions = _build_positions(moves_qs, white_id)

    moves_data = []
    for move in moves_qs:
        color = 'white' if move.player_id == white_id else 'black'
        moves_data.append(_move_to_dict(move, color))

    advantage_curve = [0]
    for m in moves_data:
        advantage_curve.append(m['material_advantage'])

    return JsonResponse(
        {
            'id': game.id,
            'result': _result_for_user(game, user),
            'score': _score_str(game, user),
            'termination_reason': game.termination_reason,
            'started_at': game.started_at.isoformat() if game.started_at else None,
            'duration_seconds': game.duration_seconds,
            'time_control_seconds': game.time_control_seconds,
            'increment_seconds': game.increment_seconds,
            'time_category': game.time_category,
            'is_competitive': game.is_competitive,
            'player_white': {
                'id': white.id if white else None,
                'username': white.username if white else 'Inconnu',
                'avatar': white.get_avatar_url() if white else '',
                'coalition': white.coalition if white else None,
                'elo': white.elo_rapid if white else None,
            },
            'player_black': {
                'id': black.id if black else None,
                'username': black.username if black else 'Inconnu',
                'avatar': black.get_avatar_url() if black else '',
                'coalition': black.coalition if black else None,
                'elo': black.elo_rapid if black else None,
            },
            'winner_id': game.winner_id,
            'moves': moves_data,
            'positions': positions,
            'advantage_curve': advantage_curve,
            'move_count': len(moves_data),
            'elo_deltas': {
                'white_delta': game.elo_delta_white,
                'black_delta': game.elo_delta_black,
                'white_rating_before': game.elo_white_before,
                'black_rating_before': game.elo_black_before,
                'white_rating_new': game.elo_white_before + game.elo_delta_white,
                'black_rating_new': game.elo_black_before + game.elo_delta_black,
            },
        }
    )


@require_GET
def game_detail_view(request, game_id):
    """Detail JSON for a game (legacy id format game-<pk> supported)."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    db_id = str(game_id).replace('game-', '', 1)
    if not db_id.isdigit():
        return JsonResponse({'error': 'Identifiant invalide'}, status=400)

    try:
        game = Game.objects.prefetch_related('moves').get(id=int(db_id))
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partie introuvable'}, status=404)

    if game.player_white_id != user.id and game.player_black_id != user.id:
        return JsonResponse({'error': 'Acces refuse'}, status=403)

    moves = game.moves.all().order_by('move_number')
    moves_data = []
    for m in moves:
        moves_data.append(
            {
                'moveNumber': m.move_number,
                'san': m.san_notation,
                'piece': m.piece_played,
                'timeSpentMs': m.time_taken_ms,
                'materialAdvantage': m.material_advantage,
                'playerId': m.player_id,
            }
        )

    white_player = game.player_white
    black_player = game.player_black

    return JsonResponse(
        {
            'id': f'game-{game.id}',
            'started_at': game.started_at.isoformat() if game.started_at else None,
            'duration_seconds': game.duration_seconds,
            'termination_reason': game.termination_reason,
            'winner_id': game.winner_id,
            'is_competitive': game.is_competitive,
            'time_category': game.time_category,
            'white_player_id': game.player_white_id,
            'black_player_id': game.player_black_id,
            'elo_deltas': {
                'white_delta': game.elo_delta_white,
                'black_delta': game.elo_delta_black,
                'white_rating_before': game.elo_white_before,
                'black_rating_before': game.elo_black_before,
                'white_rating_new': game.elo_white_before + game.elo_delta_white,
                'black_rating_new': game.elo_black_before + game.elo_delta_black,
            },
            'player_white': {
                'id': white_player.id if white_player else None,
                'username': white_player.username if white_player else 'Bot',
            },
            'player_black': {
                'id': black_player.id if black_player else None,
                'username': black_player.username if black_player else 'Bot',
            },
            'moves': moves_data,
        }
    )
