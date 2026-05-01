import os
import re
import math
import json
from elasticsearch import Elasticsearch
from django.conf import settings

es = Elasticsearch(
    "https://elasticsearch:9200",
    ca_certs="/etc/certs_elastic/elasticsearch.crt",
    basic_auth=("elastic", settings.ELASTIC_PASSWORD),
)

def index_game_result(game_data, game_id=None):
    try:
        # On crée un document "propre" pour l'analyse

        winner_id = str(game_data.get('winner_id')) if game_data.get('winner_id') is not None else None
        white_id = str(game_data.get('player_white_id'))
        black_id = str(game_data.get('player_black_id'))
        is_draw = (winner_id is None)

        winner_side = "draw"
        if not is_draw:
            if winner_id == white_id:
                winner_side = "white"
            elif winner_id == black_id:
                winner_side = "black"
            else:
                # Sécurité au cas où l'ID ne correspond à personne
                winner_side = "unknown"

        doc = {
            "player_white_id": white_id,
            "player_black_id": black_id,
            "winner_id": winner_id,
            "winner_side": winner_side,
            "is_draw": is_draw,
            "duration_seconds": game_data.get('duration_seconds'),
            "time_control": game_data.get('time_control'),
            "increment": game_data.get('increment'),
            "time_category": game_data.get('time_category', 'rapid'),
            "timestamp": game_data.get('start_timestamp'),
            "elo_white_before": game_data.get('elo_white_before', 1000),
            "elo_black_before": game_data.get('elo_black_before', 1000),
            "total_moves": len(game_data.get('moves', [])),
            "moves": game_data.get('moves', [])
        }
        
        # On indexe dans 'chess-games'
        # Si game_id est fourni, on l'utilise comme ID de document
        if game_id:
            response = es.index(index="chess-games", id=str(game_id), document=doc)
        else:
            response = es.index(index="chess-games", document=doc)
            
        print(f"Propagé vers Elasticsearch : {response['result']} (ID: {response.get('_id')})")
        return True
    except Exception as e:
        print(f"Erreur d'indexation Elasticsearch : {e}")
        return False

def index_game_instance(game_instance):
    """
    Sérialise une instance de modèle Game (Django) et l'envoie vers Elasticsearch.
    Utile pour la resynchronisation et la vérification d'intégrité.
    """
    try:
        moves = list(game_instance.moves.all().order_by('move_number'))
        game_data = {
            'player_white_id': game_instance.player_white.id if game_instance.player_white else None,
            'player_black_id': game_instance.player_black.id if game_instance.player_black else None,
            'winner_id': game_instance.winner.id if game_instance.winner else None,
            'duration_seconds': game_instance.duration_seconds,
            'time_control': game_instance.time_control,
            'increment': game_instance.increment,
            'time_category': game_instance.time_category,
            'start_timestamp': game_instance.started_at.timestamp(),
            'elo_white_before': game_instance.elo_white_before,
            'elo_black_before': game_instance.elo_black_before,
            'moves': [
                {
                    'player_id': move.player.id if move.player else None,
                    'move_number': move.move_number,
                    'san_notation': move.san_notation,
                    'piece_played': move.piece_played,
                    'time_taken_ms': move.time_taken_ms,
                    'material_advantage': move.material_advantage
                }
                for move in moves
            ]
        }
        return index_game_result(game_data, game_id=game_instance.id)
    except Exception as e:
        print(f"Erreur lors de la sérialisation de la partie {game_instance.id} pour ES : {e}")
        return False

