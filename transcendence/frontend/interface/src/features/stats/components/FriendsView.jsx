import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'

const STATUS_TEXT = {
	available: (u) => (u?.inGame ? 'En ligne' : 'En ligne (disponible pour un défi)'),
	in_game: () => 'En partie',
	offline: () => 'Hors ligne',
	away: () => 'Absent',
}

function isOpponentCoalitionBySlug(mine, theirs) {
	const a = coalitionToSlug(mine)
	const b = coalitionToSlug(theirs)
	if (!a || !b || a === b) return false
	/* Rivalité classique Feu↔Eau, Terre↔Air (schéma simplifié) */
	const opp = { feu: 'eau', eau: 'feu', terre: 'air', air: 'terre' }
	return opp[a] === b
}

/**
 * Fusionne la liste API avec le roster mock détaillé (même username).
 * @param {Array} apiList — réponse /api/auth/friends?status=accepted
 * @param {Array} roster — friendsRoster depuis mock (contrat backend futur)
 * @param {string} myCoalition — coalition du joueur courant
 */
function mergeFriendEntries(apiList, roster, myCoalition) {
	const byUsername = new Map()
	for (const r of roster ?? []) {
		const un = (r.user?.username ?? r.username ?? '').toLowerCase()
		if (un) byUsername.set(un, r)
	}
	const out = []
	for (const entry of apiList) {
		const u = entry.user || entry
		const un = (u.username || '').toLowerCase()
		const fromRoster = byUsername.get(un)
		const activeId = u.active_game_id ?? u.activeGameId
		const inGamePayload =
			activeId
				? { id: activeId, label: u.active_game_label ?? 'Partie en cours' }
				: (fromRoster?.inGame?.id != null ? fromRoster.inGame : null)
		const merged = {
			friendship_id: entry.friendship_id ?? fromRoster?.friendship_id,
			user: {
				...fromRoster?.user,
				...u,
				avatar: u.avatar || fromRoster?.user?.avatar || '',
				coalition: u.coalition ?? fromRoster?.user?.coalition,
			},
			statusKey: inferStatusKey({ ...u, active_game_id: activeId }, fromRoster),
			elo_rapid: u.elo_rapid ?? u.elo ?? fromRoster?.elo_rapid,
			title: fromRoster?.title,
			streak: fromRoster?.streak,
			trend: fromRoster?.trend,
			rivalry: fromRoster?.rivalry
				? {
						...fromRoster.rivalry,
						isOpponentCoalition:
							fromRoster.rivalry.isOpponentCoalition ??
							isOpponentCoalitionBySlug(myCoalition, u.coalition),
					}
				: undefined,
			lastActivity: fromRoster?.lastActivity,
			inGame: inGamePayload,
		}
		out.push(merged)
	}
	/* Démonstration UI : si l’API est vide, afficher le roster complet */
	if (out.length === 0 && roster?.length) {
		return roster.map((r) => {
			const u = r.user || r
			return {
				...r,
				user: u,
				statusKey: r.statusKey || 'available',
				rivalry: r.rivalry
					? {
							...r.rivalry,
							isOpponentCoalition:
								r.rivalry.isOpponentCoalition ?? isOpponentCoalitionBySlug(myCoalition, u?.coalition),
						}
					: undefined,
			}
		})
	}
	return out
}

function inferStatusKey(u, fromRoster) {
	if (u?.active_game_id || u?.activeGameId) return 'in_game'
	if (fromRoster?.inGame?.id != null) return 'in_game'
	if (u?.is_online) return 'available'
	if (fromRoster?.statusKey) {
		if (fromRoster.statusKey === 'in_game' && !fromRoster?.inGame && !u?.is_online) return 'offline'
		return fromRoster.statusKey
	}
	return 'offline'
}

function StreakOrTrend({ streak, trend }) {
	if (streak?.count > 0 && streak?.kind === 'wins') {
		return (
			<span className="gfv-streak" title="Série de victoires" aria-label={`Série de ${streak.count} victoires`}>
				<i className="ri-fire-line" aria-hidden="true" /> {streak.count}
			</span>
		)
	}
	if (streak?.count > 0 && streak?.kind === 'losses') {
		return (
			<span className="gfv-streak gfv-streak--loss" title="Mauvaise série">
				<i className="ri-arrow-down-line" aria-hidden="true" /> {streak.count}
			</span>
		)
	}
	if (trend === 'up') return <i className="gfv-trend gfv-trend--up ri-arrow-up-s-line" title="Classement en hausse" aria-hidden="true" />
	if (trend === 'down') return <i className="gfv-trend gfv-trend--down ri-arrow-down-s-line" title="Classement en baisse" aria-hidden="true" />
	return null
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.headerAudio] — contrôle musique (même barre que les autres onglets)
 * @param {string} [props.coalitionSlug] — thème ghv (feu, eau, terre, air)
 * @param {Array} props.friends — amis (API, format backend)
 * @param {Array} [props.friendsRoster] — mock détaillé
 * @param {string} [props.myCoalition] — coalition du joueur
 */
