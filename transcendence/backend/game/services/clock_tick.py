"""Game clock tick orchestrator: encapsulates per-second time decay and timeout checks."""
import json
import time
import chess
from game.services.clock import (
	apply_elapsed_for_active_turn,
	ensure_clock_fields,
	mark_timeout_if_needed,
)


async def tick_game_clock(redis_client, game_id, channel_name, channel_layer, room_group_name, build_event_fn):
	"""
	Tick the game clock: apply elapsed time, detect timeout, persist and broadcast.
	Returns True if state was updated and broadcast occurred.
	"""
	lock_key = f'clock_lock:{game_id}'
	got_lock = await redis_client.set(lock_key, channel_name, ex=2, nx=True)
	if not got_lock:
		return False

	game_state_json = await redis_client.get(game_id)
	if game_state_json is None:
		return False

	game_state = json.loads(game_state_json)
	if game_state.get('status') != 'active':
		return False

	now_ts = time.time()
	ensure_clock_fields(game_state, now_ts)
	board = chess.Board(game_state['fen'])
	apply_elapsed_for_active_turn(game_state, board, now_ts)
	mark_timeout_if_needed(game_state, board)

	await redis_client.set(game_id, json.dumps(game_state))
	await channel_layer.group_send(room_group_name, build_event_fn(game_state))
	return True
