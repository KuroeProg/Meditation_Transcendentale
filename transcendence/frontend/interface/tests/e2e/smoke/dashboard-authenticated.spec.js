import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('authenticated smoke', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie qu'un utilisateur déjà authentifié accède au dashboard sans repasser par la connexion.
	test('dashboard is reachable without re-login', async ({ page }) => {
		await page.goto('/dashboard')
		await waitForDashboardReady(page)
	})
})

