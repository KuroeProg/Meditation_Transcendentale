def ensure_clock_fields(game_state, now_ts):
    if 'white_time_left' not in game_state:
        game_state['white_time_left'] = 600
    if 'black_time_left' not in game_state:
        game_state['black_time_left'] = 600
    if 'last_move_timestamp' not in game_state:
        game_state['last_move_timestamp'] = now_ts


def apply_elapsed_for_active_turn(game_state, board, now_ts):
    if game_state.get('status') != 'active':
        return

    last_ts = float(game_state.get('last_move_timestamp', now_ts))
    elapsed = max(0.0, now_ts - last_ts)
    if elapsed <= 0:
        return

    if board.turn:
        key = 'white_time_left'
    else:
        key = 'black_time_left'

    remaining = max(0.0, float(game_state.get(key, 0)) - elapsed)
    game_state[key] = remaining
    game_state['last_move_timestamp'] = now_ts


def mark_timeout_if_needed(game_state, board):
    if game_state.get('status') != 'active':
        return False

    turn_key = 'white_time_left' if board.turn else 'black_time_left'
    remaining = float(game_state.get(turn_key, 0))
    if remaining > 0:
        return False

    winner_id = game_state['black_player_id'] if board.turn else game_state['white_player_id']
    game_state['status'] = 'timeout'
    game_state['winner_player_id'] = winner_id
    game_state['result'] = '1-0' if winner_id == game_state['white_player_id'] else '0-1'
    return True
