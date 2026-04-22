import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import SiteBrandLogo from '../../common/Logo/SiteBrandLogo.jsx'
import { NAV_ITEMS } from '../../../config/navItems.js'

function Sidebar() {
	const navigate = useNavigate()
	const { logout, isAuthenticated } = useAuth()

	const handleLogout = async () => {
		await logout()
		navigate('/auth', { replace: true })
	}

	return (
		<div className="sidebar" role="navigation" aria-label="Navigation principale">
			<ul>
				<li>
					<Link to="/" className="logo" aria-label="Accueil Transcendance">
						<span className="icon">
							<SiteBrandLogo className="Profile-logo site-brand-logo" alt="" />
						</span>
						<span className="text">Transcendance</span>
					</Link>
				</li>

				{NAV_ITEMS.map(({ to, icon, label }) => (
					<li key={to}>
						<NavLink
							to={to}
							className={({ isActive }) =>
								isActive ? 'sidebar-navlink sidebar-navlink--active' : 'sidebar-navlink'
							}
						>
							<span className="icon">
								<i className={`fa-solid ${icon}`} aria-hidden="true" />
							</span>
							<span className="text">{label}</span>
						</NavLink>
					</li>
				))}

				<li>
					{isAuthenticated ? (
						<button
							type="button"
							className="sidebar-btn sidebar-btn--logout"
							onClick={handleLogout}
							aria-label="Se déconnecter"
						>
							<span className="icon">
								<i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
							</span>
							<span className="text">Déconnexion</span>
						</button>
					) : (
						<Link to="/auth" aria-label="Se connecter">
							<span className="icon">
								<i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
							</span>
							<span className="text">Connexion</span>
						</Link>
					)}
				</li>
			</ul>
		</div>
	)
}

export default Sidebar
