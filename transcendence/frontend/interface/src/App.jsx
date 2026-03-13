import './index.css'
import Board from './Board.jsx'
import { useState } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from './Chrono.jsx'

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

		const [duration, setDuration] = useState(GAME_DURATION.rapid)

		const blackTimer = useChessTimer(5, game.turn() === 'b', () => setWinner('White'))
		const whiteTimer = useChessTimer(duration, game.turn() === 'w', () => setWinner('Black'))

	return (

		<div>

		<div className="sidebar">
			<ul>
				<li>
					<a className="logo" href="#">
						<span className="icon">
							<i className="icon">
								<img src="imgs/ChessLogo.jpg" className="Profile-logo"/>
							</i>
						</span>
						<span className="text">
							Transcendance
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-house"></i>
							</i>
						</span>
						<span className="text">
							Home
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-user"></i>
							</i>
						</span>
						<span className="text">
							Profile
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-bell"></i>
							</i>
						</span>
						<span className="text">
							Friends
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-gear"></i>
							</i>
						</span>
						<span className="text">
							Settings
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span className="icon">
							<i className="icon">
							<i className="fa-solid fa-right-from-bracket"></i>
							</i>
						</span>
						<span className="text">
							Logout
						</span>
					</a>
				</li>
			</ul>
		</div>



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