"""Reconnect synchronization orchestrator: updates clocks and metadata for returning players."""
import time
import json
import chess
from game.services.clock import (
	apply_elapsed_for_active_turn,
	ensure_clock_fields,
	mark_timeout_if_needed,
)
from game.services.game_state import ensure_draw_fields


async def synchronize_reconnecting_player(redis_client, game_id, game_state_json):
	"""
	Synchronize game state for reconnecting player.
	Update clocks, check timeouts, ensure metadata completeness.
	Returns (updated game_state, was_updated).
	"""
	if game_state_json is None:
		return None, False

	game_state = json.loads(game_state_json)
	now_ts = time.time()
	ensure_clock_fields(game_state, now_ts)
	ensure_draw_fields(game_state)

	updated = False

	# Import locally to avoid circular imports
	from game.services.state_builder import ensure_player_metadata
	if await ensure_player_metadata(game_state):
		updated = True

	board = chess.Board(game_state['fen'])
	before_white = float(game_state.get('white_time_left', 0))
	before_black = float(game_state.get('black_time_left', 0))
	apply_elapsed_for_active_turn(game_state, board, now_ts)
	if mark_timeout_if_needed(game_state, board):
		updated = True
	if before_white != float(game_state.get('white_time_left', 0)):
		updated = True
	if before_black != float(game_state.get('black_time_left', 0)):
		updated = True

	if updated:
		await redis_client.set(game_id, json.dumps(game_state))

	return game_state, updated
