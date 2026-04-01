import '../styles/Dashboard.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { useChessSocket } from '../../chess/hooks/useChessSocket.js'

const MATCHMAKING_ROOM_ID = 'matchmaking'

const ELO_ITEMS = [
	{ label: 'Blitz', icon: 'ri-flashlight-line', value: 1200 },
	{ label: 'Rapide', icon: 'ri-timer-line', value: 1200 },
	{ label: 'Bullet', icon: 'ri-speed-up-line', value: 1200 },
	{ label: 'Lent', icon: 'ri-hourglass-line', value: 1200 },
]

const FRIENDS = [
	{ id: 'f1', name: 'Nora', status: 'online' },
	{ id: 'f2', name: 'Ilyes', status: 'offline' },
	{ id: 'f3', name: 'Camille', status: 'online' },
	{ id: 'f4', name: 'Mika', status: 'offline' },
]

function normalizeWirePlayerId(value) {
	if (value == null) return null
	const raw = String(value)
	const legacyBytesMatch = raw.match(/^b['"](.+)['"]$/)
	return legacyBytesMatch ? legacyBytesMatch[1] : raw
}

function EloCard({ label, icon, value }) {
	return (
		<article className="dashboard-elo-card">
			<div className="dashboard-elo-head">
				<span className="dashboard-elo-icon" aria-hidden="true">
					<i className={icon} />
				</span>
				<span className="dashboard-elo-label">{label}</span>
			</div>
			<p className="dashboard-elo-value">{value}</p>
		</article>
	)
}

function FriendListItem({ name, status }) {
	const isOnline = status === 'online'
	return (
		<li className="dashboard-friend-item">
			<div className="dashboard-friend-meta">
				<span className={`dashboard-friend-status ${isOnline ? 'is-online' : 'is-offline'}`} />
				<div>
					<p className="dashboard-friend-name">{name}</p>
					<p className="dashboard-friend-presence">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
				</div>
			</div>
			<button className="dashboard-friend-action" type="button" disabled={!isOnline}>
				Defier
			</button>
		</li>
	)
}

export default function Dashboard() {
	const navigate = useNavigate()
	const { user, isAuthenticated } = useAuth()
	const { isConnected, socketError, lastMessage, sendMove } = useChessSocket(MATCHMAKING_ROOM_ID)
	const [queueSize, setQueueSize] = useState(0)
	const [searching, setSearching] = useState(false)
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
			setSearching(true)
			return
		}
		if (!isConnected) {
			setStatusMessage('WebSocket non connecte, reessaie dans quelques secondes')
			setSearching(true)
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
		<div className="dashboard-simple">
			<section className="dashboard-panel" aria-labelledby="quick-play-heading">
				<h1 id="quick-play-heading" className="dashboard-title">Quick Play</h1>
				<div className="dashboard-quick-actions">
					<button className="dashboard-btn dashboard-btn-primary" type="button" onClick={startSearch}>
						Jouer en ligne
					</button>
					<button
						className="dashboard-btn dashboard-btn-secondary"
						type="button"
						onClick={() => navigate('/game/training')}
					>
						Entrainement
					</button>
					<button className="dashboard-btn dashboard-btn-disabled" type="button" disabled>
						Jouer contre l'IA
						<span className="dashboard-badge">Bientot</span>
					</button>
				</div>
			</section>

			<section className="dashboard-panel" aria-labelledby="elo-heading">
				<h2 id="elo-heading">Classement ELO</h2>
				<div className="dashboard-elo-grid">
					{ELO_ITEMS.map((item) => (
						<EloCard key={item.label} label={item.label} icon={item.icon} value={item.value} />
					))}
				</div>
			</section>

			<section className="dashboard-panel" aria-labelledby="friends-heading">
				<h2 id="friends-heading">Amis</h2>
				<ul className="dashboard-friends-list">
					{FRIENDS.map((friend) => (
						<FriendListItem key={friend.id} name={friend.name} status={friend.status} />
					))}
				</ul>
			</section>

			{searching && (
				<div className="dashboard-matchmaking-modal" role="dialog" aria-modal="true" aria-label="Recherche de partie">
					<div className="dashboard-matchmaking-card">
						<div className="dashboard-spinner" aria-hidden="true" />
						<h3>Recherche d'un adversaire...</h3>
						<p>{statusMessage}</p>
						<p>Joueurs en file: {queueSize}</p>
						{socketError && <p className="dashboard-matchmaking-error">{socketError}</p>}
						<button className="dashboard-btn dashboard-btn-secondary" type="button" onClick={cancelSearch}>
							Annuler
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
