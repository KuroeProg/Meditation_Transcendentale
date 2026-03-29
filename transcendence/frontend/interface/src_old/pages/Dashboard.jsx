import './Dashboard.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useChessSocket } from '../hooks/useChessSocket.js'

const MATCHMAKING_ROOM_ID = 'matchmaking'

function normalizeWirePlayerId(value) {
	if (value == null) return null
	const raw = String(value)
	const legacyBytesMatch = raw.match(/^b['"](.+)['"]$/)
	return legacyBytesMatch ? legacyBytesMatch[1] : raw
}

function Home() {
	const navigate = useNavigate()
	const { user, isAuthenticated } = useAuth()
	const { isConnected, socketError, lastMessage, sendMove } = useChessSocket(MATCHMAKING_ROOM_ID)
	const [searching, setSearching] = useState(false)
	const [queueSize, setQueueSize] = useState(0)
	const [statusMessage, setStatusMessage] = useState('Pret a chercher une partie')
	const hasJoinedQueueRef = useRef(false)

	const userId = useMemo(() => {
		if (!user) return null
		return user.id ?? user.user_id ?? user.pk ?? user.sub ?? null
	}, [user])

	useEffect(() => {
		if (!searching || !isConnected || !userId || hasJoinedQueueRef.current) return
		sendMove({ action: 'join_queue', player_id: userId })
		hasJoinedQueueRef.current = true
		setStatusMessage('Recherche en cours...')
	}, [searching, isConnected, userId, sendMove])

	useEffect(() => {
		if (!lastMessage) return
		if (lastMessage.error) {
			setStatusMessage(lastMessage.error)
			return
		}

		if (lastMessage.action === 'queue_status') {
			setQueueSize(Number(lastMessage.queue_size) || 0)
		}

		if (lastMessage.action === 'match_found' && userId != null) {
			const whiteId = normalizeWirePlayerId(lastMessage.white_player_id)
			const blackId = normalizeWirePlayerId(lastMessage.black_player_id)
			const currentId = normalizeWirePlayerId(userId)
			if (currentId === whiteId || currentId === blackId) {
				setSearching(false)
				hasJoinedQueueRef.current = false
				setStatusMessage('Match trouve, redirection...')
				navigate(`/game/${lastMessage.game_id}`)
			}
		}
	}, [lastMessage, navigate, userId])

	useEffect(() => {
		return () => {
			if (hasJoinedQueueRef.current && userId != null) {
				sendMove({ action: 'leave_queue', player_id: userId })
			}
		}
	}, [sendMove, userId])

	const startSearch = () => {
		if (!isAuthenticated || userId == null) {
			setStatusMessage('Connecte-toi pour lancer une recherche')
			return
		}
		if (!isConnected) {
			setStatusMessage('WebSocket non connecte, reessaie dans quelques secondes')
			return
		}
		setSearching(true)
		setStatusMessage('Mise en file...')
	}

	const cancelSearch = () => {
		if (userId != null && hasJoinedQueueRef.current) {
			sendMove({ action: 'leave_queue', player_id: userId })
		}
		hasJoinedQueueRef.current = false
		setSearching(false)
		setStatusMessage('Recherche annulee')
	}

	return (
		<div className="home home-matchmaking">
			<div className="matchmaking-card">
				<h1 className="matchmaking-title">Recherche de partie</h1>
				<p className="matchmaking-subtitle">
					Lance la file d&apos;attente et rejoins automatiquement une partie des qu&apos;un adversaire est disponible.
				</p>

				<div className="matchmaking-stats">
					<p>Connexion WS: {isConnected ? 'connecte' : 'deconnecte'}</p>
					<p>Joueurs en file: {queueSize}</p>
					{socketError && <p className="matchmaking-error">{socketError}</p>}
					<p>{statusMessage}</p>
				</div>

				<div className="matchmaking-actions">
					{!searching ? (
						<button className="matchmaking-btn primary" type="button" onClick={startSearch}>
							Rechercher une partie
						</button>
					) : (
						<button className="matchmaking-btn" type="button" onClick={cancelSearch}>
							Annuler la recherche
						</button>
					)}
				</div>
			</div>
		</div>
	)
}

export default Home
