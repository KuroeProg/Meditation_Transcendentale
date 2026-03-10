import './index.css'
import Board from './Board.jsx'

	function App() {
		document.title = 'Transcendance Chess Game'
	return (





		<div>


		<div class="sidebar">
			<ul>
				<li>
					<a class="logo" href="#">
						<span class="icon">
							<i class="icon">
								<img src="public/imgs/ChessLogo.jpg" class="Profile-logo"/>
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
					<img className="player-avatar" src="public/imgs/PawnLogoB.jpeg"/>
					<span className="player-nameB">Joueur Noir</span>
				<span className="player-timerB">10:00</span>
			</div>

			<div className="board-frame">
				<Board />
			</div>

				<div class="player-bar">
					<img className='player-avatar' src="public/imgs/Profile-Logo.png"/>
					<span class="player-nameW">Joueur Blanc</span>
					<span class="player-timerW">10:00</span>
				</div>

			</div>

		</div>
	);
}


export default App;