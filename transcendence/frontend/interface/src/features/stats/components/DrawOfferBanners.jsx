export function DrawOfferBanners({ drawOfferIncoming, drawOfferOutgoing, onRespondDraw }) {
  if (drawOfferIncoming) {
    return (
      <div className="stats-result-banner">
        <p className="stats-result-title">Proposition de nulle</p>
        <p className="stats-result-sub">Votre adversaire propose match nul.</p>
        <div className="stats-modal__actions">
          <button
            type="button"
            className="stats-modal__btn stats-modal__btn--ghost"
            onClick={() => onRespondDraw?.(false)}
          >
            Refuser
          </button>
          <button
            type="button"
            className="stats-modal__btn stats-modal__btn--primary"
            onClick={() => onRespondDraw?.(true)}
          >
            Accepter
          </button>
        </div>
      </div>
    )
  }

  if (drawOfferOutgoing) {
    return (
      <div className="stats-result-banner">
        <p className="stats-result-title">Nulle proposée</p>
        <p className="stats-result-sub">En attente de réponse de l’adversaire.</p>
      </div>
    )
  }

  return null
}
