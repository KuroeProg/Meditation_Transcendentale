import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import { fetchHistory } from '../services/historyApi.js'
import { enrichGameForUi } from '../services/historyGameUi.js'
import UserProfileLink from '../../../components/common/UserProfileLink.jsx'
import '../styles/History.scss'

const FALLBACK_FILTERS = {
	results: [
		{ id: 'all', label: 'Tous' },
		{ id: 'win', label: 'Victoires' },
		{ id: 'loss', label: 'Défaites' },
		{ id: 'draw', label: 'Nuls' },
	],
	formats: [
		{ id: 'all', label: 'Tous' },
		{ id: 'bullet', label: 'Bullet' },
		{ id: 'blitz', label: 'Blitz' },
		{ id: 'rapid', label: 'Rapide' },
	],
	modes: [
		{ id: 'all', label: 'Tous' },
		{ id: 'ranked', label: 'Classé' },
		{ id: 'casual', label: 'Amical' },
	],
}

/* ── Constantes pièces ── */
const PIECE_SYMBOLS = {
	w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
	b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

const COALITION_LABELS = { feu: 'Feu', eau: 'Eau', terre: 'Terre', air: 'Air' }

const FORMAT_ICONS = {
	bullet: 'ri-dashboard-3-line',
	blitz: 'ri-flashlight-line',
	rapid: 'ri-timer-line',
}

function formatIcon(format) {
	return FORMAT_ICONS[format] || 'ri-chess-line'
}

/* ── Badge coalition ── */
function CoalitionBadge({ coalition }) {
	if (!coalition) return (
		<span className="phistory-coalition-badge phistory-coalition-badge--bot">
			<i className="ri-robot-line" aria-hidden="true" /> Bot
		</span>
	)
	return (
		<span className={`phistory-coalition-badge phistory-coalition-badge--${coalition}`}>
			{COALITION_LABELS[coalition] ?? coalition}
		</span>
	)
}

/* ── Courbe d'évaluation mini ── */
/* ── Courbe d'évaluation mini ── */
function EvalMiniChart({ trend = [] }) {
	if (!trend || trend.length < 2) return <div className="phistory-eval-chart" />
	
	const width = 200
	const height = 48
	const maxVal = Math.max(...trend.map(Math.abs), 2)
	
	// Calcul des points
	const points = trend.map((v, i) => {
		const x = (i / (trend.length - 1)) * width
		const y = (height / 2) - (v / maxVal) * (height / 2)
		return { x, y }
	})

	const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
	const areaData = `${pathData} L ${width} ${height / 2} L 0 ${height / 2} Z`

	return (
		<div className="phistory-eval-chart" aria-hidden="true">
			<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
				<defs>
					<linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="var(--phistory-win)" stopOpacity="0.3" />
						<stop offset="50%" stopColor="var(--phistory-win)" stopOpacity="0" />
						<stop offset="50%" stopColor="var(--phistory-loss)" stopOpacity="0" />
						<stop offset="100%" stopColor="var(--phistory-loss)" stopOpacity="0.3" />
					</linearGradient>
				</defs>
				<line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
				<path d={areaData} fill="url(#evalGradient)" />
				<path d={pathData} fill="none" stroke="var(--phistory-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</div>
	)
}

/* ── Liste de coups ── */
function MovesList({ pgn = '' }) {
	if (!pgn) return <p className="phistory-pgn-preview">Aucun coup enregistré</p>

	// Split basique du PGN pour l'affichage
	const moves = pgn.split(/\s+/).filter(m => m && !m.includes('.'))
	const pairs = []
	for (let i = 0; i < moves.length; i += 2) {
		pairs.push({
			num: Math.floor(i / 2) + 1,
			w: moves[i],
			b: moves[i + 1]
		})
	}

	return (
		<div className="phistory-move-list">
			{pairs.map((p, idx) => (
				<div key={idx} className="phistory-move-row">
					<span className="phistory-move-num">{p.num}.</span>
					<span className="phistory-move-san">{p.w}</span>
					{p.b && <span className="phistory-move-san">{p.b}</span>}
				</div>
			))}
		</div>
	)
}

/* ── Pièces capturées mini ── */
function CapturesPreview({ capturedByMe = {}, capturedByOpponent = {} }) {
	const renderPieces = (caps, colorKey) =>
		Object.entries(caps).flatMap(([type, count]) => {
			const lowerType = type.toLowerCase()
			return Array.from({ length: count }, (_, i) => (
				<span key={`${type}-${i}`} className="phistory-piece-icon" aria-hidden="true">
					{PIECE_SYMBOLS[colorKey]?.[lowerType] ?? ''}
				</span>
			))
		})

	return (
		<div className="phistory-captures-preview">
			<div className="phistory-captures-row">
				<span className="phistory-captures-label">Moi</span>
				{renderPieces(capturedByMe, 'b')}
				{!Object.keys(capturedByMe).length && <span style={{ opacity: 0.35, fontSize: '0.62rem' }}>—</span>}
			</div>
			<div className="phistory-captures-row">
				<span className="phistory-captures-label">Adv.</span>
				{renderPieces(capturedByOpponent, 'w')}
				{!Object.keys(capturedByOpponent).length && <span style={{ opacity: 0.35, fontSize: '0.62rem' }}>—</span>}
			</div>
		</div>
	)
}

/* ── Ligne de partie ── */
function HistoryRow({ game, isSelected, onSelect }) {
	const navigate = useNavigate()

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() }
	}

	const handleReview = (e) => {
		e.stopPropagation()
		const pk = String(game.id).replace(/^game-/, '')
		navigate(`/game/review/${pk}`)
	}
	const handleChallenge = (e) => { e.stopPropagation() /* TODO: ouvrir modale défi */ }

	return (
		<>
			<div
				className={`phistory-row${isSelected ? ' phistory-row--selected' : ''}`}
				role="row"
				tabIndex={0}
				aria-expanded={isSelected}
				onClick={onSelect}
				onKeyDown={handleKeyDown}
				data-testid={`history-row-${game.id}`}
			>
				{/* Résultat */}
				<span
					className={`phistory-badge phistory-badge--${game.result}`}
					aria-label={`Résultat : ${game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Nul'}`}
				>
					{game.score}
				</span>

				{/* Format */}
				<div className="phistory-format" aria-label={game.formatLabel}>
					<i className={formatIcon(game.format)} aria-hidden="true" />
					<span className="visually-hidden">{game.formatLabel}</span>
				</div>

				{/* Date */}
				<time className="phistory-date" dateTime={game.date} title={new Date(game.date).toLocaleString('fr-FR')}>
					{game.relativeDate}
				</time>

				{/* Adversaire */}
				<div className="phistory-player">
					<div className="phistory-player-info">
						<span className="phistory-player-name">
							{game.opponent.isBot ? (
								<><i className="ri-robot-line" aria-hidden="true" /> {game.opponent.username}</>
							) : (
								<UserProfileLink userId={game.opponent.id} username={game.opponent.username} className="phistory-player-name" />
							)}
						</span>
						{game.opponent.elo && (
							<span className="phistory-player-elo">{game.opponent.elo} ELO</span>
						)}
					</div>
				</div>

				{/* Coalition adversaire */}
				<CoalitionBadge coalition={game.opponent.coalition} />

				{/* Mode et ELO Delta */}
				<div className="phistory-mode-elo">
					<span className={`phistory-mode-badge ${game.competitive ? 'phistory-mode-badge--ranked' : 'phistory-mode-badge--casual'}`}>
						{game.competitive ? 'Compétitive' : 'Amical'}
					</span>
					{game.competitive && game.player.eloChange !== 0 && (
						<span className={`phistory-elo-delta ${game.player.eloChange >= 0 ? 'phistory-elo-delta--pos' : 'phistory-elo-delta--neg'}`}>
							{game.player.eloChange >= 0 ? '+' : ''}{game.player.eloChange}
						</span>
					)}
				</div>

				{/* Visionnage */}
				<div className="phistory-row-actions" role="group" aria-label="Visionnage de la partie">
					{game.analysisStatus === 'analyzed' && (
						<span
							className="phistory-analysis-status phistory-analysis-status--analyzed"
							title="Analysée"
						>
							<i className="ri-checkbox-circle-line" aria-hidden="true" />
						</span>
					)}
					<button
						type="button"
						className="phistory-action-btn phistory-action-btn--accent"
						onClick={handleReview}
						aria-label="Revoir la partie"
						title="Revoir la partie"
					>
						<i className="ri-play-line" aria-hidden="true" />
					</button>
				</div>
			</div>

			{/* Preview accordéon */}
			{isSelected && (
				<div className="phistory-row-preview" role="region" aria-label="Détails de la partie" data-testid={`history-row-detail-${game.id}`}>
					{/* Courbe eval */}
					<div className="phistory-preview-block">
						<p className="phistory-preview-title">
							<i className="ri-line-chart-line" aria-hidden="true" /> Courbe d'évaluation
						</p>
						<EvalMiniChart trend={game.evalTrend} />
					</div>

					{/* PGN */}
					<div className="phistory-preview-block">
						<p className="phistory-preview-title">
							<i className="ri-file-list-3-line" aria-hidden="true" /> Liste des coups
						</p>
						<MovesList pgn={game.pgn || game.shortPgn} />
					</div>

					{/* Captures */}
					<div className="phistory-preview-block">
						<p className="phistory-preview-title">
							<i className="ri-chess-line" aria-hidden="true" /> Prises
						</p>
						<CapturesPreview capturedByMe={game.capturedByMe} capturedByOpponent={game.capturedByOpponent} />
					</div>

					<div className="phistory-preview-actions">
						<button type="button" className="phistory-cta-btn phistory-cta-btn--primary" onClick={handleReview}>
							<i className="ri-play-circle-line" aria-hidden="true" />
							Revoir la partie
						</button>
						{/* <button type="button" className="phistory-cta-btn">
							<i className="ri-bar-chart-2-line" aria-hidden="true" />
							Analyse complète
						</button> */}
					</div>
				</div>
			)}
		</>
	)
}

