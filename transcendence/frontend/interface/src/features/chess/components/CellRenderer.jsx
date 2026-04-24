import { memo } from 'react'
import { ChessPieceImg } from './ChessPiecePng.jsx'

const BoardCell = memo(function BoardCell({
  sq,
  isLight,
  useTiles,
  tileCoalitionSlug,
  tileSrc,
  tileRotation,
  pieceType,
  pieceColor,
  pieceThemeSlug,
  isSelected,
  isPossibleMove,
  isPossibleCapture,
  isKingCheckCell,
  isIllegalFlash,
  suppressPiece,
  pieceRotation,
  isDragOver,
}) {
  const className = [
    'cell',
    isLight ? 'light' : 'dark',
    useTiles ? 'board-tiles' : '',
    isSelected ? 'selected' : '',
    isPossibleMove ? 'possible-move' : '',
    isPossibleCapture ? 'possible-capture' : '',
    isKingCheckCell ? 'king-check king-check-attn' : '',
    isIllegalFlash ? 'illegal-move-flash' : '',
    isDragOver ? 'drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showPiece = pieceType && pieceColor && !suppressPiece

  return (
    <div data-square={sq} className={className}>
      {useTiles && tileSrc && (
        <span className="cell-tile-stack" aria-hidden>
          <img
            className="cell-tile"
            src={tileSrc}
            alt=""
            draggable={false}
            decoding="async"
            style={{ transform: tileRotation }}
            data-tile-theme={tileCoalitionSlug}
            data-tile-shade={isLight ? 'light' : 'dark'}
          />
        </span>
      )}

      {showPiece && (
        <div className="piece-wrap">
          <ChessPieceImg
            theme={pieceThemeSlug}
            pieceType={pieceType}
            pieceColor={pieceColor}
            className="piece"
            style={{ transform: pieceRotation }}
          />
        </div>
      )}
    </div>
  )
})

export function CellRenderer({
  position,
  toSquare,
  selected,
  possibleMoves,
  kingSquare,
  kingFlash,
  illegalFlashSq,
  tilePattern,
  useTiles,
  tileCoalitionSlug,
  tileRotation,
  whitePieceThemeSlug,
  blackPieceThemeSlug,
  activeMoveAnim,
  pieceRotation,
  pieceSuppressed,
  dragOverSq,
}) {
  return position.map((row, rowIndex) =>
    row.map((piece, colIndex) => {
      const sq = toSquare(rowIndex, colIndex)
      const isLight = (rowIndex + colIndex) % 2 === 0
      const isSelected = selected === sq
      const isPossibleMove = possibleMoves.includes(sq) && !piece
      const isPossibleCapture = possibleMoves.includes(sq) && !!piece
      const isKingInCheck = sq === kingSquare && kingFlash
      const isIllegal = illegalFlashSq === sq
      const tileSrc = tilePattern ? tilePattern[rowIndex * 8 + colIndex] : null

      return (
        <BoardCell
          key={`${rowIndex}-${colIndex}`}
          sq={sq}
          isLight={isLight}
          useTiles={useTiles}
          tileCoalitionSlug={tileCoalitionSlug}
          tileSrc={tileSrc}
          tileRotation={tileRotation}
          pieceType={piece ? piece.type : null}
          pieceColor={piece ? piece.color : null}
          pieceThemeSlug={piece ? (piece.color === 'w' ? whitePieceThemeSlug : blackPieceThemeSlug) : ''}
          isSelected={isSelected}
          isPossibleMove={isPossibleMove}
          isPossibleCapture={isPossibleCapture}
          isKingCheckCell={isKingInCheck}
          isIllegalFlash={isIllegal}
          suppressPiece={pieceSuppressed(sq, activeMoveAnim)}
          pieceRotation={pieceRotation}
          isDragOver={dragOverSq === sq}
        />
      )
    }),
  )
}
