import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('history page', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await page.goto('/history')
		await expect(page.getByTestId('history-page')).toBeVisible()
	})

	test('shows the filter bar', async ({ page }) => {
		await expect(page.getByTestId('history-filters')).toBeVisible()
	})

	test('shows the game list with at least one row', async ({ page }) => {
		const list = page.getByTestId('history-game-list')
		await expect(list).toBeVisible()
		const rows = list.locator('[data-testid^="history-row-"]')
		await expect(rows.first()).toBeVisible()
	})

	test('clicking a row expands the detail panel', async ({ page }) => {
		const firstRow = page.locator('[data-testid^="history-row-"]').first()
		await firstRow.click()
		const detail = page.locator('[data-testid^="history-row-detail-"]').first()
		await expect(detail).toBeVisible()
	})

	test('filter chip "Victoires" reduces or maintains the game list', async ({ page }) => {
		const list = page.getByTestId('history-game-list')
		const initialCount = await list.locator('[data-testid^="history-row-"]').count()

		const victoiresChip = page.getByRole('button', { name: /victoires/i })
		await victoiresChip.click()
		const filteredCount = await list.locator('[data-testid^="history-row-"]').count()
		expect(filteredCount).toBeLessThanOrEqual(initialCount)
	})

	test('filter chip "Tout" restores the full list', async ({ page }) => {
		const list = page.getByTestId('history-game-list')
		const totalCount = await list.locator('[data-testid^="history-row-"]').count()

		await page.getByRole('button', { name: /victoires/i }).click()
		await page.getByRole('button', { name: /tout/i }).click()
		const restoredCount = await list.locator('[data-testid^="history-row-"]').count()
		expect(restoredCount).toBe(totalCount)
	})

	test('a row is keyboard-accessible (Enter key expands detail)', async ({ page }) => {
		const firstRow = page.locator('[data-testid^="history-row-"]').first()
		await firstRow.focus()
		await page.keyboard.press('Enter')
		const detail = page.locator('[data-testid^="history-row-detail-"]').first()
		await expect(detail).toBeVisible()
	})
})
