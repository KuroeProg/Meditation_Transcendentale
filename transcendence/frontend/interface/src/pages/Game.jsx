import '../index.css'
import Board from '../objects/Board.jsx'
import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from '../objects/Chrono.jsx'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useChessSocket } from '../hooks/useChessSocket.js'

	function App() {
		document.title = 'Transcendance Chess Game'
		const [showDebug, setShowDebug] = useState(false)

const GAME_DURATION = {
	bullet: 60,
	blitz: 300,
	rapid: 600,
	classNameic: 1800,
}

		const [game, setGame] = useState(() => new Chess())
		const [gameState, setGameState] = useState(null)
		const [winner, setWinner] = useState(null)
		const [moveFeedback, setMoveFeedback] = useState(null)
		// console.log('App render, winner:', winner)

		const [duration] = useState(GAME_DURATION.rapid)
		const { gameId } = useParams()
		const { user } = useAuth()
		const { isConnected, socketError, lastMessage, sendMove } = useChessSocket(gameId)

		const userId = useMemo(() => {
			if (!user) return null
			return user.id ?? user.user_id ?? user.pk ?? user.sub ?? null
		}, [user])

		const playerColor = useMemo(() => {
			if (!gameState || userId == null) return null
			if (String(gameState.white_player_id) === String(userId)) return 'w'
			if (String(gameState.black_player_id) === String(userId)) return 'b'
			return null
		}, [gameState, userId])

		useEffect(() => {
			if (!lastMessage) return

			if (lastMessage.error) {
				setMoveFeedback(lastMessage.error)
				return
			}

			if (lastMessage.action === 'game_state' && lastMessage.game_state) {
				const incomingState = lastMessage.game_state
				setGameState(incomingState)
				if (incomingState.fen) {
					setGame(new Chess(incomingState.fen))
				}

				if (incomingState.status === 'checkmate') {
					const isWhiteWinner = String(incomingState.winner_player_id) === String(incomingState.white_player_id)
					setWinner(isWhiteWinner ? 'White' : 'Black')
				} else if (incomingState.status === 'stalemate' || incomingState.status === 'draw') {
					setWinner('Nulle')
				} else {
					setWinner(null)
				}
			}
		}, [lastMessage])

		// Auto-bootstrap: create game on first socket connection if not exists
		useEffect(() => {
			if (isConnected && gameState === null && userId && !moveFeedback?.includes('Partie introuvable')) {
				sendMove({ action: 'create_game', white_id: userId, black_id: 999 })
			}
		}, [isConnected, gameState, userId, moveFeedback, sendMove])

		const handleMoveRequest = ({ move }) => {
			if (!userId) {
				setMoveFeedback('Utilisateur non connecté')
				return
			}

			if (!isConnected) {
				setMoveFeedback('Connexion WebSocket indisponible')
				return
			}

			setMoveFeedback(null)
			sendMove({ action: 'play_move', move, player_id: userId })
		}

		const handleResetGame = () => {
			if (isConnected && userId) {
				sendMove({ action: 'reset_game', white_id: userId, black_id: 999 })
				setMoveFeedback('Jeu réinitialisé...')
				setTimeout(() => setMoveFeedback(null), 2000)
			}
		}

		const blackTimer = useChessTimer(duration, !winner && game.turn() === 'b', () => setWinner('White-Timeout'))
		const whiteTimer = useChessTimer(duration, !winner && game.turn() === 'w', () => setWinner('Black-Timeout'))

		const topPlayerColor = playerColor === 'b' ? 'w' : 'b'
		const bottomPlayerColor = playerColor === 'b' ? 'b' : 'w'

		const getPlayerBarData = (color) => {
			if (color === 'b') {
				return {
					avatar: 'imgs/PawnLogoB.jpeg',
					name: 'Joueur Noir',
					nameClass: 'player-nameB',
					timerClass: 'player-timerB',
					timer: blackTimer,
				}
			}

			return {
				avatar: 'imgs/Profile-Logo.png',
				name: 'Joueur Blanc',
				nameClass: 'player-nameW',
				timerClass: 'player-timerW',
				timer: whiteTimer,
			}
		}

		const topPlayer = getPlayerBarData(topPlayerColor)
		const bottomPlayer = getPlayerBarData(bottomPlayerColor)

	return (

		<div>
			{/* Debug Panel */}
			<div style={{
				position: 'fixed', bottom: 10, right: 10, zIndex: 999,
				background: showDebug ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
				color: '#0f0', padding: '10px', fontSize: '11px', fontFamily: 'monospace',
				border: '1px solid #0f0', cursor: 'pointer', maxWidth: '400px', maxHeight: '300px', overflow: 'auto'
			}} onClick={() => setShowDebug(!showDebug)}>
				{!showDebug ? (
					<div>Debug ▼</div>
				) : (
					<div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '10px' }}>
						User ID: {userId || 'null'}<br/>
						Auth: {user ? 'OK' : 'auth-err'}<br/>
						WS: {isConnected ? '✓' : '✗'}<br/>
						Error: {socketError || 'none'}<br/>
						Game: {gameId}<br/>
						Color: {playerColor || '-'}<br/>
						Status: {gameState?.status || '-'}<br/>
						---<br/>
						user: {JSON.stringify(user ? { id: user.id, login: user.login } : null)}<br/>
						---<br/>
						<button 
							onClick={(e) => { e.stopPropagation(); handleResetGame(); }}
							style={{ 
								padding: '4px 8px', 
								marginTop: '5px', 
								background: '#0f0', 
								color: '#000', 
								border: 'none', 
								cursor: 'pointer',
								width: '100%'
							}}
						>
							Reset Game
						</button>
					</div>
				)}
			</div>
			<div className="header">
			</div>

			<div className="game-container">

			<div className="player-bar">
					<img className="player-avatar" src={topPlayer.avatar}/>
					<span className={topPlayer.nameClass}>{topPlayer.name}</span>
					<span className={topPlayer.timerClass}>{topPlayer.timer}</span>
			</div>

			<div className="board-frame">
				<Board
					game={game}
					winner={winner}
					onMoveRequest={handleMoveRequest}
					playerColor={playerColor}
					moveFeedback={moveFeedback || socketError}
				/>
			</div>

				<div className="player-bar">
					<img className='player-avatar' src={bottomPlayer.avatar}/>
					<span className={bottomPlayer.nameClass}>{bottomPlayer.name}</span>
					<span className={bottomPlayer.timerClass}>{bottomPlayer.timer}</span>
				</div>

			</div>

		</div>
	);
}

export default App;


// Todo, effectuer tout les calculs de chrono, réécrire la fonction principales
// Ecran de win, (popup) / Lose
// Checkmate