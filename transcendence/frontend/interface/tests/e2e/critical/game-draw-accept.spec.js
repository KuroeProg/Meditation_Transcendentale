import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installOnlineGameWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

// Vérifie qu'une offre de nulle acceptée met bien la partie à jour.
test('draw offer accept path updates game state', async ({ page }) => {
	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	await installOnlineGameWebSocketMock(page, 'draw-offer-1')

	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionUser) })
	})
	await page.route('**/api/auth/friends?status=accepted', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
	})
	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
	})

	await page.goto('/game/draw-offer-1')
	await expect(page.getByText('Proposition de nulle')).toBeVisible()
	await page.getByRole('button', { name: 'Accepter', exact: true }).click()

	await expect(page.getByText('Draw!')).toBeVisible()
	await expect(page.getByText('Equal position')).toBeVisible()
})
