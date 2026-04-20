import fs from 'node:fs'
import path from 'node:path'

function parseEnvValue(rawValue) {
	if (rawValue == null) return ''
	const trimmed = String(rawValue).trim()
	if (!trimmed) return ''
	const quoted = trimmed.match(/^(['"])(.*)\1$/)
	return quoted ? quoted[2] : trimmed
}

function loadEnvFile(envFilePath) {
	if (!fs.existsSync(envFilePath)) return {}

	const contents = fs.readFileSync(envFilePath, 'utf8')
	return contents.split(/\r?\n/).reduce((accumulator, line) => {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) return accumulator

		const separatorIndex = trimmed.indexOf('=')
		if (separatorIndex === -1) return accumulator

		const key = trimmed.slice(0, separatorIndex).trim()
		const value = parseEnvValue(trimmed.slice(separatorIndex + 1))
		if (key) accumulator[key] = value
		return accumulator
	}, {})
}

// Preferred location shared at compose level.
const sharedBaseEnvFilePath = path.resolve(process.cwd(), '../../env/e2e/.env.e2e')
const sharedLocalEnvFilePath = path.resolve(process.cwd(), '../../env/e2e/.env.e2e.local')

// Backward-compatible location kept for local transition.
const legacyBaseEnvFilePath = path.resolve(process.cwd(), '.env.e2e')
const legacyLocalEnvFilePath = path.resolve(process.cwd(), '.env.e2e.local')

const fileEnv = {
	...loadEnvFile(legacyBaseEnvFilePath),
	...loadEnvFile(legacyLocalEnvFilePath),
	...loadEnvFile(sharedBaseEnvFilePath),
	...loadEnvFile(sharedLocalEnvFilePath),
}

export function getE2EEnv(name, fallback = '') {
	return process.env[name] ?? fileEnv[name] ?? fallback
}

export function getE2ERoleCredentials(roleName) {
	const normalizedRole = String(roleName).toUpperCase()
	return {
		email: getE2EEnv(`E2E_${normalizedRole}_EMAIL`),
		password: getE2EEnv(`E2E_${normalizedRole}_PASSWORD`),
	}
}

export function hasE2ERoleCredentials(roleName) {
	const credentials = getE2ERoleCredentials(roleName)
	return Boolean(credentials.email) && Boolean(credentials.password)
}
