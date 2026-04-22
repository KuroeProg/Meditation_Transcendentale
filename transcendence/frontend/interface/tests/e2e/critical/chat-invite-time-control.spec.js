/**
 * Tests de non-régression sur le correctif d'affichage de la cadence dans GameInviteCard.
 * Scénarios couverts :
 *   - time_control au format "15+10" → "15 min"
 *   - time_control au format "1+0"   → "1 min"
 *   - time_seconds + increment       → calcul en minutes
 *   - time_control_label             → libellé libre
 */
import { expect, test } from '@playwright/test'

import { withRoleSessions } from '../helpers/multiUser.js'
import { openConversationThread, waitForDashboardReady } from '../helpers/waits.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

const SESSION_USER = {
	id: 101,
	username: 'SMOKE_USER',
	first_name: 'Smoke',
	last_name: 'User',
	email: 'smoke@example.test',
	coalition: 'water',
	is_online: true,
}

function buildInviteMessage(overrides = {}) {
	return {
		id: overrides.id ?? 7000,
		content: JSON.stringify({
			invite_id: overrides.invite_id ?? 99,
			competitive: false,
			invite_status: 'pending',
			status: 'pending',
			sender_id: 202,
			receiver_id: 101,
			...overrides.content,
		}),
		message_type: 'game_invite',
		created_at: new Date().toISOString(),
		sender: { id: 202, username: 'USER_B', avatar: '' },
		read_by: [202],
	}
}

async function setupPageWithInvite(page, inviteMessage) {
	await installChatWebSocketMock(page, 1)

	await page.route('**/api/auth/me', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) })
	)
	await page.route('**/api/auth/friends?status=accepted', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
	)
	await page.route('**/api/auth/leaderboard**', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ leaderboard: [], current_user_rank: null }) })
	)
	await page.route('**/api/chat/invites/pending-outgoing', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
	)
	await page.route('**/api/chat/conversations', (r) =>
		r.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				conversations: [{
					id: 1,
					participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
					last_message: { id: inviteMessage.id, content: inviteMessage.content, message_type: 'game_invite' },
					unread_count: 1,
					unread_text_count: 0,
					unread_invite_count: 1,
				}],
			}),
		})
	)
	await page.route('**/api/chat/conversations/1/messages**', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [inviteMessage] }) })
	)
	await page.route('**/api/auth/csrf', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
	)
	await page.route('**/api/chat/invites/**/respond', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: { id: 99, status: 'declined' } }) })
	)

	await page.goto('/dashboard')
	await waitForDashboardReady(page)
	await page.getByTestId('chat-open-button').click()
	await openConversationThread(page, 1)
	await expect(page.getByTestId('chat-game-invite-card')).toBeVisible()
}

test('invite card shows correct duration from time_control "15+10"', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		const msg = buildInviteMessage({ content: { time_control: '15+10' } })
		await setupPageWithInvite(page, msg)
		await expect(page.getByTestId('chat-game-invite-card')).toContainText('15 min')
	})
})

test('invite card shows correct duration from time_control "1+0"', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		const msg = buildInviteMessage({ content: { time_control: '1+0' } })
		await setupPageWithInvite(page, msg)
		await expect(page.getByTestId('chat-game-invite-card')).toContainText('1 min')
	})
})

test('invite card shows correct duration computed from time_seconds + increment', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		// 900 seconds = 15 min, increment = 0
		const msg = buildInviteMessage({ content: { time_seconds: 900, increment: 0 } })
		await setupPageWithInvite(page, msg)
		await expect(page.getByTestId('chat-game-invite-card')).toContainText('15 min')
	})
})

test('invite card shows time_control_label when provided', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		const msg = buildInviteMessage({ content: { time_control_label: 'Bullet 2+1' } })
		await setupPageWithInvite(page, msg)
		await expect(page.getByTestId('chat-game-invite-card')).toContainText('Bullet 2+1')
	})
})
