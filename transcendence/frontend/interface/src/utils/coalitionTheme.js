/**
 * Coalitions 42 Perpignan (éléments) — assets pièces sous /public/chess/coalitions/
 */

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
	// fallback sûr
	return 'feu'
}

export function isKnownCoalitionSlug(slug) {
	return SLUGS.includes(slug)
}

/** Libellé court pour l’UI (profil, etc.) */
export function coalitionSlugToLabel(slug) {
	const labels = { feu: 'Feu', eau: 'Eau', terre: 'Terre', air: 'Air' }
	return labels[slug] ?? slug ?? '—'
}

/**
 * @param {string} slug — feu | eau | terre | air
 * @param {'w'|'b'} color — blancs = clair, noirs = sombre
 * @param {string} type — p r n b q k
 */
export function getCoalitionPiecePath(slug, color, type) {
	const safeSlug = isKnownCoalitionSlug(slug) ? slug : 'feu'
	const shade = color === 'w' ? 'clair' : 'sombre'
	const t = String(type).toLowerCase()
	return `/chess/coalitions/${safeSlug}/${shade}/${t}.svg`
}
