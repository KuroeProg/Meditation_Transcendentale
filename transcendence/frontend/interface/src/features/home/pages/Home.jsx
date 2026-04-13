import { useEffect } from 'react'
import '../styles/Home.css'
import MenuHome from '../components/MenuHome'
import { SiteBrandLogo } from '../../../components/common/index.js'
import { tryPlayHomeBgm } from '../../audio/services/homeBgm.js'
import { CoalitionFire, CoalitionEarth, CoalitionWater, CoalitionWind } from '../../theme/index.js'
import { motion as Motion } from 'framer-motion'
import { useReduceMotionPref } from '../../theme/index.js'
import { Link, useNavigate } from 'react-router-dom'
import { LEGAL_COOKIES_URL, LEGAL_PRIVACY_URL, LEGAL_TOS_URL } from '../../../config/legalPages.js'
import { useAuth } from '../../auth/index.js'
import { markWelcomeHomeSeen } from '../../../utils/postLoginRedirect.js'
import { goToGuestHome } from '../../../utils/devGuestPreview.js'

function Home() {
	const reduceMotion = useReduceMotionPref()
	const navigate = useNavigate()
	const { user, logout } = useAuth()
	const userId = user?.id ?? user?.user_id ?? null
	const devLogoGuestHome =
		import.meta.env.DEV
			? async () => {
					await goToGuestHome(logout, navigate)
				}
			: undefined

	useEffect(() => {
		if (userId != null) markWelcomeHomeSeen(userId)
	}, [userId])

	return (
		<div
			className={`home${user ? ' home--chat-fab-room' : ''}`}
			onPointerDown={() => {
				void tryPlayHomeBgm()
			}}
		>
			<div className="HomeMenu">
				<MenuHome />
			</div>
			<div className="front-page">
				<h1 className="title-gradient">TRANSCENDANCE</h1>
			</div>

			<div className="second-section">
				<div className="second-left">
					<Motion.h2
						className="home-section-title"
						initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: reduceMotion ? 0 : 0.8 }}
						viewport={{ once: false }}
					>
						Plus qu&apos;un jeu d&apos;échecs
					</Motion.h2>

					<Motion.p
						initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2 }}
						viewport={{ once: false }}
					>
						Transcendance réinvente l&apos;expérience des jeux d&apos;échecs en ligne pour 42.
						Affrontez les joueurs de votre école partout dans le monde. Au travers de vos
						coalitions, jouez des parties prenantes vous permettant d&apos;apprendre, progresser
						et vous améliorer Participez à des tournois et remportez des points pour vos
						coalitions!
					</Motion.p>

					<Motion.div
						className="coalition-icons"
						initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.4 }}
						viewport={{ once: false, amount: 0.3 }}
					>
						<CoalitionFire />
						<CoalitionWater />
						<CoalitionWind />
						<CoalitionEarth />
					</Motion.div>
				</div>

				<div className="second-right">
					<SiteBrandLogo className="home-second-logo" alt="Transcendance" onClick={devLogoGuestHome} />
				</div>
			</div>

			<div className="third-section" />

			<footer className="footer">
				<div className="footer-top">
					<nav className="footer-nav" aria-label="Liens pied de page">
						<Link className="footer-link footer-link--app" to="/contact">
							Contact
						</Link>
						<span className="footer-separator" aria-hidden="true">
							·
						</span>
						<Link className="footer-link footer-link--app" to="/about">
							À propos
						</Link>
						<span className="footer-separator" aria-hidden="true">
							·
						</span>
						<a className="footer-link" href={LEGAL_PRIVACY_URL} target="_blank" rel="noreferrer">
							Confidentialité
						</a>
						<span className="footer-separator" aria-hidden="true">
							·
						</span>
						<a className="footer-link" href={LEGAL_TOS_URL} target="_blank" rel="noreferrer">
							CGU
						</a>
						<span className="footer-separator" aria-hidden="true">
							·
						</span>
						<a className="footer-link" href={LEGAL_COOKIES_URL} target="_blank" rel="noreferrer">
							Cookies
						</a>
					</nav>
					<a
						className="footer-github"
						href="https://github.com/KuroeProg/Meditation_Transcendentale"
						target="_blank"
						rel="noreferrer"
						aria-label="Dépôt GitHub du projet"
					>
						<i className="ri-github-fill" aria-hidden="true" />
					</a>
				</div>
			</footer>
		</div>
	)
}

export default Home
