import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('game shell load', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que l'écran de jeu affiche bien les éléments principaux pour un utilisateur authentifié.
	test('authenticated user sees board and player bars on game route', async ({ page }) => {
		await page.goto('/game/training')
		await expect(page.getByTestId('game-page')).toBeVisible()
		await waitForGameShellReady(page)
		await expect(page.getByTestId('game-player-bar-top')).toBeVisible()
		await expect(page.getByTestId('game-player-bar-bottom')).toBeVisible()
	})
})
