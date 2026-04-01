import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'

const NAV_ITEMS = [
	{ to: '/dashboard', icon: 'fa-house', label: 'Home' },
	{ to: '/game', icon: 'fa-chess', label: 'Game' },
	{ to: '/profile', icon: 'fa-user', label: 'Profile' },
	{ to: '/statistics', icon: 'fa-chart-pie', label: 'Stats' },
	{ to: '/settings', icon: 'fa-gear', label: 'Settings' },
]

function BottomNav() {
	const navigate = useNavigate()
	const { logout, isAuthenticated } = useAuth()

	const handleLogout = async () => {
		await logout()
		navigate('/auth', { replace: true })
	}

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
					className="bottom-nav__item bottom-nav__logout"
					onClick={handleLogout}
				>
					<i className="fa-solid fa-right-from-bracket" />
					<span>Logout</span>
				</button>
			)}
		</nav>
	)
}

export default BottomNav
