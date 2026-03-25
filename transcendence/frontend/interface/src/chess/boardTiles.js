/**
 * Damier en tuiles PNG par thème de coalition.
 * Motif généré avec **faible répétition locale** (pénalité si même tuile qu’un voisin orthogonal).
 *
 * Manifeste : npm run generate:tiles-manifest (predev / prebuild)
 */

import { isKnownCoalitionSlug } from '../utils/coalitionTheme.js'
import boardTilesManifest from './boardTilesManifest.json'

/** @param {string} str */
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

/** Mélange déterministe (Fisher–Yates + seed) */
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
	seed: 'default-board-seed',
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

/**
 * Remplit les cases d’une parité (clair ou foncé) en évitant les blocs de même tuile.
 * @param {number[][]} positions [row, col][]
 * @param {number[]} pool
 * @param {string} seed
 * @param {(number|null)[][]} grid
 */
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
			// Forte pénalité si voisin identique ; léger bruit pour départager
			const score = -sameNeighbors * 1000 + noise
			if (score > bestScore) {
				bestScore = score
				bestId = id
			}
		}
		grid[r][c] = bestId
	}
}

/**
 * Grille 8×8 d’URLs de tuiles (indices [row][col]), ou null si pas d’assets.
 * @param {string} seed
 * @param {string} coalitionSlug
 * @returns {string[][] | null}
 */
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

/**
 * Plateau aplati rangée par rangée (comme avant), pour Board.jsx
 * @returns {string[] | null}
 */
export function buildTileUrlFlat(seed, coalitionSlug) {
	const g = buildTileUrlGrid(seed, coalitionSlug)
	if (!g) return null
	const flat = []
	for (let r = 0; r < 8; r++) {
		for (let c = 0; c < 8; c++) flat.push(g[r][c])
	}
	return flat
}
