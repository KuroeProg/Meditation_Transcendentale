/** Pièces PNG : `public/chess/pieces/<coalition>/{light|dark}/<type>.png` (types chess.js). */

import { memo, useMemo } from 'react'
import { isKnownCoalitionSlug } from '../utils/coalitionTheme.js'
import { chessColorToVariant } from './chessColorVariant.js'

function ChessPieceImgInner({ theme, pieceType, pieceColor, className, rowIndex, colIndex, ...rest }) {
	const resolved = isKnownCoalitionSlug(theme) ? theme : 'feu'
	const variant = chessColorToVariant(pieceColor)
	const src = useMemo(
		() => `/chess/pieces/${resolved}/${variant}/${pieceType}.png`,
		[resolved, variant, pieceType],
	)
	return (
		<img
			src={src}
			alt=""
			className={className}
			draggable={false}
			decoding="async"
			data-piece-type={pieceType}
			{...rest}
		/>
	)
}

/** Pas d’animation au déplacement : éviter un remount + spring à chaque coup (lag). */
export const ChessPieceImg = memo(ChessPieceImgInner)
