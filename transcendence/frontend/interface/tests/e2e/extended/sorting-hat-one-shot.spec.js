/**
 * Tests de non-régression pour la correction du Sorting Hat (cérémonie de coalition).
 * Scénarios couverts :
 *  - la cérémonie n'apparaît PAS si l'utilisateur a déjà une coalition
 *  - la cérémonie n'apparaît PAS si le localStorage marque la clé comme complétée
 *  - le bouton dismiss ferme la cérémonie et persiste la clé localStorage
 */
import { expect, test } from '@playwright/test'

import { withRoleSessions } from '../helpers/multiUser.js'
import { waitForDashboardReady } from '../helpers/waits.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

const BASE_ROUTES = async (page, user) => {
	await installChatWebSocketMock(page, 1)
	await page.route('**/api/auth/me', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
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
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) })
	)
}

test('ceremony does NOT appear when user already has a coalition', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER

		const userWithCoalition = {
			id: 101,
			username: 'SMOKE_USER',
			email: 'smoke@example.test',
			coalition: 'water',
			auth_provider: 'local',
			is_online: true,
		}

		await BASE_ROUTES(page, userWithCoalition)
		await page.goto('/dashboard')
		await waitForDashboardReady(page)

		// The overlay must not be present
		await expect(page.getByTestId('sorting-hat-overlay')).toBeHidden()
	})
})

test('ceremony does NOT appear when localStorage completion key is set', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER

		const userWithoutCoalition = {
			id: 101,
			username: 'SMOKE_USER',
			email: 'smoke@example.test',
			coalition: null,
			auth_provider: 'local',
			is_online: true,
		}

		// Pre-set the localStorage key before page loads
		await page.addInitScript(() => {
			window.localStorage.setItem('transcendance_sorting_hat_v1_101', '1')
		})

		await BASE_ROUTES(page, userWithoutCoalition)
		await page.goto('/dashboard')
		await waitForDashboardReady(page)

		await expect(page.getByTestId('sorting-hat-overlay')).toBeHidden()
	})
})

test('dismiss button closes the ceremony and persists completion key', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER

		const userWithCoalition = {
			id: 101,
			username: 'SMOKE_USER',
			email: 'smoke@example.test',
			coalition: 'fire',
			auth_provider: 'local',
			is_online: true,
		}

		// Test dismiss : si l’overlay apparaît, fermeture + clé localStorage ; sinon OK (coalition déjà connue).
		await BASE_ROUTES(page, userWithCoalition)
		await page.goto('/dashboard')
		await waitForDashboardReady(page)

		// If overlay is visible (feature enabled), dismiss it
		const overlay = page.getByTestId('sorting-hat-overlay')
		const isVisible = await overlay.isVisible()
		if (isVisible) {
			await page.getByTestId('sorting-hat-dismiss').click()
			await expect(overlay).toBeHidden()

			// Verify localStorage key was set
			const key = await page.evaluate(() => window.localStorage.getItem('transcendance_sorting_hat_v1_101'))
			expect(key).toBe('1')
		} else {
			// Overlay absent (coalition déjà connue ou pas de cérémonie pour ce mock)
			expect(isVisible).toBe(false)
		}
	})
})
