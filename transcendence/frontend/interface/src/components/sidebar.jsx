import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import SiteBrandLogo from './SiteBrandLogo.jsx'

function Sidebar() {
	const { logout, isAuthenticated } = useAuth()

	return (
		<div className="sidebar">
			<ul>
				<li>
					<Link to="/" className="logo">
						<span className="icon">
							<SiteBrandLogo className="Profile-logo site-brand-logo" alt="" />
						</span>
						<span className="text">Transcendance</span>
					</Link>
				</li>
				<li>
					<Link to="/game">
						<span className="icon">
							<i className="fa-solid fa-house" />
						</span>
						<span className="text">Home</span>
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
				<li>
					<Link to="/">
						<span className="icon">
							<i className="fa-solid fa-bell" />
						</span>
						<span className="text">Friends</span>
					</Link>
				</li>
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
						<button type="button" className="sidebar-btn" onClick={() => logout()}>
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
