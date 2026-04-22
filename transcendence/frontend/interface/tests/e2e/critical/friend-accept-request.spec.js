/**
 * Tests pour la correction du bouton "Accepter une demande d'ami" dans ContactSearch.
 * Couvre :
 *  - rendu du bouton d'acceptation quand une demande est en attente
 *  - état loading (aria-busy) pendant l'appel API
 *  - disparition du bouton après acceptation réussie
 *  - affichage d'un message d'erreur en cas d'échec API
 */
import { expect, test } from '@playwright/test'

import { withRoleSessions } from '../helpers/multiUser.js'
import { waitForDashboardReady } from '../helpers/waits.js'
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

const PENDING_FRIEND = {
	friendship_id: 42,
	status: 'pending',
	is_sender: false,
	user: {
		id: 202,
		username: 'USER_B',
		avatar: '',
		coalition: 'fire',
		is_online: true,
	},
}

async function setupPageWithPendingFriend(page, respondOverride) {
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
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) })
	)
	await page.route('**/api/auth/csrf', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
	)
	// Friends list with pending request
	await page.route('**/api/auth/friends', (r) =>
		r.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ friends: [PENDING_FRIEND] }),
		})
	)

	if (respondOverride) {
		await respondOverride(page)
	} else {
		await page.route('**/api/auth/friends/42/accept', (r) =>
			r.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ friendship_id: 42, status: 'accepted' }),
			})
		)
	}

	await page.goto('/dashboard')
	await waitForDashboardReady(page)
	await page.getByTestId('chat-open-button').click()

	// Navigate to contacts/friends tab
	await expect(page.getByTestId('chat-drawer')).toBeVisible()
}

test('accept button is visible for a pending friend request', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		await setupPageWithPendingFriend(page)

		// Open contacts view
		const contactsTab = page.locator('.chat-tab-btn', { hasText: /contacts|amis/i })
		if (await contactsTab.isVisible()) await contactsTab.click()

		const acceptBtn = page.getByTestId('friend-accept-42')
		await expect(acceptBtn).toBeVisible()
		await expect(acceptBtn).toBeEnabled()
	})
})

test('accept button shows loading state while API call is in-flight', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER

		let resolveAccept
		const acceptPromise = new Promise((r) => { resolveAccept = r })

		await setupPageWithPendingFriend(page, async (p) => {
			await p.route('**/api/auth/friends/42/accept', async (route) => {
				await acceptPromise
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friendship_id: 42, status: 'accepted' }) })
			})
		})

		const contactsTab = page.locator('.chat-tab-btn', { hasText: /contacts|amis/i })
		if (await contactsTab.isVisible()) await contactsTab.click()

		const acceptBtn = page.getByTestId('friend-accept-42')
		await acceptBtn.click()

		await expect(acceptBtn).toBeDisabled()
		await expect(acceptBtn).toHaveAttribute('aria-busy', 'true')

		resolveAccept()
	})
})

test('accept button disappears after successful accept', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER

		let acceptedFriend = { ...PENDING_FRIEND, status: 'accepted' }

		await setupPageWithPendingFriend(page, async (p) => {
			await p.route('**/api/auth/friends/42/accept', async (route) => {
				// After accept, update friends list to return accepted status
				await p.route('**/api/auth/friends', (r) =>
					r.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({ friends: [acceptedFriend] }),
					})
				)
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friendship_id: 42, status: 'accepted' }) })
			})
		})

		const contactsTab = page.locator('.chat-tab-btn', { hasText: /contacts|amis/i })
		if (await contactsTab.isVisible()) await contactsTab.click()

		const acceptBtn = page.getByTestId('friend-accept-42')
		await acceptBtn.click()
		await expect(acceptBtn).toBeHidden({ timeout: 3000 })
	})
})

test('accept button shows error message on API failure', async ({ browser }) => {
	await withRoleSessions(browser, ['SMOKE_USER'], async ({ SMOKE_USER }) => {
		const { page } = SMOKE_USER
		await setupPageWithPendingFriend(page, async (p) => {
			await p.route('**/api/auth/friends/42/accept', (r) =>
				r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) })
			)
		})

		const contactsTab = page.locator('.chat-tab-btn', { hasText: /contacts|amis/i })
		if (await contactsTab.isVisible()) await contactsTab.click()

		await page.getByTestId('friend-accept-42').click()
		await expect(page.locator('.chat-ca-error').first()).toBeVisible({ timeout: 3000 })
	})
})
