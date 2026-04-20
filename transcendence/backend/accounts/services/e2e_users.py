"""E2E test account seeding helpers."""

from datetime import datetime

from django.db import transaction
from django.utils import timezone

from accounts.models import Friendship, LocalUser
from chat.models import Conversation, Message
from game.models import Game, Move


DEFAULT_E2E_USERS = [
	{
		'username': 'smoke_user',
		'password': 'Smoke1234!',
		'first_name': 'Smoke',
		'last_name': 'User',
		'email': 'smoke@e2e.local',
		'coalition': 'feu',
	},
	{
		'username': 'user_a',
		'password': 'MatchA1234!',
		'first_name': 'User',
		'last_name': 'A',
		'email': 'user-a@e2e.local',
		'coalition': 'eau',
	},
	{
		'username': 'user_b',
		'password': 'MatchB1234!',
		'first_name': 'User',
		'last_name': 'B',
		'email': 'user-b@e2e.local',
		'coalition': 'terre',
	},
	{
		'username': 'user_c',
		'password': 'MatchC1234!',
		'first_name': 'User',
		'last_name': 'C',
		'email': 'user-c@e2e.local',
		'coalition': 'air',
	},
]

DEFAULT_E2E_FRIENDSHIPS = [
	('smoke_user', 'user_a', 'accepted'),
	('smoke_user', 'user_b', 'accepted'),
	('user_a', 'user_b', 'accepted'),
]

DEFAULT_E2E_CONVERSATIONS = [
	{
		'fixture_key': 'e2e-private-smoke-user-a',
		'type': 'private',
		'participants': ('smoke_user', 'user_a'),
		'message': {
			'sender': 'user_a',
			'content': 'E2E fixture conversation: smoke_user <-> user_a',
			'message_type': 'text',
		},
	},
]

DEFAULT_E2E_GAME_FIXTURES = [
	{
		'fixture_key': 'e2e-online-fixture-1',
		'white': 'user_a',
		'black': 'smoke_user',
		'winner': None,
		'time_control_seconds': 180,
		'increment_seconds': 2,
		'time_category': 'blitz',
		'is_competitive': False,
		'is_rated': False,
		'game_mode': 'standard',
		'started_at': datetime(2026, 1, 1, 12, 0, 0),
		'duration_seconds': 95,
		'moves': [
			{'player': 'user_a', 'move_number': 1, 'san': 'e4', 'piece': 'pawn', 'time_ms': 2500, 'material_advantage': 0},
			{'player': 'smoke_user', 'move_number': 2, 'san': 'e5', 'piece': 'pawn', 'time_ms': 2900, 'material_advantage': 0},
		],
	},
]


def _upsert_seed_user(seed):
	user = LocalUser.objects.filter(username=seed['username']).first()
	created = user is None
	if user is None:
		user = LocalUser(username=seed['username'])

	user.first_name = seed['first_name']
	user.last_name = seed['last_name']
	user.email = seed['email']
	user.coalition = seed['coalition']
	user.is_2fa_enabled = False
	user.is_2fa_verified = True
	user.set_password(seed['password'])
	user.save()
	return user, created


def _upsert_friendship(users_by_username, spec):
	from_username, to_username, status = spec
	from_user = users_by_username[from_username]
	to_user = users_by_username[to_username]
	friendship, created = Friendship.objects.get_or_create(
		from_user=from_user,
		to_user=to_user,
		defaults={'status': status},
	)
	if friendship.status != status:
		friendship.status = status
		friendship.save(update_fields=['status', 'updated_at'])
	return friendship, created


def _upsert_conversation_fixture(users_by_username, spec):
	conversation, created = Conversation.objects.get_or_create(
		game_id=spec['fixture_key'],
		defaults={'type': spec['type']},
	)
	if conversation.type != spec['type']:
		conversation.type = spec['type']
		conversation.save(update_fields=['type', 'updated_at'])

	participants = [users_by_username[username] for username in spec['participants']]
	conversation.participants.set(participants)

	msg_spec = spec.get('message')
	if msg_spec:
		sender = users_by_username[msg_spec['sender']]
		message, _ = Message.objects.get_or_create(
			conversation=conversation,
			sender=sender,
			content=msg_spec['content'],
			defaults={'message_type': msg_spec.get('message_type', 'text')},
		)
		message.read_by.set(participants)

	return conversation, created


