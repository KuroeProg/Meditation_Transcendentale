from django.core.management.base import BaseCommand

from accounts.services.e2e_users import seed_e2e_users


class Command(BaseCommand):
	help = 'Create or refresh deterministic E2E test users.'

	def handle(self, *args, **options):
		result = seed_e2e_users()
		created = ', '.join(result['created']) if result['created'] else 'none'
		updated = ', '.join(result['updated']) if result['updated'] else 'none'
		self.stdout.write(self.style.SUCCESS(
			f"E2E users ready: total={result['total']} created={created} updated={updated}"
		))
