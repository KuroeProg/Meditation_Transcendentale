import { expect, test } from '../testWithLogging'

import { hasE2ERoleCredentials } from '../helpers/e2eEnv.js'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('récupération après échec temporaire de mise à jour du profil', () => {
	test.skip(!hasE2ERoleCredentials('SMOKE_USER'), 'Set SMOKE_USER credentials in .env.e2e to run this suite.')

	// Vérifie qu'un échec transitoire de mise à jour finit par persister la valeur de profil.
	test('retry after transient update failure eventually persists profile value', async ({ page }) => {
		const profileState = {
			id: 101,
			username: 'SMOKE_USER',
			first_name: 'Smoke',
			last_name: 'User',
			email: 'smoke@example.test',
			bio: 'Initial bio',
			coalition: 'water',
			is_online: true,
			avatar_url: '',
		}
		let updateCallCount = 0

		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(profileState),
			})
		})

		await page.route('**/api/auth/friends?status=accepted', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) })
		})

		await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ invite: null }) })
		})

		await page.route('**/api/auth/me/update', async (route) => {
			updateCallCount += 1
			if (updateCallCount === 1) {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Erreur temporaire' }),
				})
				return
			}

			const payload = route.request().postDataJSON()
			Object.assign(profileState, payload)
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
		})

		await page.goto('/profile')
		await expect(page.getByTestId('profile-page')).toBeVisible()

		await page.getByTestId('profile-username-display').click()
		await page.getByTestId('profile-username-input').fill('SMOKE_FAIL_1')
		await page.getByTestId('profile-username-input').press('Enter')
		await expect(page.getByRole('alert')).toContainText('Erreur temporaire')

		await page.getByTestId('profile-username-display').click()
		await page.getByTestId('profile-username-input').fill('SMOKE_OK_2')
		await page.getByTestId('profile-username-input').press('Enter')

		await expect(page.getByTestId('profile-username-display')).toContainText('SMOKE_OK_2')
		await expect(page.getByText('Erreur temporaire')).toHaveCount(0)
	})
})
