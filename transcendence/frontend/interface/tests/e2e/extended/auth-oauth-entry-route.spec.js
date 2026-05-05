import { expect, test } from '../testWithLogging'

test.describe('entrée du flux OAuth 42', () => {
	// Vérifie que le bouton OAuth pointe bien vers la route backend d'entrée du flux 42.
	test('oauth login button targets the oauth backend entry route', async ({ page }) => {
		await page.route('**/api/auth/42/login/', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html',
				body: '<html><body><h1>oauth-entry-mock</h1></body></html>',
			})
		})

		await page.goto('/auth')
		await page.getByRole('button', { name: /se connecter via/i }).click()

		await expect(page).toHaveURL(/\/api\/auth\/42\/login\/?$/)
		await expect(page.getByRole('heading', { name: 'oauth-entry-mock' })).toBeVisible()
	})
})
