import { expect, test } from '@playwright/test'

test.describe('auth 2fa resend code', () => {
	test('resend code starts countdown after successful request', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/login', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: '2fa_required',
					user_id: 101,
					pre_auth_token: 'pre-auth-token',
					email: 'smoke@example.test',
				}),
			})
		})

		let resendCalled = false
		await page.route('**/api/auth/resend-code', async (route) => {
			resendCalled = true
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ status: '2fa_required', message: 'Verification code sent. Check your email.' }),
			})
		})

		await page.goto('/auth')
		await page.locator('#login-email').fill('smoke@example.test')
		await page.locator('#login-password').fill('smoke-password')
		await page.getByRole('button', { name: 'Se Connecter', exact: true }).click()

		await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible()
		await page.getByRole('button', { name: 'Resend Code', exact: true }).click()
		await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeVisible()
		expect(resendCalled).toBeTruthy()
	})

	test('resend code shows error on invalid pre-auth token', async ({ page }) => {
		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthenticated' }) })
		})

		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/login', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: '2fa_required',
					user_id: 101,
					pre_auth_token: 'expired-token',
					email: 'smoke@example.test',
				}),
			})
		})

		await page.route('**/api/auth/resend-code', async (route) => {
			await route.fulfill({
				status: 401,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Invalid or expired pre-auth token' }),
			})
		})

		await page.goto('/auth')
		await page.locator('#login-email').fill('smoke@example.test')
		await page.locator('#login-password').fill('smoke-password')
		await page.getByRole('button', { name: 'Se Connecter', exact: true }).click()
		await expect(page.getByRole('heading', { name: 'Verify Your Email' })).toBeVisible()

		await page.getByRole('button', { name: 'Resend Code', exact: true }).click()
		await expect(page.getByText('Invalid or expired pre-auth token')).toBeVisible()
	})
})
