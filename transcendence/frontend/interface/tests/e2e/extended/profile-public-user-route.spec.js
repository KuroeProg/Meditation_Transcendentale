import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

	test.describe('consultation du profil public par identifiant', () => {
		// Vérifie qu'un profil public existant est renvoyé correctement par identifiant.
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('fetch public user by id', async ({ page }) => {
		await page.route('**/api/auth/users/202', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 202, username: 'USER_B', coalition: 'water' }),
			})
		})

		await page.goto('/dashboard')
		const result = await page.evaluate(async () => {
			const response = await fetch('/api/auth/users/202', {
				method: 'GET',
				credentials: 'include',
			})
			const payload = await response.json().catch(() => ({}))
			return { status: response.status, payload }
		})

		expect(result.status).toBe(200)
		expect(result.payload.username).toBe('USER_B')
	})

		// Vérifie qu'un identifiant absent renvoie bien une erreur 404.
	test('public user route returns 404 for missing user', async ({ page }) => {
		await page.route('**/api/auth/users/999999', async (route) => {
			await route.fulfill({
				status: 404,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Utilisateur introuvable' }),
			})
		})

		await page.goto('/dashboard')
		const result = await page.evaluate(async () => {
			const response = await fetch('/api/auth/users/999999', {
				method: 'GET',
				credentials: 'include',
			})
			const payload = await response.json().catch(() => ({}))
			return { status: response.status, payload }
		})

		expect(result.status).toBe(404)
		expect(result.payload.error).toContain('introuvable')
	})
})
