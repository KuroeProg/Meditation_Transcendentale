import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'
import { installMatchmakingWebSocketMock } from '../helpers/wsMocks.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('in-game chat shell', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test.beforeEach(async ({ page }) => {
		await installMatchmakingWebSocketMock(page)
		await page.goto('/game/training')
		await waitForGameShellReady(page)
		await page.getByRole('tab', { name: /chat/i }).click()
	})

	test('stats panel shows "Chat" tab', async ({ page }) => {
		await expect(page.getByRole('tab', { name: /chat/i })).toBeVisible()
	})

	test('switching to Chat tab renders the chat shell', async ({ page }) => {
		await expect(page.getByTestId('ingame-chat')).toBeVisible()
	})

	test('chat shell shows message list area', async ({ page }) => {
		await expect(page.getByTestId('ingame-chat-messages')).toBeVisible()
	})

	test('typing a message enables the send button', async ({ page }) => {
		const input = page.getByTestId('ingame-chat-input')
		const sendBtn = page.getByTestId('ingame-chat-send')

		await expect(sendBtn).toBeDisabled()
		await input.fill('Bonne partie !')
		await expect(sendBtn).toBeEnabled()
	})

	test('sending a message appends it to the message list', async ({ page }) => {
		const input = page.getByTestId('ingame-chat-input')
		const sendBtn = page.getByTestId('ingame-chat-send')
		const messageText = 'Salut adversaire'

		await input.fill(messageText)
		await sendBtn.click()
		await expect(page.getByTestId('ingame-chat-messages')).toContainText(messageText)
	})

	test('pressing Enter in chat input sends the message', async ({ page }) => {
		const input = page.getByTestId('ingame-chat-input')
		const messageText = 'Test clavier'

		await input.fill(messageText)
		await page.keyboard.press('Enter')
		await expect(page.getByTestId('ingame-chat-messages')).toContainText(messageText)
	})

	test('quick reply buttons are visible and clickable', async ({ page }) => {
		const quickReplies = page.locator('.igc-quick-btn')
		await expect(quickReplies.first()).toBeVisible()
		await quickReplies.first().click()
		// After clicking a quick reply, the messages area should contain something
		await expect(page.getByTestId('ingame-chat-messages')).not.toBeEmpty()
	})
})
