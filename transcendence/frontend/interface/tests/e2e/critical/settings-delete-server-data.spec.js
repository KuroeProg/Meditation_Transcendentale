import { expect, test } from '../testWithLogging'
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

// Vérifie que la section RGPD serveur est visible et que la double confirmation fonctionne.
test('server data deletion section is visible and requires double confirmation', async ({ page }) => {
	await setupBaseRoutes(page)
	await page.goto('/settings')

	const deleteBtn = page.getByTestId('settings-delete-server-data')
	await expect(deleteBtn).toBeVisible({ timeout: 5000 })

	// Premier clic : passe à l'état de confirmation
	await deleteBtn.click()
	await expect(deleteBtn).toBeVisible()
	await expect(deleteBtn).toContainText('Confirmer')

	// Bouton Annuler doit apparaître
	await expect(page.getByTestId('settings-delete-server-cancel')).toBeVisible()
	await page.getByTestId('settings-delete-server-cancel').click()

	// Retour à l'état initial
	await expect(deleteBtn).toContainText('Supprimer')
})

// Vérifie que la suppression réussie affiche le message de confirmation.
test('successful server data deletion shows confirmation message', async ({ page }) => {
	await setupBaseRoutes(page)

	await page.route('**/api/auth/me/delete-data', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
	)
	// Après déconnexion logout appellera /api/auth/logout
	await page.route('**/api/auth/logout', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
	)

	await page.goto('/settings')

	const deleteBtn = page.getByTestId('settings-delete-server-data')
	await deleteBtn.click() // étape 1 → confirm
	await deleteBtn.click() // étape 2 → in-progress → done

	await expect(page.getByTestId('settings-delete-server-done')).toBeVisible({ timeout: 5000 })
})

// Vérifie que si le serveur renvoie une erreur, elle est affichée.
test('server data deletion error is shown to user', async ({ page }) => {
	await setupBaseRoutes(page)

	await page.route('**/api/auth/me/delete-data', (route) =>
		route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Erreur serveur' }) }),
	)

	await page.goto('/settings')

	const deleteBtn = page.getByTestId('settings-delete-server-data')
	await deleteBtn.click()
	await deleteBtn.click()

	await expect(page.getByTestId('settings-delete-server-error')).toBeVisible({ timeout: 5000 })
	await expect(page.getByTestId('settings-delete-server-error')).toContainText('Erreur serveur')
})
