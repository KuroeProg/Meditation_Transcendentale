import { expect, test } from '@playwright/test'

test.describe('auth reset password', () => {
	// Vérifie qu'un token valide permet la mise à jour du mot de passe.
	test('reset password succeeds with valid token', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/reset-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true, message: 'Mot de passe mis a jour avec succes' }),
			})
		})

		await page.goto('/auth/reset-password?token=valid-token')
		await page.getByPlaceholder('Nouveau mot de passe').fill('new-password-1234')
		await page.getByPlaceholder('Confirme le mot de passe').fill('new-password-1234')
		await page.getByRole('button', { name: 'Changer le mot de passe', exact: true }).click()

		await expect(page.getByText('Mot de passe mis a jour avec succes')).toBeVisible()
	})

	// Vérifie qu'un token invalide/expiré remonte l'erreur backend.
	test('reset password shows backend token error', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/reset-password', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Lien invalide ou expire' }),
			})
		})

		await page.goto('/auth/reset-password?token=expired-token')
		await page.getByPlaceholder('Nouveau mot de passe').fill('new-password-1234')
		await page.getByPlaceholder('Confirme le mot de passe').fill('new-password-1234')
		await page.getByRole('button', { name: 'Changer le mot de passe', exact: true }).click()

		await expect(page.getByText('Lien invalide ou expire')).toBeVisible()
	})

	// Vérifie que l'absence de token est bloquée localement sans appel API.
	test('reset password validates missing token before backend call', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		let resetCalled = false
		await page.route('**/api/auth/reset-password', async (route) => {
			resetCalled = true
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Lien invalide ou expire' }),
			})
		})

		await page.goto('/auth/reset-password')
		await page.getByPlaceholder('Nouveau mot de passe').fill('new-password-1234')
		await page.getByPlaceholder('Confirme le mot de passe').fill('new-password-1234')
		await page.getByRole('button', { name: 'Changer le mot de passe', exact: true }).click()

		await expect(page.getByText('Lien de reinitialisation invalide.')).toBeVisible()
		expect(resetCalled).toBeFalsy()
	})
})
