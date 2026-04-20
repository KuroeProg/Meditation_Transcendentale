import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { openConversationThread, waitForChatDrawerReady, waitForDashboardReady } from '../helpers/waits.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test.describe('chat send message', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('chat opens, loads conversation list, and sends a message', async ({ browser }) => {
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
		await waitForDashboardReady(page)
		await page.getByTestId('chat-open-button').click()

		await waitForChatDrawerReady(page)
		await openConversationThread(page, 1)

		const messageText = `Salut e2e ${Date.now()}`
		await page.getByTestId('chat-message-input').fill(messageText)
		await page.getByTestId('chat-send-button').click()

			await expect(page.getByText(messageText)).toBeVisible()
		})
	})
})
