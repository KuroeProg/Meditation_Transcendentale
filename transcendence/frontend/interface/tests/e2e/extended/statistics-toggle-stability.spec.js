import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('bascule des graphiques de statistiques', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que les contrôles de statistiques changent de vue sans casser l'interface.
	test('toggle controls switch chart modes without UI break', async ({ page }) => {
		const uncaughtErrors = []
		page.on('pageerror', (error) => {
			uncaughtErrors.push(error.message)
		})

		await page.goto('/statistics')
		await expect(page.locator('.pstats-page')).toBeVisible()

			await page.getByRole('button', { name: /advantage/i }).click()
			await page.getByRole('button', { name: /elo progression/i }).click()
			await page.getByRole('button', { name: /move speed/i }).click()

		await expect(page.locator('.pstats-chart-block')).toHaveCount(2)
		expect(uncaughtErrors, `Unexpected errors: ${uncaughtErrors.join(' | ')}`).toEqual([])
	})
})
