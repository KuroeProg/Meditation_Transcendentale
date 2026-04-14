import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('authenticated smoke', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('dashboard is reachable without re-login', async ({ page }) => {
		await page.goto('/dashboard')
		await expect(page.getByRole('button', { name: /commencer la partie/i })).toBeVisible()
	})
})

