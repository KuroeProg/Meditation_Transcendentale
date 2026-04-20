import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('wave c - non-chat invite notification', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('invite unread badge and toast update on dashboard without opening chat', async ({ page }) => {
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
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
		})

		let inboxTick = 0
		await page.route('**/api/chat/conversations', async (route) => {
			inboxTick += 1
			const unreadInvite = inboxTick > 1 ? 1 : 0
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					conversations: [
						{
							id: 1,
							participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
							last_message: { id: 99, message_type: 'text', content: 'Salut' },
							unread_count: unreadInvite,
							unread_text_count: 0,
							unread_invite_count: unreadInvite,
						},
					],
				}),
			})
		})

		await page.goto('/dashboard')
		await expect(page.getByTestId('chat-fab-cluster')).toBeVisible()
		await expect(page.locator('.chat-fab-badge--invite')).toHaveCount(0)

		await page.evaluate(() => {
			window.dispatchEvent(new Event('focus'))
		})

		await expect(page.locator('.chat-fab-badge--invite')).toContainText('1')
		await expect(page.getByTestId('chat-toast-button')).toBeVisible()
	})
})
