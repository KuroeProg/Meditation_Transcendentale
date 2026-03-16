import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()

return (
		<div className="sidebar">
			<ul>
				<li>
					<Link to="/" className="logo">
						<span className="icon">
								<img src="imgs/ChessLogo.jpg" className="Profile-logo"/>
						</span>
						<span className="text">
							Transcendance
						</span>
					</Link>
				</li>
				<li>
					<Link to="/">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-house"></i>
							</i>
						</span>
						<span className="text">
							Home
						</span>
					</Link>
				</li>
				<li>
					<Link to="/">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-user"></i>
							</i>
						</span>
						<span className="text">
							Profile
						</span>
					</Link>
				</li>
				<li>
					<Link to="/">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-bell"></i>
							</i>
						</span>
						<span className="text">
							Friends
						</span>
					</Link>
				</li>
				<li>
					<Link to="/">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-gear"></i>
							</i>
						</span>
						<span className="text">
							Settings
						</span>
					</Link>
				</li>
				<li>
					<Link to="/">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-right-from-bracket"></i>
							</i>
						</span>
						<span className="text">
							Logout
						</span>
					</Link>
				</li>
			</ul>
		</div>
	)
}

export default Sidebar