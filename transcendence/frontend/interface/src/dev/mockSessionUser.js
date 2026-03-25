/**
 * Utilisateur fictif pour tester Profil / Paramètres / pièces coalition sans OAuth.
 * Activer : VITE_DEV_MOCK_USER=true dans .env.local
 *
 * Coalitions Perpignan (éléments) — change `coalition` pour tester les sets de pièces :
 *   "Feu" | "Eau" | "L'eau" | "Terre" | "Air"
 */

export function isDevMockAuthEnabled() {
	return import.meta.env.DEV === true && import.meta.env.VITE_DEV_MOCK_USER === 'true'
}

export function getMockSessionUser() {
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
		coalition: 'terre',
		coalition_name: 'terre',
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
