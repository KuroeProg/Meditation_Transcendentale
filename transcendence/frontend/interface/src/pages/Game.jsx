import '../index.css'
import Board from '../objects/Board.jsx'
import { useState } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from '../objects/Chrono.jsx'

	function App() {
		document.title = 'Transcendance Chess Game'

const GAME_DURATION = {
	bullet: 60,
	blitz: 300,
	rapid: 600,
	classNameic: 1800,
}

		const [game, setGame] = useState(() => new Chess())
		const [winner, setWinner] = useState(null)
		console.log('App render, winner:', winner)

		const [duration, setDuration] = useState(GAME_DURATION.rapid)

		const blackTimer = useChessTimer(5, !winner && game.turn() === 'b', () => setWinner('White-Timeout'))
		const whiteTimer = useChessTimer(duration, !winner && game.turn() === 'w', () => setWinner('Black-Timeout'))

	return (

		<div>
			<div className="header">
			</div>

			<div className="game-container">

			<div className="player-bar">
					<img className="player-avatar" src="imgs/PawnLogoB.jpeg"/>
					<span className="player-nameB">Joueur Noir</span>
					<span className="player-timerB">{blackTimer}</span>
			</div>

			<div className="board-frame">
				<Board game={game} setGame={setGame} winner={winner} setWinner={setWinner}/>
			</div>

				<div className="player-bar">
					<img className='player-avatar' src="imgs/Profile-Logo.png"/>
					<span className="player-nameW">Joueur Blanc</span>
					<span className="player-timerW">{whiteTimer}</span>
				</div>

			</div>

		</div>
	);
}


export default App;





// Todo, effectuer tout les calculs de chrono, réécrire la fonction principales
// Ecran de win, (popup) / Lose
// Checkmate