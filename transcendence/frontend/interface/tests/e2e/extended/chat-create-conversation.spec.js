import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { waitForChatDrawerReady, waitForDashboardReady } from '../helpers/waits.js'

test.describe('création de conversation depuis les contacts', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie qu'un clic depuis les contacts crée bien une conversation privée.
	test('starting a chat from contacts calls create conversation endpoint', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER

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
			await page.route('**/api/chat/conversations', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) })
			})

			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						friends: [
							{
								friendship_id: 11,
								status: 'accepted',
								is_sender: true,
								user: { id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true },
							},
						],
					}),
				})
			})

			let createCalled = false
			await page.route('**/api/chat/conversations/create', async (route) => {
				createCalled = true
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 9,
						participants: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
						last_message: null,
						unread_count: 0,
					}),
				})
			})

			await page.route('**/api/chat/conversations/9/messages**', async (route) => {
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

			await page.getByTitle('Contacts').click()
			await page.getByTitle('Envoyer un message').click()

			await expect.poll(() => createCalled).toBeTruthy()
			await expect(page.getByTestId('chat-thread')).toBeVisible()
			await expect(page.getByTestId('chat-thread').getByText('USER_B')).toBeVisible()
		})
	})

	// Vérifie qu'un conflit de conversation laisse l'écran cohérent sans ouvrir de thread cassé.
	test('contact chat start gracefully handles conflict response', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER

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
			await page.route('**/api/chat/conversations', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) })
			})

			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						friends: [
							{
								friendship_id: 11,
								status: 'accepted',
								is_sender: true,
								user: { id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true },
							},
						],
					}),
				})
			})

			let createCalled = false
			await page.route('**/api/chat/conversations/create', async (route) => {
				createCalled = true
				await route.fulfill({
					status: 409,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Conversation conflict' }),
				})
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await waitForChatDrawerReady(page)

			await page.getByTitle('Contacts').click()
			await page.getByTitle('Envoyer un message').click()

			await expect.poll(() => createCalled).toBeTruthy()
			await expect(page.getByTestId('chat-thread')).toHaveCount(0)
		})
	})
})
