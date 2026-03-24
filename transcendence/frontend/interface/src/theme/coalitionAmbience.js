/**
 * Assets et teintes d’ambiance par slug coalition (aligné sur coalitionToSlug).
 */

export const COALITION_BACKGROUNDS = {
	feu: '/imgs/Fire-Background.png',
	eau: '/imgs/Water-Background.png',
	terre: '/imgs/Earth-Background.png',
	air: '/imgs/Air-Background.png',
}

/** Accents UI optionnels (variables CSS sur la scène) */
export const COALITION_ACCENTS = {
	feu: '#ff5c33',
	eau: '#38bdf8',
	terre: '#98ab1b',
	air: '#c084fc',
}

/** Bord du flash éclair : opaque (plus d’alpha 0 vers l’aurora), teinte lisible par coalition */
export const COALITION_LIGHTNING_FLASH_EDGE = {
	feu: 'rgba(18, 6, 10, 1)',
	eau: 'rgba(6, 14, 22, 1)',
	terre: 'rgba(10, 14, 6, 1)',
	air: 'rgba(48, 32, 78, 1)',
}
