/**
 * Utilisateur fictif pour tester Profil / Paramètres / pièces coalition sans OAuth.
 * Activer : VITE_DEV_MOCK_USER=true dans .env.local
 *
 * Coalition → pièces / tuiles des blancs. Les noirs sont simulés via sessionStorage.
 *
 * Chaque onglet/fenêtre reçoit un ID utilisateur différent (blanc: 42, noir: 999)
 * pour permettre des tests multi-joueurs.
 */

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
		coalition: isWhite ? 'feu' : 'eau',
		coalition_name: isWhite ? 'feu' : 'eau',
		cursus_level: 7,
		level: 7,
		stats: {
			wins: 12,
			losses: 8,
			rank: 42,
			level: 3,
		},
	}
}
