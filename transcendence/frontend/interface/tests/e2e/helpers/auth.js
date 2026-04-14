import { expect } from '@playwright/test'

export async function login(page, email, password) {
	await page.goto('/auth')
	await page.locator('#login-email').fill(email)
	await page.locator('#login-password').fill(password)
	await page.getByRole('button', { name: /se connecter/i }).click()
	await expect(page).not.toHaveURL(/\/auth/)
}

export async function loginAndOpenDashboard(page, email, password) {
	await login(page, email, password)
	await page.goto('/dashboard')
	await expect(page.getByRole('button', { name: /commencer la partie/i })).toBeVisible()
}
