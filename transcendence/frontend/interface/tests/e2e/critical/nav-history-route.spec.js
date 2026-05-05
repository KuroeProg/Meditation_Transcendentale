import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForDashboardReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('navigation — route /history', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('authenticated user reaches /history and sees the history page', async ({ page }) => {
		await page.goto('/history')
		await expect(page.getByTestId('history-page')).toBeVisible()
	})

	test('sidebar contains Annales link pointing to /history', async ({ page }) => {
		await page.goto('/dashboard')
		await waitForDashboardReady(page)

		const sidebarLink = page.locator('.sidebar-navlink[href="/history"]')
		await expect(sidebarLink).toBeVisible()
		await sidebarLink.click()
		await expect(page).toHaveURL(/\/history/)
		await expect(page.getByTestId('history-page')).toBeVisible()
	})

	test('unauthenticated user is redirected away from /history', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: undefined })
		const page = await ctx.newPage()
		await page.goto('/history')
		await expect(page).not.toHaveURL(/\/history/)
		await ctx.close()
	})
})
