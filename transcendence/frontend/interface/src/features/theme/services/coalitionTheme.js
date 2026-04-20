/** Slugs coalition (thème pièces, fond, profil). */

const SLUGS = ['feu', 'eau', 'terre', 'air']

/**
 * Visiteur non connecté : thème neutre « minuit » (home, contact, à propos, auth).
 * Pendant `isLoading`, on garde le défaut feu pour éviter un flash sur les routes protégées.
 */
export function shouldUseNeutralGuestTheme(pathname, hasUser, isLoading) {
	if (hasUser || isLoading || !pathname) return false
	if (pathname === '/' || pathname === '/contact' || pathname === '/about') return true
	if (pathname === '/auth' || pathname.startsWith('/auth/')) return true
	return false
}

/**
 * @param {string | undefined | null} raw — ex. "Feu", "L'eau", coalition_name API
 * @returns {'feu'|'eau'|'terre'|'air'}
 */
export function coalitionToSlug(raw) {
	if (raw == null || String(raw).trim() === '') return 'feu'
	const s = String(raw)
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/['']/g, '')
	if (s.includes('feu')) return 'feu'
	if (s.includes('eau')) return 'eau'
	if (s.includes('terre')) return 'terre'
	if (s.includes('air')) return 'air'
	return 'feu'
}

export function isKnownCoalitionSlug(slug) {
	return SLUGS.includes(slug)
}

export function coalitionSlugToLabel(slug) {
	const labels = { feu: 'Feu', eau: 'Eau', terre: 'Terre', air: 'Air' }
	return labels[slug] ?? slug ?? '—'
}