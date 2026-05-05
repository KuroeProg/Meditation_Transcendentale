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

test('export data button downloads JSON snapshot', async ({ page }) => {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/me/client-settings', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefs: {} }) }),
	)

	const exportPayload = {
		export_version: 1,
		exported_at: '2026-04-26T12:00:00+00:00',
		profile: { id: 101, username: 'SMOKE_USER' },
		client_prefs: {},
		games: [],
		game_invites: [],
		conversations: [],
		messages_truncated: false,
	}

	await page.route('**/api/auth/me/export-data', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json; charset=utf-8',
			headers: {
				'Content-Disposition': 'attachment; filename="transcendence-export-user-101.json"',
			},
			body: JSON.stringify(exportPayload),
		})
	})

	await page.goto('/settings')

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByTestId('settings-export-server-data').click(),
	])
	expect(download.suggestedFilename()).toMatch(/export.*101/)
	await expect(page.getByTestId('settings-export-server-done')).toBeVisible({ timeout: 5000 })
})
