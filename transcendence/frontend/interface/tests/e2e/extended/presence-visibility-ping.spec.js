import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('wave c - presence ping on visibility change', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('sends heartbeat on mount and when tab becomes visible', async ({ page }) => {
		let presenceCalls = 0

		await page.route('**/api/auth/me/presence', async (route) => {
			presenceCalls += 1
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
		})

		await page.goto('/dashboard')
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
