import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'
import { installUnstableOnlineGameWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('récupération après déconnexion websocket en partie', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie que l'écran de jeu reste exploitable après déconnexion puis recharge la session WebSocket.
	test('game shell stays usable after disconnect and recovers websocket state after reload', async ({ page }) => {
		await installUnstableOnlineGameWebSocketMock(page, 'unstable-1')

		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ id: 101, username: 'SMOKE_USER', coalition: 'water' }),
			})
		})
		await page.route('**/api/auth/friends?status=accepted', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
		})
		await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
		})

		await page.goto('/game/unstable-1')
		await waitForGameShellReady(page)

		await page.evaluate(() => {
			document.querySelector('.game-debug-hud')?.click()
		})
		const debugHud = page.locator('.game-debug-hud')
		await expect(debugHud).toContainText('WS:')
		await expect(debugHud).toContainText('WS: ok')

		await page.evaluate(() => {
			window.__e2eOnlineGameMock.triggerDisconnect()
		})

		await expect(debugHud).toContainText('WS: ko')
		await expect(page.getByTestId('game-board-frame')).toBeVisible()

		await page.reload()
		await waitForGameShellReady(page)
		await page.evaluate(() => {
			document.querySelector('.game-debug-hud')?.click()
		})
		await expect(page.locator('.game-debug-hud')).toContainText('WS: ok')
		await expect(page.locator('.game-debug-hud')).toContainText('Status: active')
	})
})
