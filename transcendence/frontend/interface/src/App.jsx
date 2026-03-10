import './index.css'
import Board from './Board.jsx'
import { useState } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from './Chrono.jsx'

	function App() {
		document.title = 'Transcendance Chess Game'

		const [game, setGame] = useState(() => new Chess())

		const blackTimer = useChessTimer(600, game.turn() === 'b')
		const whiteTimer = useChessTimer(600, game.turn() === 'w')

	return (

		<div>

		<div class="sidebar">
			<ul>
				<li>
					<a class="logo" href="#">
						<span class="icon">
							<i class="icon">
								<img src="imgs/ChessLogo.jpg" class="Profile-logo"/>
							</i>
						</span>
						<span class="text">
							Transcendance
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span class="icon">
							<i class="icon">
							<i class="fa-solid fa-house"></i>
							</i>
						</span>
						<span class="text">
							Home
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span class="icon">
							<i class="icon">
							<i class="fa-solid fa-user"></i>
							</i>
						</span>
						<span class="text">
							Profile
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span class="icon">
							<i class="icon">
							<i class="fa-solid fa-bell"></i>
							</i>
						</span>
						<span class="text">
							Friends
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span class="icon">
							<i class="icon">
							<i class="fa-solid fa-gear"></i>
							</i>
						</span>
						<span class="text">
							Settings
						</span>
					</a>
				</li>
				<li>
					<a href="#">
						<span class="icon">
							<i class="icon">
							<i class="fa-solid fa-right-from-bracket"></i>
							</i>
						</span>
						<span class="text">
							Logout
						</span>
					</a>
				</li>
			</ul>
		</div>



			<div class="header">
			</div>

			<div class="game-container">

			<div className="player-bar">
					<img className="player-avatar" src="imgs/PawnLogoB.jpeg"/>
					<span className="player-nameB">Joueur Noir</span>
				<span className="player-timerB">{blackTimer}</span>
			</div>

			<div className="board-frame">
				<Board game={game} setGame={setGame} />
			</div>

				<div class="player-bar">
					<img className='player-avatar' src="imgs/Profile-Logo.png"/>
					<span class="player-nameW">Joueur Blanc</span>
					<span class="player-timerW">{whiteTimer}</span>
				</div>

			</div>

		</div>
	);
}


export default App;





// Todo, effectuer tout les calculs de chrono, réécrire la fonction principales
// Ecran de win, (popup) / Lose
// Checkmate 