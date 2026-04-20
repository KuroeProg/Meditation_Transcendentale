import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test('send friend invite from thread creates an invite card', async ({ page }) => {
	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	const conversations = [
		{
			id: 1,
			participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
			last_message: null,
			unread_count: 0,
			unread_text_count: 0,
			unread_invite_count: 0,
		},
	]
	const messagesByConversation = {
		1: [],
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
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations }) })
	})
	await page.route('**/api/chat/conversations/1/messages**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ messages: messagesByConversation[1] }),
		})
	})
	await page.route('**/api/auth/csrf', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
	})
	await page.route('**/api/chat/conversations/1/invite', async (route) => {
		const invitePayload = {
			invite_id: 77,
			time_control: '3+2',
			competitive: false,
			invite_status: 'pending',
			status: 'pending',
			sender_id: 101,
			receiver_id: 202,
		}
		messagesByConversation[1].push({
			id: 5001,
			content: JSON.stringify(invitePayload),
			message_type: 'game_invite',
			created_at: new Date().toISOString(),
			sender: { id: 101, username: 'SMOKE_USER', avatar: '' },
			read_by: [101],
		})
		conversations[0].last_message = {
			id: 5001,
			content: JSON.stringify(invitePayload),
			message_type: 'game_invite',
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ invite: { id: 77, status: 'pending', sender_id: 101, receiver_id: 202 } }),
		})
	})

	await page.goto('/dashboard')
	await page.getByTestId('chat-open-button').click()
	await page.getByTestId('chat-conversation-item-1').click()
	await expect(page.getByTestId('chat-thread')).toBeVisible()

	await page.getByTestId('chat-thread-invite-button').click()
	await expect(page.getByTestId('friend-invite-modal')).toBeVisible()
	await page.getByTestId('friend-invite-send').click()
	await expect(page.getByTestId('friend-invite-modal')).toBeHidden()

	await page.locator('.chat-drawer-back').click()
	await page.getByTestId('chat-conversation-item-1').click()

	await expect(page.getByTestId('chat-game-invite-card')).toBeVisible()
	await expect(page.getByText('Invitation envoyee')).toBeVisible()
})
