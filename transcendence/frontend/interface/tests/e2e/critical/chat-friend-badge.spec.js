/**
 * Badge « demande d'ami » sur le bouton chat flottant (ChatFabCluster).
 *
 * Vérifie :
 *  - pastille verte absente quand aucune demande d'ami en attente
 *  - pastille verte présente quand GET /api/auth/friends?status=pending retourne
 *    une demande reçue (is_sender === false)
 *  - pastille absente quand la demande est envoyée par soi-même (is_sender === true)
 */
import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { installChatWebSocketMock } from '../helpers/wsMocks.js'

const SESSION_USER = {
	id: 101,
	username: 'SMOKE_USER',
	email: 'smoke@example.test',
	coalition: 'water',
	is_online: true,
}

const PENDING_FRIEND_RECEIVED = {
	friendship_id: 99,
	status: 'pending',
	is_sender: false,
	user: { id: 303, username: 'REQUESTER', avatar: '', coalition: 'fire', is_online: false },
}

const PENDING_FRIEND_SENT = {
	friendship_id: 98,
	status: 'pending',
	is_sender: true,
	user: { id: 304, username: 'TARGET', avatar: '', coalition: 'earth', is_online: false },
}

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

async function setupPage(page, { pendingFriends = [] } = {}) {
	await installChatWebSocketMock(page, SESSION_USER.id)

	await page.route('**/api/auth/me', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/leaderboard**', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ leaderboard: [], current_user_rank: null }) }),
	)
	await page.route('**/api/chat/invites/pending-outgoing', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) }),
	)
	await page.route('**/api/chat/conversations', (r) =>
		r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [] }) }),
	)
	await page.route('**/api/auth/friends*', async (route) => {
		const u = new URL(route.request().url())
		const status = u.searchParams.get('status')
		if (status === 'pending') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ friends: pendingFriends }),
			})
			return
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ friends: [] }),
		})
	})

	await page.goto('/dashboard')
	await expect(page.getByTestId('chat-open-button')).toBeVisible({ timeout: 10_000 })
}

test.describe('badge demande d'ami sur le bouton chat', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('aucun badge ami quand la liste de demandes en attente est vide', async ({ page }) => {
		await setupPage(page, { pendingFriends: [] })
		const badge = page.locator('.chat-fab-badge--friend')
		await expect(badge).not.toBeVisible()
	})

	test('badge ami visible quand une demande d'ami reçue est en attente', async ({ page }) => {
		await setupPage(page, { pendingFriends: [PENDING_FRIEND_RECEIVED] })
		const badge = page.locator('.chat-fab-badge--friend')
		await expect(badge).toBeVisible({ timeout: 5_000 })
		await expect(badge).toContainText('1')
	})

	test('badge ami absent quand la demande en attente a été envoyée par soi-même', async ({ page }) => {
		await setupPage(page, { pendingFriends: [PENDING_FRIEND_SENT] })
		const badge = page.locator('.chat-fab-badge--friend')
		await expect(badge).not.toBeVisible()
	})

	test('badge ami affiche le bon compteur quand plusieurs demandes reçues', async ({ page }) => {
		const two = [
			PENDING_FRIEND_RECEIVED,
			{ ...PENDING_FRIEND_RECEIVED, friendship_id: 100, user: { ...PENDING_FRIEND_RECEIVED.user, id: 305 } },
		]
		await setupPage(page, { pendingFriends: two })
		const badge = page.locator('.chat-fab-badge--friend')
		await expect(badge).toBeVisible({ timeout: 5_000 })
		await expect(badge).toContainText('2')
	})
})
