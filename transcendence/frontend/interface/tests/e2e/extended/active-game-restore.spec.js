import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe("restauration d'une partie active", () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que le dashboard redirige vers l'identifiant de partie active conservé.
	test('redirects from dashboard to stored active game id', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('activeGameId', 'training')
		})

		await page.goto('/dashboard')
		await expect(page).toHaveURL(/\/game\/training/)
		await waitForGameShellReady(page)
	})
})
