import '../index.css'
import Board from '../objects/Board.jsx'
import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from '../objects/Chrono.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { get42AvatarUrl, getDisplayTitle } from '../utils/sessionUser.js'
import { getMockGameOpponent, isMockGameOpponentActive } from '../dev/mockGameOpponent.js'

function App() {
	useEffect(() => {
		document.title = 'Transcendance Chess Game'
	}, [])

	const { user } = useAuth()
	const devOpp = isMockGameOpponentActive() ? getMockGameOpponent() : null

	const GAME_DURATION = {
		bullet: 60,
		blitz: 300,
		rapid: 600,
		classNameic: 1800,
	}

	const [game, setGame] = useState(() => new Chess())
	const [winner, setWinner] = useState(null)
	/** Coup adverse reçu (WS / API) : { from, to, promotion? } — consommé par Board puis remis à null */
	const [remoteMove, setRemoteMove] = useState(null)

	const [duration] = useState(GAME_DURATION.rapid)

	const blackTimer = useChessTimer(duration, !winner && game.turn() === 'b', () =>
		setWinner('White-Timeout'),
	)
	const whiteTimer = useChessTimer(duration, !winner && game.turn() === 'w', () =>
		setWinner('Black-Timeout'),
	)

	const whiteLabel = user ? getDisplayTitle(user).primary ?? 'Joueur Blanc' : 'Joueur Blanc'
	const whiteAvatar = get42AvatarUrl(user)
	const blackLabel = devOpp?.displayName ?? 'Joueur Noir'
	const blackAvatar = devOpp?.avatarSrc ?? 'imgs/PawnLogoB.jpeg'

	return (
		<div>
			<div className="header" />
			<div className="game-container">
				<div className="player-bar">
					<img className="player-avatar" src={blackAvatar} alt="" />
					<span className="player-nameB">{blackLabel}</span>
					<span className="player-timerB">{blackTimer}</span>
				</div>

				<div className="board-frame">
					<Board
						game={game}
						setGame={setGame}
						winner={winner}
						setWinner={setWinner}
						remoteMove={remoteMove}
						onRemoteMoveConsumed={() => setRemoteMove(null)}
					/>
				</div>

				<div className="player-bar">
					<img className="player-avatar" src={whiteAvatar} alt="" />
					<span className="player-nameW">{whiteLabel}</span>
					<span className="player-timerW">{whiteTimer}</span>
				</div>
			</div>
		</div>
	)
}

export default App


// Todo, effectuer tout les calculs de chrono, réécrire la fonction principales
// Ecran de win, (popup) / Lose
// Checkmate