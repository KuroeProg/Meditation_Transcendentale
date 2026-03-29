/** Grille de tuiles PNG par coalition ; manifeste via `npm run generate:tiles-manifest`. */

import { isKnownCoalitionSlug } from '../../theme/services/coalitionTheme'
import boardTilesManifest from './boardTilesManifest.json'

export function hash32(str) {
	let h = 1779033703 ^ str.length
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
		h = (h << 13) | (h >>> 19)
	}
	h = Math.imul(h ^ (h >>> 16), 2246822507)
	h = Math.imul(h ^ (h >>> 13), 3266489909)
	return (h ^ (h >>> 16)) >>> 0
}

function seededShuffle(items, seed) {
	const out = [...items]
	let s = hash32(seed)
	for (let i = out.length - 1; i > 0; i--) {
		s = (Math.imul(s, 1103515245) + 12345) >>> 0
		const j = s % (i + 1)
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}

export const BOARD_TILES = {
	active: true,
	rootPath: '/chess/tiles',
	/** Seed par défaut si aucun seed n’est fourni (tests / Storybook). */
	seed: 'default-board-seed',
}

/** Seed unique pour une disposition aléatoire des dalles (chaque partie). */
export function randomTilePatternSeed() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `board-${crypto.randomUUID()}`
	}
	return `board-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function safeTileThemeSlug(slug) {
	return isKnownCoalitionSlug(slug) ? slug : 'feu'
}

export function tileManifestForSlug(slug) {
	const key = safeTileThemeSlug(slug)
	const m = boardTilesManifest[key]
	return {
		light: Array.isArray(m?.light) ? m.light : [],
		dark: Array.isArray(m?.dark) ? m.dark : [],
	}
}

export function themeHasTileAssets(slug) {
	const { light, dark } = tileManifestForSlug(slug)
	return light.length > 0 && dark.length > 0
}

function assignTilesLowAdjacency(positions, pool, seed, grid) {
	if (!pool.length) return
	const order = seededShuffle(
		positions.map((p, i) => i),
		`${seed}|order|${pool.join(',')}`
	)
	for (const idx of order) {
		const [r, c] = positions[idx]
		const ortho = [
			grid[r - 1]?.[c],
			grid[r + 1]?.[c],
			grid[r]?.[c - 1],
			grid[r]?.[c + 1],
		].filter((x) => x != null)

		let bestId = pool[0]
		let bestScore = -Infinity
		for (const id of pool) {
			const sameNeighbors = ortho.filter((n) => n === id).length
			const noise = (hash32(`${seed}|${r}|${c}|${id}`) % 10000) / 10000
			const score = -sameNeighbors * 1000 + noise
			if (score > bestScore) {
				bestScore = score
				bestId = id
			}
		}
		grid[r][c] = bestId
	}
}

export function buildTileUrlGrid(seed, coalitionSlug) {
	const { light: lightPool, dark: darkPool } = tileManifestForSlug(coalitionSlug)
	if (!lightPool.length || !darkPool.length) return null

	const theme = safeTileThemeSlug(coalitionSlug)
	const base = BOARD_TILES.rootPath

	/** @type {(number|null)[][]} */
	const idGrid = Array.from({ length: 8 }, () => Array(8).fill(null))
	const lightPos = []
	const darkPos = []
	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) {
			if ((r + c) % 2 === 0) lightPos.push([r, c])
			else darkPos.push([r, c])
		}
	}

	assignTilesLowAdjacency(lightPos, lightPool, `${seed}|light|${coalitionSlug}`, idGrid)
	assignTilesLowAdjacency(darkPos, darkPool, `${seed}|dark|${coalitionSlug}`, idGrid)

	const urlGrid = Array.from({ length: 8 }, (_, r) =>
		Array.from({ length: 8 }, (_, c) => {
			const id = idGrid[r][c]
			const shade = (r + c) % 2 === 0 ? 'light' : 'dark'
			return `${base}/${theme}/${shade}/${id}.png`
		})
	)
	return urlGrid
}

export function buildTileUrlFlat(seed, coalitionSlug) {
	const g = buildTileUrlGrid(seed, coalitionSlug)
	if (!g) return null
	const flat = []
	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) flat.push(g[r][c])
	}
	return flat
}
