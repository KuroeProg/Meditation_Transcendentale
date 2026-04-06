import { useNavigate } from 'react-router-dom'
import '../styles/MenuHome.css'
import { tryPlayHomeBgm } from '../../audio/services/homeBgm.js'

function MenuHome() {
	const navigate = useNavigate()

	return (
			<nav
				className="top-bar"
				onPointerDown={() => {
					void tryPlayHomeBgm()
				}}
			>
			</nav>
	)
	}

export default MenuHome