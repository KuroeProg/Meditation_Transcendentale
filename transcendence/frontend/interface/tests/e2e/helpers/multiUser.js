import { getRoleStateFilePath } from './storageState.js'

export async function createRoleSession(browser, roleName, options = {}) {
	const context = await browser.newContext({
		ignoreHTTPSErrors: true,
		storageState: getRoleStateFilePath(roleName),
		...options,
	})
	const page = await context.newPage()
	return { roleName, context, page }
}

export async function createRoleSessions(browser, roleNames, options = {}) {
	const entries = await Promise.all(
		roleNames.map(async (roleName) => [roleName, await createRoleSession(browser, roleName, options)]),
	)
	return Object.fromEntries(entries)
}

export async function closeRoleSessions(roleSessions) {
	const sessions = Object.values(roleSessions || {})
	for (const session of sessions) {
		try {
			await session.context.close()
		} catch {
			// best effort cleanup for E2E contexts
		}
	}
}

export async function withRoleSessions(browser, roleNames, callback, options = {}) {
	const sessions = await createRoleSessions(browser, roleNames, options)
	try {
		return await callback(sessions)
	} finally {
		await closeRoleSessions(sessions)
	}
}
