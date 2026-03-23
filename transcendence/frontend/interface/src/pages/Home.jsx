import { useNavigate } from 'react-router-dom'
import './Home.css'
import MenuHome from '../components/MenuHome'
import CoalitionFire from '../Coalition_symbol/Coalition_Fire'
import CoalitionEarth from '../Coalition_symbol/Colation_Earth'
import CoalitionWater from '../Coalition_symbol/Coalition_Water'
import CoalitionWind from '../Coalition_symbol/Coalition_Wind'
import { motion } from 'framer-motion'


function Home() {
	const navigate = useNavigate()

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
			<motion.h2
			initial={{ opacity: 0, x: -30 }}
			whileInView={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.8 }}
			viewport={{ once: false }}
			>
			<h2>Plus qu'un jeu d'échecs</h2>
			</motion.h2>

			<motion.p
			initial={{ opacity: 0, x: -30 }}
			whileInView={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.8, delay: 0.2 }}
			viewport={{ once: false }}
			>
			<p>
				Transcendance réinvente l'expérience des jeux d'échecs en ligne pour 42.
				Affrontez les joueurs de votre école partout dans le monde.
				Au travers de vos coalitions, jouez des parties prenantes vous permettant d'apprendre, progresser et vous améliorer
				Participez à des tournois et remportez des points pour vos coalitions!
			</p>
			</motion.p>


			<motion.div
			// className="second-left p"
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.8, delay: 0.4 }}
			viewport={{ once: false, amount: 0.3}}
			>
			<div className="coalition-icons">
				<CoalitionFire />
				<CoalitionWater />
				<CoalitionWind />
				<CoalitionEarth />
			</div>
			</motion.div>
		</div>

		<div className="second-right">
			<img src="imgs/ChessLogo.jpg" alt="Chess preview" />
		</div>
		</div>

		<div className="third-section">

		</div>
	</div>
	)
}

export default Home