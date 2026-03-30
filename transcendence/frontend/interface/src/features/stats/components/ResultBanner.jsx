export function ResultBanner({ result, onPlayAgain }) {
  return (
    <div className="stats-result-banner">
      <p className="stats-result-title">{result.title}</p>
      <p className="stats-result-sub">{result.subtitle}</p>
      {typeof onPlayAgain === 'function' && (
        <button type="button" className="stats-play-again" onClick={onPlayAgain}>
          Nouvelle partie
        </button>
      )}
    </div>
  )
}
