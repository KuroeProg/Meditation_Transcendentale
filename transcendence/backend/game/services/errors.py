"""Centralized error response definitions for consistent error handling."""

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


def json_error(message):
	return {'error': message}


def game_not_found():
	return json_error(ERROR_GAME_NOT_FOUND)


def json_invalid():
	return json_error(ERROR_JSON_INVALID)


def action_unknown():
	return json_error(ERROR_ACTION_UNKNOWN)
