/**
 * In-game chat — backend integration E2E spec
 *
 * Mocks GET /api/chat/game-conversation and the chat WebSocket to verify:
 *  1. The component resolves a conversation and connects.
 *  2. A received WS new_message appears in the message list.
 *  3. Sending a message dispatches send_message via WebSocket.
 */
import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installOnlineGameWebSocketMock } from '../helpers/wsMocks.js'
import { waitForGameShellReady } from '../helpers/waits.js'

const GAME_ID = 'e2e-ingame-chat'
const CONV_ID = 9001

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

async function mockGameAndChat(page) {
	// Mock the chess WebSocket
	await installOnlineGameWebSocketMock(page, GAME_ID)

	// Mock the game-conversation resolution endpoint
	await page.route('**/api/chat/game-conversation**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ id: CONV_ID, type: 'game', game_id: GAME_ID }),
		})
	})

	// Mock message history (empty for a fresh game)
	await page.route(`**/api/chat/conversations/${CONV_ID}/messages/`, async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
	})

	// Mock the chat WebSocket
	await page.addInitScript((convId) => {
		const Native = window.WebSocket
		window.__e2eIngameChatMock = { socket: null, sendSpy: [] }

		class MockChatWS {
			static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
			constructor(url) {
				this.url = url
				this.readyState = MockChatWS.CONNECTING
				this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null
				if (url.includes(`/ws/chat/${convId}/`)) {
					window.__e2eIngameChatMock.socket = this
					setTimeout(() => {
						this.readyState = MockChatWS.OPEN
						this.onopen?.({ type: 'open' })
					}, 0)
					return
				}
				const native = new Native(url)
				native.onopen = (e) => { this.readyState = MockChatWS.OPEN; this.onopen?.(e) }
				native.onmessage = (e) => this.onmessage?.(e)
				native.onerror = (e) => this.onerror?.(e)
				native.onclose = (e) => { this.readyState = MockChatWS.CLOSED; this.onclose?.(e) }
			}
			send(raw) {
				window.__e2eIngameChatMock.sendSpy.push(raw)
				if (!this.url.includes(`/ws/chat/${convId}/`)) return
				try {
					const data = JSON.parse(raw)
					if (data.action === 'send_message') {
						setTimeout(() => {
							this.onmessage?.({
								data: JSON.stringify({
									action: 'new_message',
									message: {
										id: Date.now(),
										content: data.content,
										message_type: 'text',
										created_at: new Date().toISOString(),
										sender: { id: 101, username: 'SMOKE_USER', avatar: '' },
										read_by: [101],
									},
								}),
							})
						}, 20)
					}
				} catch {}
			}
			close() { this.readyState = MockChatWS.CLOSED; this.onclose?.({ type: 'close' }) }
		}
		window.WebSocket = MockChatWS
	}, CONV_ID)
}

test.describe('chat ingame — intégration backend', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await mockGameAndChat(page)
		await page.goto(`/game/${GAME_ID}`)
		await waitForGameShellReady(page)
		await page.getByRole('tab', { name: /chat/i }).click()
		// Wait for the "Live" badge indicating WS connection
		await expect(page.getByTestId('ingame-chat-status-live')).toBeVisible({ timeout: 6000 })
	})

	test('le badge Live est visible une fois le WS connecté', async ({ page }) => {
		await expect(page.getByTestId('ingame-chat-status-live')).toBeVisible()
	})

	test('envoyer un message via WS l\'ajoute dans la liste', async ({ page }) => {
		const input = page.getByTestId('ingame-chat-input')
		await expect(input).toBeEnabled()
		await input.fill('Bonne partie !')
		await page.getByTestId('ingame-chat-send').click()
		await expect(page.getByTestId('ingame-chat-messages')).toContainText('Bonne partie !', { timeout: 3000 })
	})

	test('un message WS reçu (new_message) apparaît dans la liste', async ({ page }) => {
		// Trigger a message from the "opponent" side via the mock socket
		await page.evaluate(() => {
			const socket = window.__e2eIngameChatMock?.socket
			if (!socket) return
			socket.onmessage?.({
				data: JSON.stringify({
					action: 'new_message',
					message: {
						id: 88888,
						content: 'Bien joué cavalier !',
						message_type: 'text',
						created_at: new Date().toISOString(),
						sender: { id: 202, username: 'OPPONENT_X', avatar: '' },
						read_by: [],
					},
				}),
			})
		})
		const messageRow = page.locator('.igc-msg', { hasText: 'Bien joué cavalier !' })
		const messageText = messageRow.locator('.igc-msg-text')

		await expect(page.getByTestId('ingame-chat-messages')).toContainText('Bien joué cavalier !', { timeout: 3000 })
		await expect(messageRow).toHaveClass(/igc-msg--opponent/)
		await expect(messageText).toHaveCSS('color', 'rgba(255, 255, 255, 0.95)')
	})
})
