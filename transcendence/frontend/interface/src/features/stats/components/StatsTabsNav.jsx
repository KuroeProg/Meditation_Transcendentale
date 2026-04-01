const VIEW_TABS = [
	{ id: 'moves', icon: 'ri-file-list-3-line', label: 'Coups' },
	{ id: 'history', icon: 'ri-history-line', label: 'Parties' },
	{ id: 'friends', icon: 'ri-group-line', label: 'Amis' },
]

export function StatsTabsNav({ activeTab, setActiveTab, onPlayAgain, gameEnded }) {
	const showNewGame = !gameEnded && typeof onPlayAgain === 'function'

	return (
		<div className="stats-nav-shell">
			<div className="stats-nav" role="tablist" aria-label="Sections du panneau">
				{VIEW_TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.id}
						className={`stats-nav-btn ${activeTab === tab.id ? 'stats-nav-btn--active' : ''}`}
						onClick={() => setActiveTab(tab.id)}
					>
						<i className={tab.icon} aria-hidden />
						<span>{tab.label}</span>
					</button>
				))}
			</div>
			{showNewGame ? (
				<button type="button" className="stats-new-game-btn" onClick={onPlayAgain}>
					<i className="ri-restart-line" aria-hidden />
					<span>Nouvelle partie</span>
				</button>
			) : null}
		</div>
	)
}
