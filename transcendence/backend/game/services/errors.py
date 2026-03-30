"""Centralized error response definitions for consistent WebSocket error handling."""


def json_error(message):
	"""Wrap error message in WebSocket JSON format."""
	return {'error': message}


def game_not_found():
	"""Return standard game-not-found error response."""
	return json_error(ERROR_GAME_NOT_FOUND)


def json_invalid():
	"""Return standard JSON parsing error response."""
	return json_error(ERROR_JSON_INVALID)


def action_unknown():
	"""Return standard unknown-action error response."""
	return json_error(ERROR_ACTION_UNKNOWN)


# Error constants
ERROR_JSON_INVALID = 'JSON invalide'
ERROR_MATCHMAKING_UNAVAILABLE = 'Matchmaking indisponible dans cette room'
ERROR_PLAYER_ID_REQUIRED = 'player_id requis'
ERROR_ACTION_UNKNOWN = 'Action inconnue'
ERROR_GAME_NOT_FOUND = 'Partie introuvable'
ERROR_GAME_FINISHED = 'Partie terminee'
ERROR_TIMEOUT = 'Temps ecoule. La partie est terminee.'
ERROR_NOT_YOUR_TURN = "Ce n'est pas votre tour !"
ERROR_ILLEGAL_MOVE = 'Coup illégal'
ERROR_INVALID_MOVE_FORMAT = 'Le coup doit être au format UCI'