def get_player_stats(player_id, category='rapid', limit='all'):
    """
    Récupère les statistiques agrégées pour un joueur depuis Elasticsearch.
    C'est le côté 'Read' (Query) de notre architecture CQRS.
    """
    pid_str = str(player_id)
    
    must_conditions = [{"term": {"time_category": category}}]
    
    if limit != 'all':
        try:
            limit_num = int(limit)
            res = es.search(index="chess-games", body={
                "size": limit_num,
                "sort": [{"timestamp": "desc"}],
                "_source": False,
                "query": {
                    "bool": {
                        "must": [{"term": {"time_category": category}}],
                        "should": [
                            {"term": {"player_white_id": pid_str}},
                            {"term": {"player_black_id": pid_str}}
                        ],
                        "minimum_should_match": 1
                    }
                }
            })
            recent_ids = [hit['_id'] for hit in res.get('hits', {}).get('hits', [])]
            if recent_ids:
                must_conditions.append({"ids": {"values": recent_ids}})
            else:
                must_conditions.append({"ids": {"values": ["none_existent"]}})
        except ValueError:
            pass

    query = {
        "size": 0,
        "aggs": {
            "mine": {
                "filter": {
                    "bool": {
                        "must": must_conditions,
                        "should": [
                            {"term": {"player_white_id": pid_str}},
                            {"term": {"player_black_id": pid_str}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                "aggs": {
                    "total_games": {"value_count": {"field": "timestamp"}},
                    "avg_duration": {"avg": {"field": "duration_seconds"}},
                    # Personal Piece Proportions (forced toString for ID safety)
                    "count_pawn": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='pawn')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "count_knight": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='knight')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "count_bishop": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='bishop')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "count_rook": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='rook')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "count_queen": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='queen')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "count_king": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.player_id!=null && m.player_id.toString()==params.pid){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='king')c++;}}}} return t>0 ? c/t : 0;", "params": {"pid": pid_str}}}},
                    "wins": {"filter": {"term": {"winner_id": pid_str}}},
                    "draws": {"filter": {"term": {"is_draw": True}}},
                    "games_white": {"filter": {"term": {"player_white_id": pid_str}}},
                    "wins_white": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {"player_white_id": pid_str}},
                                    {"term": {"winner_id": pid_str}}
                                ]
                            }
                        }
                    },
                    "draws_white": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {"player_white_id": pid_str}},
                                    {"term": {"is_draw": True}}
                                ]
                            }
                        }
                    },
                    "games_black": {"filter": {"term": {"player_black_id": pid_str}}},
                    "wins_black": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {"player_black_id": pid_str}},
                                    {"term": {"winner_id": pid_str}}
                                ]
                            }
                        }
                    },
                    "draws_black": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"term": {"player_black_id": pid_str}},
                                    {"term": {"is_draw": True}}
                                ]
                            }
                        }
                    }
                }
            },
            "everyone": {
                "filter": {"term": {"time_category": category}},
                "aggs": {
                    "total_games": {"value_count": {"field": "timestamp"}},
                    "avg_speed": {"avg": {"field": "moves.time_taken_ms"}},
                    # Global Piece Proportions (Community weighted profile)
                    "count_pawn": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='pawn')c++;}}} return t>0 ? c/t : 0;"}}},
                    "count_knight": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='knight')c++;}}} return t>0 ? c/t : 0;"}}},
                    "count_bishop": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='bishop')c++;}}} return t>0 ? c/t : 0;"}}},
                    "count_rook": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='rook')c++;}}} return t>0 ? c/t : 0;"}}},
                    "count_queen": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='queen')c++;}}} return t>0 ? c/t : 0;"}}},
                    "count_king": {"sum": {"script": {"source": "double t=0; double c=0; if(params._source.moves!=null){for(m in params._source.moves){if(m.piece_played!=null && m.piece_played!='unknown'){t++; if(m.piece_played=='king')c++;}}} return t>0 ? c/t : 0;"}}},
                    "wins_white": {"filter": {"term": {"winner_side": "white"}}},
                    "wins_black": {"filter": {"term": {"winner_side": "black"}}},
                    "draws": {"filter": {"term": {"winner_side": "draw"}}},
                    "draws_white": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"exists": {"field": "player_white_id"}},
                                    {"term": {"winner_side": "draw"}}
                                ]
                            }
                        }
                    },
                    "draws_black": {
                        "filter": {
                            "bool": {
                                "must": [
                                    {"exists": {"field": "player_black_id"}},
                                    {"term": {"winner_side": "draw"}}
                                ]
                            }
                        }
                    }
                }
            }
        }
    }
    try:
        response = es.search(index="chess-games", body=query)
        aggs = response.get('aggregations', {})
        
        # --- CALCULATE GLOBAL AVG SPEED ---
        global_all_data = aggs.get('everyone', {})
        g_avg_ms = global_all_data.get('avg_speed', {}).get('value')
        global_avg_sec = round(g_avg_ms / 1000, 2) if g_avg_ms else 5.0
        
        # --- DONNES PERSONNELLES ---
        my_data = aggs.get('mine', {})
        total_mine = my_data.get('total_games', {}).get('value', 0)
        avg_val = my_data.get('avg_duration', {}).get('value')
        my_avg_speed = my_data.get('avg_speed', {}).get('value')
        my_avg_speed_sec = round(my_avg_speed / 1000, 2) if my_avg_speed else 0
        g_white = my_data.get('games_white', {}).get('doc_count', 0)
        g_black = my_data.get('games_black', {}).get('doc_count', 0)

        wr_global_mine = round((my_data.get('wins', {}).get('doc_count', 0) / total_mine * 100), 1) if total_mine > 0 else 0
        wr_white_mine = round((my_data.get('wins_white', {}).get('doc_count', 0) / g_white * 100), 1) if g_white > 0 else 0
        wr_black_mine = round((my_data.get('wins_black', {}).get('doc_count', 0) / g_black * 100), 1) if g_black > 0 else 0
        
        dr_global_mine = round((my_data.get('draws', {}).get('doc_count', 0) / total_mine * 100), 1) if total_mine > 0 else 0
        dr_white_mine = round((my_data.get('draws_white', {}).get('doc_count', 0) / g_white * 100), 1) if g_white > 0 else 0
        dr_black_mine = round((my_data.get('draws_black', {}).get('doc_count', 0) / g_black * 100), 1) if g_black > 0 else 0

        # --- DONNEES GLOBALES (ALL PLAYERS) ---
        all_data = aggs.get('everyone', {})
        total_all = all_data.get('total_games', {}).get('value', 0)
        
        # Global Winrate (Avg seat winrate)
        wr_white_all = round((all_data.get('wins_white', {}).get('doc_count', 0) / total_all * 100), 1) if total_all > 0 else 0
        wr_black_all = round((all_data.get('wins_black', {}).get('doc_count', 0) / total_all * 100), 1) if total_all > 0 else 0
        wr_global_all = round((wr_white_all + wr_black_all) / 2, 1) if total_all > 0 else 50.0
        
        # Global Drawrates
        dr_global_all = round((all_data.get('draws', {}).get('doc_count', 0) / total_all * 100), 1) if total_all > 0 else 0
        dr_white_all = round((all_data.get('draws_white', {}).get('doc_count', 0) / total_all * 100), 1) if total_all > 0 else 0
        dr_black_all = round((all_data.get('draws_black', {}).get('doc_count', 0) / total_all * 100), 1) if total_all > 0 else 0



        # --- FORMAT PIECE PREFERENCE (Average of percentages across valid data) ---
        def extract_piece_preference(source_data):
            pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
            ratios = {}
            total_sum_ratios = 0
            
            # On récupère d'abord les sommes brutes de ratios de chaque pièce
            for p in pieces:
                val = source_data.get(f"count_{p}", {}).get('value', 0)
                ratios[p] = val
                total_sum_ratios += val
            
            # On normalise pour que la somme fasse exactement 100%
            res = {}
            current_sum = 0
            for p in pieces:
                if total_sum_ratios > 0:
                    val = round((ratios[p] / total_sum_ratios) * 100, 1)
                    res[p] = val
                    current_sum += val
                else:
                    res[p] = 0

            if current_sum != 100.0 and current_sum > 0:
                diff = round(100.0 - current_sum, 1)
                res['pawn'] = round(res['pawn'] + diff, 1)
                
            return res

        my_piece_usage = extract_piece_preference(my_data)
        all_piece_usage = extract_piece_preference(all_data)

        my_wins = my_data.get('wins', {}).get('doc_count', 0)
        my_draws = my_data.get('draws', {}).get('doc_count', 0)
        my_losses = total_mine - my_wins - my_draws

        return {
            "total_games": total_mine,
            "avg_duration": round(avg_val, 1) if avg_val is not None else 0,
            "avg_thinking_time": my_avg_speed_sec,
            "wins": my_wins,
            "draws": my_draws,
            "losses": my_losses,
            "wins_white": my_data.get('wins_white', {}).get('doc_count', 0),
            "wins_black": my_data.get('wins_black', {}).get('doc_count', 0),
            
            "winrate_global": wr_global_mine,
            "winrate_white": wr_white_mine,
            "winrate_black": wr_black_mine,
            
            "drawrate_global": dr_global_mine,
            "drawrate_white": dr_white_mine,
            "drawrate_black": dr_black_mine,
            
            "games_white": g_white,
            "games_black": g_black,
            
            "all_players_winrate_global": wr_global_all,
            "all_players_winrate_white": wr_white_all,
            "all_players_winrate_black": wr_black_all,
            "all_players_drawrate_global": dr_global_all,
            "all_players_drawrate_white": dr_white_all,
            "all_players_drawrate_black": dr_black_all,
            
            "piece_usage": my_piece_usage,
            "all_players_piece_usage": all_piece_usage,

            "performance_history": get_performance_history(player_id, global_avg_sec, category, limit)
        }
    except Exception as e:
        print(f"Erreur de lecture Elasticsearch (Stats) : {e}")
        return {}


