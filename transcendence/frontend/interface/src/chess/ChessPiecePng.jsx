/**
 * Pièces PNG par coalition — assets dans public/chess/pieces/{eau|feu|terre|air}/
 * chess.js : p r n b q k → fichiers .png du même nom.
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
 * @param {object} props
 * @param {'eau'|'feu'|'terre'|'air'} props.theme — slug inconnu → repli **feu**
 * @param {string} props.pieceType
 * @param {'w'|'b'} props.pieceColor
 * @param {string} [props.className]
 */
export function ChessPieceImg({ theme, pieceType, pieceColor, className, ...rest }) {
	const resolved = isKnownCoalitionSlug(theme) ? theme : 'feu'
	const variant = chessColorToVariant(pieceColor)
	const src = `/chess/pieces/${resolved}/${variant}/${pieceType}.png`
	return (
		<img
			src={src}
			alt=""
			className={className}
			draggable={false}
			data-piece-type={pieceType}
			{...rest}
		/>
	)
}
