import { expect } from '@playwright/test'

export async function waitForDashboardReady(page) {
	await expect(page.getByTestId('dashboard-page')).toBeVisible()
	await expect(page.getByTestId('dashboard-start-matchmaking')).toBeVisible()
}

export async function waitForChatDrawerReady(page) {
	await expect(page.getByTestId('chat-drawer')).toBeVisible()
	await expect(page.getByTestId('chat-conversation-list')).toBeVisible()
}

export async function openConversationThread(page, conversationId) {
	await waitForChatDrawerReady(page)
	await page.getByTestId(`chat-conversation-item-${conversationId}`).click()
	await expect(page.getByTestId('chat-thread')).toBeVisible()
}

export async function waitForGameShellReady(page) {
	await expect(page.getByTestId('game-shell')).toBeVisible()
	await expect(page.getByTestId('game-board-frame')).toBeVisible()
}