export function FriendsView({
	friends = [],
	friendsRoster = [],
	myCoalition,
	headerAudio = null,
	coalitionSlug = null,
}) {
	const navigate = useNavigate()
	const list = useMemo(
		() => mergeFriendEntries(friends, friendsRoster, myCoalition),
		[friends, friendsRoster, myCoalition]
	)

	const onWatch = useCallback(
		(gameId) => {
			if (!gameId) return
			navigate(`/game/${encodeURIComponent(String(gameId))}`)
		},
		[navigate]
	)

	const onChallenge = useCallback(
		(userId) => {
			/* Intégration future : WebSocket + modal d’invitation, ou focus chat */
			if (import.meta.env.DEV) {
				// eslint-disable-next-line no-console
				console.info('[FriendsView] challenge', userId)
			}
		},
		[]
	)

	const gMod = coalitionSlug ? ` ghv-header--${coalitionSlug}` : ''
	const friendsHeader = (
		<header
			className={`ghv-header gfv-ghv-header${gMod}`}
			data-testid="ingame-friends-ghv-header"
		>
			<div className="ghv-header-inner">
				<div className="ghv-header-lead">
					<h2 className="ghv-title">
						<i className="ri-group-line" aria-hidden="true" />
						Amis & défis
					</h2>
					<p className="ghv-header-subtitle">Réseau 42, ELO et rivalités de coalition</p>
				</div>
				{headerAudio ? <div className="ghv-header-actions">{headerAudio}</div> : null}
			</div>
		</header>
	)

	if (!list.length) {
		return (
			<div className="gfv-shell" data-testid="ingame-friends-wrap">
				{friendsHeader}
				<div className="gfv-empty" data-testid="ingame-friends-empty" role="status">
					<i className="ri-group-line" aria-hidden="true" />
					<p>Aucun ami pour l’instant — invite des joueurs depuis le chat.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="gfv-shell" data-testid="ingame-friends-wrap">
			{friendsHeader}
		<div className="gfv-root" data-testid="ingame-friends" role="list" aria-label="Amis en ligne et stats">
			{list.map((row) => {
				const u = row.user
				const id = u?.id ?? row.friendship_id
				const slug = coalitionToSlug(u?.coalition) || 'feu'
				const statusKey = row.statusKey || 'offline'
				const isInMatch = statusKey === 'in_game'
				const hasWatchableGame = isInMatch && row.inGame?.id != null
				const statusLabel = isInMatch
					? STATUS_TEXT.in_game()
					: statusKey === 'available' || statusKey === 'online'
						? STATUS_TEXT.available(u)
						: statusKey === 'away' || statusKey === 'absent'
							? 'Absent'
							: 'Hors ligne'
				const elo = row.elo_rapid ?? row.elo ?? u?.elo ?? '—'
				const myW = row.rivalry?.wins ?? 0
				const thW = row.rivalry?.losses ?? 0
				const showRivalry = row.rivalry?.isOpponentCoalition && (myW + thW) > 0
				const rivalryText =
					myW === thW
						? `Rivalité ${myW}–${thW} (égalité)`
						: myW > thW
							? `Face-à-face : tu mènes ${myW}–${thW}`
							: `Face-à-face : ${thW}–${myW} (ils mènent)`
				return (
					<article className="gfv-card" key={row.friendship_id ?? id} role="listitem">
						<div className="gfv-card__grid">
							<div className="gfv-card__col gfv-card__col--left">
								<div className="gfv-avatar-wrap" aria-hidden="true">
									{u?.avatar
										? <img className="gfv-avatar" src={u.avatar} alt="" />
										: (
											<div className="gfv-avatar gfv-avatar--placeholder" title={u?.username ?? ''}>
												{(u?.username ?? '?').slice(0, 1).toUpperCase()}
											</div>
										)}
									<span className={`gfv-avatar-coal gfv-avatar-coal--${slug}`} title={coalitionSlugToLabel(slug)}>
										<ProfileCoalitionIcon slug={slug} />
									</span>
								</div>
							</div>
							<div className="gfv-card__col gfv-card__col--main">
								<div className="gfv-identity">
									<div className="gfv-name-line">
										<span className="gfv-username">@{u?.username ?? '—'}</span>
									</div>
									{row.title
										? <p className="gfv-title-noble">{row.title}</p>
										: null}
								</div>
								<p className={`gfv-status gfv-status--${statusKey}`}>
									<span className="gfv-status-dot" aria-hidden="true" />
									{statusLabel}
								</p>
								{row.lastActivity?.label
									? <p className="gfv-activity">{row.lastActivity.label}</p>
									: null}
								{isInMatch && row.inGame?.label
									? <p className="gfv-ingame-hint"><i className="ri-broadcast-line" /> {row.inGame.label}</p>
									: null}
							</div>
							<div className="gfv-card__col gfv-card__col--right">
								<div className="gfv-right-stack">
									<StreakOrTrend streak={row.streak} trend={row.trend} />
									<span className="gfv-elo" aria-label="Elo rapide">
										<span className="gfv-elo-label">ELO</span>
										{elo}
									</span>
									{showRivalry
										? <span className="gfv-rivalry" title="Face-à-face coalition / rivalité">{rivalryText}</span>
										: null}
									<div className="gfv-actions">
										{hasWatchableGame ? (
											<button
												type="button"
												className="gfv-btn gfv-btn--watch"
												onClick={() => onWatch(row.inGame.id)}
												aria-label="Regarder la partie de cet ami"
												data-testid={`friend-watch-${id}`}
											>
												Regarder
											</button>
										) : null}
										<button
											type="button"
											className="gfv-btn gfv-btn--challenge"
											onClick={() => onChallenge(id)}
											disabled={statusKey === 'offline' || statusKey === 'in_game' || statusKey === 'away'}
											aria-label={`Défier ${u?.username ?? 'ce joueur'}`}
											data-testid={`friend-challenge-${id}`}
										>
											<i className="ri-sword-line" aria-hidden="true" /> Défier
										</button>
									</div>
								</div>
							</div>
						</div>
					</article>
				)
			})}
		</div>
		</div>
	)
}

export default FriendsView
