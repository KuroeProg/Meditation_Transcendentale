import { expect, test } from '../testWithLogging'

test('about page shows Even with local profile photo', async ({ page }) => {
	await page.goto('/about')

	await expect(page.getByTestId('about-member-ezeppa')).toBeVisible()
	await expect(page.getByTestId('about-member-photo-ezeppa')).toHaveAttribute('src', '/team/even.png')
})
