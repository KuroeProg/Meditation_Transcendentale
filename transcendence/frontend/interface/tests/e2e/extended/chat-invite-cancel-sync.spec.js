import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installChatWebSocketMock, installNotificationsWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('wave c - sender invite cancel sync', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('sender card updates to cancelled when invite_updated websocket event arrives', async ({ page }) => {
		await installChatWebSocketMock(page, 1)
		await installNotificationsWebSocketMock(page, 101)

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

		await page.goto('/dashboard')
		await page.getByTestId('chat-open-button').click()
		await page.getByTestId('chat-conversation-item-1').click()
		await expect(page.getByTestId('chat-game-invite-card')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible()

		await page.evaluate(() => {
			window.__e2eNotificationsMock.triggerEvent({
				action: 'invite_updated',
				invite: {
					id: 77,
					status: 'cancelled',
					sender_id: 101,
					receiver_id: 202,
					time_control: '3+2',
					competitive: false,
				},
			})
		})

		await expect(page.getByText('Invitation annulee')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toHaveCount(0)
	})
})
