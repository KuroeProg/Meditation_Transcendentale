import { expect, test } from '@playwright/test'

test('2FA required branch verifies code and completes login', async ({ page }) => {
	await page.route('**/api/auth/me', async (route) => {
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Unauthenticated' }),
		})
	})

	await page.route('**/api/auth/csrf', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ok: true }),
		})
	})

	await page.route('**/api/auth/login', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				status: '2fa_required',
				user_id: 101,
				pre_auth_token: 'e2e-pre-auth-token',
				email: 'smoke@example.test',
				message: '2FA required',
			}),
		})
	})

	await page.route('**/api/auth/verify-2fa', async (route) => {
		const payload = route.request().postDataJSON()
		await route.fulfill({
			status: payload?.code === '123456' ? 200 : 400,
			contentType: 'application/json',
			body: JSON.stringify(
				payload?.code === '123456'
					? {
							user: {
								id: 101,
								username: 'SMOKE_USER',
								first_name: 'Smoke',
								last_name: 'User',
								email: 'smoke@example.test',
								coalition: 'water',
								is_online: true,
							},
						}
					: { error: 'Invalid code' },
			),
		})
	})

	await page.goto('/auth')
	await page.locator('#login-email').fill('smoke@example.test')
	await page.locator('#login-password').fill('smoke-password')
	await page.getByRole('button', { name: 'Se Connecter', exact: true }).click()

	await expect(page.getByText('Verify Your Email')).toBeVisible()
	await page.locator('.code-input').fill('123456')

	await page.waitForURL((url) => !url.pathname.startsWith('/auth'))
	await expect(page).not.toHaveURL(/\/auth/)
})
