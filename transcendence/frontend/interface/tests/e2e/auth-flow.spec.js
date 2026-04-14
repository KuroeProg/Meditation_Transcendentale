import { test } from '@playwright/test'
import { loginAndOpenDashboard } from './helpers/auth.js'

const email = process.env.E2E_SMOKE_USER_EMAIL
const password = process.env.E2E_SMOKE_USER_PASSWORD
const hasCredentials = Boolean(email) && Boolean(password)

test.describe('auth flow', () => {
	test.skip(!hasCredentials, 'Set E2E_SMOKE_USER_EMAIL and E2E_SMOKE_USER_PASSWORD to run this suite.')

	test('logs in and opens the dashboard', async ({ page }) => {
		await loginAndOpenDashboard(page, email, password)
	})
})
