import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('in-game stats panel — BGM in section headers', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await installMatchmakingWebSocketMock(page)
		await page.goto('/game/training')
		await waitForGameShellReady(page)
	})

	test('moves tab shows ghv header with player labels and one BGM control', async ({ page }) => {
		await expect(page.getByTestId('ingame-moves-ghv-header')).toBeVisible()
		await expect(page.getByTestId('ingame-bgm-fab')).toBeVisible()
		await expect(page.locator('[data-testid="ingame-bgm-fab"]')).toHaveCount(1)
		await expect(page.getByText(/Blancs\s*:/)).toBeVisible()
		await expect(page.getByText(/Noirs\s*:/)).toBeVisible()
	})

	test('Parties tab: Annales header + BGM', async ({ page }) => {
		await page.getByRole('tab', { name: /parties/i }).click()
		await expect(page.getByTestId('ingame-bgm-fab')).toBeVisible()
		await expect(page.locator('[data-testid="ingame-bgm-fab"]')).toHaveCount(1)
		await expect(page.getByTestId('ingame-history-ghv-header')).toBeVisible()
	})

	test('Chat tab: header + BGM', async ({ page }) => {
		await page.getByRole('tab', { name: /chat/i }).click()
		await expect(page.getByTestId('ingame-bgm-fab')).toBeVisible()
		await expect(page.locator('[data-testid="ingame-bgm-fab"]')).toHaveCount(1)
		await expect(page.getByTestId('ingame-chat-ghv-header')).toBeVisible()
	})

	test('Amis tab: header + BGM + friend cards', async ({ page }) => {
		await page.getByRole('tab', { name: /amis/i }).click()
		await expect(page.getByTestId('ingame-bgm-fab')).toBeVisible()
		await expect(page.locator('[data-testid="ingame-bgm-fab"]')).toHaveCount(1)
		await expect(page.getByTestId('ingame-friends-ghv-header')).toBeVisible()
		await expect(page.getByTestId('ingame-friends-wrap')).toBeVisible()
	})
})
