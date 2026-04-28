/**
 * Utilisateur fictif (Vite dev uniquement).
 *
 * Fichier : `transcendence/frontend/interface/.env.local` (voir `make mock-help`).
 * En complément, la barre « Dev mock » (import.meta.env.DEV) écrit dans localStorage :
 * - transcendance_dev_mock_mode : follow_env | force_on | force_off
 * - transcendance_dev_mock_coalition : feu | eau | terre | air (optionnel, sinon .env)
 * - transcendance_dev_mock_auth_provider : local | oauth42 (optionnel, sinon .env)
 *
 * Variables :
 * - VITE_DEV_MOCK_USER=true        → active le mock (session auto au chargement)
 * - VITE_MOCK_COALITION=feu|eau|terre|air
 * - VITE_MOCK_AUTH_PROVIDER=local  → compte « local » (cérémonie choixpeau si coalition non fixée)
 * - VITE_MOCK_AUTH_PROVIDER=oauth42 → évite le choixpeau (défaut)
 * - VITE_MOCK_USER_ID=42           → fixe l’id (sinon 42 ou 999 aléatoire par onglet)
 * - VITE_MOCK_RESET_SORTING_HAT=true → au chargement mock, efface le stockage choixpeau pour cet id (retester l’anim)
 *
 * Valeur spéciale `transcendance_dev_mock_coalition=pending_hat` : coalition non assignée (avant cérémonie choixpeau).
 */

import mockPersonalStats from '../features/stats/assets/mockPersonalStats.json'

const COALITIONS = ['feu', 'eau', 'terre', 'air']

/** Clés localStorage — surcharges dev (barre debug), sans redémarrer Vite. */
export const DEV_MOCK_STORAGE = {
	MODE: 'transcendance_dev_mock_mode',
	COALITION: 'transcendance_dev_mock_coalition',
	AUTH_PROVIDER: 'transcendance_dev_mock_auth_provider',
}

/** Émis par la barre dev pour relancer la logique choixpeau (même utilisateur). */
export const SORTING_HAT_DEV_RETRY_EVENT = 'transcendance-sorting-hat-retry'

/** @typedef {'follow_env' | 'force_on' | 'force_off'} DevMockMode */

/**
 * Mock session activé en dev si .env le demande ou si la barre force « on »,
 * sauf si la barre force « off ».
 */
export function isDevMockAuthEnabled() {
	if (import.meta.env.DEV !== true) return false
	try {
		const mode = localStorage.getItem(DEV_MOCK_STORAGE.MODE)
		if (mode === 'force_off') return false
		if (mode === 'force_on') return true
	} catch {
		/* ignore */
	}
	return import.meta.env.VITE_DEV_MOCK_USER === 'true'
}

export function readDevMockCoalitionFromStorage() {
	try {
		const v = localStorage.getItem(DEV_MOCK_STORAGE.COALITION)
		return v && String(v).trim() !== '' ? v : null
	} catch {
		return null
	}
}

export function readDevMockAuthProviderFromStorage() {
	try {
		const v = localStorage.getItem(DEV_MOCK_STORAGE.AUTH_PROVIDER)
		return v && String(v).trim() !== '' ? v : null
	} catch {
		return null
	}
}

const SORTING_HAT_PREFIX = 'transcendance_sorting_hat_v1_'

/** Efface le stockage choixpeau pour un id (dev / tests). */
export function clearSortingHatStorageForUserId(userId) {
	if (typeof window === 'undefined' || userId == null) return
	const base = `${SORTING_HAT_PREFIX}${userId}`
	try {
		window.localStorage.removeItem(base)
		window.localStorage.removeItem(`${base}_pending`)
	} catch {
		/* ignore */
	}
}

function normalizeMockCoalition(raw) {
	const s = String(raw ?? 'eau').toLowerCase().trim()
	return COALITIONS.includes(s) ? s : 'eau'
}

function getMockUserId() {
	const fixed = import.meta.env.VITE_MOCK_USER_ID
	if (fixed != null && String(fixed).trim() !== '') {
		const n = parseInt(String(fixed), 10)
		if (!Number.isNaN(n)) return n
	}
	let id = sessionStorage.getItem('mockUserId')
	if (!id) {
		id = Math.random() > 0.5 ? '42' : '999'
		sessionStorage.setItem('mockUserId', id)
	}
	return parseInt(id, 10)
}

/** Id stable du mock courant (sessionStorage / VITE_MOCK_USER_ID) — pour effacer le stockage choixpeau. */
export function getDevMockUserId() {
	return getMockUserId()
}

/**
 * Efface les clés localStorage du choixpeau pour cet id (dev : retester l’animation).
 */
export function maybeClearSortingHatStorageForMock(userId) {
	if (!isDevMockAuthEnabled()) return
	if (import.meta.env.VITE_MOCK_RESET_SORTING_HAT !== 'true') return
	if (typeof window === 'undefined' || userId == null) return
	const base = `transcendance_sorting_hat_v1_${userId}`
	try {
		window.localStorage.removeItem(base)
		window.localStorage.removeItem(`${base}_pending`)
	} catch {
		/* ignore */
	}
}

const PENDING_HAT_SENTINEL = 'pending_hat'

export function getMockSessionUser() {
	const userId = getMockUserId()
	const isWhite = userId === 42
	const ps = mockPersonalStats.profileSummary
	const coalitionFromStore = readDevMockCoalitionFromStorage()
	const coalitionPending =
		coalitionFromStore != null && String(coalitionFromStore).toLowerCase().trim() === PENDING_HAT_SENTINEL
	const coalition = coalitionPending
		? null
		: normalizeMockCoalition(coalitionFromStore ?? import.meta.env.VITE_MOCK_COALITION)
	const authFromStore = readDevMockAuthProviderFromStorage()
	const authRaw = String(authFromStore ?? import.meta.env.VITE_MOCK_AUTH_PROVIDER ?? '')
		.toLowerCase()
		.trim()
	const auth_provider = authRaw === 'local' ? 'local' : 'oauth42'

	return {
		id: userId,
		login: isWhite ? 'white_player' : 'black_player',
		email: isWhite ? 'white@transcendence.test' : 'black@transcendence.test',
		first_name: isWhite ? 'Blanc' : 'Noir',
		last_name: 'Joueur',
		image: {
			link: 'https://picsum.photos/id/64/256/256',
			versions: {
				medium: 'https://picsum.photos/id/64/256/256',
			},
		},
		coalition,
		coalition_name: coalition ?? null,
		auth_provider,
		cursus_level: 7,
		level: 7,
		stats: {
			wins: ps.wins,
			losses: ps.losses,
			rank: ps.rank,
			level: ps.level,
		},
	}
}
