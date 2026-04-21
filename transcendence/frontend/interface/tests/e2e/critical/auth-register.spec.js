import { expect, test } from '@playwright/test'

test.describe('auth register', () => {
	test('register flow enters 2fa verification stage', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Unauthenticated' }),
			})
		})

		await page.route('**/api/auth/register', async (route) => {
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					status: '2fa_pending',
					user_id: 101,
					email: 'new-user@example.test',
					message: 'Verification code sent to email',
				}),
			})
		})

		await page.goto('/auth?mode=register')
		await page.locator('#firstName').fill('New')
		await page.locator('#lastName').fill('User')
		await page.locator('#reg-username').fill('NEW_USER_01')
		await page.locator('#reg-email').fill('new-user@example.test')
		await page.locator('#reg-password').fill('strong-password-123')
		await page.getByRole('button', { name: 'Creer mon compte', exact: true }).click()

		await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible()
	})

	test('duplicate username surfaces backend error', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Unauthenticated' }),
			})
		})

		await page.route('**/api/auth/register', async (route) => {
			await route.fulfill({
				status: 409,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Username already taken' }),
			})
		})

		await page.goto('/auth?mode=register')
		await page.locator('#reg-username').fill('SMOKE_USER')
		await page.locator('#reg-email').fill('already-used@example.test')
		await page.locator('#reg-password').fill('strong-password-123')
		await page.getByRole('button', { name: 'Creer mon compte', exact: true }).click()

		await expect(page.getByText('Username already taken')).toBeVisible()
	})
})
