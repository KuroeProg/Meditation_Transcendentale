import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Icônes par format ── */
const FORMAT_ICONS = {
	blitz:     'ri-flashlight-line',
	rapid:     'ri-time-line',
	classical: 'ri-chess-line',
	puzzle:    'ri-puzzle-line',
}

/* ── Symboles de pièces Unicode ── */
const PIECE_SYMBOLS = {
	w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
	b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

/* ── Labels coalition ── */
const COALITION_LABELS = { feu: 'Feu', eau: 'Eau', terre: 'Terre', air: 'Air' }

const FILTERS_RESULT = [
	{ id: 'all',  label: 'Tout' },
	{ id: 'win',  label: 'Victoires' },
	{ id: 'loss', label: 'Défaites' },
	{ id: 'draw', label: 'Nuls' },
]

const FILTERS_FORMAT = [
	{ id: 'all',    label: 'Tous' },
	{ id: 'blitz',  label: 'Blitz' },
	{ id: 'rapid',  label: 'Rapide' },
	{ id: 'puzzle', label: 'Puzzle' },
]

/* ── Mini courbe éval ── */
function EvalMiniBar({ trend = [] }) {
	if (!trend.length) return null
	const max = Math.max(...trend.map(Math.abs), 1)
	return (
		<div className="ghv-eval-chart" aria-hidden="true">
			{trend.map((v, i) => (
				<div
					key={i}
					className={`ghv-eval-bar ${v >= 0 ? 'ghv-eval-bar--pos' : 'ghv-eval-bar--neg'}`}
					style={{ height: `${Math.max(Math.abs(v) / max, 0.08) * 100}%` }}
				/>
			))}
		</div>
	)
}

/* ── Affichage des pièces capturées ── */
function PiecesLine({ caps, colorKey }) {
	const items = Object.entries(caps ?? {}).flatMap(([type, count]) =>
		Array.from({ length: count }, (_, i) => (
			<span key={`${type}-${i}`} className="ghv-piece" aria-hidden="true">
				{PIECE_SYMBOLS[colorKey]?.[type] ?? ''}
			</span>
		))
	)
	return items.length ? <>{items}</> : <span className="ghv-no-capture">—</span>
}

/* ── Coalition badge compact ── */
function CoalitionBadge({ coalition }) {
	if (!coalition) return <span className="ghv-coalition ghv-coalition--bot"><i className="ri-robot-line" />Bot</span>
	return <span className={`ghv-coalition ghv-coalition--${coalition}`}>{COALITION_LABELS[coalition] ?? coalition}</span>
}

/* ── Ligne de partie accordéon ── */
function GameRow({ game, isOpen, onToggle }) {
	const navigate = useNavigate()

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
	}

	const stopAndGo = (fn) => (e) => { e.stopPropagation(); fn() }

	return (
		<div className={`ghv-row${isOpen ? ' ghv-row--open' : ''}`} data-testid={`ingame-history-row-${game.id}`}>
			{/* Ligne principale */}
			<div
				className="ghv-row-main"
				role="row"
				tabIndex={0}
				aria-expanded={isOpen}
				onClick={onToggle}
				onKeyDown={handleKeyDown}
			>
				{/* Badge résultat */}
				<span
					className={`ghv-badge ghv-badge--${game.result}`}
					aria-label={game.result === 'win' ? 'Victoire' : game.result === 'loss' ? 'Défaite' : 'Nul'}
				>
					{game.score}
				</span>

				{/* Format */}
				<i
					className={`ghv-format-icon ${FORMAT_ICONS[game.format] ?? 'ri-chess-line'}`}
					title={game.formatLabel}
					aria-label={game.formatLabel}
				/>

				{/* Adversaire + coalition */}
				<div className="ghv-opponent">
					<span className="ghv-opponent-name">
						{game.opponent.isBot
							? <><i className="ri-robot-line" aria-hidden="true" />{' '}</>
							: null
						}
						{game.opponent.username}
					</span>
					<CoalitionBadge coalition={game.opponent.coalition} />
				</div>

				{/* Date */}
				<time className="ghv-date" dateTime={game.date}>{game.relativeDate}</time>

				{/* Flèche accordéon */}
				<i
					className={`ghv-chevron ri-arrow-down-s-line${isOpen ? ' ghv-chevron--open' : ''}`}
					aria-hidden="true"
				/>
			</div>

			{/* Détail accordéon */}
			{isOpen && (
				<div className="ghv-detail" role="region" aria-label={`Détail : ${game.opponent.username}`}>
					{/* Courbe eval + précision */}
					<div className="ghv-detail-stats">
						<div className="ghv-detail-col">
							<span className="ghv-detail-label">Précision</span>
							<span className="ghv-detail-val">{game.accuracy?.me ?? '—'}%</span>
						</div>
						<div className="ghv-detail-col">
							<span className="ghv-detail-label">Coups</span>
							<span className="ghv-detail-val">{game.moveCount}</span>
						</div>
						<div className="ghv-detail-col">
							<span className="ghv-detail-label">Durée</span>
							<span className="ghv-detail-val">{game.duration}</span>
						</div>
					</div>

					{/* Mini courbe */}
					<div className="ghv-eval-section">
						<span className="ghv-detail-label" aria-hidden="true">Évaluation</span>
						<EvalMiniBar trend={game.evalTrend} />
					</div>

					{/* Prises */}
					<div className="ghv-captures">
						<div className="ghv-captures-row">
							<span className="ghv-captures-label">Moi</span>
							<PiecesLine caps={game.capturedByMe} colorKey="b" />
						</div>
						<div className="ghv-captures-row">
							<span className="ghv-captures-label">Adv.</span>
							<PiecesLine caps={game.capturedByOpponent} colorKey="w" />
						</div>
					</div>

					{/* Statut analyse */}
					{game.analysisStatus && (
						<div className="ghv-analysis-status">
							{game.analysisStatus === 'analyzed'
								? <><i className="ri-checkbox-circle-line ghv-status-ok" aria-hidden="true" />Analysée</>
								: <><i className="ri-time-line ghv-status-pending" aria-hidden="true" />En attente</>
							}
						</div>
					)}

					{/* CTA */}
					<div className="ghv-actions" role="group" aria-label="Actions de la partie">
						<button
							type="button"
							className="ghv-btn ghv-btn--primary"
							onClick={stopAndGo(() => navigate(`/game/${game.id}`))}
						>
							<i className="ri-play-line" aria-hidden="true" />
							Revoir
						</button>
						<button
							type="button"
							className="ghv-btn"
							onClick={stopAndGo(() => navigate('/history'))}
						>
							<i className="ri-bar-chart-2-line" aria-hidden="true" />
							Analyser
						</button>
						<button
							type="button"
							className="ghv-btn"
							onClick={stopAndGo(() => { /* TODO: défi */ })}
						>
							<i className="ri-sword-line" aria-hidden="true" />
							Défier
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

/* ══════════════════════════════════════════════════
   Composant principal HistoryView
   Props:
     recentGames   — tableau de parties (shape: mockPersonalStats.gamePanel.recentGames)
     coalitionSlug — slug coalition du joueur courant pour la bannière
   ══════════════════════════════════════════════════ */
export function HistoryView({ recentGames = [], coalitionSlug }) {
	const [filterResult, setFilterResult] = useState('all')
	const [filterFormat,  setFilterFormat]  = useState('all')
	const [openId, setOpenId] = useState(null)
	const navigate = useNavigate()

	const filtered = useMemo(() =>
		recentGames.filter((g) => {
			if (filterResult !== 'all' && g.result !== filterResult) return false
			if (filterFormat  !== 'all' && g.format  !== filterFormat)  return false
			return true
		}),
		[recentGames, filterResult, filterFormat]
	)

	const handleToggle = (id) => setOpenId((prev) => (prev === id ? null : id))

	return (
		<div className="ghv-root chess-grid-pattern--md" data-testid="ingame-history-panel">
			{/* ── En-tête avec bannière coalition ── */}
			<header className={`ghv-header${coalitionSlug ? ` ghv-header--${coalitionSlug}` : ''}`}>
				<div className="ghv-header-inner">
					<h2 className="ghv-title">
						<i className="ri-book-3-line" aria-hidden="true" />
						Annales de l'Arène
					</h2>
					<button
						type="button"
						className="ghv-see-all"
						onClick={() => navigate('/history')}
						aria-label="Voir tout l'historique"
					>
						Tout voir <i className="ri-arrow-right-line" aria-hidden="true" />
					</button>
				</div>

				{/* Filtres rapides */}
				<div className="ghv-filters" role="group" aria-label="Filtres rapides">
					<div className="ghv-filter-row" role="group" aria-label="Filtrer par résultat">
						{FILTERS_RESULT.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`ghv-filter-chip${filterResult === f.id ? ' ghv-filter-chip--active' : ''}`}
								onClick={() => setFilterResult(f.id)}
								aria-pressed={filterResult === f.id}
							>
								{f.label}
							</button>
						))}
					</div>
					<div className="ghv-filter-row" role="group" aria-label="Filtrer par format">
						{FILTERS_FORMAT.map((f) => (
							<button
								key={f.id}
								type="button"
								className={`ghv-filter-chip${filterFormat === f.id ? ' ghv-filter-chip--active' : ''}`}
								onClick={() => setFilterFormat(f.id)}
								aria-pressed={filterFormat === f.id}
							>
								{f.id !== 'all' && <i className={FORMAT_ICONS[f.id]} aria-hidden="true" />}
								{f.label}
							</button>
						))}
					</div>
				</div>
			</header>

			{/* ── Liste des parties ── */}
			<div
				className="ghv-list"
				role="table"
				aria-label="Parties récentes"
				aria-rowcount={filtered.length}
				data-testid="ingame-history-list"
			>
				{filtered.length === 0 ? (
					<div className="ghv-empty" role="status">
						<i className="ri-inbox-line" aria-hidden="true" />
						<span>Aucune partie correspondante</span>
					</div>
				) : (
					filtered.map((game) => (
						<GameRow
							key={game.id}
							game={game}
							isOpen={openId === game.id}
							onToggle={() => handleToggle(game.id)}
						/>
					))
				)}
			</div>

			{/* ── Footer : lien vers page dédiée ── */}
			{filtered.length > 0 && (
				<div className="ghv-footer">
					<button type="button" className="ghv-footer-btn" onClick={() => navigate('/history')}>
						<i className="ri-history-line" aria-hidden="true" />
						Voir l'historique complet
					</button>
				</div>
			)}
		</div>
	)
}
