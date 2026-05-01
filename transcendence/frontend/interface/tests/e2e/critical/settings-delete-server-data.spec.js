import { expect, test } from '@playwright/test'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

const SESSION_USER = {
	id: 101,
	username: 'SMOKE_USER',
	first_name: 'Smoke',
	last_name: 'User',
	email: 'smoke@example.test',
	coalition: 'water',
	is_online: true,
}

async function setupBaseRoutes(page) {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/me/client-settings', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefs: {} }) }),
	)
}

// Vérifie que la section RGPD serveur envoie un email de confirmation.
test('server data deletion requests confirmation email', async ({ page }) => {
	await setupBaseRoutes(page)
	await page.route('**/api/auth/me/delete-data/request', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
	)
	await page.goto('/settings')

	const deleteBtn = page.getByTestId('settings-delete-server-data')
	await expect(deleteBtn).toBeVisible({ timeout: 5000 })
	await deleteBtn.click()
	await expect(page.getByTestId('settings-delete-server-email-sent')).toBeVisible({ timeout: 5000 })
	await expect(deleteBtn).toContainText('Email envoyé')
})

// Vérifie que la confirmation par token supprime et affiche le message final.
test('successful server data deletion via token shows confirmation message', async ({ page }) => {
	await setupBaseRoutes(page)

	await page.route('**/api/auth/me/delete-data/confirm', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
	)
	// Après déconnexion logout appellera /api/auth/logout
	await page.route('**/api/auth/logout', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
	)

	await page.goto('/settings?deleteToken=abc123')

	await expect(page.getByTestId('settings-delete-server-done')).toBeVisible({ timeout: 5000 })
})

// Vérifie que si le serveur renvoie une erreur, elle est affichée.
test('server data deletion request error is shown to user', async ({ page }) => {
	await setupBaseRoutes(page)

	await page.route('**/api/auth/me/delete-data/request', (route) =>
		route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur serveur' }) }),
	)

	await page.goto('/settings')

	const deleteBtn = page.getByTestId('settings-delete-server-data')
	await deleteBtn.click()

	await expect(page.getByTestId('settings-delete-server-error')).toBeVisible({ timeout: 5000 })
	await expect(page.getByTestId('settings-delete-server-error')).toContainText('Erreur serveur')
})
