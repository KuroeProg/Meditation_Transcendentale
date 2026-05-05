import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('in-game history panel', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await installMatchmakingWebSocketMock(page)
		await page.goto('/game/training')
		await waitForGameShellReady(page)
	})

	test('stats panel shows "Parties" tab', async ({ page }) => {
		const partiesTab = page.getByRole('tab', { name: /parties/i })
		await expect(partiesTab).toBeVisible()
	})

	test('clicking "Parties" tab shows the in-game history panel', async ({ page }) => {
		await page.getByRole('tab', { name: /parties/i }).click()
		await expect(page.getByTestId('ingame-history-panel')).toBeVisible()
		await expect(page.getByRole('button', { name: /^Bullet$/i })).toBeVisible()
		await expect(page.getByRole('button', { name: /^Puzzle$/i })).toHaveCount(0)
	})

	test('in-game history panel displays at least one game row', async ({ page }) => {
		await page.getByRole('tab', { name: /parties/i }).click()
		const list = page.getByTestId('ingame-history-list')
		await expect(list).toBeVisible()
		const rows = list.locator('[data-testid^="ingame-history-row-"]')
		await expect(rows.first()).toBeVisible()
	})

	test('clicking a game row in panel expands its detail', async ({ page }) => {
		await page.getByRole('tab', { name: /parties/i }).click()
		const firstRow = page.locator('[data-testid^="ingame-history-row-"]').first()
		await firstRow.click()
		await expect(firstRow).toHaveAttribute('aria-expanded', 'true')
	})
})
