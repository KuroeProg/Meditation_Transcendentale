/**
 * URLs d’auth / session — à brancher côté Django quand ce sera prêt.
 * Le front gère 401/404 gracieusement (utilisateur considéré comme déconnecté).
 *
 * Attendu côté backend (contrat suggéré) :
 * - GET  /api/auth/me → 200 JSON (champs Intra / profil), idéalement :
 *   login, email, first_name, last_name,
 *   image: { link, versions?: { medium, ... } } (photo 42 = avatar),
 *   coalition ou coalition_name, cursus_level ou level (niveau 42),
 *   stats?: { wins, losses, rank, level } (jeu, plus tard)
 *   ou champs équivalents aplatis (image_url, etc.) — voir src/utils/sessionUser.js
 * - GET  /api/auth/42/login → redirection OAuth 42
 * - POST /api/auth/logout → 204 / 200, CSRF si activé
 */

/** Origine pour les redirections OAuth (doit être celle qui sert Django / les cookies). */
export function getOAuthOrigin() {
	const explicit = import.meta.env.VITE_API_ORIGIN
	if (explicit) return String(explicit).replace(/\/$/, '')
	// En dev Vite (:5173), les cookies de session sont sur l’origine HTTPS du proxy (souvent https://localhost)
	if (import.meta.env.DEV) return 'https://localhost'
	if (typeof window !== 'undefined') return window.location.origin
	return ''
}

/** Préfixe relatif pour fetch() — même origine (Docker + nginx) ou via proxy Vite en dev. */
export const API_PREFIX = ''

export const AUTH_PATHS = {
	me: `${API_PREFIX}/api/auth/me`,
	login42: '/api/auth/42/login',
	logout: `${API_PREFIX}/api/auth/logout`,
}

/** URL absolue pour rediriger le navigateur vers le login 42 (hors fetch). */
export function getLogin42AbsoluteUrl() {
	return `${getOAuthOrigin()}${AUTH_PATHS.login42}`
}
