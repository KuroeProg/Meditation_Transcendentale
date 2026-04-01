export function DrawOfferModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="stats-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-draw-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="stats-draw-title" className="stats-modal__title">
          Proposition de match nul
        </p>
        <p className="stats-modal__text">Envoyer une proposition de nulle à votre adversaire ?</p>
        <div className="stats-modal__actions">
          <button type="button" className="stats-modal__btn stats-modal__btn--ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="stats-modal__btn stats-modal__btn--primary" onClick={onConfirm}>
            Proposer nul
          </button>
        </div>
      </div>
    </div>
  )
}
