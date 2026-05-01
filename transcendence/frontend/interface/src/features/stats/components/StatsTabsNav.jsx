const VIEW_TABS = [
	{ id: 'moves',   icon: 'ri-file-list-3-line', label: 'Coups'   },
	{ id: 'history', icon: 'ri-history-line',      label: 'Parties' },
	{ id: 'chat',    icon: 'ri-chat-3-line',       label: 'Chat'    },
	{ id: 'friends', icon: 'ri-group-line',        label: 'Amis'    },
]

export function StatsTabsNav({ activeTab, setActiveTab, onPlayAgain, gameEnded, chatUnread = 0 }) {
	const showNewGame = Boolean(gameEnded) && typeof onPlayAgain === 'function'

	return (
		<div className="stats-nav-shell">
			<div className="stats-nav" role="tablist" aria-label="Sections du panneau">
				{VIEW_TABS.map((tab) => {
					const hasBadge = tab.id === 'chat' && chatUnread > 0
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							data-testid={`stats-tab-${tab.id}`}
							aria-selected={activeTab === tab.id}
							className={`stats-nav-btn${activeTab === tab.id ? ' stats-nav-btn--active' : ''}`}
							onClick={() => setActiveTab(tab.id)}
						>
							<span className="stats-nav-btn__icon-wrap">
								<i className={tab.icon} aria-hidden />
								{hasBadge && (
									<span
										className="stats-nav-chat-badge"
										aria-label={`${chatUnread} message${chatUnread > 1 ? 's' : ''} non lu${chatUnread > 1 ? 's' : ''}`}
									>
										{chatUnread > 9 ? '9+' : chatUnread}
									</span>
								)}
							</span>
							<span>{tab.label}</span>
						</button>
					)
				})}
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
