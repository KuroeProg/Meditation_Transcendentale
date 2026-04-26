export function ResultBanner({ result, onPlayAgain, onRematch, rematchOfferOutgoing, mode }) {
  const isOnline = mode === 'online'

  return (
    <div className="stats-result-banner">
      <p className="stats-result-title">{result.title}</p>
      <p className="stats-result-sub">{result.subtitle}</p>
      <div className="stats-result-actions">
        {typeof onPlayAgain === 'function' && (
          <button
            type="button"
            className="stats-play-again"
            data-testid="result-new-game"
            onClick={onPlayAgain}
          >
            Nouvelle partie
          </button>
        )}
        {isOnline && typeof onRematch === 'function' && !rematchOfferOutgoing && (
          <button
            type="button"
            className="stats-play-again stats-play-again--secondary"
            data-testid="result-rematch"
            onClick={onRematch}
          >
            Revanche
          </button>
        )}
        {isOnline && rematchOfferOutgoing && (
          <p className="stats-result-sub" data-testid="result-rematch-waiting">
            Proposition de revanche envoyée…
          </p>
        )}
      </div>
    </div>
  )
}
