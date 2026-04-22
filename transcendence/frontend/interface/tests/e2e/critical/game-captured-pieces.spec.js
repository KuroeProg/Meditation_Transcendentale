import { expect, test } from '@playwright/test'

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
})
