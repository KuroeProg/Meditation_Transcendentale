import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import mockData from '../assets/mockHistoryData.json'
import '../styles/History.css'

/* ── Constantes pièces ── */
const PIECE_SYMBOLS = {
	w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
	b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

const COALITION_LABELS = { feu: 'Feu', eau: 'Eau', terre: 'Terre', air: 'Air' }

const FORMAT_ICONS = {
	blitz:     'ri-flashlight-line',
	rapid:     'ri-time-line',
	classical: 'ri-chess-line',
	puzzle:    'ri-puzzle-line',
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
function EvalMiniChart({ trend = [] }) {
	if (!trend.length) return <div className="phistory-eval-chart" />
	const max = Math.max(...trend.map(Math.abs), 1)
	return (
		<div className="phistory-eval-chart" aria-hidden="true">
			{trend.map((v, i) => {
				const pct = Math.min(Math.abs(v) / max, 1) * 100
				return (
					<div
						key={i}
						className={`phistory-eval-bar ${v >= 0 ? 'phistory-eval-bar--pos' : 'phistory-eval-bar--neg'}`}
						style={{ height: `${Math.max(pct, 8)}%` }}
					/>
				)
			})}
		</div>
	)
}

/* ── Pièces capturées mini ── */
function CapturesPreview({ capturedByMe = {}, capturedByOpponent = {} }) {
	const renderPieces = (caps, colorKey) =>
		Object.entries(caps).flatMap(([type, count]) =>
			Array.from({ length: count }, (_, i) => (
				<span key={`${type}-${i}`} className="phistory-piece-icon" aria-hidden="true">
					{PIECE_SYMBOLS[colorKey]?.[type] ?? ''}
				</span>
			))
		)

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

	const handleReview = (e) => { e.stopPropagation(); navigate(`/game/${game.id}`) }
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
							{game.opponent.isBot ? <><i className="ri-robot-line" aria-hidden="true" /> {game.opponent.username}</> : game.opponent.username}
						</span>
						{game.opponent.elo && (
							<span className="phistory-player-elo">{game.opponent.elo} ELO</span>
						)}
					</div>
				</div>

				{/* Coalition adversaire */}
				<CoalitionBadge coalition={game.opponent.coalition} />

				{/* Précision */}
				{game.accuracy && (
					<div className="phistory-accuracy">
						<span className="phistory-accuracy-val">{game.accuracy.me}%</span>
						<span className="phistory-accuracy-label">préc.</span>
					</div>
				)}

				{/* Actions rapides */}
				<div className="phistory-row-actions" role="group" aria-label="Actions de la partie">
					{game.analysisStatus === 'analyzed' && (
						<span
							className="phistory-analysis-status phistory-analysis-status--analyzed"
							title="Analysée"
						>
							<i className="ri-checkbox-circle-line" aria-hidden="true" />
						</span>
					)}
					{game.analysisStatus === 'pending' && (
						<span
							className="phistory-analysis-status phistory-analysis-status--pending"
							title="En attente d'analyse"
						>
							<i className="ri-time-line" aria-hidden="true" />
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
					<button
						type="button"
						className="phistory-action-btn"
						onClick={handleChallenge}
						aria-label="Défier à nouveau"
						title="Défier à nouveau"
					>
						<i className="ri-sword-line" aria-hidden="true" />
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
							<i className="ri-file-list-3-line" aria-hidden="true" /> Coups notables
						</p>
						<p className="phistory-pgn-preview">{game.shortPgn}</p>
					</div>

					{/* Captures */}
					<div className="phistory-preview-block">
						<p className="phistory-preview-title">
							<i className="ri-chess-line" aria-hidden="true" /> Prises
						</p>
						<CapturesPreview capturedByMe={game.capturedByMe} capturedByOpponent={game.capturedByOpponent} />
					</div>

					{/* CTA */}
					<div className="phistory-preview-actions">
						<button type="button" className="phistory-cta-btn phistory-cta-btn--primary" onClick={handleReview}>
							<i className="ri-play-circle-line" aria-hidden="true" />
							Revoir la partie
						</button>
						<button type="button" className="phistory-cta-btn">
							<i className="ri-bar-chart-2-line" aria-hidden="true" />
							Analyse complète
						</button>
						<button type="button" className="phistory-cta-btn" onClick={handleChallenge}>
							<i className="ri-sword-line" aria-hidden="true" />
							Défier à nouveau
						</button>
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
				<div>
					<p className="phistory-preview-title">
						<i className="ri-line-chart-line" aria-hidden="true" /> Courbe d'évaluation
					</p>
					<EvalMiniChart trend={game.evalTrend} />
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
				<button type="button" className="phistory-cta-btn phistory-cta-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
					<i className="ri-bar-chart-box-line" aria-hidden="true" />
					Voir l'analyse complète
				</button>
			</div>
		</div>
	)
}

/* ── Panneau communauté ── */
function CommunityPanel({ community }) {
	const FEED_TYPE_ICONS = {
		win: 'ri-trophy-line',
		challenge: 'ri-sword-line',
		trophy: 'ri-medal-line',
		default: 'ri-notification-line',
	}

	return (
		<div className="phistory-panel">
			<div className="phistory-panel-header">
				<i className="phistory-panel-icon ri-group-line" aria-hidden="true" />
				<h2 className="phistory-panel-title">Le Grand Tournoi</h2>
			</div>
			<div className="phistory-panel-body">
				{/* Classements */}
				<div className="phistory-rank-grid" role="list" aria-label="Classements">
					<div className="phistory-rank-card" role="listitem">
						<div className="phistory-rank-num">#{community.coalitionRank}</div>
						<div className="phistory-rank-label">Dans ta coalition</div>
					</div>
					<div className="phistory-rank-card" role="listitem">
						<div className="phistory-rank-num">#{community.globalRank}</div>
						<div className="phistory-rank-label">Classement mondial</div>
					</div>
				</div>

				{/* Rivalité */}
				{community.rivalryRank && (
					<div className="phistory-rivalry">
						<div className="phistory-rivalry-title">
							<i className="ri-sword-line" aria-hidden="true" /> Rivalité vs{' '}
							<CoalitionBadge coalition={community.rivalryRank.enemyCoalition} />
						</div>
						<div className="phistory-rivalry-row">
							<span>#{community.rivalryRank.position}</span>
							<div className="phistory-rivalry-score">
								<span className="phistory-rivalry-w">{community.rivalryRank.wins}V</span>
								<span className="phistory-rivalry-d">{community.rivalryRank.draws}N</span>
								<span className="phistory-rivalry-l">{community.rivalryRank.losses}D</span>
							</div>
						</div>
					</div>
				)}

				{/* Trophées */}
				<div>
					<p className="phistory-preview-title">
						<i className="ri-medal-line" aria-hidden="true" /> Trophées
					</p>
					<div className="phistory-trophies" role="list" aria-label="Trophées">
						{community.trophies.map((t) => (
							<span
								key={t.id}
								className={`phistory-trophy${t.earned ? ' phistory-trophy--earned' : ''}`}
								role="listitem"
								title={t.label}
								aria-label={`${t.label}${t.earned ? ' — obtenu' : ' — non obtenu'}`}
							>
								<i className={t.icon} aria-hidden="true" />
								<span className="visually-hidden">{t.label}</span>
							</span>
						))}
					</div>
				</div>

				{/* Flux activité */}
				<div>
					<p className="phistory-preview-title">
						<i className="ri-pulse-line" aria-hidden="true" /> Activité coalition
					</p>
					<ul className="phistory-feed" aria-label="Activités récentes de la coalition">
						{community.activityFeed.map((item) => (
							<li key={item.id} className="phistory-feed-item">
								<div className="phistory-feed-icon" aria-hidden="true">
									<i className={FEED_TYPE_ICONS[item.type] ?? FEED_TYPE_ICONS.default} />
								</div>
								<div className="phistory-feed-text">
									<span className="phistory-feed-username">{item.username}</span>{' '}
									{item.text}
									<time className="phistory-feed-time">{item.time}</time>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	)
}

/* ══════════════════════════════════════════════════
   Page principale
   ══════════════════════════════════════════════════ */
export default function HistoryPage() {
	const { user } = useAuth()
	const coalition = coalitionToSlug(user?.coalition)

	const [filterPeriod, setFilterPeriod] = useState('all')
	const [filterResult, setFilterResult] = useState('all')
	const [filterFormat,  setFilterFormat]  = useState('all')
	const [filterMode,    setFilterMode]    = useState('all')
	const [selectedId,    setSelectedId]    = useState(null)

	// Mise à jour du titre de page
	useEffect(() => {
		document.title = 'Transcendance — Annales de l\'Arène'
		return () => { document.title = 'Transcendance' }
	}, [])

	const filteredGames = useMemo(() => {
		return mockData.games.filter((g) => {
			if (filterResult !== 'all' && g.result !== filterResult) return false
			if (filterFormat  !== 'all' && g.format  !== filterFormat)  return false
			if (filterMode    !== 'all') {
				if (filterMode === 'ranked'  && !g.competitive) return false
				if (filterMode === 'casual'  && g.competitive)  return false
			}
			return true
		})
	}, [filterResult, filterFormat, filterMode])

	const selectedGame = useMemo(
		() => filteredGames.find((g) => g.id === selectedId) ?? null,
		[filteredGames, selectedId]
	)

	const handleSelect = (id) => setSelectedId((prev) => (prev === id ? null : id))

	const wins   = filteredGames.filter((g) => g.result === 'win').length
	const losses = filteredGames.filter((g) => g.result === 'loss').length
	const draws  = filteredGames.filter((g) => g.result === 'draw').length

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
						{mockData.filters.results.map((f) => (
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
						{mockData.filters.formats.map((f) => (
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
						{mockData.filters.modes.map((f) => (
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
							<span className="phistory-table-col phistory-table-col--right">Précision</span>
							<span className="phistory-table-col phistory-table-col--right">Actions</span>
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
				<aside className="phistory-sidebar" aria-label="Panneaux d'analyse et communauté">
					<AnalysisPanel game={selectedGame} />
					<CommunityPanel community={mockData.communityPanel} />
				</aside>
			</div>
		</div>
	)
}
