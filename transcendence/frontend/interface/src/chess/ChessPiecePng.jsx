/** Pièces PNG : `public/chess/pieces/<coalition>/{light|dark}/<type>.png` (types chess.js). */

import { isKnownCoalitionSlug } from '../utils/coalitionTheme.js'

export function chessColorToVariant(color) {
	return color === 'w' ? 'light' : 'dark'
}

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