def get_performance_history(player_id, global_avg_sec=5.0, category='rapid', limit='all'):
    """
    Renvoie deux listes : 
    1. move_speed_history : tous les coups individuels (pour la vitesse).
    2. game_advantage_history : l'avantage final de chaque partie (pour le matériel).
    """
    pid_str = str(player_id)

    query_size = 50
    if limit != 'all':
        try:
            query_size = int(limit)
        except ValueError:
            pass

    query = {
        "size": query_size,
        "query": {
            "bool": {
                "must": [
                    {"term": {"time_category": category}}
                ],
                "should": [
                    {"term": {"player_white_id": pid_str}},
                    {"term": {"player_black_id": pid_str}}
                ],
                "minimum_should_match": 1
            }
        },
        "sort": [{"timestamp": "desc"}]
    }
    try:
        response = es.search(index="chess-games", body=query)
        hits = response.get('hits', {}).get('hits', [])
        hits.reverse() # On inverse pour avoir l'ordre chronologique (asc) sur le graphe
        
        print(f"[AUDIT] {len(hits)} parties trouvées pour l'analyse analytique complète.")
        
        move_speed_history = []
        speed_by_rank = {} # index -> {sum, count} pour la moyenne globale par coup
        game_advantage_history = []
        
        opening_times = []
        comeback_potential_games = 0
        comeback_success_games = 0
        all_advantages_flattened = []
        captured_squares = {}
        moves_in_wins = []
        moves_in_losses = []

        # --- Variables Intelligence (ELO, Tilt, Blunders) ---
        current_elo = 1000
        peak_elo = 1000
        highest_elo_defeated = 0
        elo_history = []
        total_blunders = 0
        total_player_moves = 0
        
        tilt_games = 0
        tilt_wins = 0
        last_game_was_loss = False
        last_game_end_ts = 0

        # --- Variables Fin de partie ---
        endgame_times = []
        last_game_duration = 0
        last_game_avg_speed = 0

        for i, hit in enumerate(hits):
            game = hit.get('_source', {})
            moves = game.get('moves', [])
            is_winner = str(game.get('winner_id')) == pid_str
            is_draw = game.get('is_draw', False)
            player_is_black = str(game.get('player_black_id')) == pid_str
            
            # 0. ELO Tracker
            if is_winner:
                current_elo += 25
                opponent_elo = game.get('elo_white_before', 1000) if player_is_black else game.get('elo_black_before', 1000)
                highest_elo_defeated = max(highest_elo_defeated, opponent_elo)
            elif is_draw:
                current_elo += 5
            else:
                current_elo -= 20
            peak_elo = max(peak_elo, current_elo)
            elo_history.append({
                "game": i + 1,
                "player": current_elo,
                "allPlayers": 1500 # Moyenne théorique
            })

            # 0.5 TILT Tracker (si joué moins de 30min après une défaite)
            start_ts = game.get('timestamp', 0)
            if last_game_was_loss and start_ts > 0 and (start_ts - last_game_end_ts) < 1800:
                tilt_games += 1
                if is_winner:
                    tilt_wins += 1
            
            last_game_was_loss = not is_winner and not is_draw
            last_game_end_ts = start_ts + game.get('duration_seconds', 0)

            # 1. Avantage relatif et Volatilité
            game_advantages = []
            has_major_disadvantage = False
            
            rel_adv_prev = 0
            for m in moves:
                adv = m.get('material_advantage', 0)
                rel_adv = -adv if player_is_black else adv
                game_advantages.append(rel_adv)
                all_advantages_flattened.append(rel_adv)
                
                # Killing Zone & Aggression Detection 
                # On utilise le delta d'avantage car le format stocké est UCI (pas de 'x')
                if str(m.get('player_id')) == pid_str:
                    total_player_moves += 1
                    delta = rel_adv - rel_adv_prev
                    
                    # 1. Détection de Gaffe (Chute de plus de 2 points)
                    if delta < -2.0:
                        total_blunders += 1
                    
                    # 2. Détection de Capture/Aggression (Gain de 1 point ou plus)
                    if delta >= 1.0:
                        # On extrait la case de destination depuis l'UCI (ex: e4d5 -> d5)
                        uci = m.get('san_notation', '')
                        if uci and len(uci) >= 4:
                            sq = uci[2:4]
                            captured_squares[sq] = captured_squares.get(sq, 0) + 1
                
                if rel_adv <= -3:
                    has_major_disadvantage = True
                
                rel_adv_prev = rel_adv

                if m.get('move_number', 0) <= 10 and str(m.get('player_id')) == pid_str:
                    opening_times.append(m.get('time_taken_ms', 0))

            if has_major_disadvantage:
                comeback_potential_games += 1
                if is_winner:
                    comeback_success_games += 1

            if is_winner:
                moves_in_wins.append(len(moves))
            elif game.get('winner_id') is not None:
                moves_in_losses.append(len(moves))

            # --- 1. AVANTAGE (Dernières parties pour le graph) ---
            final_adv = game_advantages[-1] if game_advantages else 0
            game_advantage_history.append({
                "game_index": i + 1,
                "advantage": final_adv,
                "allPlayers": 0 
            })
            
            # --- 2. VITESSE (Agrégation par index de coup pour le profil moyen) ---
            game_player_moves = []
            player_move_in_game_index = 0
            for m in moves:
                if str(m.get('player_id')) == pid_str:
                    player_move_in_game_index += 1
                    duration_ms = m.get('time_taken_ms', 0)
                    
                    if player_move_in_game_index not in speed_by_rank:
                        speed_by_rank[player_move_in_game_index] = {"sum": 0, "count": 0}
                    speed_by_rank[player_move_in_game_index]["sum"] += duration_ms
                    speed_by_rank[player_move_in_game_index]["count"] += 1
                    
                    game_player_moves.append(duration_ms)
            
            # --- 3. METRIQUES DERNIERE PARTIE ---
            if i == len(hits) - 1:
                last_game_duration = game.get('duration_seconds', 0)
                last_game_avg_speed = (sum(game_player_moves) / len(game_player_moves)) if game_player_moves else 0
                
            # --- 4. ENDGAME SPEED (Derniers 5 coups du joueur dans chaque partie) ---
            if len(game_player_moves) > 5:
                endgame_times.extend(game_player_moves[-5:])
            elif game_player_moves:
                endgame_times.extend(game_player_moves)
            
        # --- RECONSTRUCTION DE MOVE_SPEED_HISTORY (Profil Moyen) ---
        for rank in sorted(speed_by_rank.keys()):
            avg_ms = speed_by_rank[rank]["sum"] / speed_by_rank[rank]["count"]
            move_speed_history.append({
                "move_index": rank,
                "speed": round(avg_ms / 1000, 2),
                "allPlayersSpeed": global_avg_sec # On garde la moyenne globale pour la ligne de base
            })

        # --- CALCUL DES AGGREGATIONS FINALES ---
        
        avg_opening_ms = sum(opening_times) / len(opening_times) if opening_times else 0
        avg_endgame_ms = sum(endgame_times) / len(endgame_times) if endgame_times else 0
        comeback_rate = (comeback_success_games / comeback_potential_games * 100) if comeback_potential_games > 0 else 0
        
        volatility = 0
        if all_advantages_flattened:
            mean_adv = sum(all_advantages_flattened) / len(all_advantages_flattened)
            variance = sum((x - mean_adv) ** 2 for x in all_advantages_flattened) / len(all_advantages_flattened)
            volatility = math.sqrt(variance)

        best_sq = max(captured_squares, key=captured_squares.get) if captured_squares else "None"
        avg_win_len = sum(moves_in_wins) / len(moves_in_wins) if moves_in_wins else 0
        avg_loss_len = sum(moves_in_losses) / len(moves_in_losses) if moves_in_losses else 0

        blunder_ratio = (total_blunders / total_player_moves * 100) if total_player_moves > 0 else 0
        tilt_winrate = (tilt_wins / tilt_games * 100) if tilt_games > 0 else 0
        
        # Aggression vs Defense (Hébdomadaire/Echantillon)
        # Ratio de captures par coup
        total_captures = sum(captured_squares.values())
        aggro_score = round((total_captures / total_player_moves * 10), 1) if total_player_moves > 0 else 5.0
        def_score = round(10.0 - aggro_score, 1)

        return {
            "move_speed_history": move_speed_history[-100:],
            "game_advantage_history": game_advantage_history[-20:], # On garde les 20 plus récents
            "elo_history": elo_history[-50:],
            "advanced": {
                "opening_speed": round(avg_opening_ms / 1000, 2),
                "endgame_speed": round(avg_endgame_ms / 1000, 2),
                "last_game_duration": last_game_duration,
                "last_game_avg_speed": round(last_game_avg_speed / 1000, 2),
                "comeback_rate": round(comeback_rate, 1),
                "volatility": round(volatility, 2),
                "killing_zone": best_sq,
                "win_len": round(avg_win_len, 1),
                "loss_len": round(avg_loss_len, 1),
                "elo": current_elo,
                "peak_elo": peak_elo,
                "highest_elo_defeated": highest_elo_defeated if highest_elo_defeated > 0 else "N/A",
                "blunder_ratio": round(blunder_ratio, 1),
                "tilt_winrate": round(tilt_winrate, 1),
                "aggression_defensive": f"Agg: {aggro_score} / Def: {def_score}"
            }
        }
    except Exception as e:
        print(f"[AUDIT] Erreur extraction performance history : {e}")
        return {"move_speed_history": [], "game_advantage_history": []}
