import { expect, test } from '@playwright/test'

test.describe('wave c - seed users route', () => {
	test('seed users endpoint returns success payload', async ({ page }) => {
		await page.route('**/api/auth/csrf', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.route('**/api/auth/seed-users', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true, created: 4, updated: 0 }),
			})
		})

		await page.goto('/auth')
		const result = await page.evaluate(async () => {
			await fetch('/api/auth/csrf', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' },
			})
			const response = await fetch('/api/auth/seed-users', {
				method: 'POST',
				credentials: 'include',
			})
			const payload = await response.json().catch(() => ({}))
			return { status: response.status, payload }
		})

		expect(result.status).toBe(200)
		expect(result.payload.ok).toBeTruthy()
	})
})
