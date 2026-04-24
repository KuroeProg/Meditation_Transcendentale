"""REST views for game history and replay data."""
import chess
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import LocalUser
from game.models import Game, Move


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


def _game_to_list_item(game: Game, user: LocalUser) -> dict:
    opponent = _opponent_of(game, user)
    opp_dict = {
        'id': opponent.id if opponent else None,
        'username': opponent.username if opponent else 'Inconnu',
        'avatar': opponent.get_avatar_url() if opponent else '',
        'coalition': opponent.coalition if opponent else None,
        'elo': getattr(opponent, f'elo_{game.time_category}', None) if opponent else None,
        'isBot': False,
    }
    return {
        'id': game.id,
        'result': _result_for_user(game, user),
        'score': _score_str(game, user),
        'format': game.time_category or 'rapid',
        'formatLabel': (game.time_category or 'rapid').capitalize(),
        'date': game.started_at.isoformat() if game.started_at else None,
        'opponent': opp_dict,
        'moveCount': game.moves.count(),
        'duration': game.duration_seconds,
        'competitive': game.is_competitive,
        'termination_reason': game.termination_reason,
        'time_control_seconds': game.time_control_seconds,
        'increment_seconds': game.increment_seconds,
    }


def _move_to_dict(move: Move, color: str) -> dict:
    return {
        'move_number': move.move_number,
        'uci': move.san_notation,  # stored as UCI despite field name
        'piece_played': move.piece_played,
        'time_taken_ms': move.time_taken_ms,
        'material_advantage': move.material_advantage,
        'player_id': move.player_id,
        'color': color,
    }


def _build_positions(moves_qs, white_id):
    """Replay moves on a board and return the FEN after each move."""
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
    """List of finished games for the authenticated user."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    qs = Game.objects.filter(
        Q(player_white=user) | Q(player_black=user)
    ).select_related('player_white', 'player_black', 'winner')

    # Optional filters
    result_filter = request.GET.get('result')  # win | loss | draw
    format_filter = request.GET.get('format')  # blitz | rapid | classical
    mode_filter = request.GET.get('mode')      # ranked | casual

    if format_filter:
        qs = qs.filter(time_category=format_filter)
    if mode_filter == 'ranked':
        qs = qs.filter(is_competitive=True)
    elif mode_filter == 'casual':
        qs = qs.filter(is_competitive=False)

    # Pagination
    limit = min(int(request.GET.get('limit', 20)), 100)
    offset = int(request.GET.get('offset', 0))
    total = qs.count()
    games = list(qs[offset:offset + limit])

    items = [_game_to_list_item(g, user) for g in games]

    # Apply result filter after conversion (avoids complex ORM expression)
    if result_filter in ('win', 'loss', 'draw'):
        items = [i for i in items if i['result'] == result_filter]

    return JsonResponse({
        'games': items,
        'total': total,
        'limit': limit,
        'offset': offset,
    })


@require_GET
def game_replay(request, pk):
    """Full replay data for a single finished game."""
    user, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        game = Game.objects.select_related(
            'player_white', 'player_black', 'winner'
        ).get(pk=pk)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partie introuvable'}, status=404)

    # Only the players themselves may access the replay
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

    # Cumulative advantage curve aligned with positions (one value per position)
    advantage_curve = [0]  # initial position = neutral
    for m in moves_data:
        advantage_curve.append(m['material_advantage'])

    return JsonResponse({
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
    })
