/**
 * Pièces PNG par coalition — assets dans public/chess/pieces/{eau|feu|terre|air}/
 * Les fous : bg / bd selon la couleur de la case (clair / foncé sur l’échiquier).
 */

import { isKnownCoalitionSlug } from '../utils/coalitionTheme.js'

/**
 * @param {'w'|'b'} color
 * @returns {'light'|'dark'}
 */
export function chessColorToVariant(color) {
	return color === 'w' ? 'light' : 'dark'
}

/**
 * Clé fichier : k q r n p + bg | bd pour les fous.
 * Case claire (classe .light sur notre plateau) → bg, case foncée → bd.
 *
 * @param {string} pieceType — chess.js : p r n b q k
 * @param {number} rowIndex — 0 = rangée 8
 * @param {number} colIndex — 0 = colonne a
 */
export function piecePngKey(pieceType, rowIndex, colIndex) {
	if (pieceType !== 'b') return pieceType
	const onLightSquare = (rowIndex + colIndex) % 2 === 0
	return onLightSquare ? 'bg' : 'bd'
}

/**
 * @param {object} props
 * @param {'eau'|'feu'|'terre'|'air'} props.theme — slug inconnu → repli **feu**
 * @param {string} props.pieceType
 * @param {'w'|'b'} props.pieceColor
 * @param {number} props.rowIndex
 * @param {number} props.colIndex
 * @param {string} [props.className]
 */
export function ChessPieceImg({ theme, pieceType, pieceColor, rowIndex, colIndex, className, ...rest }) {
	const resolved = isKnownCoalitionSlug(theme) ? theme : 'feu'
	const variant = chessColorToVariant(pieceColor)
	const key = piecePngKey(pieceType, rowIndex, colIndex)
	const src = `/chess/pieces/${resolved}/${variant}/${key}.png`
	return (
		<img
			src={src}
			alt=""
			className={className}
			draggable={false}
			{...rest}
		/>
	)
}
