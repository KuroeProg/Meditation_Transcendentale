/**
 * CapturedPieces — Affichage des pièces capturées et de l'avantage matériel.
 *
 * Style inspiré chess.com : rangée de pièces prises + "+N" si avantage.
 * Fonctionne entièrement côté frontend à partir de l'instance Chess (chess.js).
 *
 * Contrat API future :
 *   Le backend expose `material_advantage` dans `game_state.moves` côté Redis.
 *   Si disponible, ce champ peut remplacer le calcul local via le prop `serverAdvantage`.
 */
import { useMemo } from 'react'
import './CapturedPieces.css'

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 }
const INITIAL_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 }

/* Symboles Unicode par couleur */
const PIECE_SYMBOLS = {
	w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
	b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

/* Ordre d'affichage : du moins au plus précieux */
const DISPLAY_ORDER = ['p', 'n', 'b', 'r', 'q']

/**
 * Calcule depuis une instance chess.js :
 *  - capturedByWhite : pièces noires capturées par les blancs
 *  - capturedByBlack : pièces blanches capturées par les noirs
 *  - advantage       : valeur positive si blancs sont devant
 */
export function computeCapturedPieces(game) {
	if (!game) return { capturedByWhite: {}, capturedByBlack: {}, advantage: 0 }

	const board = game.board()
	const onBoard = { w: {}, b: {} }

	for (const row of board) {
		for (const cell of row) {
			if (!cell || cell.type === 'k') continue
			onBoard[cell.color][cell.type] = (onBoard[cell.color][cell.type] || 0) + 1
		}
	}

	const capturedByWhite = {} // pièces noires manquantes = prises par les blancs
	const capturedByBlack = {} // pièces blanches manquantes = prises par les noirs

	let whitePoints = 0
	let blackPoints = 0

	for (const type of DISPLAY_ORDER) {
		const bMissing = INITIAL_COUNTS[type] - (onBoard.b[type] || 0)
		const wMissing = INITIAL_COUNTS[type] - (onBoard.w[type] || 0)

		if (bMissing > 0) {
			capturedByWhite[type] = bMissing
			whitePoints += bMissing * PIECE_VALUES[type]
		}
		if (wMissing > 0) {
			capturedByBlack[type] = wMissing
			blackPoints += wMissing * PIECE_VALUES[type]
		}
	}

	return {
		capturedByWhite,
		capturedByBlack,
		advantage: whitePoints - blackPoints,
	}
}

/** Rangée de pièces capturées pour un camp donné */
function PiecesRow({ captured, pieceColor, advantage }) {
	const pieces = []

	for (const type of DISPLAY_ORDER) {
		const count = captured[type] || 0
		for (let i = 0; i < count; i++) {
			pieces.push(
				<span key={`${type}-${i}`} className="cp-piece" aria-hidden="true">
					{PIECE_SYMBOLS[pieceColor][type]}
				</span>
			)
		}
	}

	if (!pieces.length && advantage <= 0) return null

	return (
		<div className="cp-row">
			<span className="cp-pieces" aria-hidden="true">{pieces}</span>
			{advantage > 0 && (
				<span className="cp-advantage" aria-label={`Avantage de ${advantage} points`}>
					+{advantage}
				</span>
			)}
		</div>
	)
}

/**
 * Props :
 *   game         — instance Chess (chess.js) pour calculer les prises
 *   playerColor  — 'w' | 'b' — couleur du joueur en bas
 *   position     — 'top' | 'bottom' — position dans le layout
 *   serverAdvantage — (optionnel) avantage fourni par le serveur
 */
export function CapturedPiecesBar({ game, playerColor, position, serverAdvantage }) {
	const { capturedByWhite, capturedByBlack, advantage: localAdv } =
		useMemo(() => computeCapturedPieces(game), [game])

	const advantage = serverAdvantage ?? localAdv

	if (position === 'top') {
		// Au-dessus du joueur du haut (opposant)
		// → montre les pièces que l'opposant a capturées (pièces du joueur manquantes)
		const topColor = playerColor === 'b' ? 'w' : 'b'
		const topCaptured = topColor === 'w' ? capturedByWhite : capturedByBlack
		const topAdv = topColor === 'w' ? Math.max(advantage, 0) : Math.max(-advantage, 0)
		return (
			<div className="cp-bar cp-bar--top" aria-label="Pièces capturées par l'adversaire">
				<PiecesRow
					captured={topCaptured}
					pieceColor={topColor === 'w' ? 'b' : 'w'}
					advantage={topAdv}
				/>
			</div>
		)
	}

	// Au-dessus du joueur en bas (joueur courant)
	// → montre les pièces que le joueur courant a capturées (pièces de l'adversaire manquantes)
	const bottomCaptured = playerColor === 'w' ? capturedByWhite : capturedByBlack
	const bottomAdv = playerColor === 'w' ? Math.max(advantage, 0) : Math.max(-advantage, 0)

	return (
		<div className="cp-bar cp-bar--bottom" aria-label="Tes pièces capturées">
			<PiecesRow
				captured={bottomCaptured}
				pieceColor={playerColor === 'w' ? 'b' : 'w'}
				advantage={bottomAdv}
			/>
		</div>
	)
}
