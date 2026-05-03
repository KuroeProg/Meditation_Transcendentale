import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('captured pieces HUD', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await installMatchmakingWebSocketMock(page)
		await page.goto('/game/training')
		await waitForGameShellReady(page)
	})

	test('captured-bar-top is rendered near the top player bar', async ({ page }) => {
		await expect(page.getByTestId('captured-bar-top')).toBeVisible()
	})

	test('captured-bar-bottom is rendered near the bottom player bar', async ({ page }) => {
		await expect(page.getByTestId('captured-bar-bottom')).toBeVisible()
	})

	test('both HUD bars are in the DOM simultaneously', async ({ page }) => {
		await expect(page.getByTestId('captured-bar-top')).toBeVisible()
		await expect(page.getByTestId('captured-bar-bottom')).toBeVisible()
	})

	test('material advantage shows a single positive +x on the leading side', async ({ page }) => {
		const board = page.getByTestId('chess-board')

		// 1. e4
		await board.locator('[data-square="e2"]').click()
		await board.locator('[data-square="e4"]').click()
		// ... d5
		await board.locator('[data-square="d7"]').click()
		await board.locator('[data-square="d5"]').click()
		// 2. exd5 (white wins a pawn => +1 for white)
		await board.locator('[data-square="e4"]').click()
		await board.locator('[data-square="d5"]').click()

		// Avec playerColor='w' en training :
		// - le joueur du haut est noir, donc il ne doit pas avoir de +x ici
		// - le joueur du bas est blanc et doit afficher +1
		await expect(page.getByTestId('captured-advantage-top')).toHaveCount(0)
		await expect(page.getByTestId('captured-advantage-bottom')).toHaveText('+1')
	})
})
