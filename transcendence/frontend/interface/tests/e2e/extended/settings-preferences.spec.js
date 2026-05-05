import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'

/** Aligné sur src/config/uiPrefs.js et src/config/gameAudioPrefs.js */
const PREFS_STORAGE_KEY = 'transcendence_ui_prefs'
const GAME_AUDIO_PREFS_KEY = 'transcendence_game_audio_v2'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('page Paramètres — préférences UI et audio', () => {
	test.describe.configure({ mode: 'serial' })

	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	test('expose la page et le formulaire audio', async ({ page }) => {
		await page.goto('/settings')
		await expect(page.getByTestId('settings-page')).toBeVisible()
		await expect(page.getByTestId('settings-audio-form')).toBeVisible()
	})

	test('mode léger applique data-light-mode sur html', async ({ page }) => {
		await page.goto('/settings')
		const light = page.getByTestId('settings-light-mode')
		await expect(light).toBeVisible()
		await light.check()
		await expect(page.locator('html')).toHaveAttribute('data-light-mode', 'true')
		await page.reload()
		await expect(light).toBeChecked()
		await expect(page.locator('html')).toHaveAttribute('data-light-mode', 'true')
	})

	test('barres de défilement appliquent data-show-scrollbars sur html', async ({ page }) => {
		await page.goto('/settings')
		const sb = page.getByTestId('settings-show-scrollbars')
		await sb.check()
		await expect(page.locator('html')).toHaveAttribute('data-show-scrollbars', 'true')
		await page.reload()
		await expect(sb).toBeChecked()
		await expect(page.locator('html')).toHaveAttribute('data-show-scrollbars', 'true')
	})

	test('masquer les toasts de défi persiste dans localStorage', async ({ page }) => {
		await page.goto('/settings')
		const hide = page.getByTestId('settings-hide-invite-toasts')
		await hide.check()
		const raw = await page.evaluate((k) => window.localStorage.getItem(k), PREFS_STORAGE_KEY)
		expect(raw).toBeTruthy()
		const parsed = JSON.parse(raw)
		expect(parsed.hideInviteToasts).toBe(true)
		await page.reload()
		await expect(hide).toBeChecked()
	})

	test('réinitialiser les préférences remet les défauts UI et supprime les prefs audio', async ({ page }) => {
		await page.goto('/settings')
		await page.getByTestId('settings-light-mode').check()
		await page.getByTestId('settings-sfx-muted').check()
		await expect(page.locator('html')).toHaveAttribute('data-light-mode', 'true')

		await page.getByTestId('settings-reset-prefs').click()

		const uiRaw = await page.evaluate((k) => window.localStorage.getItem(k), PREFS_STORAGE_KEY)
		const audioRaw = await page.evaluate((k) => window.localStorage.getItem(k), GAME_AUDIO_PREFS_KEY)
		expect(uiRaw).toBeTruthy()
		const uiParsed = JSON.parse(uiRaw)
		expect(uiParsed.lightMode).toBe(false)
		expect(uiParsed.reduceMotion).toBe(false)
		expect(audioRaw).toBeNull()

		await page.reload()
		await expect(page.getByTestId('settings-light-mode')).not.toBeChecked()
		await expect(page.locator('html')).not.toHaveAttribute('data-light-mode', 'true')
	})

	test('effacement local confirmé remet les défauts UI et supprime les prefs audio', async ({ page }) => {
		await page.goto('/settings')
		await page.getByTestId('settings-reduce-motion').check()
		await page.getByTestId('settings-erase-local').click()
		await expect(page.getByTestId('settings-erase-local')).toContainText('Confirmer')

		await page.getByTestId('settings-erase-local').click()
		await expect(page.getByTestId('settings-erase-feedback')).toBeVisible()

		const uiRaw = await page.evaluate((k) => window.localStorage.getItem(k), PREFS_STORAGE_KEY)
		const audioRaw = await page.evaluate((k) => window.localStorage.getItem(k), GAME_AUDIO_PREFS_KEY)
		expect(uiRaw).toBeTruthy()
		expect(JSON.parse(uiRaw).reduceMotion).toBe(false)
		expect(audioRaw).toBeNull()
	})

	test('mode de piste BGM aléatoire persiste après rechargement', async ({ page }) => {
		await page.goto('/settings')
		await page.getByTestId('settings-bgm-track-random').check()
		await page.reload()
		await expect(page.getByTestId('settings-bgm-track-random')).toBeChecked()
	})

	test('mode piste fixe affiche le sélecteur et persiste', async ({ page }) => {
		await page.goto('/settings')
		await page.getByTestId('settings-bgm-track-fixed').check()
		const select = page.getByTestId('settings-bgm-fixed-track')
		await expect(select).toBeVisible()
		await select.selectOption('Main Title.m4a')
		await page.reload()
		await expect(page.getByTestId('settings-bgm-track-fixed')).toBeChecked()
		await expect(select).toHaveValue('Main Title.m4a')
	})

	test('cocher un toggle envoie un PATCH à l\'API serveur', async ({ page }) => {
		let patchBody = null
		await page.route('**/api/auth/me/client-settings', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefs: {} }) })
				return
			}
			if (route.request().method() === 'PATCH') {
				patchBody = route.request().postDataJSON()
				await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ prefs: patchBody }) })
				return
			}
			await route.continue()
		})
		await page.goto('/settings')
		await page.getByTestId('settings-reduce-motion').check()
		// Debounce is 800ms — wait for it to fire
		await page.waitForTimeout(1200)
		expect(patchBody).toBeTruthy()
		expect(patchBody.reduceMotion).toBe(true)
	})

	test('les préférences serveur sont fusionnées au chargement (serveur gagne)', async ({ page }) => {
		await page.route('**/api/auth/me/client-settings', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ prefs: { lightMode: true } }),
				})
				return
			}
			await route.continue()
		})
		await page.goto('/settings')
		// Server sent lightMode:true → checkbox should be checked
		await expect(page.getByTestId('settings-light-mode')).toBeChecked({ timeout: 3000 })
	})
})
