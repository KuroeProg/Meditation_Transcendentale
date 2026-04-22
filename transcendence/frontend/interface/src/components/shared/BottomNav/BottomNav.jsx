import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import { useChatUi } from '../../../features/chat/index.js'
import { NAV_ITEMS } from '../../../config/navItems.js'

function BottomNav() {
	const { isAuthenticated } = useAuth()
	const { openChat } = useChatUi()

	return (
		<nav className="bottom-nav" aria-label="Navigation principale">
			{NAV_ITEMS.map(({ to, icon, label }) => (
				<NavLink
					key={to}
					to={to}
					className={({ isActive }) =>
						`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
					}
					aria-label={label}
				>
					<i className={`fa-solid ${icon}`} aria-hidden="true" />
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
					<i className="ri-chat-3-line" aria-hidden="true" />
					<span>Messages</span>
				</button>
			)}
		</nav>
	)
}

export default BottomNav
