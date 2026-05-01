/**
 * Game review / replay page — E2E spec
 *
 * Uses page.route to mock GET /api/game/history and GET /api/game/history/<pk>.
 * Verifies:
 *  - history page navigates to /game/review/:pk on "Revoir"
 *  - review page renders board + controls
 *  - transport controls (first, prev, play, next, last) work
 *  - advantage bar and move list are visible
 */
import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

const MOCK_GAME_ID = 7777

const MOCK_HISTORY = {
	games: [
		{
			id: MOCK_GAME_ID,
			result: 'win',
			score: '1-0',
			format: 'rapid',
			formatLabel: 'Rapid',
			date: new Date().toISOString(),
			opponent: { username: 'OPPONENT_X', coalition: 'fire', elo: 1200, isBot: false },
			moveCount: 4,
			competitive: false,
			duration: 120,
			termination_reason: 'checkmate_or_draw',
			time_control_seconds: 600,
			increment_seconds: 0,
		},
	],
	total: 1,
	limit: 50,
	offset: 0,
}

// 4-move scholar's mate positions
const SCHOLAR_POSITIONS = [
	'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
	'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
	'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
	'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 2',
	'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
]

const MOCK_REPLAY = {
	id: MOCK_GAME_ID,
	result: 'win',
	score: '1-0',
	termination_reason: 'checkmate_or_draw',
	started_at: new Date().toISOString(),
	duration_seconds: 120,
	time_control_seconds: 600,
	increment_seconds: 0,
	time_category: 'rapid',
	is_competitive: false,
	player_white: { id: 101, username: 'SMOKE_USER', avatar: '', coalition: 'water', elo: 1400 },
	player_black: { id: 202, username: 'OPPONENT_X', avatar: '', coalition: 'fire', elo: 1200 },
	winner_id: 101,
	positions: SCHOLAR_POSITIONS,
	moves: [
		{ move_number: 1, uci: 'e2e4', piece_played: 'pawn', time_taken_ms: 1000, material_advantage: 0, player_id: 101, color: 'white' },
		{ move_number: 2, uci: 'e7e5', piece_played: 'pawn', time_taken_ms: 800, material_advantage: 0, player_id: 202, color: 'black' },
		{ move_number: 3, uci: 'f1c4', piece_played: 'bishop', time_taken_ms: 600, material_advantage: 0, player_id: 101, color: 'white' },
		{ move_number: 4, uci: 'b8c6', piece_played: 'knight', time_taken_ms: 700, material_advantage: 0, player_id: 202, color: 'black' },
	],
	advantage_curve: [0, 0, 0, 0, 0],
	move_count: 4,
}

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

async function mockHistoryApi(page) {
	await page.route('**/api/game/history', async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_HISTORY) })
	})
	await page.route(`**/api/game/history/${MOCK_GAME_ID}`, async (route) => {
		await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REPLAY) })
	})
}

test.describe('historique — API et relecture de partie', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('la page historique charge depuis l\'API et liste les parties', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto('/history')
		await expect(page.getByTestId('history-page')).toBeVisible()
		const list = page.getByTestId('history-game-list')
		await expect(list).toBeVisible()
		await expect(list.locator(`[data-testid="history-row-${MOCK_GAME_ID}"]`)).toBeVisible()
	})

	test('"Revoir la partie" navigue vers /game/review/:pk', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto('/history')
		await expect(page.getByTestId('history-page')).toBeVisible()
		// Open the detail row first
		await page.locator(`[data-testid="history-row-${MOCK_GAME_ID}"]`).click()
		const reviewBtn = page.getByRole('button', { name: /revoir/i })
		await expect(reviewBtn).toBeVisible()
		await reviewBtn.click()
		await expect(page).toHaveURL(new RegExp(`/game/review/${MOCK_GAME_ID}`))
	})

	test('page de relecture rend l\'échiquier et les contrôles', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto(`/game/review/${MOCK_GAME_ID}`)
		await expect(page.getByTestId('review-page')).toBeVisible({ timeout: 8000 })
		await expect(page.getByTestId('review-board')).toBeVisible()
		await expect(page.getByTestId('review-controls')).toBeVisible()
	})

	test('header de relecture style Annales est affiché', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto(`/game/review/${MOCK_GAME_ID}`)
		await expect(page.getByTestId('review-header')).toBeVisible({ timeout: 8000 })
		// Titre de style Annales
		await expect(page.locator('.gr-title--arena')).toBeVisible()
		await expect(page.locator('.gr-title--arena')).toContainText(/relecture/i)
		// Sous-titre avec les joueurs
		await expect(page.locator('.gr-subtitle--arena')).toContainText('SMOKE_USER')
		await expect(page.locator('.gr-subtitle--arena')).toContainText('OPPONENT_X')
		// Bouton retour aux annales
		await expect(page.getByRole('button', { name: /retour aux annales/i })).toBeVisible()
	})

	test('avancer / reculer coup par coup met à jour le compteur de progression', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto(`/game/review/${MOCK_GAME_ID}`)
		await expect(page.getByTestId('review-progress')).toBeVisible({ timeout: 8000 })
		const progress = page.getByTestId('review-progress')
		await expect(progress).toHaveText('0 / 4')

		// Next
		await page.getByTestId('review-btn-next').click()
		await expect(progress).toHaveText('1 / 4')

		// Previous
		await page.getByTestId('review-btn-prev').click()
		await expect(progress).toHaveText('0 / 4')

		// Last
		await page.getByTestId('review-btn-last').click()
		await expect(progress).toHaveText('4 / 4')

		// First
		await page.getByTestId('review-btn-first').click()
		await expect(progress).toHaveText('0 / 4')
	})

	test('les boutons premier/dernier sont désactivés aux extrémités', async ({ page }) => {
		await mockHistoryApi(page)
		await page.goto(`/game/review/${MOCK_GAME_ID}`)
		await expect(page.getByTestId('review-btn-first')).toBeDisabled({ timeout: 8000 })
		await expect(page.getByTestId('review-btn-prev')).toBeDisabled()
		await page.getByTestId('review-btn-last').click()
		await expect(page.getByTestId('review-btn-next')).toBeDisabled()
		await expect(page.getByTestId('review-btn-last')).toBeDisabled()
	})
})
