"""Game state builders: initial game creation and metadata enrichment."""
import chess
import time

from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)


def infer_time_category(time_control, increment=0):
	"""Infer chess cadence category from initial clock and increment."""
	seconds = int(time_control)
	inc = int(increment)
	estimated_time = seconds + 40 * inc
	
	if estimated_time < 180:
		return 'bullet'
	if estimated_time < 480:
		return 'blitz'
	if estimated_time < 1500:
		return 'rapid'
	if seconds >= 86400:
		return 'correspondence'
	return 'classical'


async def build_new_game_state(white_id, black_id, time_control=600, increment=0, competitive=False):
	"""Create fresh game state with player profiles, coalitions, and default clock."""
	board = chess.Board()
	white_coalition = await fetch_user_coalition(white_id)
	black_coalition = await fetch_user_coalition(black_id)
	white_profile = await fetch_user_public_profile(white_id)
	black_profile = await fetch_user_public_profile(black_id)
	time_control = int(time_control)
	increment = int(increment)
	time_category = infer_time_category(time_control, increment)
	is_competitive = bool(competitive)

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
		'time_control_seconds': time_control,
		'increment': increment,
		'increment_seconds': increment,
		'time_category': time_category,
		'is_competitive': is_competitive,
		'is_rated': is_competitive,
		'game_mode': 'standard',
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
