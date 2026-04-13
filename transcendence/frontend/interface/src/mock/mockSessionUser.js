/**
 * Utilisateur fictif pour tester Profil / Paramètres / pièces coalition sans OAuth.
 * Activer : VITE_DEV_MOCK_USER=true dans .env.local
 *
 * Coalition → pièces / tuiles des blancs. Les noirs sont simulés via sessionStorage.
 *
 * Chaque onglet/fenêtre reçoit un ID utilisateur différent (blanc: 42, noir: 999)
 * pour permettre des tests multi-joueurs.
 */

import mockPersonalStats from '../features/stats/assets/mockPersonalStats.json'

export function isDevMockAuthEnabled() {
	return import.meta.env.DEV === true && import.meta.env.VITE_DEV_MOCK_USER === 'true'
}

function getMockUserId() {
	let id = sessionStorage.getItem('mockUserId')
	if (!id) {
		id = Math.random() > 0.5 ? '42' : '999'
		sessionStorage.setItem('mockUserId', id)
	}
	return parseInt(id, 10)
}

export function getMockSessionUser() {
	const userId = getMockUserId()
	const isWhite = userId === 42
	const ps = mockPersonalStats.profileSummary
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
		// ← Modifie cette valeur pour voir les pièces Feu / Eau / Terre / Air sur l’échiquier
		coalition: 'eau',
		coalition_name: 'eau',
		// OAuth fictif : évite le flux « choixpeau » (VITE_SORTING_HAT_COALITION) en mock
		auth_provider: 'oauth42',
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
