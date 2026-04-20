import { expect, test } from '@playwright/test'

test('home loads with primary CTA', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByTestId('home-page')).toBeVisible()
	await expect(page.getByTestId('home-login-cta')).toBeVisible()
})
