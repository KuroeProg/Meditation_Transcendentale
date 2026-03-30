const TABS = [
  { id: 'moves', icon: 'ri-play-fill', label: 'Jouer' },
  { id: 'newgame', icon: 'ri-restart-line', label: 'Nouvelle partie' },
  { id: 'history', icon: 'ri-history-line', label: 'Parties' },
  { id: 'friends', icon: 'ri-group-line', label: 'Amis' },
]

export function StatsTabsNav({ activeTab, setActiveTab, onPlayAgain }) {
  return (
    <div className="stats-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`stats-nav-btn ${activeTab === tab.id ? 'stats-nav-btn--active' : ''}`}
          onClick={() => {
            if (tab.id === 'newgame' && typeof onPlayAgain === 'function') {
              onPlayAgain()
              return
            }
            setActiveTab(tab.id)
          }}
        >
          <i className={tab.icon} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}
