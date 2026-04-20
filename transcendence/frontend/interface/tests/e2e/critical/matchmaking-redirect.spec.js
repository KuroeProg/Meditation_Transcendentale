import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady, waitForGameShellReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('matchmaking redirect', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('start matchmaking then redirect to game on match_found', async ({ page }) => {
		await installMatchmakingWebSocketMock(page)

		await page.goto('/dashboard')
		await waitForDashboardReady(page)

		await page.getByTestId('dashboard-start-matchmaking').click()
		await expect(page.getByTestId('matchmaking-modal')).toBeVisible()
		await expect(page.getByTestId('matchmaking-queue-size')).toContainText('Joueurs en file : 1')

			await page.evaluate(() => {
				window.__e2eMatchmakingMock?.triggerMatchFound?.()
			})

			await page.waitForURL(/\/game\/e2e-game-123$/)
			await waitForGameShellReady(page)
	})
})
