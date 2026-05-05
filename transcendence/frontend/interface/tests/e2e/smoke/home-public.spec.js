import { expect, test } from '../testWithLogging'

// Vérifie que la page d'accueil publique s'affiche avec son CTA principal.
test('home loads with primary CTA', async ({ page }) => {
	await page.goto('/')
	await expect(page.getByTestId('home-page')).toBeVisible()
	await expect(page.getByTestId('home-login-cta')).toBeVisible()
})
