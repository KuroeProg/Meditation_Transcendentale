"""Game clock tick orchestrator: encapsulates per-second time decay and timeout checks."""
import json
import time
import chess
from game.services.clock import (
	apply_elapsed_for_active_turn,
	ensure_clock_fields,
	is_clock_running,
	is_realtime_clock_enabled,
	mark_timeout_if_needed,
)


async def tick_game_clock(redis_client, game_id, channel_name, channel_layer, room_group_name, build_event_fn):
	"""
	Tick the game clock: apply elapsed time, detect timeout, persist and broadcast.

	Returns (updated: bool, timed_out_state: dict | None).
	timed_out_state is the game state dict when a timeout was just detected this tick,
	None otherwise. The caller is responsible for triggering DB save when timed_out_state
	is not None.
	"""
	lock_key = f'clock_lock:{game_id}'
	got_lock = await redis_client.set(lock_key, channel_name, ex=2, nx=True)
	if not got_lock:
		return False, None

	game_state_json = await redis_client.get(game_id)
	if game_state_json is None:
		return False, None

	game_state = json.loads(game_state_json)
	if game_state.get('status') != 'active':
		return False, None
	if not is_realtime_clock_enabled(game_state):
		return False, None

	now_ts = time.time()
	ensure_clock_fields(game_state, now_ts)
	board = chess.Board(game_state['fen'])
	if is_clock_running(game_state):
		apply_elapsed_for_active_turn(game_state, board, now_ts)
		timed_out = mark_timeout_if_needed(game_state, board)
	else:
		timed_out = False

	# Re-read Redis before persisting: évite d'écraser un abandon (ou autre fin) arrivé
	# en concurrence (tick vs resign sur deux tâches asyncio).
	if timed_out:
		reread = await redis_client.get(game_id)
		if reread is not None:
			cur = json.loads(reread)
			if cur.get('status') != 'active':
				return False, None

	await redis_client.set(game_id, json.dumps(game_state))
	await channel_layer.group_send(room_group_name, build_event_fn(game_state))
	return True, game_state if timed_out else None
