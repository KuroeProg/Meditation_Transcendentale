from django.db import transaction
from accounts.models import LocalUser
from game.models import Game, Move
from asgiref.sync import sync_to_async
import datetime
from django.utils import timezone

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
            black_user = LocalUser.objects.get(id=game_data['player_black_id'])
            winner_user = None
            if game_data.get('winner_id'):
                winner_user = LocalUser.objects.get(id=game_data['winner_id'])
            
            # 1.5 Calcul de la date de debut
            start_ts = game_data.get('start_timestamp')
            if start_ts:
                start_dt = datetime.datetime.fromtimestamp(start_ts, tz=timezone.utc)
            else:
                start_dt = timezone.now()

            # 2. Création de l'Entité de la Partie (Game)
            game = Game.objects.create(
                player_white=white_user,
                player_black=black_user,
                winner=winner_user,
                duration_seconds=game_data.get('duration_seconds', 0),
                started_at=start_dt,
            )
            
            # Si nécessaire vous pourriez aussi overwrite started_at via game_data['started_at'] ici
            
            # 3. Préparation et Création en bloc de l'ensemble des Coups (Bulk Create)
            moves_to_create = []
            for move in game_data.get('moves', []):
                # On associe le joueur (blanc ou noir) selon l'ID
                move_player = white_user if move['player_id'] == white_user.id else black_user
                
                # Nous instancions l'objet localement sans toucher à la database à chaque boucle
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
            
        return True # Succès de la transaction !

    except Exception as e:
        # En cas d'erreur (problème d'intégrité, contraintes db etc), tout est annulé sans laisser de données corrompues.
        print(f"Erreur lors de la sauvegarde atomique de la partie : {e}")
        return False

# =====================================================================
# Wrapper Asynchrone (indispensable pour vos Consumers Channels)
# =====================================================================

@sync_to_async
def async_save_full_game(game_data: dict):
    return save_game_data_atomically(game_data)

"""
================ Exemple d'utilisation dans game_consumer.py ================

async def finalize_match(self, winner_uid, match_duration):
    # Vous rassemblez toutes vos variables gardées en mémoire / state manager :
    final_game_data = {
        'player_white_id': 1,
        'player_black_id': 2,
        'winner_id': winner_uid,
        'duration_seconds': match_duration,
        
        # Le tableau des coups de la partie depuis la RAM ou le cache
        'moves': [
            {'move_number': 1, 'player_id': 1, 'san': 'e4', 'piece': 'pawn', 'time_taken': 1500, 'advantage': 0},
            {'move_number': 2, 'player_id': 2, 'san': 'e5', 'piece': 'pawn', 'time_taken': 1200, 'advantage': 0},
            # ... (suite des tous les autres coups)
        ]
    }
    
    # Appel asynchrone final pour sauvegarder sans aucun risque (Atomique + Bulk)
    success = await async_save_full_game(final_game_data)
    
    if success:
        print("Fin de match : Stockage parfait et optimisé en Model accompli.")
    else:
        print("Alerte: Un problème est survenu et la database n'a pas été affectée.")
"""

