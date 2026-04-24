from django.db import transaction
from accounts.models import LocalUser
from game.models import Game, Move
from asgiref.sync import sync_to_async
import datetime
from django.utils import timezone
from game.services.elasticsearch_service import index_game_result
from game.services.rating import (
    compute_elo_delta,
    get_game_score,
    get_rating_field,
    normalize_time_category,
)

# =====================================================================
# Fonction Synchrone et Atomique (à utiliser depuis des Vues ou Consumers)
# =====================================================================

def save_game_data_atomically(game_data: dict) -> bool:
    """
    Sauvegarde l'intégralité d'une partie (Game et ses vastes Moves) en toute fin de match,
    en une seule transaction atomique pour éviter les accès multiples et la corruption.
    """
    try:
        # Le bloc transaction.atomic() garantit que si une seule erreur survient 
        # (ex: joueur introuvable ou erreur ORM), rien du tout ne sera sauvegardé (Rollback automatique).
        with transaction.atomic():
            
            # 1. Récupération des utilisateurs concernés
            white_user = LocalUser.objects.get(id=game_data['player_white_id'])
            is_self_game = str(game_data['player_white_id']) == str(game_data['player_black_id'])
            black_user = white_user if is_self_game else LocalUser.objects.get(id=game_data['player_black_id'])
            winner_user = None
            game_result = game_data.get('game_result')
            if game_data.get('winner_id'):
                winner_user = LocalUser.objects.get(id=game_data['winner_id'])
            
            # 1.5 Calcul de la date de debut
            start_ts = game_data.get('start_timestamp')
            if start_ts:
                start_dt = datetime.datetime.fromtimestamp(start_ts, tz=datetime.timezone.utc)
            else:
                start_dt = timezone.now()

            # 2. Création de l'Entité de la Partie (Game)
            game = Game.objects.create(
                player_white=white_user,
                player_black=black_user,
                winner=winner_user,
                duration_seconds=game_data.get('duration_seconds', 0),
                time_control_seconds=game_data.get('time_control_seconds'),
                increment_seconds=game_data.get('increment_seconds', 0),
                # Sync redundant fields for backward compatibility
                time_control=game_data.get('time_control_seconds'),
                increment=game_data.get('increment_seconds', 0),
                
                time_category=game_data.get('time_category', 'rapid'),
                is_competitive=bool(game_data.get('is_competitive', False)),
                is_rated=bool(game_data.get('is_rated', False)),
                game_mode=game_data.get('game_mode', 'standard'),
                termination_reason=game_data.get('termination_reason', ''),
                started_at=start_dt,
            )

            game_category = normalize_time_category(game.time_category)
            rating_field = get_rating_field(game_category)
            
            # get_game_score uses integer comparison internally if we pass integers
            white_score = get_game_score(game_result, white_user.id, white_user.id, black_user.id)
            black_score = get_game_score(game_result, black_user.id, white_user.id, black_user.id)

            white_user.games_played += 1
            if not is_self_game:
                black_user.games_played += 1

            # IDs from game_data are often strings, while user.id is int. Normalizing to str for comparison.
            winner_id_str = str(game_data.get('winner_id')) if game_data.get('winner_id') else None
            
            if winner_id_str == str(white_user.id):
                white_user.games_won += 1
                if not is_self_game:
                    black_user.games_lost += 1
            elif not is_self_game and winner_id_str == str(black_user.id):
                black_user.games_won += 1
                white_user.games_lost += 1
            elif game_result in {'draw', 'stalemate'}:
                white_user.games_draw += 1
                if not is_self_game:
                    black_user.games_draw += 1
            else:
                # Fallback (maybe game aborted?)
                pass

            white_delta, black_delta = 0, 0
            white_rating = getattr(white_user, rating_field)
            black_rating = getattr(black_user, rating_field)

            # Pas d'ELO pour les parties contre soi-même
            if game.is_competitive and not is_self_game:
                
                # Use dynamic calculation based on games played
                white_delta = compute_elo_delta(white_rating, black_rating, white_score, white_user.games_played)
                black_delta = compute_elo_delta(black_rating, white_rating, black_score, black_user.games_played)
                
                # Update user ratings
                setattr(white_user, rating_field, max(0, int(white_rating) + white_delta))
                setattr(black_user, rating_field, max(0, int(black_rating) + black_delta))
                
                # Freeze deltas and initial ratings in Game record
                game.elo_delta_white = white_delta
                game.elo_delta_black = black_delta
                game.elo_white_before = white_rating
                game.elo_black_before = black_rating
                game.save(update_fields=['elo_delta_white', 'elo_delta_black', 'elo_white_before', 'elo_black_before'])

            white_user.save(update_fields=['games_played', 'games_won', 'games_lost', 'games_draw', rating_field])
            if not is_self_game:
                black_user.save(update_fields=['games_played', 'games_won', 'games_lost', 'games_draw', rating_field])
            
            # 3. Préparation et Création en bloc de l'ensemble des Coups (Bulk Create)
            moves_to_create = []
            for move in game_data.get('moves', []):
                # CRITICAL: Normalizing player_id for move attribution
                move_player_id_str = str(move.get('player_id'))
                move_player = white_user if move_player_id_str == str(white_user.id) else black_user
                
                move_obj = Move(
                    game=game,
                    player=move_player,
                    move_number=move['move_number'],
                    san_notation=move['san_notation'],
                    piece_played=move['piece_played'],
                    time_taken_ms=move['time_taken_ms'],
                    material_advantage=move['material_advantage']
                )
                moves_to_create.append(move_obj)
            
            # Utilisation magique de bulk_create !
            # Cela exécute UNE SEULE requête d'insertion SQL pour l'entièreté des coups.
            Move.objects.bulk_create(moves_to_create)
            
            # 4. Appel au service externe pour l'indexation
            index_game_result(game_data)
            
        return True, {
            'white_delta': white_delta if game.is_competitive else 0,
            'black_delta': black_delta if game.is_competitive else 0,
            'white_rating_new': getattr(white_user, rating_field),
            'black_rating_new': getattr(black_user, rating_field),
        }

    except Exception as e:
        print(f"Erreur lors de la sauvegarde atomique de la partie : {e}")
        return False, {}

# =====================================================================
# Wrapper Asynchrone (indispensable pour vos Consumers Channels)
# =====================================================================

@sync_to_async
def async_save_full_game(game_data: dict):
    return save_game_data_atomically(game_data)

