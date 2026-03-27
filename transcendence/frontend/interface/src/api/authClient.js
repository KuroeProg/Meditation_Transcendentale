import { AUTH_PATHS } from '../config/authEndpoints.js'

function readCookie(name) {
	const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`))
	return m ? decodeURIComponent(m[1]) : null
}

/**
 * Récupère l’utilisateur connecté (cookie de session Django si endpoint présent).
 */
export async function fetchSessionUser(signal) {
	// const res = await fetch(AUTH_PATHS.me, {
	// 	method: 'GET',
	// 	credentials: 'include',
	// 	headers: { Accept: 'application/json' },
	// 	signal,
	// })
	// if (res.status === 401 || res.status === 403 || res.status === 404) return null
	// if (!res.ok) throw new Error(`auth/me: ${res.status}`)
	// try {
	// 	return await res.json()
	// } catch {
	// 	return null
	// }
}

/**
 * Déconnexion (best-effort ; sans route backend, échoue silencieusement).
 */
export async function logoutRequest() {
	const csrf = readCookie('csrftoken')
	const headers = { Accept: 'application/json' }
	if (csrf) headers['X-CSRFToken'] = csrf
	const res = await fetch(AUTH_PATHS.logout, {
		method: 'POST',
		credentials: 'include',
		headers,
	})
	return res.ok
}
