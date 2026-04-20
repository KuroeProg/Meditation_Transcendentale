import { expect, test } from '@playwright/test'

import { withRoleSessions } from '../helpers/multiUser.js'
import { openConversationThread, waitForDashboardReady } from '../helpers/waits.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test('accept invite in thread navigates to game route', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	const inviteMessage = {
		id: 6001,
		content: JSON.stringify({
			invite_id: 55,
			time_control: '3+2',
			competitive: false,
			invite_status: 'pending',
			status: 'pending',
			sender_id: 202,
			receiver_id: 101,
		}),
		message_type: 'game_invite',
		created_at: new Date().toISOString(),
		sender: { id: 202, username: 'USER_B', avatar: '' },
		read_by: [202],
	}

	await installChatWebSocketMock(page, 1)

	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionUser) })
	})
	await page.route('**/api/auth/friends?status=accepted', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
	})
	await page.route('**/api/auth/leaderboard**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ leaderboard: [], current_user_rank: null }) })
	})
	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
	})
	await page.route('**/api/chat/conversations', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				conversations: [
					{
						id: 1,
						participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
						last_message: { id: 6001, content: inviteMessage.content, message_type: 'game_invite' },
						unread_count: 1,
						unread_text_count: 0,
						unread_invite_count: 1,
					},
				],
			}),
		})
	})
	await page.route('**/api/chat/conversations/1/messages**', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [inviteMessage] }) })
	})
	await page.route('**/api/auth/csrf', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
	})
	await page.route('**/api/chat/invites/55/respond', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ invite: { id: 55, status: 'accepted', game_id: 'invite-game-55' } }),
		})
	})

	await page.goto('/dashboard')
	await waitForDashboardReady(page)
	await page.getByTestId('chat-open-button').click()
	await openConversationThread(page, 1)
	await expect(page.getByTestId('chat-game-invite-card')).toBeVisible()

	await page.getByTestId('chat-invite-accept').click()
	await page.waitForURL(/\/game\/invite-game-55$/)
	})
})
