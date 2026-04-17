"""Game state builders: initial game creation and metadata enrichment."""
import chess
import time

from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)


async def build_new_game_state(white_id, black_id, time_control, increment):
	"""Create fresh game state with player profiles, coalitions, and default clock."""
	board = chess.Board()
	white_coalition = await fetch_user_coalition(white_id)
	black_coalition = await fetch_user_coalition(black_id)
	white_profile = await fetch_user_public_profile(white_id)
	black_profile = await fetch_user_public_profile(black_id)

	return {
		'fen': board.fen(),
		'status': 'active',
		'white_player_id': white_id,
		'black_player_id': black_id,
		'white_player_coalition': white_coalition,
		'black_player_coalition': black_coalition,
		'white_player_profile': white_profile,
		'black_player_profile': black_profile,
		'white_time_left': time_control,
		'black_time_left': time_control,
		'time_total': time_control,
		'increment': increment,
		'last_move_timestamp': time.time(),
		'start_timestamp': time.time(),
		'draw_offer_from_player_id': None,
		'moves': [],
	}


async def ensure_player_metadata(game_state):
	"""Fill missing player profile and coalition data; returns True if modified."""
	changed = False
	white_id = game_state.get('white_player_id')
	black_id = game_state.get('black_player_id')

	if 'white_player_coalition' not in game_state:
		game_state['white_player_coalition'] = await fetch_user_coalition(white_id)
		changed = True
	if 'black_player_coalition' not in game_state:
		game_state['black_player_coalition'] = await fetch_user_coalition(black_id)
		changed = True

	if 'white_player_profile' not in game_state or not isinstance(game_state.get('white_player_profile'), dict):
		profile = await fetch_user_public_profile(white_id)
		if profile is not None:
			game_state['white_player_profile'] = profile
			changed = True

	if 'black_player_profile' not in game_state or not isinstance(game_state.get('black_player_profile'), dict):
		profile = await fetch_user_public_profile(black_id)
		if profile is not None:
			game_state['black_player_profile'] = profile
			changed = True

	return changed
