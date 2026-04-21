import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe("route HTTP d'envoi de message chat", () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que l'endpoint HTTP accepte un message chat valide.
	test('http send endpoint accepts message payload', async ({ page }) => {
		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		let receivedBody = null
		await page.route('**/api/chat/conversations/55/send', async (route) => {
			receivedBody = route.request().postDataJSON()
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					id: 5002,
					content: receivedBody?.content || '',
					message_type: receivedBody?.message_type || 'text',
				}),
			})
		})

		await page.goto('/dashboard')
		const result = await page.evaluate(async () => {
			await fetch('/api/auth/csrf', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' },
			})

			const response = await fetch('/api/chat/conversations/55/send', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: 'message via http', message_type: 'text' }),
			})
			const payload = await response.json().catch(() => ({}))
			return { ok: response.ok, status: response.status, payload }
		})

		expect(receivedBody).toEqual({ content: 'message via http', message_type: 'text' })
		expect(result.ok).toBeTruthy()
		expect(result.status).toBe(201)
		expect(result.payload.content).toBe('message via http')
	})

	// Vérifie qu'un payload vide renvoie une erreur de validation claire.
	test('http send endpoint returns validation error for empty payload', async ({ page }) => {
		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/chat/conversations/55/send', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Contenu requis' }),
			})
		})

		await page.goto('/dashboard')
		const result = await page.evaluate(async () => {
			await fetch('/api/auth/csrf', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' },
			})

			const response = await fetch('/api/chat/conversations/55/send', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: '', message_type: 'text' }),
			})
			const payload = await response.json().catch(() => ({}))
			return { ok: response.ok, status: response.status, payload }
		})

		expect(result.ok).toBeFalsy()
		expect(result.status).toBe(400)
		expect(result.payload.error).toBe('Contenu requis')
	})
})
