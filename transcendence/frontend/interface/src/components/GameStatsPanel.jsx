import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { Chess } from 'chess.js'
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import mockStats from '../dev/mockPlayerStats.json'
import './GameStatsPanel.css'

const PIECE_LABELS = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }
const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q', 'k']
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function materialBalance(chess) {
	const board = chess.board()
	let w = 0
	let b = 0
	for (const row of board) {
		for (const cell of row) {
			if (!cell) continue
			const v = PIECE_VAL[cell.type] ?? 0
			if (cell.color === 'w') w += v
			else b += v
		}
	}
	return +(w - b).toFixed(2)
}

function getResultInfo(winner) {
	if (!winner) return { title: 'Partie en cours', subtitle: '' }
	if (winner === 'Nulle') return { title: 'Draw!', subtitle: 'Equal position' }
	if (winner === 'White-Timeout' || winner === 'Black-Timeout') {
		const color = winner === 'White-Timeout' ? 'White' : 'Black'
		return { title: 'Time is up!', subtitle: `${color} wins on time` }
	}
	return { title: 'Checkmate!', subtitle: `${winner} wins` }
}

function resultShortNotation(winner) {
	if (!winner) return null
	if (winner === 'Nulle') return '½–½'
	if (winner === 'White' || winner === 'White-Timeout') return '1–0'
	if (winner === 'Black' || winner === 'Black-Timeout') return '0–1'
	return null
}

function buildPerfChartData(moveLog) {
	const byTurn = []
	for (let i = 0; i < moveLog.length; i += 2) {
		const wMove = moveLog[i]
		const bMove = moveLog[i + 1]
		const turn = Math.floor(i / 2) + 1
		byTurn.push({
			turn,
			white: wMove ? +(wMove.timeSpentMs / 1000).toFixed(1) : null,
			black: bMove ? +(bMove.timeSpentMs / 1000).toFixed(1) : null,
		})
	}
	return byTurn
}

function buildMaterialChartData(moveLog) {
	const chess = new Chess()
	const data = []
	for (let i = 0; i < moveLog.length; i++) {
		const m = moveLog[i]
		const r = chess.move(m.san)
		if (!r) break
		data.push({
			ply: i + 1,
			material: materialBalance(chess),
		})
	}
	return data
}

function buildPieceUsageData(moveLog) {
	const total = { w: 0, b: 0 }
	const counts = {}
	for (const p of PIECE_ORDER) {
		counts[p] = { w: 0, b: 0 }
	}
	for (const m of moveLog) {
		const c = m.color
		total[c]++
		if (counts[m.piece]) counts[m.piece][c]++
	}
	return PIECE_ORDER.map((p) => ({
		piece: PIECE_LABELS[p],
		white: total.w ? +((counts[p].w / total.w) * 100).toFixed(1) : 0,
		black: total.b ? +((counts[p].b / total.b) * 100).toFixed(1) : 0,
	}))
}

