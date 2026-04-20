import { expect, test } from '@playwright/test'

test('guest is redirected to auth when opening protected dashboard route', async ({ page }) => {
	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
	})

	await page.goto('/dashboard')
	await expect(page).toHaveURL(/\/auth/)
	await expect(page.locator('#login-email')).toBeVisible()
})
