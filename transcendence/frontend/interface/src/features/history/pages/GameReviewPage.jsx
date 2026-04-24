/**
 * GameReviewPage — lecteur pas à pas d'une partie terminée.
 *
 * Route : /game/review/:pk
 * API   : GET /api/game/history/<pk>  →  { positions[], moves[], advantage_curve[], ... }
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import Board from '../../chess/components/Board.jsx'
import { CapturedPiecesBar } from '../../chess/components/CapturedPieces.jsx'
import '../styles/GameReview.css'

const API_BASE = '/api/game'

async function fetchReplay(pk) {
	const res = await fetch(`${API_BASE}/history/${pk}`, { credentials: 'include' })
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	return res.json()
}

function formatMs(ms) {
	if (!ms) return '—'
	const s = Math.round(ms / 1000)
	return s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

function AdvantageBar({ curve = [], currentIdx }) {
	if (!curve.length) return null
	const max = Math.max(...curve.map(Math.abs), 1)
	return (
		<div className="gr-adv-bar" aria-label="Courbe d'avantage matériel" role="img">
			{curve.map((v, i) => {
				const pct = Math.min(Math.abs(v) / max, 1) * 100
				return (
					<div
						key={i}
						className={`gr-adv-col${i === currentIdx ? ' gr-adv-col--active' : ''}${v >= 0 ? ' gr-adv-col--white' : ' gr-adv-col--black'}`}
						style={{ height: `${Math.max(pct, 4)}%` }}
						title={`Coup ${i} : avantage ${v >= 0 ? 'Blancs' : 'Noirs'} (${Math.abs(v)})`}
					/>
				)
			})}
		</div>
	)
}

function MoveList({ moves, currentIdx, onSelect }) {
	const pairs = useMemo(() => {
		const out = []
		for (let i = 0; i < moves.length; i += 2) {
			out.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] })
		}
		return out
	}, [moves])

	return (
		<ol className="gr-movelist" aria-label="Liste des coups">
			{pairs.map(({ num, white, black }) => {
				const wiIdx = white ? white.move_number - 1 : -1
				const biIdx = black ? black.move_number - 1 : -1
				return (
					<li key={num} className="gr-movelist__pair">
						<span className="gr-movelist__num">{num}.</span>
						<button
							type="button"
							className={`gr-movelist__move gr-movelist__move--w${wiIdx === currentIdx ? ' gr-movelist__move--active' : ''}`}
							onClick={() => onSelect(wiIdx)}
						>
							{white?.uci ?? '—'}
						</button>
						{black && (
							<button
								type="button"
								className={`gr-movelist__move gr-movelist__move--b${biIdx === currentIdx ? ' gr-movelist__move--active' : ''}`}
								onClick={() => onSelect(biIdx)}
							>
								{black.uci}
							</button>
						)}
					</li>
				)
			})}
		</ol>
	)
}

export default function GameReviewPage() {
	const { pk } = useParams()
	const navigate = useNavigate()
	const [data, setData] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	// currentIdx: index into data.positions (0 = start, N = after last move)
	const [currentIdx, setCurrentIdx] = useState(0)
	const [playing, setPlaying] = useState(false)

	useEffect(() => {
		document.title = 'Transcendance — Relecture de partie'
		return () => { document.title = 'Transcendance' }
	}, [])

	useEffect(() => {
		setLoading(true)
		setError(null)
		fetchReplay(pk)
			.then((d) => { setData(d); setCurrentIdx(0) })
			.catch((e) => setError(e.message))
			.finally(() => setLoading(false))
	}, [pk])

	const positions = data?.positions ?? []
	const moves = data?.moves ?? []
	const curve = data?.advantage_curve ?? []
	const totalPositions = positions.length
	const maxIdx = Math.max(totalPositions - 1, 0)

	const currentFen = positions[currentIdx] ?? new Chess().fen()
	const currentGame = useMemo(() => {
		try { return new Chess(currentFen) } catch { return new Chess() }
	}, [currentFen])

	// Current move info (idx 0 = before any move)
	const currentMove = currentIdx > 0 ? moves[currentIdx - 1] : null

	const goTo = useCallback((idx) => {
		setCurrentIdx(Math.max(0, Math.min(idx, maxIdx)))
	}, [maxIdx])

	const goFirst = useCallback(() => { setPlaying(false); goTo(0) }, [goTo])
	const goPrev = useCallback(() => { setPlaying(false); goTo(currentIdx - 1) }, [goTo, currentIdx])
	const goNext = useCallback(() => goTo(currentIdx + 1), [goTo, currentIdx])
	const goLast = useCallback(() => { setPlaying(false); goTo(maxIdx) }, [goTo, maxIdx])

	// Auto-play
	useEffect(() => {
		if (!playing) return
		if (currentIdx >= maxIdx) { setPlaying(false); return }
		const t = setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, maxIdx)), 900)
		return () => clearTimeout(t)
	}, [playing, currentIdx, maxIdx])

	const togglePlay = useCallback(() => {
		if (currentIdx >= maxIdx) { setCurrentIdx(0); setPlaying(true); return }
		setPlaying((p) => !p)
	}, [currentIdx, maxIdx])

	if (loading) {
		return (
			<div className="gr-page gr-review chess-grid-pattern" data-testid="review-page">
				<div className="gr-loading" role="status">Chargement de la partie…</div>
			</div>
		)
	}

	if (error || !data) {
		return (
			<div className="gr-page gr-review chess-grid-pattern" data-testid="review-page">
				<div className="gr-error" role="alert">
					<i className="ri-error-warning-line" aria-hidden="true" />
					Impossible de charger cette partie. {error}
					<button type="button" className="gr-back-btn" onClick={() => navigate('/history')}>
						← Retour à l'historique
					</button>
				</div>
			</div>
		)
	}

	const whiteUser = data.player_white
	const blackUser = data.player_black
	const advValue = curve[currentIdx] ?? 0

	return (
		<div className="gr-page gr-review chess-grid-pattern" data-testid="review-page">
			{/* Header : bandeau lisible, centré comme le corps */}
			<header className="gr-header">
				<div className="gr-header-inner">
					<button type="button" className="gr-back-btn" onClick={() => navigate('/history')} aria-label="Retour à l'historique">
						<i className="ri-arrow-left-line" aria-hidden="true" /> Historique
					</button>
					<div className="gr-header-title">
						<h1 className="gr-title">Relecture de partie</h1>
						<p className="gr-subtitle">
							{whiteUser?.username ?? '?'} vs {blackUser?.username ?? '?'}
							{data.time_category && ` · ${data.time_category}`}
							{data.started_at && ` · ${new Date(data.started_at).toLocaleDateString('fr-FR')}`}
						</p>
					</div>
				</div>
			</header>

			<div className="gr-body">
				<div className="gr-board-col">
					<div className="gr-board-col__top">
						<div className="gr-player-bar" data-testid="review-player-top">
							<img className="gr-avatar" src={blackUser?.avatar} alt="" />
							<span className="gr-player-name">{blackUser?.username ?? '?'}</span>
							{blackUser?.elo && <span className="gr-elo">{blackUser.elo} ELO</span>}
						</div>
						<CapturedPiecesBar game={currentGame} playerColor="w" position="top" />
					</div>

					<div className="gr-board-slot">
						<div className="gr-board-frame" data-testid="review-board">
							<Board
								game={currentGame}
								winner={null}
								onMoveRequest={null}
								playerColor="w"
								isViewOnly
							/>
						</div>
					</div>

					<div className="gr-board-col__bottom">
						<CapturedPiecesBar game={currentGame} playerColor="w" position="bottom" />
						<div className="gr-player-bar" data-testid="review-player-bottom">
							<img className="gr-avatar" src={whiteUser?.avatar} alt="" />
							<span className="gr-player-name">{whiteUser?.username ?? '?'}</span>
							{whiteUser?.elo && <span className="gr-elo">{whiteUser.elo} ELO</span>}
						</div>
						<div className="gr-controls" role="group" aria-label="Contrôles de relecture" data-testid="review-controls">
							<button type="button" className="gr-ctrl-btn" onClick={goFirst} disabled={currentIdx === 0} aria-label="Premier coup" data-testid="review-btn-first">
								<i className="ri-skip-back-line" />
							</button>
							<button type="button" className="gr-ctrl-btn" onClick={goPrev} disabled={currentIdx === 0} aria-label="Coup précédent" data-testid="review-btn-prev">
								<i className="ri-arrow-left-s-line" />
							</button>
							<button type="button" className={`gr-ctrl-btn gr-ctrl-btn--play${playing ? ' gr-ctrl-btn--playing' : ''}`} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Lire'} data-testid="review-btn-play">
								<i className={playing ? 'ri-pause-line' : 'ri-play-line'} />
							</button>
							<button type="button" className="gr-ctrl-btn" onClick={goNext} disabled={currentIdx >= maxIdx} aria-label="Coup suivant" data-testid="review-btn-next">
								<i className="ri-arrow-right-s-line" />
							</button>
							<button type="button" className="gr-ctrl-btn" onClick={goLast} disabled={currentIdx >= maxIdx} aria-label="Dernier coup" data-testid="review-btn-last">
								<i className="ri-skip-forward-line" />
							</button>
							<span className="gr-progress" aria-live="polite" data-testid="review-progress">
								{currentIdx} / {maxIdx}
							</span>
						</div>
					</div>
				</div>

				{/* Side panel */}
				<aside className="gr-side" aria-label="Analyse">
					{/* Current move info */}
					<section className="gr-surface gr-current-move" aria-label="Coup courant">
						<h2 className="gr-section-title">
							<i className="ri-chess-line" aria-hidden="true" /> Coup {currentIdx}
							{currentMove && <span className="gr-move-uci">{currentMove.uci}</span>}
						</h2>
						{currentMove ? (
							<dl className="gr-move-meta">
								<div><dt>Couleur</dt><dd>{currentMove.color === 'white' ? 'Blancs' : 'Noirs'}</dd></div>
								<div><dt>Pièce</dt><dd>{currentMove.piece_played}</dd></div>
								<div><dt>Temps</dt><dd>{formatMs(currentMove.time_taken_ms)}</dd></div>
								<div>
									<dt>Avantage</dt>
									<dd className={`gr-adv-val${advValue >= 0 ? ' gr-adv-val--w' : ' gr-adv-val--b'}`}>
										{advValue >= 0 ? `+${advValue}` : advValue} ({advValue >= 0 ? 'Blancs' : 'Noirs'})
									</dd>
								</div>
							</dl>
						) : (
							<p className="gr-move-meta-empty">Position initiale</p>
						)}
					</section>

					{/* Advantage curve */}
					<section className="gr-surface" aria-label="Courbe d'avantage">
						<h2 className="gr-section-title">
							<i className="ri-line-chart-line" aria-hidden="true" /> Avantage Blancs / Noirs
						</h2>
						<AdvantageBar curve={curve} currentIdx={currentIdx} />
						<div className="gr-adv-legend">
							<span className="gr-adv-legend--w">Blancs ↑</span>
							<span className="gr-adv-legend--b">Noirs ↓</span>
						</div>
					</section>

					{/* Move list */}
					<section className="gr-surface gr-movelist-wrap" aria-label="Liste des coups">
						<h2 className="gr-section-title">
							<i className="ri-list-check" aria-hidden="true" /> Coups joués
						</h2>
						<MoveList
							moves={moves}
							currentIdx={currentIdx - 1}
							onSelect={(idx) => goTo(idx + 1)}
						/>
					</section>
				</aside>
			</div>
		</div>
	)
}
