/**
 * Panneau droit en partie — onglet « Parties » : liste branchée sur GET /api/game/history.
 */
import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

const MOCK_GAME_ID = 88901

const MOCK_HISTORY_LIST = {
	games: [
		{
			id: MOCK_GAME_ID,
			result: 'win',
			score: '1-0',
			format: 'blitz',
			formatLabel: 'Blitz',
			date: new Date().toISOString(),
			opponent: { id: 777, username: 'INGAME_PANEL_OPP', coalition: 'eau', elo: 1500, isBot: false },
			moveCount: 24,
			competitive: true,
			duration_seconds: 334,
		},
	],
	total: 1,
	limit: 40,
	offset: 0,
}

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

async function mockIngameHistoryList(page) {
	await page.route('**/api/game/history**', async (route) => {
		if (route.request().method() !== 'GET') {
			await route.continue()
			return
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(MOCK_HISTORY_LIST),
		})
	})
}

test.describe('panneau jeu — onglet Parties et API historique', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('ouvre l’onglet Parties et affiche les lignes renvoyées par l’API', async ({ page }) => {
		await mockIngameHistoryList(page)
		await page.goto('/game/training')
		await waitForGameShellReady(page)
		await page.getByTestId('stats-tab-history').click()
		await expect(page.getByTestId('ingame-history-loading')).toBeHidden({ timeout: 8000 })
		await expect(page.getByTestId(`ingame-history-row-${MOCK_GAME_ID}`)).toBeVisible()
		await expect(page.getByTestId('ingame-history-list')).toContainText('INGAME_PANEL_OPP')
	})
})
