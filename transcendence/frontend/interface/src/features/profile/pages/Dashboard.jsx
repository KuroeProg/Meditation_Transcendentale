import '../styles/Dashboard.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { useChessSocket } from '../../chess/hooks/useChessSocket.js'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'

const MATCHMAKING_ROOM_ID = 'matchmaking'

const TIME_CONTROLS = {
	bullet: [
		{ label: '1 min', time: 60, increment: 0 },
		{ label: '1 | 1', time: 60, increment: 1 },
		{ label: '2 | 1', time: 120, increment: 1 },
	],
	blitz: [
		{ label: '3 min', time: 180, increment: 0 },
		{ label: '3 | 2', time: 180, increment: 2 },
		{ label: '5 min', time: 300, increment: 0 },
	],
	rapid: [
		{ label: '10 min', time: 600, increment: 0 },
		{ label: '15 | 10', time: 900, increment: 10 },
		{ label: '30 min', time: 1800, increment: 0 },
	],
	correspondence: [
		{ label: '1 jour', time: 86400, increment: 0 },
		{ label: '3 jours', time: 259200, increment: 0 },
		{ label: '7 jours', time: 604800, increment: 0 },
	],
}

const CATEGORY_META = {
	bullet: { icon: 'ri-speed-up-line', label: 'Bullet', color: '#ff6b6b' },
	blitz: { icon: 'ri-flashlight-line', label: 'Blitz', color: '#ffd93d' },
	rapid: { icon: 'ri-timer-line', label: 'Rapide', color: '#6bcb77' },
	correspondence: { icon: 'ri-sun-line', label: 'Correspondance', color: '#4d96ff' },
}

const CATEGORY_RATING_FIELD = {
	bullet: 'elo_bullet',
	blitz: 'elo_blitz',
	rapid: 'elo_rapid',
	correspondence: 'elo_rapid',
}

