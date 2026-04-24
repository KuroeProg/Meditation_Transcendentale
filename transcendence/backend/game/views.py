from django.http import JsonResponse
from django.db.models import Q
from accounts.models import LocalUser
from .models import Game

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

def history_view(request):
    try:
        user, err = _get_authenticated_user(request)
        if err:
            return err
        
        uid = user.id
        games_qs = Game.objects.filter(Q(player_white_id=uid) | Q(player_black_id=uid)).order_by('-started_at')
        
        games_data = []
        
        for game in games_qs:
            wid = game.winner_id
            if wid == uid:
                result = "win"
                score = "1-0" if game.player_white_id == uid else "0-1"
            elif wid is None:
                result = "draw"
                score = "½-½"
            else:
                result = "loss"
                score = "0-1" if game.player_white_id == uid else "1-0"
                
            is_user_white = (game.player_white_id == uid)
            opponent = game.player_black if is_user_white else game.player_white
            
            # Détermination du format parmi les 3 catégories du projet
            seconds = game.time_control_seconds or game.time_control or 0
            inc = game.increment_seconds or game.increment or 0
            est = seconds + (40 * inc)
            
            if est < 180:
                format_val = 'bullet'
                format_label = 'Bullet'
                opp_elo = getattr(opponent, 'elo_bullet', 1500) if opponent else 1500
                player_elo = getattr(user, 'elo_bullet', 1500)
            elif est < 480:
                format_val = 'blitz'
                format_label = 'Blitz'
                opp_elo = getattr(opponent, 'elo_blitz', 1500) if opponent else 1500
                player_elo = getattr(user, 'elo_blitz', 1500)
            else:
                format_val = 'rapid'
                format_label = 'Rapide'
                opp_elo = getattr(opponent, 'elo_rapid', 1500) if opponent else 1500
                player_elo = getattr(user, 'elo_rapid', 1500)
            
            # Calcul du delta reel stocke
            is_white = (game.player_white_id == user.id)
            elo_change = game.elo_delta_white if is_white else game.elo_delta_black
            
            if opponent:
                opponent_data = {
                    "username": getattr(opponent, 'username', "Bot"),
                    "coalition": getattr(opponent, 'coalition', None),
                    "elo": opp_elo,
                    "isBot": False
                }
            else:
                opponent_data = {
                    "username": "Bot",
                    "coalition": None,
                    "elo": 1500,
                    "isBot": True
                }
            
            moves = game.moves.all().order_by('move_number')
            move_count = moves.count()
            short_pgn_parts = []
            
            try:
                subset = list(moves[:10])
                for i in range(0, len(subset), 2):
                    turn_num = (i // 2) + 1
                    white_san = subset[i].san_notation
                    black_san = subset[i+1].san_notation if i+1 < len(subset) else ""
                    if black_san:
                        short_pgn_parts.append(f"{turn_num}.{white_san} {black_san}")
                    else:
                        short_pgn_parts.append(f"{turn_num}.{white_san}")
            except Exception:
                short_pgn_parts = ["..."]
                    
            short_pgn = " ".join(short_pgn_parts)
            
            duration_str = "0:00"
            if game.duration_seconds:
                m = int(game.duration_seconds) // 60
                s = int(game.duration_seconds) % 60
                duration_str = f"{m}:{s:02d}"
                
            games_data.append({
                "id": f"game-{game.id}",
                "result": result,
                "score": score,
                "format": format_val,
                "formatLabel": format_label,
                "timeControl": f"{seconds}+{inc}",
                "competitive": game.is_competitive,
                "date": game.started_at.isoformat() if game.started_at else None,
                "relativeDate": game.started_at.strftime("%d %b %Y") if game.started_at else "Inconnu",
                "moveCount": move_count,
                "duration": duration_str,
                "player": {
                    "username": user.username,
                    "coalition": getattr(user, 'coalition', None),
                    "eloAfter": player_elo,
                    "eloChange": elo_change
                },
                "opponent": opponent_data,
                "shortPgn": short_pgn,
                "analysisStatus": "pending"
            })
            
        response_data = {
            "player": {
                "username": user.username,
                "coalition": getattr(user, 'coalition', None),
                "elo_bullet": user.elo_bullet,
                "elo_blitz": user.elo_blitz,
                "elo_rapid": user.elo_rapid
            },
            "games": games_data,
            "filters": {
                "formats": [
                    { "id": "all",    "label": "Tous" },
                    { "id": "bullet", "label": "Bullet" },
                    { "id": "blitz",  "label": "Blitz" },
                    { "id": "rapid",  "label": "Rapide" }
                ],
                "results": [
                    { "id": "all",  "label": "Tous" },
                    { "id": "win",  "label": "Victoires" },
                    { "id": "loss", "label": "Défaites" },
                    { "id": "draw", "label": "Nuls" }
                ],
                "modes": [
                    { "id": "all",        "label": "Tous" },
                    { "id": "ranked",     "label": "Classé" },
                    { "id": "casual",     "label": "Amical" }
                ]
            },
            "communityPanel": {
                "coalitionRank": 1,
                "globalRank": 1,
                "trophies": [
                    { "id": "first-win",   "label": "Première victoire (mock)",  "icon": "ri-trophy-line",       "earned": True  },
                    { "id": "ten-wins",    "label": "10 victoires (mock)",       "icon": "ri-sword-line",         "earned": True  },
                    { "id": "blitz-king",  "label": "Roi du Blitz (mock)",       "icon": "ri-flashlight-line",    "earned": False  },
                    { "id": "analyst",     "label": "Analyste expert (mock)",    "icon": "ri-bar-chart-2-line",   "earned": False },
                    { "id": "tournament",  "label": "Champion tournoi (mock)",   "icon": "ri-medal-line",         "earned": False }
                ],
                "activityFeed": [
                    { "id": 1, "type": "win", "username": "Système", "coalition": "feu", "text": "Bienvenue dans l'arène (mock)", "time": "À l'instant" }
                ],
                "rivalryRank": {
                    "enemyCoalition": "eau",
                    "position": 1,
                    "wins": 0, "losses": 0, "draws": 0
                }
            },
            "puzzleRecommendations": [
                { "id": "p1", "theme": "Fourchette (mock)", "difficulty": "Intermédiaire", "icon": "ri-crosshair-line" },
                { "id": "p2", "theme": "Clouage (mock)", "difficulty": "Facile", "icon": "ri-lock-line" }
            ]
        }
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({'error': f"Erreur historique: {str(e)}"}, status=500)

def game_detail_view(request, game_id):
    """Returns full details of a specific game, including all moves metadata."""
    try:
        user, err = _get_authenticated_user(request)
        if err:
            return err
        
        # strip 'game-' prefix if present from frontend ID format
        db_id = game_id.replace('game-', '')
        
        game = Game.objects.prefetch_related('moves').get(id=db_id)
        
        # Security: only players can see details (or add check if public)
        if game.player_white_id != user.id and game.player_black_id != user.id:
            return JsonResponse({'error': 'Acces refuse'}, status=403)
            
        moves = game.moves.all().order_by('move_number')
        moves_data = []
        for m in moves:
            moves_data.append({
                "moveNumber": m.move_number,
                "san": m.san_notation,
                "piece": m.piece_played,
                "timeSpentMs": m.time_taken_ms,
                "materialAdvantage": m.material_advantage,
                "playerId": m.player_id
            })
            
        # Basic stats summary
        white_player = game.player_white
        black_player = game.player_black
        
        return JsonResponse({
            "id": f"game-{game.id}",
            "started_at": game.started_at.isoformat() if game.started_at else None,
            "duration_seconds": game.duration_seconds,
            "termination_reason": game.termination_reason,
            "winner_id": game.winner_id,
            "is_competitive": game.is_competitive,
            "time_category": game.time_category,
            "white_player_id": game.player_white_id,
            "black_player_id": game.player_black_id,
            "elo_deltas": {
                "white_delta": game.elo_delta_white,
                "black_delta": game.elo_delta_black,
                "white_rating_before": game.elo_white_before,
                "black_rating_before": game.elo_black_before,
                "white_rating_new": game.elo_white_before + game.elo_delta_white,
                "black_rating_new": game.elo_black_before + game.elo_delta_black,
            },
            "player_white": {
                "id": white_player.id if white_player else None,
                "username": white_player.username if white_player else "Bot",
            },
            "player_black": {
                "id": black_player.id if black_player else None,
                "username": black_player.username if black_player else "Bot",
            },
            "moves": moves_data
        })
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partie introuvable'}, status=404)
    except Exception as e:
        return JsonResponse({'error': f"Erreur interne: {str(e)}"}, status=500)
