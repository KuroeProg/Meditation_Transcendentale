import { test } from '@playwright/test'
import { loginAndOpenDashboard } from '../helpers/auth.js'
import { getE2ERoleCredentials, hasE2ERoleCredentials } from '../helpers/e2eEnv.js'

const { email, password } = getE2ERoleCredentials('SMOKE_USER')
const hasCredentials = hasE2ERoleCredentials('SMOKE_USER')

test.describe('auth flow', () => {
	test.skip(!hasCredentials, 'Set E2E_SMOKE_USER_EMAIL and E2E_SMOKE_USER_PASSWORD to run this suite.')

	// Vérifie qu'un login réussi ouvre bien le tableau de bord.
	test('logs in and opens the dashboard', async ({ page }) => {
		await loginAndOpenDashboard(page, email, password)
	})
})
