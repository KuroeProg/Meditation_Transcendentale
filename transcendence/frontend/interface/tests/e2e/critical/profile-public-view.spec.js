import { expect, test } from '@playwright/test'
import { getRoleStateFilePath } from '../helpers/storageState.js'

test.use({
	storageState: getRoleStateFilePath('SMOKE_USER'),
})

const SESSION_USER = {
	id: 101,
	username: 'SMOKE_USER',
	first_name: 'Smoke',
	last_name: 'User',
	email: 'smoke@example.test',
	coalition: 'water',
	bio: 'Bio perso',
	is_online: true,
	achievements: ['first_game'],
}

test('friend username opens public profile in read-only mode', async ({ page }) => {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				friends: [
					{
						friendship_id: 42,
						status: 'accepted',
						user: {
							id: 202,
							username: 'Rival_202',
							avatar: 'https://example.test/rival.png',
							coalition: 'fire',
							is_online: true,
							elo_rapid: 1250,
							elo_blitz: 1220,
						},
					},
				],
			}),
		}),
	)
	await page.route('**/api/auth/public-profile/202', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				can_edit: false,
				is_self: false,
				friends: [],
				profile: {
					id: 202,
					username: 'Rival_202',
					first_name: 'Rival',
					last_name: 'Public',
					bio: 'Profil public',
					coalition: 'fire',
					elo_rapid: 1250,
					elo_blitz: 1220,
					elo_bullet: 1200,
					games_played: 11,
					games_won: 5,
					games_lost: 4,
					games_draw: 2,
					avatar: 'https://example.test/rival.png',
					achievements: [
						{ id: 'first_game', title: 'Premier pas', description: 'Jouer sa première partie.' },
					],
				},
			}),
		}),
	)

	await page.goto('/profile')
	await page.getByRole('link', { name: 'Rival_202' }).click()
	await expect(page).toHaveURL(/\/profile\/202$/)
	await expect(page.getByTestId('profile-page')).toBeVisible()
	await expect(page.getByTestId('profile-username-display')).toHaveCount(0)
	await expect(page.getByText(/^Amis \(/)).toHaveCount(0)
	await expect(page.getByTestId('profile-achievements')).toBeVisible()
})
