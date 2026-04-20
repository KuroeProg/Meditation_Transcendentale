import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('wave c - statistics chart toggles', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('toggle controls switch chart modes without UI break', async ({ page }) => {
		const uncaughtErrors = []
		page.on('pageerror', (error) => {
			uncaughtErrors.push(error.message)
		})

		await page.goto('/statistics')
		await expect(page.locator('.pstats-page')).toBeVisible()

		await page.getByRole('button', { name: /advantage/i }).click()
		await page.getByRole('button', { name: /time/i }).click()
		await page.getByRole('button', { name: /raw count/i }).click()
		await page.getByRole('button', { name: /percentage/i }).click()

		await expect(page.locator('.pstats-chart-block')).toHaveCount(2)
		expect(uncaughtErrors, `Unexpected errors: ${uncaughtErrors.join(' | ')}`).toEqual([])
	})
})
