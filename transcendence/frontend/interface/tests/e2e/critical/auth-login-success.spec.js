import { expect, test } from '@playwright/test'

import { loginAndOpenDashboard } from '../helpers/auth.js'
import { getE2ERoleCredentials, hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { waitForDashboardReady } from '../helpers/waits.js'

const { email, password } = getE2ERoleCredentials('SMOKE_USER')
const hasCredentials = hasE2ERoleCredentials('SMOKE_USER')

test.describe('auth login success', () => {
	test.skip(!hasCredentials, 'Set E2E_SMOKE_USER_EMAIL and E2E_SMOKE_USER_PASSWORD to run this suite.')

	test('successful login opens app shell and survives refresh', async ({ page }) => {
		await loginAndOpenDashboard(page, email, password)
		await waitForDashboardReady(page)

		await page.reload()
		await page.goto('/dashboard')
		await waitForDashboardReady(page)
	})
})
