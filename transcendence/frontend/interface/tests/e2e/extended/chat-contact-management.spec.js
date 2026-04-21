import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { withRoleSessions } from '../helpers/multiUser.js'
import { waitForChatDrawerReady, waitForDashboardReady } from '../helpers/waits.js'

async function mockDashboardShell(page) {
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
}

test.describe('wave c - contacts routes', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('search users and send friend request from contacts', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockDashboardShell(page)

			let friendRequestCalled = false
			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
			})
			await page.route('**/api/auth/search?q=US**', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						users: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
					}),
				})
			})
			await page.route('**/api/auth/friends/request', async (route) => {
				friendRequestCalled = true
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						friendship_id: 701,
						status: 'pending',
						is_sender: true,
						user: { id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true },
					}),
				})
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await waitForChatDrawerReady(page)
			await page.getByTitle('Contacts').click()

			await page.locator('.chat-contacts-tabs .chat-tab').last().click()
			await page.getByPlaceholder('Rechercher un joueur...').fill('USER')
			await expect(page.locator('.chat-contact-list .chat-contact-item').first().locator('.chat-contact-name').first()).toHaveText('USER_B')
			await page.locator('.chat-contact-list .chat-contact-item').first().getByTitle('Ajouter en ami').click()

			await expect.poll(() => friendRequestCalled).toBeTruthy()
		})
	})

	test('accept, block, unblock and delete use friends action endpoint', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockDashboardShell(page)

			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						friends: [
							{
								friendship_id: 11,
								status: 'pending',
								is_sender: false,
								user: { id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true },
							},
							{
								friendship_id: 14,
								status: 'pending',
								is_sender: false,
								user: { id: 205, username: 'USER_C', avatar: '', coalition: 'fire', is_online: false },
							},
							{
								friendship_id: 12,
								status: 'accepted',
								is_sender: true,
								user: { id: 203, username: 'USER_D', avatar: '', coalition: 'earth', is_online: true },
							},
							{
								friendship_id: 13,
								status: 'blocked',
								is_sender: true,
								user: { id: 204, username: 'USER_E', avatar: '', coalition: 'wind', is_online: false },
							},
						],
					}),
				})
			})

			const actions = []
			await page.route('**/api/auth/friends/*', async (route) => {
				const req = route.request()
				const method = req.method()
				const body = req.postDataJSON?.() || null
				actions.push({ method, body, url: req.url() })
				if (method === 'DELETE') {
					await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
					return
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						friendship_id: 11,
						status: body?.action || 'accepted',
						is_sender: true,
						user: { id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true },
					}),
				})
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await waitForChatDrawerReady(page)
			await page.getByTitle('Contacts').click()

			await page.getByRole('button', { name: /En attente/ }).click()
			await page.locator('.chat-contact-list .chat-contact-item').nth(0).getByTitle('Accepter').click()
			await expect.poll(() => actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'accept')).toBeTruthy()
			await page.locator('.chat-contact-list .chat-contact-item').nth(1).getByTitle('Refuser').click()
			await expect.poll(() => actions.some((entry) => entry.method === 'DELETE')).toBeTruthy()

			await page.getByRole('button', { name: /Amis/ }).click()
			await page.getByTitle('Bloquer').click()
			await expect.poll(() => actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'block')).toBeTruthy()

			await page.getByRole('button', { name: /Bloques/ }).click()
			await page.getByTitle('Debloquer').click()
			await expect.poll(() => actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'unblock')).toBeTruthy()

			expect(actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'accept')).toBeTruthy()
			expect(actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'block')).toBeTruthy()
			expect(actions.some((entry) => entry.method === 'PUT' && entry.body?.action === 'unblock')).toBeTruthy()
			expect(actions.some((entry) => entry.method === 'DELETE')).toBeTruthy()
		})
	})

	test('friend request conflict does not crash contact search flow', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockDashboardShell(page)

			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
			})
			await page.route('**/api/auth/search?q=US**', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						users: [{ id: 202, username: 'USER_B', avatar: '', coalition: 'water', is_online: true }],
					}),
				})
			})

			let requestCalled = false
			await page.route('**/api/auth/friends/request', async (route) => {
				requestCalled = true
				await route.fulfill({
					status: 409,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Demande deja envoyee' }),
				})
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await waitForChatDrawerReady(page)
			await page.getByTitle('Contacts').click()

			await page.locator('.chat-contacts-tabs .chat-tab').last().click()
			await page.getByPlaceholder('Rechercher un joueur...').fill('USER')
			await page.locator('.chat-contact-list .chat-contact-item').first().getByTitle('Ajouter en ami').click()

			await expect.poll(() => requestCalled).toBeTruthy()
			await expect(page.locator('.chat-contact-list .chat-contact-item').first().locator('.chat-contact-name').first()).toHaveText('USER_B')
		})
	})

	test('short search query does not trigger search endpoint', async ({ browser }) => {
		await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
			const { page } = SMOKE_USER
			await mockDashboardShell(page)

			await page.route('**/api/auth/friends', async (route) => {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
			})

			let searchCalls = 0
			await page.route('**/api/auth/search**', async (route) => {
				searchCalls += 1
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) })
			})

			await page.goto('/dashboard')
			await waitForDashboardReady(page)
			await page.getByTestId('chat-open-button').click()
			await waitForChatDrawerReady(page)
			await page.getByTitle('Contacts').click()

			await page.locator('.chat-contacts-tabs .chat-tab').last().click()
			await page.getByPlaceholder('Rechercher un joueur...').fill('U')

			await page.waitForTimeout(400)
			expect(searchCalls).toBe(0)
		})
	})
})
