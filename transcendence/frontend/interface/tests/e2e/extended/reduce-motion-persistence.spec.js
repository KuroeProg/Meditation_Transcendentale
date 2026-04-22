import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('persistance du mode animation réduite', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que le réglage d'animations réduites reste actif après rechargement.
	test('persists reduced motion toggle after reload', async ({ page }) => {
		await page.goto('/settings')
		const reduceMotionToggle = page.locator('.toggle-row input[type="checkbox"]')

		await expect(reduceMotionToggle).toBeVisible()
		await reduceMotionToggle.check()
		await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')

		await page.reload()
		await expect(reduceMotionToggle).toBeChecked()
		await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
	})
})
