import { expect, test } from '../testWithLogging'

import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

// Vérifie que l'annulation du matchmaking ferme la modal et ignore les événements tardifs.
test('cancel matchmaking closes modal and blocks later match_found', async ({ page }) => {
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

	await page.route('**/api/auth/leaderboard**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ leaderboard: [], current_user_rank: null }),
		})
	})

	await installMatchmakingWebSocketMock(page)

	await page.goto('/dashboard')
	await waitForDashboardReady(page)

	await page.getByRole('button', { name: /commencer la partie/i }).click()
	await expect(page.getByRole('dialog', { name: /recherche de partie/i })).toBeVisible()

	await page.getByRole('button', { name: /annuler/i }).click()
	await expect(page.getByRole('dialog', { name: /recherche de partie/i })).toBeHidden()
	await expect(page).toHaveURL(/\/dashboard$/)

	await page.evaluate(() => {
		window.__e2eMatchmakingMock?.triggerMatchFound?.()
	})

	await expect(page).toHaveURL(/\/dashboard$/)
})
