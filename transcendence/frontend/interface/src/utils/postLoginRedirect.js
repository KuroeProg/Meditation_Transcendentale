/**
 * Première visite « accueil » pour ce compte sur ce navigateur → Home (`/`).
 * La clé est posée sur la page Home (évite le double effet React Strict en dev).
 */
export const WELCOME_HOME_STORAGE_PREFIX = 'transcendance_welcome_'

export function getWelcomeHomeKey(userId) {
	return `${WELCOME_HOME_STORAGE_PREFIX}${userId}`
}

export function getPostAuthDestination(userId) {
	if (userId == null || typeof window === 'undefined') return '/dashboard'
	if (window.localStorage.getItem(getWelcomeHomeKey(userId))) return '/dashboard'
	return '/'
}

/** À appeler depuis la Home une fois la page affichée (marque l’accueil comme vu). */
export function markWelcomeHomeSeen(userId) {
	if (userId == null || typeof window === 'undefined') return
	try {
		window.localStorage.setItem(getWelcomeHomeKey(userId), '1')
	} catch {
		/* ignore */
	}
}
