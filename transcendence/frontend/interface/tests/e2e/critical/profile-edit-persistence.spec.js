import { expect, test } from '@playwright/test'

test.describe('profile edit persistence', () => {
	test('username and bio edits persist after reload', async ({ page }) => {
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

		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(profileState),
			})
		})

		await page.route('**/api/auth/me/update', async (route) => {
			const body = route.request().postDataJSON()
			Object.assign(profileState, body)
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true }),
			})
		})

		await page.route('**/api/auth/friends?status=accepted', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ friends: [] }),
			})
		})

		await page.route('**/api/chat/invites/pending-outgoing', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ invite: null }),
			})
		})

		await page.goto('/profile')
		await expect(page.getByTestId('profile-page')).toBeVisible()

		const newUsername = `SMOKE_USER_${Date.now()}`
		const newBio = `Bio e2e ${Date.now()}`

		await page.getByTestId('profile-username-display').click()
		await page.getByTestId('profile-username-input').fill(newUsername)
		await page.getByTestId('profile-username-input').press('Enter')

		await page.getByTestId('profile-bio-display').click()
		await page.getByTestId('profile-bio-input').fill(newBio)
		await page.getByTestId('profile-bio-input').press('Escape')
		await page.getByTestId('profile-bio-display').click()
		await page.getByTestId('profile-bio-input').fill(newBio)
		await page.getByTestId('profile-bio-input').blur()

		await page.reload()
		await expect(page.getByTestId('profile-username-display')).toContainText(newUsername)
		await expect(page.getByTestId('profile-bio-display')).toContainText(newBio)
	})
})
