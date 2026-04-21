import { expect, test } from '@playwright/test'

import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

test.describe('profile avatar upload', () => {
	// Vérifie qu'un upload d'avatar réussi met immédiatement à jour l'image affichée.
	test('successful upload refreshes the avatar image', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 })

		const profileState = {
			id: 101,
			username: 'SMOKE_USER',
			first_name: 'Smoke',
			last_name: 'User',
			email: 'smoke@example.test',
			bio: 'Initial bio',
			coalition: 'water',
			is_online: true,
			avatar_url: '/imgs/Profile-Logo.png',
		}
		const uploadedAvatarUrl = '/media/avatars/e2e-upload.png'

		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(profileState),
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

		await page.route('**/api/auth/me/avatar', async (route) => {
			profileState.avatar_url = uploadedAvatarUrl
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true, avatar_url: uploadedAvatarUrl }),
			})
		})

		await page.goto('/profile')
		await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()
		await expect(page.locator('.profile-avatar-lg')).toHaveAttribute('src', /Profile-Logo\.png/)

		await page.locator('input[type="file"]').setInputFiles({
			name: 'avatar.png',
			mimeType: 'image/png',
			buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Y2FQAAAAASUVORK5CYII=', 'base64'),
		})

		await expect(page.locator('.profile-avatar-lg')).toHaveAttribute('src', uploadedAvatarUrl)
	})

	// Vérifie qu'un upload trop volumineux affiche une erreur récupérable.
	test('failed upload shows a recoverable size error', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 })

		const profileState = {
			id: 101,
			username: 'SMOKE_USER',
			first_name: 'Smoke',
			last_name: 'User',
			email: 'smoke@example.test',
			bio: 'Initial bio',
			coalition: 'water',
			is_online: true,
			avatar_url: '/imgs/Profile-Logo.png',
		}

		await page.route('**/api/auth/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(profileState),
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

		await page.route('**/api/auth/me/avatar', async (route) => {
			await route.fulfill({
				status: 413,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Image trop volumineuse' }),
			})
		})

		await page.goto('/profile')
		await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()

		await page.locator('input[type="file"]').setInputFiles({
			name: 'avatar-big.png',
			mimeType: 'image/png',
			buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Y2FQAAAAASUVORK5CYII=', 'base64'),
		})

		await expect(page.getByRole('alert')).toContainText('Image trop volumineuse')
	})
})
