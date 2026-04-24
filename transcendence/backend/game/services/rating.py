"""Rating helpers for category-based Elo updates and leaderboard selection."""

from __future__ import annotations


RATING_FIELDS = {
	'bullet': 'elo_bullet',
	'blitz': 'elo_blitz',
	'rapid': 'elo_rapid',
	'correspondence': 'elo_rapid',
}


def normalize_time_category(value, default='rapid'):
	"""Normalize a time category to one of the supported rating buckets."""
	raw = str(value or '').strip().lower()
	if raw in RATING_FIELDS:
		return raw
	return default


def get_rating_field(time_category):
	"""Return the LocalUser Elo field for the given time category."""
	return RATING_FIELDS.get(normalize_time_category(time_category), 'elo_rapid')


def compute_elo_delta(rating_a, rating_b, score_a, games_played_a=0):
	"""
	Compute an Elo delta for player A against player B.
	Uses a dynamic K-factor: 
	- 40 for new players (< 30 games) to help them find their rank fast.
	- 20 for established players.
	"""
	rating_a = float(rating_a)
	rating_b = float(rating_b)
	score_a = float(score_a)
	
	# Dynamic K-Factor
	k_factor = 40 if games_played_a < 30 else 20
	
	expected_a = 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))
	return int(round(k_factor * (score_a - expected_a)))


def get_game_score(game_result, player_id, white_id, black_id):
	"""Return 1.0, 0.5 or 0.0 for the given player."""
	if game_result in {'draw', 'stalemate'}:
		return 0.5
	if player_id == white_id and game_result == 'white':
		return 1.0
	if player_id == black_id and game_result == 'black':
		return 1.0
	return 0.0
