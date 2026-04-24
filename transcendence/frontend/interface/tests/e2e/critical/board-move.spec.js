import { expect, test } from '@playwright/test'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'
import { waitForGameShellReady } from '../helpers/waits.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('board-move — plateau training', () => {
	test.skip(
		!hasE2ERoleCredentials('SMOKE_USER'),
		'Set SMOKE_USER credentials in .env.e2e to run this suite.',
	)

	test.beforeEach(async ({ page }) => {
		await page.goto('/game/training')
		await waitForGameShellReady(page)
		// Attendre que le plateau soit monté et que les cases soient disponibles
		await expect(page.locator('[data-testid="chess-board"]')).toBeVisible()
	})

	test('déplacement par clic deux temps : e2 → e4', async ({ page }) => {
		const board = page.locator('[data-testid="chess-board"]')

		// Premier clic : sélectionner le pion e2
		await board.locator('[data-square="e2"]').click()
		// La case sélectionnée reçoit la classe "selected"
		await expect(board.locator('[data-square="e2"]')).toHaveClass(/selected/)

		// Vérifier qu'un coup légal est mis en évidence (e4 est un coup valide)
		await expect(board.locator('[data-square="e4"]')).toHaveClass(/possible-move/)

		// Deuxième clic : déposer sur e4
		await board.locator('[data-square="e4"]').click()

		// Après le coup la sélection est effacée et e4 n'est plus un marqueur de coup possible
		await expect(board.locator('[data-square="e2"]')).not.toHaveClass(/selected/)
		await expect(board.locator('[data-square="e4"]')).not.toHaveClass(/possible-move/)
	})

	test('déplacement par drag-and-drop : d2 → d4', async ({ page }) => {
		const board = page.locator('[data-testid="chess-board"]')
		const fromCell = board.locator('[data-square="d2"]')
		const toCell = board.locator('[data-square="d4"]')

		const fromBox = await fromCell.boundingBox()
		const toBox = await toCell.boundingBox()

		if (!fromBox || !toBox) {
			test.fail(true, 'Impossible de récupérer les bounding boxes des cases')
			return
		}

		const fromX = fromBox.x + fromBox.width / 2
		const fromY = fromBox.y + fromBox.height / 2
		const toX = toBox.x + toBox.width / 2
		const toY = toBox.y + toBox.height / 2

		// Simuler un drag via Pointer Events
		await page.mouse.move(fromX, fromY)
		await page.mouse.down()
		// Déplacer progressivement pour dépasser le seuil de 5 px
		await page.mouse.move(fromX + 3, fromY + 3)
		await page.mouse.move(fromX + 10, fromY + 10)
		await page.mouse.move(toX, toY)
		await page.mouse.up()

		// Après le coup la pièce ne se trouve plus sur d2 (la case est vide)
		// et la sélection est annulée
		await expect(board.locator('[data-square="d2"]')).not.toHaveClass(/selected/)
		await expect(board.locator('[data-square="d4"]')).not.toHaveClass(/possible-move/)
	})
})
