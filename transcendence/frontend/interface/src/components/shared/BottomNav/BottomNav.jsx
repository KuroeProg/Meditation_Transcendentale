import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { useChatUi } from '../../../features/chat/index.js'

const NAV_ITEMS = [
	{ to: '/dashboard', icon: 'fa-table-columns', label: 'Dashboard' },
	{ to: '/game', icon: 'fa-chess', label: 'Game' },
	{ to: '/profile', icon: 'fa-user', label: 'Profile' },
	{ to: '/statistics', icon: 'fa-chart-pie', label: 'Stats' },
	{ to: '/settings', icon: 'fa-gear', label: 'Settings' },
]

function BottomNav() {
	const { isAuthenticated } = useAuth()
	const { openChat } = useChatUi()

	return (
		<nav className="bottom-nav" aria-label="Main navigation">
			{NAV_ITEMS.map(({ to, icon, label }) => (
				<NavLink
					key={to}
					to={to}
					className={({ isActive }) =>
						`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
					}
				>
					<i className={`fa-solid ${icon}`} />
					<span>{label}</span>
				</NavLink>
			))}
			{isAuthenticated && (
				<button
					type="button"
					className="bottom-nav__item bottom-nav__chat"
					onClick={() => openChat()}
					aria-label="Ouvrir les messages"
				>
					<i className="ri-chat-3-line" />
					<span>Msg</span>
				</button>
			)}
		</nav>
	)
}

export default BottomNav
