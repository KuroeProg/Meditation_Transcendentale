/** Slugs coalition (thème pièces, fond, profil). */

const SLUGS = ['feu', 'eau', 'terre', 'air']

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