function MoveListView({ moveLog, viewPlies, onViewPlies, winner }) {
	const listEndRef = useRef(null)
	const selectedHalfIdx =
		viewPlies === null
			? moveLog.length > 0
				? moveLog.length - 1
				: -1
			: viewPlies === 0
				? -1
				: viewPlies - 1

	useLayoutEffect(() => {
		if (viewPlies !== null) return
		listEndRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
	}, [moveLog.length, viewPlies])

	const rows = []
	for (let i = 0; i < moveLog.length; i += 2) {
		rows.push({
			num: Math.floor(i / 2) + 1,
			white: moveLog[i],
			black: moveLog[i + 1],
			wIdx: i,
			bIdx: i + 1,
		})
	}
	const lastTurnNum = rows.length ? rows[rows.length - 1].num : 0
	const resultStr = resultShortNotation(winner)

	if (!moveLog.length) {
		return (
			<div className="stats-moves-block stats-moves-block--pgn">
				<div className="stats-moves-pgn__tabbar">
					<span className="stats-moves-pgn__tab stats-moves-pgn__tab--active">Coups</span>
				</div>
				<p className="stats-empty-moves">Aucun coup pour l’instant.</p>
			</div>
		)
	}

	return (
		<div className="stats-moves-block stats-moves-block--pgn">
			<div className="stats-moves-pgn__tabbar">
				<span className="stats-moves-pgn__tab stats-moves-pgn__tab--active">Coups</span>
				{viewPlies != null ? (
					<button type="button" className="stats-moves-pgn__live" onClick={() => onViewPlies(null)}>
						Partie en cours
					</button>
				) : null}
			</div>
			<div className="stats-move-list stats-move-list--pgn" role="list">
				{rows.map(({ num, white, black, wIdx, bIdx }) => (
					<div
						key={num}
						ref={num === lastTurnNum && viewPlies === null ? listEndRef : undefined}
						role="listitem"
						className={`stats-pgn-row stats-pgn-row--${num % 2 === 1 ? 'odd' : 'even'}`}
					>
						<span className="stats-pgn-row__num">{num}.</span>
						<div className="stats-pgn-row__moves">
							<button
								type="button"
								className={`stats-pgn-san-btn stats-pgn-san-btn--w${
									selectedHalfIdx === wIdx ? ' stats-pgn-san-btn--selected' : ''
								}`}
								aria-pressed={selectedHalfIdx === wIdx}
								aria-label={`Blancs ${white.san}, ${(white.timeSpentMs / 1000).toFixed(1)} secondes — afficher la position`}
								onClick={() => onViewPlies(wIdx + 1)}
							>
								{white.san}
							</button>
							{black ? (
								<button
									type="button"
									className={`stats-pgn-san-btn stats-pgn-san-btn--b${
										selectedHalfIdx === bIdx ? ' stats-pgn-san-btn--selected' : ''
									}`}
									aria-pressed={selectedHalfIdx === bIdx}
									aria-label={`Noirs ${black.san}, ${(black.timeSpentMs / 1000).toFixed(1)} secondes — afficher la position`}
									onClick={() => onViewPlies(bIdx + 1)}
								>
									{black.san}
								</button>
							) : (
								<span className="stats-pgn-san-btn stats-pgn-san-btn--b stats-pgn-san-btn--empty" aria-hidden />
							)}
						</div>
						<div className="stats-pgn-row__times">
							<span className="stats-pgn-row__time">{(white.timeSpentMs / 1000).toFixed(1)}s</span>
							{black ? (
								<span className="stats-pgn-row__time">{(black.timeSpentMs / 1000).toFixed(1)}s</span>
							) : (
								<span className="stats-pgn-row__time stats-pgn-row__time--placeholder" />
							)}
						</div>
					</div>
				))}
			</div>
			{resultStr ? <div className="stats-pgn-result">{resultStr}</div> : null}
		</div>
	)
}

function HistoryView() {
	return (
		<div>
			{mockStats.recentGames.map((g) => (
				<div key={g.id} className="stats-list-item">
					<span className={`stats-history-result stats-history-result--${g.result}`}>{g.result}</span>
					<span style={{ flex: 1 }}>{g.opponent}</span>
					<span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{g.date}</span>
				</div>
			))}
		</div>
	)
}

function FriendsView() {
	return (
		<div>
			{mockStats.friends.map((f) => (
				<div key={f.id} className="stats-list-item">
					<span className={`stats-online-dot ${f.online ? '' : 'stats-online-dot--offline'}`} />
					<span style={{ flex: 1 }}>{f.name}</span>
					<span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{f.elo} ELO</span>
				</div>
			))}
		</div>
	)
}

