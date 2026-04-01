export function SummaryCards({ stats }) {
  return (
    <div className="stats-cards">
      <div className="stats-card">
        <span className="stats-card__label">Games Played</span>
        <span className="stats-card__value">
          {stats.gamesPlayed.toLocaleString()}
          <i className="ri-line-chart-line stats-card__icon" />
        </span>
      </div>
      <div className="stats-card">
        <span className="stats-card__label">Winrate</span>
        <span className="stats-card__value">{stats.winrate}%</span>
      </div>
      <div className="stats-card">
        <span className="stats-card__label">ELO Rating</span>
        <span className="stats-card__value">
          {stats.eloRating}
          <span className={`stats-card__change ${stats.eloChange < 0 ? 'stats-card__change--negative' : ''}`}>
            {stats.eloChange > 0 ? '+' : ''}
            {stats.eloChange}
          </span>
        </span>
      </div>
    </div>
  )
}
