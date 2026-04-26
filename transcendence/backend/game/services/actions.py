"""Game action mutations: move, resign, draw offer/response with validation."""
import time

import chess

from game.services.clock import is_clock_running
from game.services.game_state import (
	clear_draw_offer,
	ensure_draw_fields,
	get_other_player_id,
	is_player_in_game,
	normalize_player_id,
	update_game_status,
)


def apply_play_move(game_state, sender_id, attempted_move):
	"""Apply a move to game state, validating legality and turn.
	
	Returns (success, error_message).
	"""
	if game_state.get('status') != 'active':
		return False, 'Partie terminee'

	board = chess.Board(game_state['fen'])
	current_turn_player_id = game_state['white_player_id'] if board.turn else game_state['black_player_id']
	sender_id = normalize_player_id(sender_id)
	current_turn_player_id = normalize_player_id(current_turn_player_id)
	if sender_id != current_turn_player_id:
		return False, "Ce n'est pas votre tour !"

	if not isinstance(attempted_move, str):
		return False, 'Le coup doit être au format UCI'

	attempted_move = attempted_move.strip().lower()
	try:
		move = chess.Move.from_uci(attempted_move)
	except ValueError:
		return False, 'Format de coup invalide'

	if move not in board.legal_moves:
		return False, 'Coup illégal'

	# Incrément seulement quand le chrono « principal » tourne (après 2 demi-coups),
	# sinon le 2e coup (ex. …d5) ajoute +inc aux noirs sans décompte → affichage > temps de base.
	increment = int(game_state.get('increment_seconds', game_state.get('increment', 0)) or 0)
	if increment and is_clock_running(game_state):
		if board.turn == chess.WHITE:
			game_state['white_time_left'] += increment
		else:
			game_state['black_time_left'] += increment

	board.push(move)
	game_state['fen'] = board.fen()
	game_state['last_move_uci'] = attempted_move
	now = time.time()
	game_state['last_move_timestamp'] = now
	game_state['turn_start_timestamp'] = now
	clear_draw_offer(game_state)
	update_game_status(game_state, board)
	return True, None


def apply_resign(game_state, sender_id):
	"""Record player resignation and set winner.
	
	Returns (success, error_message).
	"""
	ensure_draw_fields(game_state)
	if game_state.get('status') != 'active':
		return False, 'Partie terminee'

	sender_id = normalize_player_id(sender_id)
	if sender_id is None or not is_player_in_game(sender_id, game_state):
		return False, 'Joueur invalide pour cette partie'

	winner_id = get_other_player_id(sender_id, game_state)
	if winner_id is None:
		return False, 'Impossible de determiner le vainqueur'

	game_state['status'] = 'resigned'
	game_state['winner_player_id'] = winner_id
	white_id = normalize_player_id(game_state.get('white_player_id'))
	game_state['result'] = '1-0' if winner_id == white_id else '0-1'
	clear_draw_offer(game_state)
	return True, None


def apply_draw_offer(game_state, sender_id):
	"""Register a draw offer from sender.
	
	Returns (success, error_message).
	"""
	ensure_draw_fields(game_state)
	if game_state.get('status') != 'active':
		return False, 'Partie terminee'

	sender_id = normalize_player_id(sender_id)
	if sender_id is None or not is_player_in_game(sender_id, game_state):
		return False, 'Joueur invalide pour cette partie'

	if game_state.get('draw_offer_from_player_id') is not None:
		return False, 'Une proposition de nulle est deja en cours'

	game_state['draw_offer_from_player_id'] = sender_id
	return True, None


def apply_draw_response(game_state, sender_id, accept_raw, response_raw):
	"""Respond to pending draw offer with acceptance or rejection.
	
	Returns (success, error_message).
	"""
	ensure_draw_fields(game_state)
	if game_state.get('status') != 'active':
		return False, 'Partie terminee'

	offer_from = normalize_player_id(game_state.get('draw_offer_from_player_id'))
	if offer_from is None:
		return False, 'Aucune proposition de nulle en cours'

	sender_id = normalize_player_id(sender_id)
	if sender_id is None or not is_player_in_game(sender_id, game_state):
		return False, 'Joueur invalide pour cette partie'

	if sender_id == offer_from:
		return False, 'Vous ne pouvez pas repondre a votre propre proposition'

	if isinstance(accept_raw, bool):
		accept = accept_raw
	else:
		accept = str(response_raw or '').lower() in ('accept', 'accepted', 'yes', 'true', '1')

	if accept:
		game_state['status'] = 'draw'
		game_state['winner_player_id'] = None
		game_state['result'] = '1/2-1/2'

	clear_draw_offer(game_state)
	return True, None
