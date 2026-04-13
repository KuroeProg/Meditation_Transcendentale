/**
 * Utilisateur fictif (Vite dev uniquement).
 *
 * Fichier : `transcendence/frontend/interface/.env.local` (voir `make mock-help`).
 *
 * Variables :
 * - VITE_DEV_MOCK_USER=true        → active le mock (session auto au chargement)
 * - VITE_MOCK_COALITION=feu|eau|terre|air
 * - VITE_MOCK_AUTH_PROVIDER=local  → compte « local » (choixpeau si VITE_SORTING_HAT_COALITION=true)
 * - VITE_MOCK_AUTH_PROVIDER=oauth42 → évite le choixpeau (défaut)
 * - VITE_MOCK_USER_ID=42           → fixe l’id (sinon 42 ou 999 aléatoire par onglet)
 * - VITE_MOCK_RESET_SORTING_HAT=true → au chargement mock, efface le stockage choixpeau pour cet id (retester l’anim)
 */

import mockPersonalStats from '../features/stats/assets/mockPersonalStats.json'

const COALITIONS = ['feu', 'eau', 'terre', 'air']

export function isDevMockAuthEnabled() {
	return import.meta.env.DEV === true && import.meta.env.VITE_DEV_MOCK_USER === 'true'
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

export function getMockSessionUser() {
	const userId = getMockUserId()
	const isWhite = userId === 42
	const ps = mockPersonalStats.profileSummary
	const coalition = normalizeMockCoalition(import.meta.env.VITE_MOCK_COALITION)
	const authRaw = String(import.meta.env.VITE_MOCK_AUTH_PROVIDER ?? '').toLowerCase().trim()
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
		coalition_name: coalition,
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
