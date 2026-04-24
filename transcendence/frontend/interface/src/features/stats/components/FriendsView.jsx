import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'

function inferStatusKey(u) {
	if (u?.active_game_id) return 'in_game'
	if (u?.is_online) return 'available'
	return 'offline'
}

function getStatusLabel(statusKey) {
	if (statusKey === 'in_game') return 'En partie'
	if (statusKey === 'available') return 'En ligne'
	return 'Hors ligne'
}

function buildList(friends) {
	return (friends ?? []).map((entry) => {
		const u = entry.user || entry
		const statusKey = inferStatusKey(u)
		return {
			friendship_id: entry.friendship_id,
			user: u,
			statusKey,
			elo: u.elo_rapid ?? u.elo_blitz ?? u.elo ?? null,
			inGameId: u.active_game_id ?? null,
		}
	})
}

/**
 * Vue « Amis » dans le panneau in-game.
 * Données 100 % backend — GET /api/auth/friends?status=accepted
 *
 * @param {object} props
 * @param {Array}  props.friends         — liste d'amis acceptés (format API)
 * @param {string} [props.coalitionSlug] — thème couleur ghv
 * @param {import('react').ReactNode} [props.headerAudio]
 */
export function FriendsView({
	friends = [],
	headerAudio = null,
	coalitionSlug = null,
}) {
	const navigate = useNavigate()
	const list = useMemo(() => buildList(friends), [friends])

	const onWatch = useCallback(
		(gameId) => {
			if (!gameId) return
			navigate(`/game/${encodeURIComponent(String(gameId))}`)
		},
		[navigate]
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
						Amis
					</h2>
					<p className="ghv-header-subtitle">Présence en temps réel · ELO</p>
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
					<p>Aucun ami pour l'instant — invite des joueurs depuis le chat.</p>
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
					const sk = row.statusKey
					const hasWatchableGame = sk === 'in_game' && row.inGameId != null
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
									<span className="gfv-username">@{u?.username ?? '—'}</span>
									<p className={`gfv-status gfv-status--${sk}`}>
										<span className="gfv-status-dot" aria-hidden="true" />
										{getStatusLabel(sk)}
									</p>
								</div>
								<div className="gfv-card__col gfv-card__col--right">
									<div className="gfv-right-stack">
										{row.elo != null && (
											<span className="gfv-elo" aria-label={`${row.elo} ELO`}>
												<span className="gfv-elo-label">ELO</span>
												{row.elo}
											</span>
										)}
										{hasWatchableGame && (
											<button
												type="button"
												className="gfv-btn gfv-btn--watch"
												onClick={() => onWatch(row.inGameId)}
												aria-label="Regarder la partie de cet ami"
												data-testid={`friend-watch-${id}`}
											>
												<i className="ri-eye-line" aria-hidden="true" /> Regarder
											</button>
										)}
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
