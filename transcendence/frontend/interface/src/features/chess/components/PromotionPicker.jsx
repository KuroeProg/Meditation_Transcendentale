import { ChessPieceImg } from './ChessPiecePng.jsx'

const PROMOTION_LABELS = {
  q: 'Dame',
  r: 'Tour',
  b: 'Fou',
  n: 'Cavalier',
}

export function PromotionPicker({ promotionPick, isViewOnly, onCancel, onChoose }) {
  if (!promotionPick || isViewOnly) return null

  return (
    <div
      className="board-promotion-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir la piece de promotion"
    >
      <button
        type="button"
        className="board-promotion-backdrop"
        aria-label="Annuler la promotion"
        onClick={onCancel}
      />
      <div className="board-promotion-toolbar">
        <p className="board-promotion-title">Promotion du pion</p>
        <div className="board-promotion-choices">
          {promotionPick.options.map((code) => (
            <button
              key={code}
              type="button"
              className="board-promotion-btn"
              aria-label={PROMOTION_LABELS[code] ?? code}
              onClick={() => onChoose(code)}
            >
              <ChessPieceImg
                theme={promotionPick.themeSlug}
                pieceType={code}
                pieceColor={promotionPick.color}
                className="board-promotion-piece"
              />
              <span className="board-promotion-label">{PROMOTION_LABELS[code] ?? code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