function normalizeWirePlayerId(value) {
	if (value == null) return null
	const raw = String(value)
	const legacyBytesMatch = raw.match(/^b['"](.+)['"]$/)
	return legacyBytesMatch ? legacyBytesMatch[1] : raw
}

function TimeControlButton({ control, selected, onSelect }) {
	const isSelected = selected?.label === control.label
	return (
		<button
			className={`dash-tc-btn ${isSelected ? 'dash-tc-btn--selected' : ''}`}
			type="button"
			onClick={() => onSelect(control)}
		>
			{control.label}
		</button>
	)
}

function TimeControlSection({ category, controls, selected, onSelect }) {
	const meta = CATEGORY_META[category]
	return (
		<div className="dash-tc-section">
			<h3 className="dash-tc-category" style={{ '--cat-color': meta.color }}>
				<i className={meta.icon} /> {meta.label}
			</h3>
			<div className="dash-tc-grid">
				{controls.map((c) => (
					<TimeControlButton key={c.label} control={c} selected={selected} onSelect={onSelect} />
				))}
			</div>
		</div>
	)
}

function FriendChip({ friend, onChallenge }) {
	return (
		<div className="dash-friend-chip">
			<span className={`dash-friend-dot ${friend.user?.is_online ? 'online' : ''}`} />
			<span className="dash-friend-name">{friend.user?.username}</span>
			{friend.user?.is_online && (
				<button className="dash-friend-action" type="button" onClick={() => onChallenge(friend.user.id)}>
					<i className="ri-sword-line" />
				</button>
			)}
		</div>
	)
}

function LeaderboardRow({ entry, isCurrentUser }) {
	const eloValue = entry.selected_rating ?? entry[entry.rating_field] ?? entry.elo_rapid
	return (
		<tr className={isCurrentUser ? 'leaderboard-current' : ''}>
			<td className="leaderboard-rank">#{entry.rank}</td>
			<td className="leaderboard-user">
				<img className="leaderboard-avatar" src={entry.avatar} alt="" />
				<span>{entry.username}</span>
			</td>
			<td className="leaderboard-elo">{eloValue}</td>
			<td className="leaderboard-games">{entry.games_played}</td>
		</tr>
	)
}

export default function Dashboard() {
	const navigate = useNavigate()
	const { user, isAuthenticated } = useAuth()
	const { isConnected, socketError, lastMessage, sendMove } = useChessSocket(MATCHMAKING_ROOM_ID)
	const [queueSize, setQueueSize] = useState(0)
	const [searching, setSearching] = useState(false)
	const [statusMessage, setStatusMessage] = useState('')
	const hasJoinedQueueRef = useRef(false)

	const [selectedTC, setSelectedTC] = useState(TIME_CONTROLS.rapid[0])
	const [isCompetitive, setIsCompetitive] = useState(false)
	const [showMoreTC, setShowMoreTC] = useState(false)
	const [friends, setFriends] = useState([])
	const [leaderboard, setLeaderboard] = useState([])
	const [currentRank, setCurrentRank] = useState(null)

	const userId = useMemo(() => {
		if (!user) return null
		return user.id ?? user.user_id ?? user.pk ?? user.sub ?? null
	}, [user])

	const coalitionSlug = useMemo(() => {
		if (!user?.coalition) return 'feu'
		return coalitionToSlug(user.coalition)
	}, [user])

	const selectedCategory = useMemo(() => {
		return Object.entries(TIME_CONTROLS).find(([, ctrls]) =>
			ctrls.some((c) => c.label === selectedTC.label)
		)?.[0] || 'rapid'
	}, [selectedTC])

	const selectedRatingField = CATEGORY_RATING_FIELD[selectedCategory] || 'elo_rapid'
	const selectedRatingLabel = CATEGORY_META[selectedCategory]?.label || 'Rapide'
	const selectedElo = user?.[selectedRatingField] ?? user?.elo_rapid ?? 1200

	const fetchFriends = useCallback(async () => {
		try {
			const res = await fetch('/api/auth/friends?status=accepted', { credentials: 'include' })
			if (res.ok) {
				const data = await res.json()
				setFriends(data.friends || [])
			}
		} catch {}
	}, [])

	const fetchLeaderboard = useCallback(async (category) => {
		try {
			const url = category ? `/api/auth/leaderboard?category=${encodeURIComponent(category)}` : '/api/auth/leaderboard'
			const res = await fetch(url, { credentials: 'include' })
			if (res.ok) {
				const data = await res.json()
				setLeaderboard(data.leaderboard || [])
				setCurrentRank(data.current_user_rank ?? null)
			}
		} catch {}
	}, [])

	useEffect(() => {
		if (user) {
			fetchFriends()
			fetchLeaderboard(selectedCategory)
		}
	}, [user, fetchFriends, fetchLeaderboard, selectedCategory])

	useEffect(() => {
		if (!searching || !isConnected || !userId || hasJoinedQueueRef.current) return
		sendMove({
			action: 'join_queue',
			player_id: userId,
			time_control: selectedTC.time,
			increment: selectedTC.increment,
			competitive: isCompetitive,
		})
		hasJoinedQueueRef.current = true
		setStatusMessage('Recherche en cours...')
	}, [searching, isConnected, userId, sendMove, selectedTC, isCompetitive])

	useEffect(() => {
		if (!lastMessage) return
		if (lastMessage.error) { setStatusMessage(lastMessage.error); return }
		if (lastMessage.action === 'queue_status') setQueueSize(Number(lastMessage.queue_size) || 0)
		if (lastMessage.action === 'match_found' && userId != null) {
			const whiteId = normalizeWirePlayerId(lastMessage.white_player_id)
			const blackId = normalizeWirePlayerId(lastMessage.black_player_id)
			const currentId = normalizeWirePlayerId(userId)
			if (currentId === whiteId || currentId === blackId) {
				setSearching(false)
				hasJoinedQueueRef.current = false
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
		setSearching(true)
		setStatusMessage('Mise en file...')
	}

	const cancelSearch = () => {
		if (userId != null && hasJoinedQueueRef.current) {
			sendMove({ action: 'leave_queue', player_id: userId })
		}
		hasJoinedQueueRef.current = false
		setSearching(false)
		setStatusMessage('')
	}

	const catMeta = CATEGORY_META[selectedCategory]

	return (
		<div className={`dashboard-v2 dashboard-coalition-${coalitionSlug}`}>
			{/* Hero Banner */}
			<section className="dash-hero">
				<div className="dash-hero-bg" />
				<div className="dash-hero-content">
					<div className="dash-hero-icon">
						<ProfileCoalitionIcon slug={coalitionSlug} />
					</div>
					<div>
						<h1 className="dash-hero-title">
							Bienvenue{user?.first_name ? `, ${user.first_name}` : ''} !
						</h1>
						<p className="dash-hero-sub">Pret a dominer le plateau ?</p>
					</div>
				</div>
				<div className="dash-hero-stats">
					<div className="dash-hero-stat">
						<span className="dash-hero-stat-val">{selectedElo}</span>
						<span className="dash-hero-stat-label">ELO {selectedRatingLabel}</span>
					</div>
					<div className="dash-hero-stat">
						<span className="dash-hero-stat-val">{user?.elo_blitz ?? 1200}</span>
						<span className="dash-hero-stat-label">ELO Blitz</span>
					</div>
					<div className="dash-hero-stat">
						<span className="dash-hero-stat-val">{user?.games_played ?? 0}</span>
						<span className="dash-hero-stat-label">Parties</span>
					</div>
					<div className="dash-hero-stat">
						<span className="dash-hero-stat-val">{user?.games_won ?? 0}</span>
						<span className="dash-hero-stat-label">Victoires</span>
					</div>
				</div>
			</section>

			<div className="dash-grid">
				{/* Game Preset Selector */}
				<section className="dash-panel dash-panel-presets">
					<div className="dash-preset-header">
						<div className="dash-preset-current">
							<i className={catMeta.icon} style={{ color: catMeta.color }} />
							<span>{selectedTC.label} ({isCompetitive ? 'Competitive' : 'Amicale'})</span>
						</div>
						<div className="dash-preset-variant">
							<i className="ri-chess-line" /> Standard
						</div>
					</div>

					<div className="dash-competitive-toggle">
						<span className={!isCompetitive ? 'active' : ''}>Amicale</span>
						<button
							className={`dash-toggle ${isCompetitive ? 'dash-toggle--on' : ''}`}
							type="button"
							onClick={() => setIsCompetitive(!isCompetitive)}
							aria-label="Competitive toggle"
						>
							<span className="dash-toggle-thumb" />
						</button>
						<span className={isCompetitive ? 'active' : ''}>Competitive</span>
					</div>

					<TimeControlSection category="bullet" controls={TIME_CONTROLS.bullet} selected={selectedTC} onSelect={setSelectedTC} />
					<TimeControlSection category="blitz" controls={TIME_CONTROLS.blitz} selected={selectedTC} onSelect={setSelectedTC} />
					<TimeControlSection category="rapid" controls={TIME_CONTROLS.rapid} selected={selectedTC} onSelect={setSelectedTC} />

					{showMoreTC && (
						<TimeControlSection category="correspondence" controls={TIME_CONTROLS.correspondence} selected={selectedTC} onSelect={setSelectedTC} />
					)}

					<button className="dash-more-tc" type="button" onClick={() => setShowMoreTC(!showMoreTC)}>
						{showMoreTC ? 'Moins de cadences' : 'Plus de cadences'} <i className={showMoreTC ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
					</button>

					<button className="dash-start-btn" type="button" onClick={startSearch}>
						Commencer la partie
					</button>
				</section>

				{/* Quick Actions */}
				<div className="dash-side-col">
					<section className="dash-panel dash-panel-actions">
						<h2><i className="ri-gamepad-line" /> Actions rapides</h2>
						<div className="dash-quick-btns">
							<button className="dash-qbtn" type="button" onClick={() => navigate('/game/training')}>
								<i className="ri-compass-line" /> Entrainement
							</button>
							<button className="dash-qbtn dash-qbtn--disabled" type="button" disabled>
								<i className="ri-robot-line" /> Jouer contre l'IA
								<span className="dash-soon-badge">Bientot</span>
							</button>
						</div>
					</section>

					{/* Friends Online */}
					<section className="dash-panel dash-panel-friends">
						<h2><i className="ri-group-line" /> Amis en ligne</h2>
						{friends.length > 0 ? (
							<div className="dash-friends-chips">
								{friends.map((f) => (
									<FriendChip key={f.friendship_id} friend={f} onChallenge={() => {}} />
								))}
							</div>
						) : (
							<p className="dash-empty-msg">Aucun ami en ligne</p>
						)}
					</section>

					<section className="dash-panel dash-panel-leaderboard">
						<h2>
							<i className="ri-trophy-line" /> Classement {selectedRatingLabel}
							{currentRank != null && <span className="profile-rank-badge">#{currentRank}</span>}
						</h2>
						{leaderboard.length > 0 ? (
							<div className="profile-leaderboard-wrap dash-leaderboard-scroll">
								<table className="profile-leaderboard">
									<thead>
										<tr>
											<th>#</th>
											<th>Joueur</th>
											<th>ELO</th>
											<th>Parties</th>
										</tr>
									</thead>
									<tbody>
										{leaderboard.map((entry) => (
											<LeaderboardRow
												key={entry.id}
												entry={entry}
												isCurrentUser={entry.id === user?.id}
											/>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="dash-empty-msg">Aucune donnee de classement.</p>
						)}
					</section>
				</div>
			</div>

			{/* Matchmaking Modal */}
			{searching && (
				<div className="dash-mm-overlay" role="dialog" aria-modal="true" aria-label="Recherche de partie">
					<div className="dash-mm-card">
						<div className="dash-mm-spinner" aria-hidden="true" />
						<h3>Recherche d'un adversaire...</h3>
						<p className="dash-mm-preset">{selectedTC.label} — {isCompetitive ? 'Competitive' : 'Amicale'}</p>
						<p>{statusMessage}</p>
						<p className="dash-mm-queue">Joueurs en file : {queueSize}</p>
						{socketError && <p className="dash-mm-error">{socketError}</p>}
						<button className="dash-mm-cancel" type="button" onClick={cancelSearch}>Annuler</button>
					</div>
				</div>
			)}
		</div>
	)
}