export default function GameStatsPanel({
	moveLog = [],
	winner,
	onPlayAgain,
	viewPlies = null,
	onViewPlies,
	onResign,
	onReplayFirst,
	onReplayPrev,
	onReplayNext,
	onReplayLast,
}) {
	const [activeTab, setActiveTab] = useState('moves')
	const [perfFilter, setPerfFilter] = useState('time')
	const [resignOpen, setResignOpen] = useState(false)
	const [drawInfoOpen, setDrawInfoOpen] = useState(false)

	useEffect(() => {
		if (!resignOpen && !drawInfoOpen) return
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setResignOpen(false)
				setDrawInfoOpen(false)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [resignOpen, drawInfoOpen])

	const gameEnded = Boolean(winner)
	const plyCount = moveLog.length
	const browsingHistory = viewPlies !== null
	const resignDisabled = gameEnded || browsingHistory
	const drawDisabled = gameEnded || browsingHistory
	const replayFirstDisabled = plyCount === 0 || viewPlies === 0
	const replayPrevDisabled = plyCount === 0 || (viewPlies !== null && viewPlies === 0)
	const replayNextDisabled = plyCount === 0 || viewPlies === null
	const replayLastDisabled = plyCount === 0 || (viewPlies !== null && viewPlies >= plyCount)

	const perfData = useMemo(() => buildPerfChartData(moveLog), [moveLog])
	const materialData = useMemo(() => buildMaterialChartData(moveLog), [moveLog])
	const pieceData = useMemo(() => buildPieceUsageData(moveLog), [moveLog])
	const result = getResultInfo(winner)

	const tabs = [
		{ id: 'moves', icon: 'ri-play-fill', label: 'Jouer' },
		{ id: 'newgame', icon: 'ri-restart-line', label: 'Nouvelle partie' },
		{ id: 'history', icon: 'ri-history-line', label: 'Parties' },
		{ id: 'friends', icon: 'ri-group-line', label: 'Amis' },
	]

	return (
		<div className="game-stats-panel">
			<div className="stats-nav">
				{tabs.map((t) => (
					<button
						key={t.id}
						type="button"
						className={`stats-nav-btn ${activeTab === t.id ? 'stats-nav-btn--active' : ''}`}
						onClick={() => {
							if (t.id === 'newgame' && typeof onPlayAgain === 'function') {
								onPlayAgain()
								return
							}
							setActiveTab(t.id)
						}}
					>
						<i className={t.icon} />
						{t.label}
					</button>
				))}
			</div>

			{activeTab === 'moves' && (
				<MoveListView
					moveLog={moveLog}
					viewPlies={viewPlies}
					onViewPlies={onViewPlies ?? (() => {})}
					winner={winner}
				/>
			)}

			{gameEnded && (
				<div className="stats-result-banner">
					<p className="stats-result-title">{result.title}</p>
					<p className="stats-result-sub">{result.subtitle}</p>
					{typeof onPlayAgain === 'function' && (
						<button type="button" className="stats-play-again" onClick={onPlayAgain}>
							Nouvelle partie
						</button>
					)}
				</div>
			)}

			{gameEnded && (
				<div className="stats-cards">
					<div className="stats-card">
						<span className="stats-card__label">Games Played</span>
						<span className="stats-card__value">
							{mockStats.gamesPlayed.toLocaleString()}
							<i className="ri-line-chart-line stats-card__icon" />
						</span>
					</div>
					<div className="stats-card">
						<span className="stats-card__label">Winrate</span>
						<span className="stats-card__value">{mockStats.winrate}%</span>
					</div>
					<div className="stats-card">
						<span className="stats-card__label">ELO Rating</span>
						<span className="stats-card__value">
							{mockStats.eloRating}
							<span
								className={`stats-card__change ${mockStats.eloChange < 0 ? 'stats-card__change--negative' : ''}`}
							>
								{mockStats.eloChange > 0 ? '+' : ''}
								{mockStats.eloChange}
							</span>
						</span>
					</div>
				</div>
			)}

			{activeTab === 'history' && <HistoryView />}
			{activeTab === 'friends' && <FriendsView />}

			{gameEnded && (
				<div className="stats-chart-section">
					<div className="stats-chart-header">
						<span className="stats-chart-title">Chess Performance Analytics</span>
						<div className="stats-chart-filters">
							<button
								type="button"
								className={`stats-filter-btn ${perfFilter === 'time' ? 'stats-filter-btn--active' : ''}`}
								onClick={() => setPerfFilter('time')}
							>
								Time / turn
							</button>
							<button
								type="button"
								className={`stats-filter-btn ${perfFilter === 'material' ? 'stats-filter-btn--active' : ''}`}
								onClick={() => setPerfFilter('material')}
							>
								Material advantage
							</button>
						</div>
					</div>
					<div className="stats-chart-body">
						<ResponsiveContainer width="100%" height={180}>
							{perfFilter === 'time' ? (
								<LineChart data={perfData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="turn" tick={{ fontSize: 10 }} label={{ value: 'Tour', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
									<YAxis tick={{ fontSize: 10 }} label={{ value: 's', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
									<Tooltip
										contentStyle={{
											background: '#1a2332',
											border: '1px solid rgba(255,255,255,0.1)',
											borderRadius: 6,
											fontSize: '0.7rem',
										}}
										labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
									/>
									<Legend wrapperStyle={{ fontSize: '0.65rem' }} />
									<Line type="monotone" dataKey="white" stroke="#f0d9b5" strokeWidth={2} dot={{ r: 2 }} name="White" connectNulls />
									<Line type="monotone" dataKey="black" stroke="#769656" strokeWidth={2} dot={{ r: 2 }} name="Black" connectNulls />
								</LineChart>
							) : (
								<LineChart data={materialData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="ply" tick={{ fontSize: 10 }} label={{ value: 'Coup (ply)', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
									<YAxis tick={{ fontSize: 10 }} label={{ value: 'Δ matériel (blancs)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
									<Tooltip
										contentStyle={{
											background: '#1a2332',
											border: '1px solid rgba(255,255,255,0.1)',
											borderRadius: 6,
											fontSize: '0.7rem',
										}}
										labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
									/>
									<Legend wrapperStyle={{ fontSize: '0.65rem' }} />
									<Line type="monotone" dataKey="material" stroke="#7dd3fc" strokeWidth={2} dot={{ r: 2 }} name="Avantage (pions)" />
								</LineChart>
							)}
						</ResponsiveContainer>
					</div>
				</div>
			)}

			{gameEnded && (
				<div className="stats-chart-section">
					<div className="stats-chart-header">
						<span className="stats-chart-title">Move Frequency Per Piece Type</span>
						<div className="stats-chart-filters">
							<button type="button" className="stats-filter-btn stats-filter-btn--active">
								% of total moves
							</button>
							<button type="button" className="stats-filter-btn" disabled>
								Raw count
							</button>
						</div>
					</div>
					<div className="stats-chart-body">
						<ResponsiveContainer width="100%" height={180}>
							<BarChart data={pieceData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="piece" tick={{ fontSize: 9 }} interval={0} angle={-12} textAnchor="end" height={48} />
								<YAxis tick={{ fontSize: 10 }} />
								<Tooltip
									contentStyle={{
										background: '#1a2332',
										border: '1px solid rgba(255,255,255,0.1)',
										borderRadius: 6,
										fontSize: '0.7rem',
									}}
									labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
								/>
								<Legend wrapperStyle={{ fontSize: '0.65rem' }} />
								<Bar dataKey="white" fill="#f0d9b5" name="White" radius={[2, 2, 0, 0]} />
								<Bar dataKey="black" fill="#769656" name="Black" radius={[2, 2, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			)}

			<div className="stats-control-bar">
				<button
					type="button"
					className={`stats-control-btn stats-control-btn--danger${resignDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={resignDisabled}
					title="Abandonner la partie"
					onClick={() => setResignOpen(true)}
				>
					<i className="ri-flag-line" aria-hidden />
				</button>
				<button
					type="button"
					className={`stats-control-btn${drawDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={drawDisabled}
					title="Proposer un match nul à l’adversaire"
					onClick={() => setDrawInfoOpen(true)}
				>
					<i className="ri-shake-hands-line" aria-hidden />
				</button>
				<span className="stats-control-spacer" />
				<button
					type="button"
					className={`stats-control-btn${replayFirstDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={replayFirstDisabled}
					title="Position de départ"
					onClick={() => onReplayFirst?.()}
				>
					<i className="ri-skip-back-mini-fill" />
				</button>
				<button
					type="button"
					className={`stats-control-btn${replayPrevDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={replayPrevDisabled}
					title="Coup précédent"
					onClick={() => onReplayPrev?.()}
				>
					<i className="ri-arrow-left-s-line" />
				</button>
				<button
					type="button"
					className={`stats-control-btn${replayNextDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={replayNextDisabled}
					title="Coup suivant"
					onClick={() => onReplayNext?.()}
				>
					<i className="ri-arrow-right-s-line" />
				</button>
				<button
					type="button"
					className={`stats-control-btn${replayLastDisabled ? '' : ' stats-control-btn--enabled'}`}
					disabled={replayLastDisabled}
					title="Dernier coup / partie en cours"
					onClick={() => onReplayLast?.()}
				>
					<i className="ri-skip-forward-mini-fill" />
				</button>
			</div>

			{resignOpen ? (
				<div
					className="stats-modal-backdrop"
					role="presentation"
					onClick={() => setResignOpen(false)}
				>
					<div
						className="stats-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="stats-resign-title"
						onClick={(e) => e.stopPropagation()}
					>
						<p id="stats-resign-title" className="stats-modal__title">
							Abandonner la partie ?
						</p>
						<p className="stats-modal__text">
							Les <strong>blancs</strong> perdent immédiatement. Cette action ne peut pas être annulée.
						</p>
						<div className="stats-modal__actions">
							<button type="button" className="stats-modal__btn stats-modal__btn--ghost" onClick={() => setResignOpen(false)}>
								Annuler
							</button>
							<button
								type="button"
								className="stats-modal__btn stats-modal__btn--danger"
								onClick={() => {
									setResignOpen(false)
									onResign?.()
								}}
							>
								Abandonner
							</button>
						</div>
					</div>
				</div>
			) : null}

			{drawInfoOpen ? (
				<div
					className="stats-modal-backdrop"
					role="presentation"
					onClick={() => setDrawInfoOpen(false)}
				>
					<div
						className="stats-modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="stats-draw-title"
						onClick={(e) => e.stopPropagation()}
					>
						<p id="stats-draw-title" className="stats-modal__title">
							Proposition de match nul
						</p>
						<p className="stats-modal__text">
							En multijoueur, cette action enverrait une demande de nul à l’adversaire, qui pourrait l’accepter ou la
							refuser.
						</p>
						<p className="stats-modal__text stats-modal__text--muted">
							Pour l’instant il n’y a pas de lien avec le backend : rien n’est envoyé et la partie continue.
						</p>
						<div className="stats-modal__actions">
							<button type="button" className="stats-modal__btn stats-modal__btn--primary" onClick={() => setDrawInfoOpen(false)}>
								Compris
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
}
