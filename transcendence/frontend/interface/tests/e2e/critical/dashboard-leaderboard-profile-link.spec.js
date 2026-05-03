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
	is_online: true,
	elo_rapid: 1240,
	elo_blitz: 1210,
	elo_bullet: 1200,
}

test('dashboard leaderboard username opens public profile', async ({ page }) => {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_USER) }),
	)
	await page.route('**/api/auth/friends?status=accepted', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [] }) }),
	)
	await page.route('**/api/auth/leaderboard?category=rapid', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				current_user_rank: 2,
				leaderboard: [
					{ id: 202, rank: 1, username: 'Rival_202', avatar: 'https://example.test/rival.png', games_played: 11, selected_rating: 1301, rating_field: 'elo_rapid' },
					{ id: 101, rank: 2, username: 'SMOKE_USER', avatar: 'https://example.test/me.png', games_played: 7, selected_rating: 1240, rating_field: 'elo_rapid' },
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
					elo_rapid: 1301,
					elo_blitz: 1288,
					elo_bullet: 1250,
					games_played: 11,
					games_won: 7,
					games_lost: 3,
					games_draw: 1,
					avatar: 'https://example.test/rival.png',
					achievements: [],
				},
			}),
		}),
	)

	await page.goto('/dashboard')
	await page.getByRole('link', { name: 'Rival_202' }).click()
	await expect(page).toHaveURL(/\/profile\/202$/)
	await expect(page.getByTestId('profile-page')).toBeVisible()
})
