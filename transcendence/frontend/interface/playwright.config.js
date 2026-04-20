import { defineConfig, devices } from '@playwright/test'
import { getE2EEnv } from './tests/e2e/helpers/e2eEnv.js'

const baseURL = getE2EEnv('E2E_BASE_URL', 'https://localhost')
const retriesEnvRaw = getE2EEnv('E2E_RETRIES', '')
const retriesEnv = retriesEnvRaw === '' ? null : Number(retriesEnvRaw)
const retries = Number.isInteger(retriesEnv) && retriesEnv >= 0 ? retriesEnv : (process.env.CI ? 1 : 0)

const traceEnv = getE2EEnv('E2E_TRACE', '')
const traceMode = traceEnv || 'on-first-retry'

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: ['**/*.spec.js'],
	globalSetup: './tests/e2e/setup/global.setup.js',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	forbidOnly: Boolean(process.env.CI),
	maxFailures: process.env.CI ? 5 : 0,
	fullyParallel: false,
	retries,
	workers: process.env.CI ? 1 : undefined,
	outputDir: './test-results',
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL,
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		trace: traceMode,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
