import { ChessPieceImg } from './ChessPiecePng.jsx'

export function MoveGhost({ activeMoveAnim, durationMs, pieceRotation, onTransitionEnd }) {
  if (!activeMoveAnim) return null
  if (activeMoveAnim.phase !== 'slide' && activeMoveAnim.phase !== 'sliding') return null
  if (activeMoveAnim.size == null) return null

  return (
    <div
      className={`board-move-ghost ${activeMoveAnim.phase === 'sliding' ? 'board-move-ghost--sliding' : ''}`}
      style={{
        '--ghost-x0': `${activeMoveAnim.x0}px`,
        '--ghost-y0': `${activeMoveAnim.y0}px`,
        '--ghost-dx': `${activeMoveAnim.dx}px`,
        '--ghost-dy': `${activeMoveAnim.dy}px`,
        '--ghost-size': `${activeMoveAnim.size}px`,
        '--ghost-dur': `${durationMs}ms`,
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <ChessPieceImg
        theme={activeMoveAnim.themeSlug}
        pieceType={activeMoveAnim.moving.type}
        pieceColor={activeMoveAnim.moving.color}
        className="board-move-ghost__img"
        style={{ transform: pieceRotation }}
      />
    </div>
  )
}
