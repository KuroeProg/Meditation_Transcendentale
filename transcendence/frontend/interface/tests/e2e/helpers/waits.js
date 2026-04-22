import { expect } from '@playwright/test'

export async function waitForDashboardReady(page) {
	await expect(page.getByTestId('dashboard-page')).toBeVisible()
	await expect(page.getByTestId('dashboard-start-matchmaking')).toBeVisible()
}

export async function waitForChatDrawerReady(page) {
	await expect(page.getByTestId('chat-drawer')).toBeVisible()
	await expect(page.getByTestId('chat-conversation-list')).toBeVisible()
}

/**
 * Drawer chat ouvert : passage à la vue Contacts puis onglet « En attente ».
 * Fallbacks CSS pour les bundles déployés sans les data-testid les plus récents (ex. image Docker non reconstruite).
 */
export async function openChatContactsPending(page) {
	const contactsBtn = page
		.locator('[data-testid="chat-drawer-contacts"], .chat-drawer-header button.chat-drawer-action-btn[title="Contacts"]')
		.first()
	await expect(contactsBtn).toBeVisible({ timeout: 20_000 })
	await contactsBtn.click()
	const pendingTab = page
		.locator('[data-testid="chat-tab-pending"], button.chat-tab')
		.filter({ hasText: /En attente/ })
		.first()
	await expect(pendingTab).toBeVisible({ timeout: 20_000 })
	await pendingTab.click()
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
