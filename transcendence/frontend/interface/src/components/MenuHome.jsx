import { Link, useNavigate } from 'react-router-dom'
import './MenuHome.css'
import 'remixicon/fonts/remixicon.css'

function MenuHome() {
	const navigate = useNavigate()

	return (
		<nav className="top-bar">
		<div className="top-bar-actions">
			<button className="button-signin" onClick={() => navigate('/signin')}>
			Sign in
			</button>
			<button className="button-signup" onClick={() => navigate('/signup')}>
			Sign up
			</button>
		</div>
		</nav>
	)
	}

export default MenuHome