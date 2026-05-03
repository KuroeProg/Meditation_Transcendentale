/**
 * Normalise les champs renvoyés par le backend après OAuth 42.
 * Le backend peut soit reprendre la forme API Intra (image.link, first_name…),
 * soit aplatir (image_url, login…).
 */

const FALLBACK_AVATAR = '/imgs/Profile-Logo.png'

/** Photo de profil Intra (pas de changement côté app pour l’instant). */
export function get42AvatarUrl(user) {
	if (!user || typeof user !== 'object') return FALLBACK_AVATAR
	if (user.image?.link) return user.image.link
	if (user.image?.versions?.medium) return user.image.versions.medium
	if (typeof user.image_url === 'string' && user.image_url) return user.image_url
	if (typeof user.avatar_url === 'string' && user.avatar_url) return user.avatar_url
	if (typeof user.avatar === 'string' && user.avatar) return user.avatar
	return FALLBACK_AVATAR
}

export function getLogin42(user) {
	if (!user) return null
	return user.login ?? user.login_42 ?? user.intra_login ?? user.username ?? null
}

export function getFullName(user) {
	if (!user) return null
	const first = (user.first_name ?? user.firstName ?? '').trim()
	const last = (user.last_name ?? user.lastName ?? '').trim()
	const combined = `${first} ${last}`.trim()
	return combined || null
}

export function getDisplayTitle(user) {
	const name = getFullName(user)
	const login = getLogin42(user)
	if (name && login) return { primary: name, secondary: login }
	if (login) return { primary: login, secondary: null }
	if (name) return { primary: name, secondary: null }
	return { primary: 'Joueur', secondary: null }
}
