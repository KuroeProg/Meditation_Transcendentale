import { expect, test } from '@playwright/test'

import { waitForDashboardReady } from '../helpers/waits.js'

test.describe('callback OAuth 42', () => {
	// Vérifie qu'un callback valide ramène l'utilisateur sur le dashboard.
	test('oauth callback redirects to dashboard on success', async ({ page }) => {
		await page.route('**/api/auth/42/callback**', async (route) => {
			await route.fulfill({
				status: 302,
				headers: {
					location: '/dashboard',
				},
				body: '',
			})
		})

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

		await page.goto('/api/auth/42/callback?code=ok-code&state=ok-state')
		await expect(page).toHaveURL(/\/dashboard$/)
		await waitForDashboardReady(page)
	})

	// Vérifie que l'état invalide est rejeté avec une erreur HTTP 400.
	test('oauth callback returns 400 on invalid state', async ({ page }) => {
		await page.route('**/api/auth/42/callback**', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Invalid state parameter' }),
			})
		})

		const response = await page.goto('/api/auth/42/callback?code=fake&state=invalid')
		expect(response?.status()).toBe(400)
	})
})
