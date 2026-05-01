import { expect, test } from '../testWithLogging'

// Vérifie que la racine publique répond et expose un titre de page cohérent.
test('landing page is reachable', async ({ page }) => {
	await page.goto('/')
	await expect(page).toHaveTitle(/Transcendance|Transcendence|Vite/i)
})
