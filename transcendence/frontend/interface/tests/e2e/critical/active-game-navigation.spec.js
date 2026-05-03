import { expect, test } from '@playwright/test'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

const SESSION_USER = {
	id: 101,
	username: 'SMOKE_USER',
	first_name: 'Smoke',
	last_name: 'User',
	email: 'smoke@example.test',
	coalition: 'water',
	is_online: true,
}

test('active game id does not block profile route', async ({ page }) => {
	await page.addInitScript(() => {
		sessionStorage.setItem('activeGameId', 'training')
	})
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }),
	)
	await page.goto('/profile')
	await expect(page).toHaveURL(/\/profile$/)
	await expect(page.getByTestId('profile-page')).toBeVisible()
})

test('route /game returns to active game id', async ({ page }) => {
	await page.addInitScript(() => {
		sessionStorage.setItem('activeGameId', 'training')
	})
	await page.goto('/game')
	await expect(page).toHaveURL(/\/game\/training$/)
	await waitForGameShellReady(page)
})

test('dashboard redirects to active game id', async ({ page }) => {
	await page.addInitScript(() => {
		sessionStorage.setItem('activeGameId', 'training')
	})
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }),
	)
	await page.goto('/dashboard')
	await expect(page).toHaveURL(/\/game\/training$/)
})
