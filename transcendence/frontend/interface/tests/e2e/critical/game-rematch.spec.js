import { expect, test } from '@playwright/test'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installRematchWebSocketMock } from '../helpers/wsMocks.js'

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

async function setupRoutes(page) {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }),
	)
	await page.route('**/api/chat/invites/pending-outgoing', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) }),
	)
}

// Vérifie que le bouton « Revanche » est affiché après une partie terminée et qu'il envoie
// bien un `rematch_offer` au serveur (état WS simulé → bannière sortante).
test('rematch offer button is shown after game ends and sends rematch_offer', async ({ page }) => {
	await installRematchWebSocketMock(page, 'rematch-game-1')
	await setupRoutes(page)

	await page.goto('/game/rematch-game-1')
	await expect(page.getByTestId('result-rematch')).toBeVisible({ timeout: 5000 })
	await page.getByTestId('result-rematch').click()

	// Après le clic, le bouton "Revanche" doit être remplacé par le message d'attente
	await expect(page.getByTestId('result-rematch-waiting')).toBeVisible({ timeout: 3000 })
})

// Vérifie que quand un `rematch_offer` entrant arrive, la bannière s'affiche avec Accepter/Refuser.
test('incoming rematch offer banner is shown and can be declined', async ({ page }) => {
	await installRematchWebSocketMock(page, 'rematch-game-1')
	await setupRoutes(page)

	await page.goto('/game/rematch-game-1')

	// Injecter une offre entrante depuis l'adversaire (player 202)
	await page.evaluate(() => {
		const socket = window.__e2eRematchMock?.socket
		if (socket) {
			const state = {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				status: 'resigned',
				winner_player_id: 202,
				white_player_id: 202,
				black_player_id: 101,
				draw_offer_from_player_id: null,
				rematch_offer_from_player_id: '202', // adversaire (not us = 101)
				time_control_seconds: 600,
				increment_seconds: 0,
				is_competitive: false,
			}
			socket.onmessage?.({ data: JSON.stringify({ action: 'game_state', game_state: state }) })
		}
	})

	await expect(page.getByTestId('rematch-banner-incoming')).toBeVisible({ timeout: 3000 })
	await page.getByTestId('rematch-decline').click()
	// Après refus, la bannière doit disparaître
	await expect(page.getByTestId('rematch-banner-incoming')).not.toBeVisible({ timeout: 3000 })
})
