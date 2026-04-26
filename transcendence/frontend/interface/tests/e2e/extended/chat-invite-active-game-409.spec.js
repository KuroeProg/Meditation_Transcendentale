import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady } from '../helpers/waits.js'

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

// Le backend renvoie 409 si l’expéditeur ou le destinataire a déjà une partie Redis active.
test('game invite HTTP 409 shows error in modal', async ({ page }) => {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				friends: [
					{
						friendship_id: 1,
						status: 'accepted',
						user: { id: 202, username: 'Buddy', is_online: true, active_game_id: null },
					},
				],
			}),
		}),
	)
	await page.route('**/api/chat/invites/pending-outgoing', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) }),
	)
	await page.route('**/api/chat/conversations/create', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 9 }) }),
	)
	await page.route('**/api/chat/conversations/9/invite', (route) =>
		route.fulfill({
			status: 409,
			contentType: 'application/json',
			body: JSON.stringify({
				error: 'Tu es déjà en partie. Termine ou quitte la partie avant d’inviter.',
				code: 'sender_in_game',
			}),
		}),
	)

	await page.goto('/dashboard')
	await waitForDashboardReady(page)
	await page.getByTestId('dash-friend-challenge-202').click()
	await expect(page.getByTestId('friend-invite-modal')).toBeVisible()
	await page.getByTestId('friend-invite-send').click()
	await expect(page.getByRole('alert')).toContainText('déjà en partie')
})
