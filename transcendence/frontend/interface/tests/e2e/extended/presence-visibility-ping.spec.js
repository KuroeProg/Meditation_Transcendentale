import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('heartbeat de présence au chargement et au retour visible', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que la présence est pingée au montage puis quand l'onglet redevient visible.
	test('sends heartbeat on mount and when tab becomes visible', async ({ page }) => {
		let presenceCalls = 0

		await page.route('**/api/auth/me/presence', async (route) => {
			presenceCalls += 1
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
		})

		await page.goto('/dashboard')
		await waitForDashboardReady(page)
		await expect.poll(() => presenceCalls).toBeGreaterThanOrEqual(1)

		await page.evaluate(() => {
			let state = 'hidden'
			Object.defineProperty(document, 'visibilityState', {
				configurable: true,
				get: () => state,
			})
			document.dispatchEvent(new Event('visibilitychange'))
			state = 'visible'
			document.dispatchEvent(new Event('visibilitychange'))
		})

		await expect.poll(() => presenceCalls).toBeGreaterThanOrEqual(2)
	})
})
