export function RematchOfferBanner({ rematchOfferIncoming, rematchOfferOutgoing, onRespondRematch }) {
  if (rematchOfferIncoming) {
    return (
      <div className="stats-result-banner" data-testid="rematch-banner-incoming">
        <p className="stats-result-title">Proposition de revanche</p>
        <p className="stats-result-sub">Votre adversaire propose une revanche.</p>
        <div className="stats-modal__actions">
          <button
            type="button"
            className="stats-modal__btn stats-modal__btn--ghost"
            data-testid="rematch-decline"
            onClick={() => onRespondRematch?.(false)}
          >
            Refuser
          </button>
          <button
            type="button"
            className="stats-modal__btn stats-modal__btn--primary"
            data-testid="rematch-accept"
            onClick={() => onRespondRematch?.(true)}
          >
            Accepter
          </button>
        </div>
      </div>
    )
  }

  if (rematchOfferOutgoing) {
    return (
      <div className="stats-result-banner" data-testid="rematch-banner-outgoing">
        <p className="stats-result-title">Revanche proposée</p>
        <p className="stats-result-sub">En attente de réponse de l'adversaire.</p>
      </div>
    )
  }

  return null
}
