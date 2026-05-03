import { Link } from 'react-router-dom'
import '../styles/MenuHome.scss'
import { tryPlayHomeBgm } from '../../audio/services/homeBgm.js'
import { useAuth } from '../../auth/index.js'

function MenuHome() {
	const { user } = useAuth()

	return (
		<nav
			className={`top-bar ${!user ? 'top-bar--full' : ''}`}
			onPointerDown={() => {
				void tryPlayHomeBgm()
			}}
			aria-label="Navigation accueil"
		>
			<div className="top-bar-actions">
				<Link to="/contact" className="top-bar-link">
					Contact
				</Link>
				<Link to="/about" className="top-bar-link">
					À propos
				</Link>
				{user ? (
					<Link to="/dashboard" className="button-signup" data-testid="home-dashboard-link">
						Tableau de bord
					</Link>
				) : (
					<>
						<Link to="/auth" className="button-signin" data-testid="home-login-cta">
							Connexion
						</Link>
						<Link to="/auth?mode=register" className="button-signup" data-testid="home-register-cta">
							Créer un compte
						</Link>
					</>
				)}
			</div>
		</nav>
	)
}

export default MenuHome
