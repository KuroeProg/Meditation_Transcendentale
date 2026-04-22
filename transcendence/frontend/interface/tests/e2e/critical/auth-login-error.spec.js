import { expect, test } from '@playwright/test'

test('invalid login shows an error message', async ({ page }) => {
	await page.context().clearCookies()

	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Unauthenticated' }),
			})
	})

	await page.route('**/api/auth/csrf', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true }),
		})
	})

	const login401 = {
		status: 401,
		contentType: 'application/json',
		body: JSON.stringify({ error: 'Identifiants invalides' }),
	}
	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill(login401)
	})
	await page.route('**/api/auth/login/', async (route) => {
		await route.fulfill(login401)
	})

	await page.goto('/auth')
	await page.locator('#login-email').fill('bad@example.test')
	await page.locator('#login-password').fill('wrong-password')
	await page.getByRole('button', { name: 'Se Connecter', exact: true }).click()

	await expect(page.locator('.auth-error')).toContainText('Identifiants invalides')
	await expect(page).toHaveURL(/\/auth/)
})
