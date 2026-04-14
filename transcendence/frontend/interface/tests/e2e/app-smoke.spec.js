import { expect, test } from '@playwright/test'
import { loginAndOpenDashboard } from './helpers/auth.js'

test('landing page is reachable', async ({ page }) => {
	await page.goto('/')
	await expect(page).toHaveTitle(/Transcendance|Transcendence|Vite/i)
})

test('auth helper can log in and open dashboard', async ({ page }) => {
	const email = process.env.E2E_SMOKE_USER_EMAIL
	const password = process.env.E2E_SMOKE_USER_PASSWORD
	if (!email || !password) {
		test.skip(true, 'Set E2E_SMOKE_USER_EMAIL and E2E_SMOKE_USER_PASSWORD to run this smoke check.')
	}

	await loginAndOpenDashboard(page, email, password)
})
