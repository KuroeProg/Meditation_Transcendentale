import '../styles/Home.css'
import MenuHome from '../components/MenuHome'
import SiteBrandLogo from '../../../components/common/Logo/SiteBrandLogo.jsx'
import { HomeAmbientBgm } from '../../../features/audio/components/HomeAudio.jsx'
import { tryPlayHomeBgm } from '../../../features/audio/services/homeBgm.js'
import CoalitionFire from '../../../features/theme/components/CoalitionSymbols/Coalition_Fire'
import CoalitionEarth from '../../../features/theme/components/CoalitionSymbols/Coalition_Earth'
import CoalitionWater from '../../../features/theme/components/CoalitionSymbols/Coalition_Water'
import CoalitionWind from '../../../features/theme/components/CoalitionSymbols/Coalition_Wind'
import { motion as Motion } from 'framer-motion'
import { useReduceMotionPref } from '../../../features/theme/hooks/useReduceMotionPref.js'

function Home() {
	const reduceMotion = useReduceMotionPref()

	return (
		<div
			className="home"
			onPointerDown={() => {
				void tryPlayHomeBgm()
			}}
		>
			<HomeAmbientBgm />
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
		</div>
	)
}

export default Home
