import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { isDevMockAuthEnabled } from './mockSessionUser.js'

/**
 * Deuxième joueur (noirs) quand VITE_DEV_MOCK_USER=true — hot-seat, pas d’IA.
 * Modifie coalition / nom / avatar ici pour tester deux thèmes de pièces.
 */
export function getMockGameOpponent() {
	return {
		displayName: 'Joueur 2 (dev)',
		avatarSrc: '/imgs/PawnLogoB.jpeg',
		coalition: 'eau',
		coalition_name: 'eau',
	}
}

export function isMockGameOpponentActive() {
	return isDevMockAuthEnabled()
}

/** Blancs : session courante ; noirs : adversaire fictif si mock actif. */
export function getPieceThemeSlugForColor(pieceColor, user) {
	const sessionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	if (!isDevMockAuthEnabled() || pieceColor !== 'b') return sessionSlug
	const o = getMockGameOpponent()
	return coalitionToSlug(o.coalition ?? o.coalition_name)
}
