export function ResignConfirmModal({ open, resigningColorLabel, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="stats-modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-resign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="stats-resign-title" className="stats-modal__title">
          Abandonner la partie ?
        </p>
        <p className="stats-modal__text">
          Les <strong>{resigningColorLabel}</strong> perdent immédiatement. Cette action ne peut pas être annulée.
        </p>
        <div className="stats-modal__actions">
          <button type="button" className="stats-modal__btn stats-modal__btn--ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="stats-modal__btn stats-modal__btn--danger" onClick={onConfirm}>
            Abandonner
          </button>
        </div>
      </div>
    </div>
  )
}
