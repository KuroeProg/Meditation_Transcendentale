import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test('logout clears authenticated UI and returns to auth', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })

	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(sessionUser),
		})
	})

	await page.route('**/api/auth/friends?status=accepted', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ friends: [] }),
		})
	})

	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ invite: null }),
		})
	})

	await page.route('**/api/auth/logout', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true }),
		})
	})

	await page.goto('/profile')
	await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()

	await page.locator('.profile-mobile-logout__btn').click()
	await expect(page).toHaveURL(/\/auth/)
	await expect(page.locator('#login-email')).toBeVisible()
})
