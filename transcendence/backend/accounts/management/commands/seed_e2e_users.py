from django.core.management.base import BaseCommand

from accounts.services.e2e_users import seed_e2e_users


class Command(BaseCommand):
	help = 'Create or refresh deterministic E2E test users.'

	def handle(self, *args, **options):
		result = seed_e2e_users()
		created = ', '.join(result['created']) if result['created'] else 'none'
		updated = ', '.join(result['updated']) if result['updated'] else 'none'
		friendships_created = ', '.join(result['friendships_created']) if result['friendships_created'] else 'none'
		friendships_updated = ', '.join(result['friendships_updated']) if result['friendships_updated'] else 'none'
		conversations_created = ', '.join(result['conversations_created']) if result['conversations_created'] else 'none'
		conversations_updated = ', '.join(result['conversations_updated']) if result['conversations_updated'] else 'none'
		games_created = ', '.join(result['games_created']) if result['games_created'] else 'none'
		games_updated = ', '.join(result['games_updated']) if result['games_updated'] else 'none'
		self.stdout.write(self.style.SUCCESS(
			'\n'.join([
				f"E2E users ready: total={result['total']} created={created} updated={updated}",
				f"E2E friendships: created={friendships_created} updated={friendships_updated}",
				f"E2E conversations: created={conversations_created} updated={conversations_updated}",
				f"E2E games: created={games_created} updated={games_updated}",
			])
		))
