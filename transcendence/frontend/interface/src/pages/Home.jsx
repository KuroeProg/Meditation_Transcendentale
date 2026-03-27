import './Home.css'
import MenuHome from '../components/MenuHome'
import CoalitionFire from '../Coalition_symbol/Coalition_Fire'
import CoalitionEarth from '../Coalition_symbol/Colation_Earth'
import CoalitionWater from '../Coalition_symbol/Coalition_Water'
import CoalitionWind from '../Coalition_symbol/Coalition_Wind'
import { motion as Motion } from 'framer-motion'
// import { useNavigate } from 'react-router-dom'

function Home() {
	// const navigate = useNavigate()

	return (
		<div className="home">
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
						initial={{ opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8 }}
						viewport={{ once: false }}
					>
						Plus qu&apos;un jeu d&apos;échecs
					</Motion.h2>

					<Motion.p
						initial={{ opacity: 0, x: -30 }}
						whileInView={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
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
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.4 }}
						viewport={{ once: false, amount: 0.3 }}
					>
						<CoalitionFire />
						<CoalitionWater />
						<CoalitionWind />
						<CoalitionEarth />
					</Motion.div>
				</div>

				<div className="second-right">
					<img src="imgs/ChessLogo.jpg" alt="Chess preview" />
				</div>
			</div>

			<div className="third-section" />
		</div>
	)
}

export default Home
