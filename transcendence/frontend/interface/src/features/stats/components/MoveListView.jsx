import { useRef, useLayoutEffect } from 'react'
import { resultShortNotation } from '../services/statsCalculator.js'
import { GameMusicPanel } from '../../audio/components/GameAudio.jsx'

export function MoveListView({
	moveLog,
	viewPlies,
	onViewPlies,
	winner,
	/** @type {string} coalition du joueur courant (thème ghv) */
	coalitionSlug = null,
	whiteLabel = 'Joueur blancs',
	blackLabel = 'Joueur noirs',
}) {
  const listScrollRef = useRef(null)
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
    const el = listScrollRef.current
    if (!el) return
    /* Ne pas utiliser scrollIntoView : sur mobile il remonte toute la page quand le panneau est sous l’échiquier. */
    el.scrollTop = el.scrollHeight
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
  const resultStr = resultShortNotation(winner)
	const gMod = coalitionSlug ? ` ghv-header--${coalitionSlug}` : ''
	const moveHeader = (
		<header
			className={`ghv-header gsp-moves-ghv${gMod}`}
			data-testid="ingame-moves-ghv-header"
		>
			<div className="ghv-header-inner">
				<div className="ghv-header-lead">
					<h2 className="ghv-title">
						<i className="ri-file-list-3-line" aria-hidden="true" />
						Coups
					</h2>
					<p className="ghv-header-subtitle">
						Blancs : {whiteLabel} · Noirs : {blackLabel}
					</p>
				</div>
				<div className="ghv-header-actions">
					{viewPlies != null ? (
						<button
							type="button"
							className="stats-moves-pgn__live"
							onClick={() => onViewPlies(null)}
						>
							Partie en cours
						</button>
					) : null}
					<GameMusicPanel />
				</div>
			</div>
		</header>
	)

  if (!moveLog.length) {
    return (
      <div className="stats-moves-block stats-moves-block--pgn">
        {moveHeader}
        <p className="stats-empty-moves">Aucun coup pour l’instant.</p>
      </div>
    )
  }

  return (
    <div className="stats-moves-block stats-moves-block--pgn">
			{moveHeader}
      <div
        ref={listScrollRef}
        className="stats-move-list stats-move-list--pgn"
        role="list"
      >
        {rows.map(({ num, white, black, wIdx, bIdx }) => (
          <div
            key={num}
            role="listitem"
            className={`stats-pgn-row stats-pgn-row--${num % 2 === 1 ? 'odd' : 'even'}`}
          >
            <span className="stats-pgn-row__num">{num}.</span>
            <div className="stats-pgn-row__moves">
              <button
                type="button"
                className={`stats-pgn-san-btn stats-pgn-san-btn--w${selectedHalfIdx === wIdx ? ' stats-pgn-san-btn--selected' : ''}`}
                aria-pressed={selectedHalfIdx === wIdx}
                aria-label={`Blancs ${white.san}, ${(white.timeSpentMs / 1000).toFixed(1)} secondes — afficher la position`}
                onClick={() => onViewPlies(wIdx + 1)}
              >
                {white.san}
              </button>
              {black ? (
                <button
                  type="button"
                  className={`stats-pgn-san-btn stats-pgn-san-btn--b${selectedHalfIdx === bIdx ? ' stats-pgn-san-btn--selected' : ''}`}
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
