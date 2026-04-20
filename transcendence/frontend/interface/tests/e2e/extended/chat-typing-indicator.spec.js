import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test.describe('wave c - typing indicator lifecycle', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('shows remote typing indicator then clears when typing stops', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await installChatWebSocketMock(page, 1)

		await page.route('**/api/chat/conversations', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					conversations: [
						{
							id: 1,
							participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
							last_message: null,
							unread_count: 0,
							unread_text_count: 0,
							unread_invite_count: 0,
						},
					],
				}),
			})
		})

		await page.route('**/api/chat/conversations/1/messages**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ messages: [] }),
			})
		})

		await page.goto('/dashboard')
		await page.getByTestId('chat-open-button').click()
		await page.getByTestId('chat-conversation-item-1').click()

		await page.evaluate(() => {
			window.__e2eChatMock.triggerTyping({ userId: 202, username: 'USER_B', isTyping: true })
		})

		await expect(page.locator('.chat-typing-indicator')).toContainText('USER_B')

		await page.evaluate(() => {
			window.__e2eChatMock.triggerTyping({ userId: 202, username: 'USER_B', isTyping: false })
		})

			await expect(page.locator('.chat-typing-indicator')).toHaveCount(0)
		})
	})
})
