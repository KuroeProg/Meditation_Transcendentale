import '../styles/Home.css'
import MenuHome from '../components/MenuHome'
import { SiteBrandLogo } from '../../../components/common/index.js'
import { tryPlayHomeBgm } from '../../audio/services/homeBgm.js'
import { CoalitionFire, CoalitionEarth, CoalitionWater, CoalitionWind } from '../../theme/index.js'
import { motion as Motion } from 'framer-motion'
import { useReduceMotionPref } from '../../theme/index.js'
import { LEGAL_COOKIES_URL, LEGAL_PRIVACY_URL } from '../../../config/legalPages.js'

function Home() {
	const reduceMotion = useReduceMotionPref()

	return (
		<div
			className="home"
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
					<SiteBrandLogo className="home-second-logo" alt="Transcendance" />
				</div>
			</div>

			<div className="third-section" />

			<footer className="footer">
				<div className="footer-left">
					<a href={LEGAL_PRIVACY_URL} target="_blank" rel="noreferrer">
						Privacy Policy
					</a>
					<span className="footer-separator" aria-hidden="true">
						·
					</span>
					<a href={LEGAL_COOKIES_URL} target="_blank" rel="noreferrer">
						Manage Cookies
					</a>
				</div>
				<div className="footer-right">
					<a
						href="https://github.com/KuroeProg/Meditation_Transcendentale"
						target="_blank"
						rel="noreferrer"
					>
						<img
							src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
							alt="GitHub"
							width="24"
							height="24"
						/>
					</a>
				</div>
			</footer>
		</div>
	)
}

export default Home