def _upsert_game_fixture(users_by_username, spec):
	white = users_by_username[spec['white']]
	black = users_by_username[spec['black']]
	winner = users_by_username[spec['winner']] if spec.get('winner') else None
	started_at = timezone.make_aware(spec['started_at']) if timezone.is_naive(spec['started_at']) else spec['started_at']

	game, created = Game.objects.get_or_create(
		termination_reason=spec['fixture_key'],
		defaults={
			'player_white': white,
			'player_black': black,
			'winner': winner,
			'time_control_seconds': spec['time_control_seconds'],
			'increment_seconds': spec['increment_seconds'],
			'time_category': spec['time_category'],
			'is_competitive': spec['is_competitive'],
			'is_rated': spec['is_rated'],
			'game_mode': spec['game_mode'],
			'started_at': started_at,
			'duration_seconds': spec['duration_seconds'],
		},
	)

	if not created:
		game.player_white = white
		game.player_black = black
		game.winner = winner
		game.time_control_seconds = spec['time_control_seconds']
		game.increment_seconds = spec['increment_seconds']
		game.time_category = spec['time_category']
		game.is_competitive = spec['is_competitive']
		game.is_rated = spec['is_rated']
		game.game_mode = spec['game_mode']
		game.started_at = started_at
		game.duration_seconds = spec['duration_seconds']
		game.save()

	Move.objects.filter(game=game).delete()
	for move_spec in spec.get('moves', []):
		Move.objects.create(
			game=game,
			player=users_by_username[move_spec['player']],
			move_number=move_spec['move_number'],
			san_notation=move_spec['san'],
			piece_played=move_spec['piece'],
			time_taken_ms=move_spec['time_ms'],
			material_advantage=move_spec['material_advantage'],
		)

	return game, created


@transaction.atomic
def seed_e2e_users(seed_specs=None):
	"""Create or refresh the deterministic E2E accounts.

	Returns a dict with created and updated usernames.
	"""
	seeds = list(seed_specs or DEFAULT_E2E_USERS)
	created = []
	updated = []

	users_by_username = {}
	for seed in seeds:
		user, was_created = _upsert_seed_user(seed)
		users_by_username[seed['username']] = user
		if was_created:
			created.append(seed['username'])
		else:
			updated.append(seed['username'])

	friendships_created = []
	friendships_updated = []
	for friendship_spec in DEFAULT_E2E_FRIENDSHIPS:
		friendship, was_created = _upsert_friendship(users_by_username, friendship_spec)
		label = f"{friendship.from_user.username}->{friendship.to_user.username}:{friendship.status}"
		if was_created:
			friendships_created.append(label)
		else:
			friendships_updated.append(label)

	conversations_created = []
	conversations_updated = []
	for conversation_spec in DEFAULT_E2E_CONVERSATIONS:
		conversation, was_created = _upsert_conversation_fixture(users_by_username, conversation_spec)
		label = f"{conversation_spec['fixture_key']}#{conversation.id}"
		if was_created:
			conversations_created.append(label)
		else:
			conversations_updated.append(label)

	games_created = []
	games_updated = []
	for game_spec in DEFAULT_E2E_GAME_FIXTURES:
		game, was_created = _upsert_game_fixture(users_by_username, game_spec)
		label = f"{game_spec['fixture_key']}#{game.id}"
		if was_created:
			games_created.append(label)
		else:
			games_updated.append(label)

	return {
		'total': len(seeds),
		'created': created,
		'updated': updated,
		'friendships_created': friendships_created,
		'friendships_updated': friendships_updated,
		'conversations_created': conversations_created,
		'conversations_updated': conversations_updated,
		'games_created': games_created,
		'games_updated': games_updated,
	}
