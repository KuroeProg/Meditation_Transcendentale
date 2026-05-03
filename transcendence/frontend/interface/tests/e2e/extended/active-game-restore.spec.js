import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe("restauration d'une partie active", () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie qu'une page protégée reste accessible même si une game active est en session.
	test('keeps profile route accessible with stored active game id', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('activeGameId', 'training')
		})

		await page.goto('/profile')
		await expect(page).toHaveURL(/\/profile/)
		await expect(page.getByTestId('profile-page')).toBeVisible()
	})

	// Vérifie que la route /game sert de retour explicite vers la partie active.
	test('route /game redirects to stored active game id', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('activeGameId', 'training')
		})

		await page.goto('/game')
		await expect(page).toHaveURL(/\/game\/training/)
		await waitForGameShellReady(page)
	})
})
