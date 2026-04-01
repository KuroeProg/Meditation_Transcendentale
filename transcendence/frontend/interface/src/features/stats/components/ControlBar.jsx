export function ControlBar({
  resignDisabled,
  drawDisabled,
  replayFirstDisabled,
  replayPrevDisabled,
  replayNextDisabled,
  replayLastDisabled,
  onOpenResign,
  onOpenDraw,
  onReplayFirst,
  onReplayPrev,
  onReplayNext,
  onReplayLast,
}) {
  return (
    <div className="stats-control-bar">
      <button
        type="button"
        className={`stats-control-btn stats-control-btn--danger${resignDisabled ? '' : ' stats-control-btn--enabled'}`}
        disabled={resignDisabled}
        title="Abandonner la partie"
        onClick={onOpenResign}
      >
        <i className="ri-flag-line" aria-hidden />
      </button>
      <button
        type="button"
        className={`stats-control-btn${drawDisabled ? '' : ' stats-control-btn--enabled'}`}
        disabled={drawDisabled}
        title="Proposer un match nul à l’adversaire"
        onClick={onOpenDraw}
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
  )
}
