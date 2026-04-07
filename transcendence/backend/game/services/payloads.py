"""WebSocket payload builders for game state and matchmaking events."""


def build_group_game_state_event(game_state):
	"""Build Channels group_send event for game state broadcast."""
	return {
		'type': 'broadcast_game_state',
		'action': 'game_state',
		'game_state': game_state,
	}


def build_ws_game_state_payload(game_state, action='game_state'):
	"""Build WebSocket JSON payload for game state to send to client."""
	return {
		'action': action,
		'game_state': game_state,
	}


def build_ws_matchmaking_payload(event):
	"""Build WebSocket JSON payload for matchmaking events (queue_status, match_found)."""
	payload = {'action': event['action']}
	for key in ('queue_size', 'game_id', 'white_player_id', 'black_player_id', 'time_control', 'increment', 'competitive'):
		if key in event:
			payload[key] = event[key]
	return payload
