import '../index.css'
import Board from '../objects/Board.jsx'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'
import { useChessTimer } from '../objects/Chrono.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { get42AvatarUrl, getDisplayTitle } from '../utils/sessionUser.js'
import { getMockGameOpponent, isMockGameOpponentActive } from '../dev/mockGameOpponent.js'
import { randomTilePatternSeed } from '../chess/boardTiles.js'
import GameStatsPanel from '../components/GameStatsPanel.jsx'

function fenAfterPlies(moveLog, count) {
	const c = new Chess()
	for (let i = 0; i < count; i++) {
		const m = moveLog[i]
		if (!m?.san) return null
		const r = c.move(m.san)
		if (!r) return null
	}
	return c.fen()
}

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
	const [tilePatternSeed, setTilePatternSeed] = useState(() => randomTilePatternSeed())
	const [matchGeneration, setMatchGeneration] = useState(0)
	const [winner, setWinner] = useState(null)
	const [remoteMove, setRemoteMove] = useState(null)
	const [duration] = useState(GAME_DURATION.rapid)

	const [moveLog, setMoveLog] = useState([])
	const [viewPlies, setViewPlies] = useState(null)
	const lastMoveTs = useRef(null)
	const moveLogLenRef = useRef(0)

	useEffect(() => {
		moveLogLenRef.current = moveLog.length
	}, [moveLog.length])

	useEffect(() => {
		lastMoveTs.current = Date.now()
	}, [matchGeneration])

	const handleMove = useCallback(({ color, piece, from, to, san }) => {
		const now = Date.now()
		const timeSpentMs = lastMoveTs.current != null ? now - lastMoveTs.current : 0
		lastMoveTs.current = now
		setMoveLog((prev) => [
			...prev,
			{ moveNumber: Math.floor(prev.length / 2) + 1, color, piece, from, to, san, timeSpentMs },
		])
		setViewPlies(null)
	}, [])

	const viewFen = useMemo(() => {
		if (viewPlies == null) return null
		if (viewPlies === 0) return new Chess().fen()
		if (!moveLog.length) return null
		const n = Math.min(viewPlies, moveLog.length)
		return fenAfterPlies(moveLog, n)
	}, [moveLog, viewPlies])

	const goReplayFirst = useCallback(() => {
		if (moveLogLenRef.current === 0) return
		setViewPlies(0)
	}, [])

	const goReplayPrev = useCallback(() => {
		setViewPlies((v) => {
			const len = moveLogLenRef.current
			if (len === 0) return v
			if (v === null) return len > 0 ? len - 1 : v
			if (v <= 0) return 0
			return v - 1
		})
	}, [])

	const goReplayNext = useCallback(() => {
		setViewPlies((v) => {
			const len = moveLogLenRef.current
			if (len === 0) return v
			if (v === null) return v
			if (v >= len) return null
			return v + 1
		})
	}, [])

	const goReplayLast = useCallback(() => {
		const len = moveLogLenRef.current
		if (len === 0) return
		setViewPlies(len)
	}, [])

	const handleResign = useCallback(() => {
		if (winner) return
		setWinner('Black')
	}, [winner])

	const startNewMatch = useCallback(() => {
		setGame(new Chess())
		setWinner(null)
		setRemoteMove(null)
		setTilePatternSeed(randomTilePatternSeed())
		setMatchGeneration((g) => g + 1)
		setMoveLog([])
		setViewPlies(null)
	}, [])

	const blackTimer = useChessTimer(
		duration,
		!winner && game.turn() === 'b',
		() => setWinner('White-Timeout'),
		matchGeneration,
	)
	const whiteTimer = useChessTimer(
		duration,
		!winner && game.turn() === 'w',
		() => setWinner('Black-Timeout'),
		matchGeneration,
	)

	const whiteLabel = user ? getDisplayTitle(user).primary ?? 'Joueur Blanc' : 'Joueur Blanc'
	const whiteAvatar = get42AvatarUrl(user)
	const blackLabel = devOpp?.displayName ?? 'Joueur Noir'
	const blackAvatar = devOpp?.avatarSrc ?? 'imgs/PawnLogoB.jpeg'

	return (
		<div>
			<div className="header" />
			<div className="game-container">
				<div className="game-board-col">
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
							tilePatternSeed={tilePatternSeed}
							onMove={handleMove}
							remoteMove={remoteMove}
							onRemoteMoveConsumed={() => setRemoteMove(null)}
							viewFen={viewFen}
						/>
					</div>

					<div className="player-bar">
						<img className="player-avatar" src={whiteAvatar} alt="" />
						<span className="player-nameW">{whiteLabel}</span>
						<span className="player-timerW">{whiteTimer}</span>
					</div>
				</div>

				<div className="game-stats-panel-wrap">
					<GameStatsPanel
						moveLog={moveLog}
						winner={winner}
						onPlayAgain={startNewMatch}
						viewPlies={viewPlies}
						onViewPlies={setViewPlies}
						onResign={handleResign}
						onReplayFirst={goReplayFirst}
						onReplayPrev={goReplayPrev}
						onReplayNext={goReplayNext}
						onReplayLast={goReplayLast}
					/>
				</div>
			</div>
		</div>
	)
}

export default App
