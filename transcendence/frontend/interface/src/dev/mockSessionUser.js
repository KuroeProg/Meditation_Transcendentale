/**
 * Utilisateur fictif pour tester Profil / Paramètres / pièces coalition sans OAuth.
 * Activer : VITE_DEV_MOCK_USER=true dans .env.local
 *
 * Coalition → pièces / tuiles des blancs. Les noirs : `src/dev/mockGameOpponent.js`.
 * Stats profil : alignées sur `mockPersonalStats.json` → `profileSummary` (page Statistiques).
 */

import mockPersonalStats from './mockPersonalStats.json'

export function isDevMockAuthEnabled() {
	return import.meta.env.DEV === true && import.meta.env.VITE_DEV_MOCK_USER === 'true'
}

export function getMockSessionUser() {
	const ps = mockPersonalStats.profileSummary
	return {
		login: 'vb_demo',
		email: 'vb_demo@student.42.fr',
		first_name: 'Vincent',
		last_name: 'Démonstration',
		image: {
			link: 'https://picsum.photos/id/64/256/256',
			versions: {
				medium: 'https://picsum.photos/id/64/256/256',
			},
		},
		// ← Modifie cette valeur pour voir les pièces Feu / Eau / Terre / Air sur l’échiquier
		coalition: 'air',
		coalition_name: 'air',
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
