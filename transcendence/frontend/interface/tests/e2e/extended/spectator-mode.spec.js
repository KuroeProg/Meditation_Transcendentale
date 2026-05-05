/**
 * Spectator mode — E2E spec
 *
 * Scenarios:
 *  1. A friend with an active_game_id in the friends list shows a "Regarder" button.
 *  2. Clicking "Regarder" navigates to /game/<gameId>.
 *  3. When the WS server sends spectator:true, the spectator banner is visible.
 *  4. Game controls are read-only (board isViewOnly) for a spectator.
 */
import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { installOnlineGameWebSocketMock } from '../helpers/wsMocks.js'
import { waitForDashboardReady } from '../helpers/waits.js'

const SPECTATE_GAME_ID = 'e2e-spectate-game'

async function mockSpectatorBase(page) {
	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ id: 101, username: 'SMOKE_USER', coalition: 'water' }),
		})
	})
	await page.route('**/api/auth/friends**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				friends: [
					{
						friendship_id: 55,
						status: 'accepted',
						is_sender: true,
						user: {
							id: 202,
							username: 'PLAYER_A',
							avatar: '',
							coalition: 'fire',
							is_online: true,
							active_game_id: SPECTATE_GAME_ID,
						},
					},
				],
			}),
		})
	})
	await page.route('**/api/auth/leaderboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ leaderboard: [], current_user_rank: null }) })
	})
	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
	})
	await page.route('**/api/chat/conversations', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) })
	})
}

test.describe('mode spectateur', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('un ami en partie affiche le bouton Regarder', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockSpectatorBase(page)
			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			const watchBtn = page.getByTestId(`friend-watch-202`)
			await expect(watchBtn).toBeVisible()
		})
	})

	test('cliquer sur Regarder navigue vers la page de jeu', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockSpectatorBase(page)
			await installOnlineGameWebSocketMock(page, SPECTATE_GAME_ID)
			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId(`friend-watch-202`).click()
			await expect(page).toHaveURL(new RegExp(`/game/${SPECTATE_GAME_ID}`))
		})
	})

	test('le WS avec spectator:true affiche la bannière spectateur', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockSpectatorBase(page)
			// Intercept the chess WS and respond with spectator:true flag
			await page.addInitScript((gameId) => {
				const Native = window.WebSocket
				class MockWS {
					static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
					constructor(url) {
						this.url = url
						this.readyState = MockWS.CONNECTING
						this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null
						if (url.includes(`/ws/chess/${gameId}/`)) {
							setTimeout(() => {
								this.readyState = MockWS.OPEN
								this.onopen?.({ type: 'open' })
								// After reconnect, send spectator payload
								setTimeout(() => {
									this.onmessage?.({
										data: JSON.stringify({
											action: 'game_state',
											spectator: true,
											game_state: {
												fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
												status: 'active',
												white_player_id: 202,
												black_player_id: 303,
											},
										}),
									})
								}, 50)
							}, 10)
							return
						}
						const native = new Native(url)
						native.onopen = (e) => { this.readyState = MockWS.OPEN; this.onopen?.(e) }
						native.onmessage = (e) => this.onmessage?.(e)
						native.onerror = (e) => this.onerror?.(e)
						native.onclose = (e) => { this.readyState = MockWS.CLOSED; this.onclose?.(e) }
					}
					send() {}
					close() { this.readyState = MockWS.CLOSED; this.onclose?.({ type: 'close' }) }
				}
				window.WebSocket = MockWS
			}, SPECTATE_GAME_ID)

			await page.goto(`/game/${SPECTATE_GAME_ID}`)
			await expect(page.getByTestId('game-shell')).toBeVisible()
			await expect(page.getByTestId('spectator-banner')).toBeVisible({ timeout: 5000 })
		})
	})
})
