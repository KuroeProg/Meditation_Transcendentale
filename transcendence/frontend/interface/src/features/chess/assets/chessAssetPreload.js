/** Préchargement PNG pièces + tuiles pour éviter décodage / jank au premier clic. */

import { BOARD_TILES, buildTileUrlFlat, themeHasTileAssets } from './boardTiles.js'
import { getPieceThemeSlugForColor } from '../mock/mockGameOpponent.js'

const PIECE_TYPES = ['p', 'r', 'n', 'b', 'q', 'k']

export function collectPieceImageUrls(whiteSlug, blackSlug) {
	const urls = new Set()
	for (const t of PIECE_TYPES) {
		urls.add(`/chess/pieces/${whiteSlug}/light/${t}.png`)
		urls.add(`/chess/pieces/${blackSlug}/dark/${t}.png`)
	}
	return [...urls]
}

export function collectTileImageUrls(tileCoalitionSlug, tilePatternSeed) {
	const seed = tilePatternSeed ?? BOARD_TILES.seed
	if (!BOARD_TILES.active || !themeHasTileAssets(tileCoalitionSlug)) return []
	const flat = buildTileUrlFlat(seed, tileCoalitionSlug)
	if (!flat) return []
	return [...new Set(flat)]
}

/**
 * @param {object | null | undefined} user — session (coalition blancs)
 * @returns {string[]} URLs uniques
 */
export function collectChessGamePreloadUrls(user, tileCoalitionSlug, tilePatternSeed) {
	const w = getPieceThemeSlugForColor('w', user)
	const b = getPieceThemeSlugForColor('b', user)
	const all = new Set([...collectPieceImageUrls(w, b), ...collectTileImageUrls(tileCoalitionSlug, tilePatternSeed)])
	return [...all]
}

function preloadOne(src) {
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			if (typeof img.decode === 'function') {
				img.decode().then(() => resolve()).catch(() => resolve())
			} else {
				resolve()
			}
		}
		img.onerror = () => resolve()
		img.src = src
	})
}

/** Décode les images en parallèle (ne bloque pas l’UI si appelé depuis useEffect). */
export function preloadChessImages(urls) {
	return Promise.all(urls.map(preloadOne))
}
