"""Game state rules and validation: draw state, players, game status, board rules."""


def ensure_draw_fields(game_state):
	"""Ensure draw offer tracking field exists in game state."""
	if 'draw_offer_from_player_id' not in game_state:
		game_state['draw_offer_from_player_id'] = None


def clear_draw_offer(game_state):
	"""Clear any pending draw offer."""
	game_state['draw_offer_from_player_id'] = None


def normalize_player_id(player_id):
	"""Convert player ID to string or None."""
	if player_id is None:
		return None
	return str(player_id)


def normalize_game_player_ids(game_state):
	"""Extract and normalize white and black player IDs from game state."""
	white_id = normalize_player_id(game_state.get('white_player_id'))
	black_id = normalize_player_id(game_state.get('black_player_id'))
	return white_id, black_id


def is_player_in_game(sender_id, game_state):
	"""Check if a player is participating in this game."""
	white_id, black_id = normalize_game_player_ids(game_state)
	return sender_id == white_id or sender_id == black_id


def get_other_player_id(sender_id, game_state):
	"""Get opponent's player ID given sender's ID."""
	white_id, black_id = normalize_game_player_ids(game_state)
	if sender_id == white_id:
		return black_id
	if sender_id == black_id:
		return white_id
	return None


def update_game_status(game_state, board):
	"""Evaluate board and set game status based on chess rules (checkmate, stalemate, draw, etc)."""
	if board.is_checkmate():
		winner_id = game_state['black_player_id'] if board.turn else game_state['white_player_id']
		game_state['status'] = 'checkmate'
		game_state['winner_player_id'] = winner_id
		game_state['result'] = '1-0' if winner_id == game_state['white_player_id'] else '0-1'
		return

	if board.is_stalemate():
		game_state['status'] = 'stalemate'
		game_state['winner_player_id'] = None
		game_state['result'] = '1/2-1/2'
		return

	is_draw = (
		board.is_insufficient_material()
		or board.is_fivefold_repetition()
		or board.is_seventyfive_moves()
		or board.can_claim_threefold_repetition()
		or board.can_claim_fifty_moves()
	)
	if is_draw:
		game_state['status'] = 'draw'
		game_state['winner_player_id'] = None
		game_state['result'] = '1/2-1/2'
		return

	game_state['status'] = 'active'
	game_state['winner_player_id'] = None
	game_state['result'] = '*'
