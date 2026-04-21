import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { openConversationThread, waitForDashboardReady } from '../helpers/waits.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

test.describe('wave c - sender invite cancel http route', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('clicking cancel on invite card calls cancel endpoint and updates status', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await installChatWebSocketMock(page, 1)

			const invitePayload = {
				invite_id: 77,
				time_control: '3+2',
				competitive: false,
				invite_status: 'pending',
				status: 'pending',
				sender_id: 101,
				receiver_id: 202,
			}

			await page.route('**/api/auth/me', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ id: 101, username: 'SMOKE_USER', coalition: 'water' }),
				})
			})
			await page.route('**/api/auth/friends?status=accepted', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
			})
			await page.route('**/api/auth/leaderboard**', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ leaderboard: [], current_user_rank: null }) })
			})
			await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ invite: { id: 77, status: 'pending', sender_id: 101, receiver_id: 202 } }),
				})
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
								last_message: { id: 5001, content: JSON.stringify(invitePayload), message_type: 'game_invite' },
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
					body: JSON.stringify({
						messages: [
							{
								id: 5001,
								content: JSON.stringify(invitePayload),
								message_type: 'game_invite',
								created_at: new Date().toISOString(),
								sender: { id: 101, username: 'SMOKE_USER', avatar: '' },
								read_by: [101],
							},
						],
					}),
				})
			})

			await page.route('**/api/auth/csrf', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
			})

			let cancelCalled = false
			await page.route('**/api/chat/invites/77/cancel', async (route) => {
				cancelCalled = true
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						invite: {
							id: 77,
							status: 'cancelled',
							sender_id: 101,
							receiver_id: 202,
							cancel_reason: 'manual_cancel',
						},
					}),
				})
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await openConversationThread(page, 1)
			await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible()
			await page.getByRole('button', { name: 'Annuler', exact: true }).click()

			await expect.poll(() => cancelCalled).toBeTruthy()
			await expect(page.getByText('Invitation annulee')).toBeVisible()
		})
	})
})
