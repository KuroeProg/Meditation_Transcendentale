import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

// Vérifie qu'un abandon mène bien à l'état terminal de la partie.
test('resign action reaches terminal game state', async ({ page }) => {
	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionUser) })
	})
	await page.route('**/api/auth/friends?status=accepted', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
	})
	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
	})

	await page.goto('/game/training')
	await page.getByTitle('Abandonner la partie').click()
	await expect(page.getByRole('dialog', { name: /abandonner la partie/i })).toBeVisible()
	await page.getByRole('button', { name: 'Abandonner', exact: true }).click()

	await expect(page.getByText('Abandon')).toBeVisible()
	await expect(page.getByText('Victoire des noirs')).toBeVisible()
})
