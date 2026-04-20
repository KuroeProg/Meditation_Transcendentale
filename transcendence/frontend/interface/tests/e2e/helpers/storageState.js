import path from 'node:path'

const AUTH_STATE_DIR = path.resolve(process.cwd(), 'tests/e2e/.auth')

export function getRoleStateFilePath(roleName) {
	const normalized = String(roleName).toLowerCase()
	return path.join(AUTH_STATE_DIR, `${normalized}.json`)
}

export function getAuthStateDirectory() {
	return AUTH_STATE_DIR
}