/* ── Panneau analyse ── */
function AnalysisPanel({ game }) {
	if (!game) {
		return (
			<div className="phistory-panel">
				<div className="phistory-panel-header">
					<i className="phistory-panel-icon ri-bar-chart-2-line" aria-hidden="true" />
					<h2 className="phistory-panel-title">Atelier de l'Archiviste</h2>
				</div>
				<div className="phistory-panel-body">
					<div className="phistory-analysis-empty" aria-live="polite">
						<i className="ri-arrow-left-line" aria-hidden="true" />
						Sélectionne une partie pour voir l'analyse
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="phistory-panel">
			<div className="phistory-panel-header">
				<i className="phistory-panel-icon ri-bar-chart-2-line" aria-hidden="true" />
				<h2 className="phistory-panel-title">Analyse — {game.relativeDate}</h2>
			</div>
			<div className="phistory-panel-body">
				{/* Précision */}
				{game.accuracy && (
					<section className="phistory-accuracy-section" aria-label="Précision des joueurs">
						<div className="phistory-accuracy-row">
							<div className="phistory-accuracy-rowlabel">
								<span>Moi</span>
								<strong>{game.accuracy.me}%</strong>
							</div>
							<div className="phistory-accuracy-bar-bg">
								<div className="phistory-accuracy-bar-fill" style={{ width: `${game.accuracy.me}%` }} />
							</div>
						</div>
						<div className="phistory-accuracy-row">
							<div className="phistory-accuracy-rowlabel">
								<span>{game.opponent.username}</span>
								<strong>{game.accuracy.opponent}%</strong>
							</div>
							<div className="phistory-accuracy-bar-bg">
								<div className="phistory-accuracy-bar-fill" style={{ width: `${game.accuracy.opponent}%`, background: 'rgba(255,255,255,0.3)' }} />
							</div>
						</div>
					</section>
				)}

				{/* Courbe éval */}
				<div className="phistory-analysis-block">
					<p className="phistory-preview-title">
						<i className="ri-line-chart-line" aria-hidden="true" /> Courbe d'évaluation
					</p>
					<EvalMiniChart trend={game.evalTrend} />
				</div>

				{/* Prises */}
				<div className="phistory-analysis-block">
					<p className="phistory-preview-title">
						<i className="ri-chess-line" aria-hidden="true" /> Prises
					</p>
					<CapturesPreview capturedByMe={game.capturedByMe} capturedByOpponent={game.capturedByOpponent} />
				</div>

				{/* Liste des coups */}
				<div className="phistory-analysis-block" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
					<p className="phistory-preview-title">
						<i className="ri-file-list-3-line" aria-hidden="true" /> Liste des coups
					</p>
					<MovesList pgn={game.pgn || game.shortPgn} />
				</div>

				{/* Stats rapides */}
				<div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
					<div className="phistory-rank-card" style={{ flex: 1 }}>
						<div className="phistory-rank-num" style={{ fontSize: '1rem' }}>{game.moveCount}</div>
						<div className="phistory-rank-label">Coups</div>
					</div>
					<div className="phistory-rank-card" style={{ flex: 1 }}>
						<div className="phistory-rank-num" style={{ fontSize: '1rem' }}>{game.blunders}</div>
						<div className="phistory-rank-label">Gaffes</div>
					</div>
					<div className="phistory-rank-card" style={{ flex: 1 }}>
						<div className="phistory-rank-num" style={{ fontSize: '1rem' }}>{game.missedWins}</div>
						<div className="phistory-rank-label">Victoires ratées</div>
					</div>
				</div>

				{/* CTA analyse complète */}
				{/* <button type="button" className="phistory-cta-btn phistory-cta-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
					<i className="ri-bar-chart-box-line" aria-hidden="true" />
					Voir l'analyse complète
				</button> */}
			</div>
		</div>
	)
}

// /* ── Panneau communauté ── */
// function CommunityPanel({ community }) {
// 	const FEED_TYPE_ICONS = {
// 		win: 'ri-trophy-line',
// 		challenge: 'ri-sword-line',
// 		trophy: 'ri-medal-line',
// 		default: 'ri-notification-line',
// 	}

// 	return (
// 		<div className="phistory-panel">
// 			<div className="phistory-panel-header">
// 				<i className="phistory-panel-icon ri-group-line" aria-hidden="true" />
// 				<h2 className="phistory-panel-title">Le Grand Tournoi</h2>
// 			</div>
// 			<div className="phistory-panel-body">
// 				{/* Classements */}
// 				<div className="phistory-rank-grid" role="list" aria-label="Classements">
// 					<div className="phistory-rank-card" role="listitem">
// 						<div className="phistory-rank-num">#{community.coalitionRank}</div>
// 						<div className="phistory-rank-label">Dans ta coalition</div>
// 					</div>
// 					<div className="phistory-rank-card" role="listitem">
// 						<div className="phistory-rank-num">#{community.globalRank}</div>
// 						<div className="phistory-rank-label">Classement mondial</div>
// 					</div>
// 				</div>

// 				{/* Rivalité */}
// 				{community.rivalryRank && (
// 					<div className="phistory-rivalry">
// 						<div className="phistory-rivalry-title">
// 							<i className="ri-sword-line" aria-hidden="true" /> Rivalité vs{' '}
// 							<CoalitionBadge coalition={community.rivalryRank.enemyCoalition} />
// 						</div>
// 						<div className="phistory-rivalry-row">
// 							<span>#{community.rivalryRank.position}</span>
// 							<div className="phistory-rivalry-score">
// 								<span className="phistory-rivalry-w">{community.rivalryRank.wins}V</span>
// 								<span className="phistory-rivalry-d">{community.rivalryRank.draws}N</span>
// 								<span className="phistory-rivalry-l">{community.rivalryRank.losses}D</span>
// 							</div>
// 						</div>
// 					</div>
// 				)}

// 				{/* Trophées */}
// 				<div>
// 					<p className="phistory-preview-title">
// 						<i className="ri-medal-line" aria-hidden="true" /> Trophées
// 					</p>
// 					<div className="phistory-trophies" role="list" aria-label="Trophées">
// 						{community.trophies.map((t) => (
// 							<span
// 								key={t.id}
// 								className={`phistory-trophy${t.earned ? ' phistory-trophy--earned' : ''}`}
// 								role="listitem"
// 								title={t.label}
// 								aria-label={`${t.label}${t.earned ? ' — obtenu' : ' — non obtenu'}`}
// 							>
// 								<i className={t.icon} aria-hidden="true" />
// 								<span className="visually-hidden">{t.label}</span>
// 							</span>
// 						))}
// 					</div>
// 				</div>

// 				{/* Flux activité */}
// 				<div>
// 					<p className="phistory-preview-title">
// 						<i className="ri-pulse-line" aria-hidden="true" /> Activité coalition
// 					</p>
// 					<ul className="phistory-feed" aria-label="Activités récentes de la coalition">
// 						{community.activityFeed.map((item) => (
// 							<li key={item.id} className="phistory-feed-item">
// 								<div className="phistory-feed-icon" aria-hidden="true">
// 									<i className={FEED_TYPE_ICONS[item.type] ?? FEED_TYPE_ICONS.default} />
// 								</div>
// 								<div className="phistory-feed-text">
// 									<span className="phistory-feed-username">{item.username}</span>{' '}
// 									{item.text}
// 									<time className="phistory-feed-time">{item.time}</time>
// 								</div>
// 							</li>
// 						))}
// 					</ul>
// 				</div>
// 			</div>
// 		</div>
// 	)
// }

/* ══════════════════════════════════════════════════
   Page principale
   ══════════════════════════════════════════════════ */
export default function HistoryPage() {
	const { user } = useAuth()
	const coalition = coalitionToSlug(user?.coalition)

	const [data, setData] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null)
	const [filterResult, setFilterResult] = useState('all')
	const [filterFormat, setFilterFormat] = useState('all')
	const [filterMode, setFilterMode] = useState('all')
	const [selectedId, setSelectedId] = useState(null)

	const filtersUi = data?.filters ?? FALLBACK_FILTERS

	// Mise à jour du titre de page + chargement historique
	useEffect(() => {
		document.title = 'Transcendance — Annales de l\'Arène'

		let isMounted = true
		fetchHistory()
			.then((res) => {
				if (isMounted) {
					setData(res)
					setIsLoading(false)
				}
			})
			.catch((err) => {
				if (isMounted) {
					setError(err.message)
					setIsLoading(false)
				}
			})

		return () => {
			document.title = 'Transcendance'
			isMounted = false
		}
	}, [])

	const filteredGames = useMemo(() => {
		const raw = data?.games ?? []
		return raw.map(enrichGameForUi).filter((g) => {
			if (filterResult !== 'all' && g.result !== filterResult) return false
			if (filterFormat !== 'all' && g.format !== filterFormat) return false
			if (filterMode !== 'all') {
				if (filterMode === 'ranked') {
					if (!g.competitive) return false
				} else if (filterMode === 'casual') {
					if (g.competitive) return false
				} else if (g.gameMode !== filterMode) {
					return false
				}
			}
			return true
		})
	}, [data, filterResult, filterFormat, filterMode])

	const selectedGame = useMemo(
		() => filteredGames.find((g) => g.id === selectedId) ?? null,
		[filteredGames, selectedId]
	)

	const handleSelect = (id) => setSelectedId((prev) => (prev === id ? null : id))

	const wins = filteredGames.filter((g) => g.result === 'win').length
	const losses = filteredGames.filter((g) => g.result === 'loss').length
	const draws = filteredGames.filter((g) => g.result === 'draw').length

	return (
		<div
			className="phistory-page chess-grid-pattern"
			data-phistory-coalition={coalition}
			aria-label="Annales de l'Arène — Historique des parties"
			data-testid="history-page"
		>
			{/* ── En-tête ── */}
			<header className="phistory-header">
				<div className="phistory-header-top">
					<div className="phistory-header-title">
						<h1 className="phistory-title">
							<i className="ri-book-3-line" aria-hidden="true" style={{ marginRight: '0.5rem', opacity: 0.8 }} />
							Annales de l'Arène
						</h1>
						<p className="phistory-subtitle">Historique des parties · {filteredGames.length} résultats</p>
					</div>
					<div className="phistory-header-stats" aria-label="Résumé des résultats filtrés">
						<span className="phistory-stat-pill">
							<i className="ri-trophy-line" aria-hidden="true" />
							<strong>{wins}</strong> Victoires
						</span>
						<span className="phistory-stat-pill">
							<i className="ri-close-circle-line" aria-hidden="true" />
							<strong>{losses}</strong> Défaites
						</span>
						<span className="phistory-stat-pill">
							<i className="ri-equals-line" aria-hidden="true" />
							<strong>{draws}</strong> Nuls
						</span>
					</div>
				</div>

				{/* Filtres */}
				<nav className="phistory-filters" aria-label="Filtres de l'historique" data-testid="history-filters">
					{/* Résultat */}
					<div className="phistory-filter-group" role="group" aria-label="Filtrer par résultat">
						{filtersUi.results.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`phistory-filter-btn${filterResult === f.id ? ' phistory-filter-btn--active' : ''}`}
								onClick={() => setFilterResult(f.id)}
								aria-pressed={filterResult === f.id}
							>
								{f.label}
							</button>
						))}
					</div>

					<span className="phistory-filters-sep" aria-hidden="true" />

					{/* Format */}
					<div className="phistory-filter-group" role="group" aria-label="Filtrer par format">
						{filtersUi.formats.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`phistory-filter-btn${filterFormat === f.id ? ' phistory-filter-btn--active' : ''}`}
								onClick={() => setFilterFormat(f.id)}
								aria-pressed={filterFormat === f.id}
							>
								{f.id !== 'all' && <i className={formatIcon(f.id)} aria-hidden="true" />}
								{f.label}
							</button>
						))}
					</div>

					<span className="phistory-filters-sep" aria-hidden="true" />

					{/* Mode */}
					<div className="phistory-filter-group" role="group" aria-label="Filtrer par mode">
						{filtersUi.modes.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`phistory-filter-btn${filterMode === f.id ? ' phistory-filter-btn--active' : ''}`}
								onClick={() => setFilterMode(f.id)}
								aria-pressed={filterMode === f.id}
							>
								{f.label}
							</button>
						))}
					</div>
				</nav>
			</header>

			{/* ── Corps ── */}
			<div className="phistory-body">
				{isLoading && (
					<div className="phistory-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', opacity: 0.6 }}>
						<i className="ri-loader-2-line spinner" style={{ fontSize: '2rem', marginRight: '1rem' }} />
						Chargement des mémoires de l'arène...
					</div>
				)}

				{error && (
					<div className="phistory-error" style={{ flex: 1, padding: '4rem', textAlign: 'center', color: '#ff4b4b' }}>
						<i className="ri-error-warning-line" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
						<p>Erreur lors du chargement : {error}</p>
					</div>
				)}

				{!isLoading && !error && (
					<>
						{/* Colonne principale */}
						<main className="phistory-main" aria-label="Liste des parties">
							<div className="phistory-table-section">
								{/* En-têtes */}
								<div className="phistory-table-header" role="row" aria-hidden="true">
									<span className="phistory-table-col">Résultat</span>
									<span className="phistory-table-col">Format</span>
									<span className="phistory-table-col">Date</span>
									<span className="phistory-table-col">Adversaire</span>
									<span className="phistory-table-col">Coalition</span>
									<span className="phistory-table-col">Mode / ELO</span>
									<span className="phistory-table-col phistory-table-col--right">Visionnage</span>
								</div>

								{/* Lignes */}
								<div
									className="phistory-table-body"
									role="table"
									aria-label="Parties jouées"
									aria-rowcount={filteredGames.length}
									data-testid="history-game-list"
								>
									{filteredGames.length === 0 ? (
										<div className="phistory-empty" role="status">
											<i className="ri-inbox-line" aria-hidden="true" />
											<p className="phistory-empty-title">Aucune partie trouvée</p>
											<p className="phistory-empty-sub">Essaie de modifier les filtres</p>
										</div>
									) : (
										filteredGames.map((game) => (
											<HistoryRow
												key={game.id}
												game={game}
												isSelected={selectedId === game.id}
												onSelect={() => handleSelect(game.id)}
											/>
										))
									)}
								</div>
							</div>

							{filteredGames.length > 0 && (
								<div className="phistory-footer">
									<button type="button" className="phistory-load-more">
										<i className="ri-loader-2-line" aria-hidden="true" />
										Charger plus de parties
									</button>
								</div>
							)}
						</main>

						{/* Colonne latérale */}
						{/* Colonne latérale - Commentée temporairement 
						<aside className="phistory-sidebar" aria-label="Panneaux d'analyse et communauté">
							<AnalysisPanel game={selectedGame} />
							
							{data?.puzzleRecommendations?.length > 0 && (
								<div className="phistory-panel">
									<div className="phistory-panel-header">
										<i className="phistory-panel-icon ri-lightbulb-line" aria-hidden="true" />
										<h2 className="phistory-panel-title">Progresser</h2>
									</div>
									<div className="phistory-panel-body">
										<p className="phistory-preview-title">Puzzles recommandés</p>
										<div className="phistory-puzzles">
											{data.puzzleRecommendations.map(p => (
												<div key={p.id} className="phistory-puzzle-card">
													<div className="phistory-puzzle-icon">
														<i className={p.icon} />
													</div>
													<div className="phistory-puzzle-info">
														<div className="phistory-puzzle-theme">{p.theme}</div>
														<div className="phistory-puzzle-diff">{p.difficulty}</div>
													</div>
													<i className="ri-arrow-right-s-line" />
												</div>
											))}
										</div>
									</div>
								</div>
							)}
							
							{data && <CommunityPanel community={data.communityPanel} />}
						</aside>
						*/}
					</>
				)}
			</div>
		</div>
	)
}
