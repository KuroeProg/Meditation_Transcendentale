import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

// Vérifie qu'une déconnexion remet l'UI publique et renvoie vers l'auth.
test('logout clears authenticated UI and returns to auth', async ({ page }) => {
	/* Bureau : déconnexion via la sidebar (même code logout + navigate) ; en ≤770px la bottom-nav fixe peut gêner le bouton profil. */
	await page.setViewportSize({ width: 1280, height: 900 })

	const sessionUser = {
		id: 101,
		username: 'SMOKE_USER',
		first_name: 'Smoke',
		last_name: 'User',
		email: 'smoke@example.test',
		coalition: 'water',
		is_online: true,
	}

	/* Avant déconnexion : session valide ; après clic : 401 comme un vrai backend qui invalide le cookie. */
	let sessionActive = true
	await page.route('**/api/auth/me', async (route) => {
		if (!sessionActive) {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				headers: { 'cache-control': 'no-store' },
				body: JSON.stringify({ error: 'Unauthenticated' }),
			})
			return
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'cache-control': 'no-store' },
			body: JSON.stringify(sessionUser),
		})
	})

	await page.route('**/api/auth/friends?status=accepted', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ friends: [] }),
		})
	})

	await page.route('**/api/auth/leaderboard**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ leaderboard: [], current_user_rank: null }),
		})
	})

	await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ invite: null }),
		})
	})

	await page.route('**/api/auth/csrf', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true }),
		})
	})

	const logoutOk = {
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ ok: true }),
	}
	const onLogoutPost = async (route) => {
		const method = route.request().method()
		if (method === 'OPTIONS') {
			await route.fulfill({
				status: 204,
				headers: {
					'access-control-allow-origin': '*',
					'access-control-allow-methods': 'POST, OPTIONS',
					'access-control-allow-headers': 'Content-Type, X-CSRFToken, Accept',
				},
			})
			return
		}
		if (method !== 'POST') {
			await route.fallback()
			return
		}
		sessionActive = false
		await route.fulfill(logoutOk)
	}
	await page.route('**/api/auth/logout', onLogoutPost)
	await page.route('**/api/auth/logout/', onLogoutPost)

	await page.goto('/profile')
	await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()

	/* Juste avant le clic : sous Vite, force_on dans le storage ferait sauter le POST logout. */
	await page.evaluate(() => {
		try {
			localStorage.removeItem('transcendance_dev_mock_mode')
			localStorage.removeItem('transcendance_dev_mock_coalition')
			localStorage.removeItem('transcendance_dev_mock_auth_provider')
		} catch {
			/* ignore */
		}
	})

	/* La sidebar repliée (75px) + overflow peut rogner le bouton ; le survol l’étend (250px), clic fiable. */
	await page.locator('.sidebar').hover()
	const sidebarLogout = page.getByTestId('sidebar-logout-button')
	await sidebarLogout.scrollIntoViewIfNeeded()
	await sidebarLogout.click({ timeout: 15_000 })
	await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 })
	await page.waitForLoadState('domcontentloaded')
	await expect(page.locator('#login-email')).toBeVisible({ timeout: 25_000 })
})
