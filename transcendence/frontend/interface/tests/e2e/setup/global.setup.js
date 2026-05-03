import fs from 'node:fs'

import { chromium } from '@playwright/test'

import { getE2ERoleCredentials, getE2EEnv } from '../helpers/e2eEnv.js'
import { getAuthStateDirectory, getRoleStateFilePath } from '../helpers/storageState.js'

const ROLES = ['SMOKE_USER', 'USER_A', 'USER_B', 'USER_C']

async function writeEmptyStorageState(roleName) {
	const filePath = getRoleStateFilePath(roleName)
	const emptyState = { cookies: [], origins: [] }
	await fs.promises.writeFile(filePath, JSON.stringify(emptyState, null, 2), 'utf8')
}

async function createRoleStorageState(browser, baseURL, roleName) {
	const { email, password } = getE2ERoleCredentials(roleName)
	if (!email || !password) {
		await writeEmptyStorageState(roleName)
		return
	}

	const context = await browser.newContext({
		baseURL,
		ignoreHTTPSErrors: true,
	})
	const page = await context.newPage()

	try {
		await page.goto('/auth')
		await page.locator('#login-email').fill(email)
		await page.locator('#login-password').fill(password)
		await page.getByRole('button', { name: 'Se Connecter', exact: true }).click()
		await page.waitForURL((url) => !url.pathname.startsWith('/auth'))
		await context.storageState({ path: getRoleStateFilePath(roleName) })
	} catch {
		await writeEmptyStorageState(roleName)
	} finally {
		await context.close()
	}
}

export default async function globalSetup() {
	await fs.promises.mkdir(getAuthStateDirectory(), { recursive: true })

	const browser = await chromium.launch()
	const baseURL = getE2EEnv('E2E_BASE_URL', 'https://localhost:8443')

	try {
		for (const roleName of ROLES) {
			await createRoleStorageState(browser, baseURL, roleName)
		}
	} finally {
		await browser.close()
	}
}

