"""E2E test account seeding helpers."""

from django.db import transaction

from accounts.models import LocalUser


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


@transaction.atomic
def seed_e2e_users(seed_specs=None):
	"""Create or refresh the deterministic E2E accounts.

	Returns a dict with created and updated usernames.
	"""
	seeds = list(seed_specs or DEFAULT_E2E_USERS)
	created = []
	updated = []

	for seed in seeds:
		_, was_created = _upsert_seed_user(seed)
		if was_created:
			created.append(seed['username'])
		else:
			updated.append(seed['username'])

	return {
		'total': len(seeds),
		'created': created,
		'updated': updated,
	}