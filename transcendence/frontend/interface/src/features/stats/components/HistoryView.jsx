export function HistoryView({ recentGames = [] }) {
  return (
    <div>
      {recentGames.map((game) => (
        <div key={game.id} className="stats-list-item">
          <span className={`stats-history-result stats-history-result--${game.result}`}>{game.result}</span>
          <span style={{ flex: 1 }}>{game.opponent}</span>
          <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{game.date}</span>
        </div>
      ))}
    </div>
  )
}
