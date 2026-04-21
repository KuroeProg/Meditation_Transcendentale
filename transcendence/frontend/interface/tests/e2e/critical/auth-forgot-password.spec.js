import { expect, test } from '@playwright/test'

test.describe('auth forgot password', () => {
	test('forgot password shows generic confirmation message', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/forgot-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.',
				}),
			})
		})

		await page.goto('/auth')
		await page.getByRole('button', { name: /Mot de passe oublie/i }).click()
		await page.getByPlaceholder('Adresse email').fill('smoke@example.test')
		await page.getByRole('button', { name: 'Envoyer le lien', exact: true }).click()

		await expect(page.getByText('Si un compte existe avec cet email')).toBeVisible()
	})

	test('forgot password surfaces API validation error', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/forgot-password', async (route) => {
			await route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Email requis' }),
			})
		})

		await page.goto('/auth')
		await page.getByRole('button', { name: /Mot de passe oublie/i }).click()
		await page.getByPlaceholder('Adresse email').fill('error-case@example.test')
		await page.getByRole('button', { name: 'Envoyer le lien', exact: true }).click()

		await expect(page.getByText('Email requis')).toBeVisible()
	})

	test('forgot password keeps generic message for unknown account', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/forgot-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.',
				}),
			})
		})

		await page.goto('/auth')
		await page.getByRole('button', { name: /Mot de passe oublie/i }).click()
		await page.getByPlaceholder('Adresse email').fill('unknown-user@example.test')
		await page.getByRole('button', { name: 'Envoyer le lien', exact: true }).click()

		await expect(page.getByText('Si un compte existe avec cet email')).toBeVisible()
	})
})
