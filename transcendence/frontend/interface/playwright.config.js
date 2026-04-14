import { defineConfig, devices } from '@playwright/test'
import { getE2EEnv } from './tests/e2e/helpers/e2eEnv.js'

const baseURL = getE2EEnv('E2E_BASE_URL', 'https://localhost')

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
