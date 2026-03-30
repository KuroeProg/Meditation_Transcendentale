def build_group_game_state_event(game_state):
	return {
		'type': 'broadcast_game_state',
		'action': 'game_state',
		'game_state': game_state,
	}


def build_ws_game_state_payload(game_state, action='game_state'):
	return {
		'action': action,
		'game_state': game_state,
	}


def build_ws_matchmaking_payload(event):
	payload = {'action': event['action']}
	for key in ('queue_size', 'game_id', 'white_player_id', 'black_player_id'):
		if key in event:
			payload[key] = event[key]
	return payload
