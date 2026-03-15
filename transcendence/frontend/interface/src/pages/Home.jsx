import { useNavigate } from 'react-router-dom'

function Home() {
	const navigate = useNavigate()

return (
	<div className="home">
		<h1>Transcendance</h1>
			<button onClick={() => navigate('/game')}>
				Jouer
			</button>
	</div>
	)
}

export default Home