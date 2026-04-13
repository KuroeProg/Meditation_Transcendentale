import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/index.js'
import SiteBrandLogo from '../../common/Logo/SiteBrandLogo.jsx'
import { goToGuestHome } from '../../../utils/devGuestPreview.js'

function Sidebar() {
	const navigate = useNavigate()
	const { logout, isAuthenticated } = useAuth()

	const handleLogout = async () => {
		await logout()
		navigate('/auth', { replace: true })
	}

	const handleLogoNav = import.meta.env.DEV
		? async (e) => {
				e.preventDefault()
				await goToGuestHome(logout, navigate)
			}
		: undefined

	return (
		<div className="sidebar">
			<ul>
				<li>
					<Link to="/" className="logo" onClick={handleLogoNav}>
						<span className="icon">
							<SiteBrandLogo className="Profile-logo site-brand-logo" alt="" />
						</span>
						<span className="text">Transcendance</span>
					</Link>
				</li>
				<li>
					<Link to="/dashboard">
						<span className="icon">
							<i className="fa-solid fa-table-columns" />
						</span>
						<span className="text">Dashboard</span>
					</Link>
				</li>
				<li>
					<Link to="/game">
						<span className="icon">
							<i className="fa-solid fa-chess" />
						</span>
						<span className="text">Game</span>
					</Link>
				</li>
				<li>
					<Link to="/profile">
						<span className="icon">
							<i className="fa-solid fa-user" />
						</span>
						<span className="text">Profile</span>
					</Link>
				</li>
				{/* <li>
					<Link to="/">
						<span className="icon">
							<i className="fa-solid fa-bell" />
						</span>
						<span className="text">Friends</span>
					</Link>
				</li> */}
				<li>
					<Link to="/settings">
						<span className="icon">
							<i className="fa-solid fa-gear" />
						</span>
						<span className="text">Settings</span>
					</Link>
				</li>
				<li>
					<Link to="/statistics">
						<span className="icon">
							<i className="fa-solid fa-chart-pie" />
						</span>
						<span className="text">Statistics</span>
					</Link>
				</li>
				<li>
					{isAuthenticated ? (
						<button type="button" className="sidebar-btn sidebar-btn--logout" onClick={handleLogout}>
							<span className="icon">
								<i className="fa-solid fa-right-from-bracket" />
							</span>
							<span className="text">Logout</span>
						</button>
					) : (
						<Link to="/profile">
							<span className="icon">
								<i className="fa-solid fa-right-to-bracket" />
							</span>
							<span className="text">Login</span>
						</Link>
					)}
				</li>
			</ul>
		</div>
	)
}

export default Sidebar
