import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('chat send message', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('chat opens, loads conversation list, and sends a message', async ({ page }) => {
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

		await expect(page.getByTestId('chat-drawer')).toBeVisible()
		await expect(page.getByTestId('chat-conversation-list')).toBeVisible()

		await page.getByTestId('chat-conversation-item-1').click()
		await expect(page.getByTestId('chat-thread')).toBeVisible()

		const messageText = `Salut e2e ${Date.now()}`
		await page.getByTestId('chat-message-input').fill(messageText)
		await page.getByTestId('chat-send-button').click()

		await expect(page.getByText(messageText)).toBeVisible()
	})
})
