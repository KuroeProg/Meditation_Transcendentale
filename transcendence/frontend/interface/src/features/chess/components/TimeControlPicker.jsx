import { CATEGORY_META, CATEGORY_RATING_FIELD, TIME_CONTROLS } from '../constants/timeControls.js'

export function TimeControlButton({ control, selected, onSelect }) {
	const isSelected = selected?.label === control.label
	const isComingSoon = control?.comingSoon === true
	return (
		<button
			className={`dash-tc-btn ${isSelected ? 'dash-tc-btn--selected' : ''} ${isComingSoon ? 'dash-tc-btn--soon' : ''}`}
			type="button"
			onClick={() => { if (!isComingSoon) onSelect(control) }}
			disabled={isComingSoon}
		>
			{control.label}
			{isComingSoon ? <span className="dash-soon-badge">Bientôt</span> : null}
		</button>
	)
}

export function TimeControlSection({ category, controls, selected, onSelect, isCompetitive, user }) {
	const meta = CATEGORY_META[category]
	const ratingField = CATEGORY_RATING_FIELD[category] || 'elo_rapid'
	const ratingVal = user?.[ratingField] ?? user?.elo_rapid ?? 1200
	return (
		<div className="dash-tc-section">
			<div className="dash-tc-category-row">
				<h3 className="dash-tc-category" style={{ '--cat-color': meta.color }}>
					<i className={meta.icon} aria-hidden />
					<span className="dash-tc-category-name">{meta.label}</span>
					{isCompetitive && (
						<span
							className="dash-tc-category-elo"
							aria-label={`ELO ${ratingVal} — ${meta.label}`}
							title={`ELO ${meta.label}`}
						>
							({ratingVal})
						</span>
					)}
				</h3>
			</div>
			<div className="dash-tc-grid">
				{controls.map((c) => (
					<TimeControlButton key={c.label} control={c} selected={selected} onSelect={onSelect} />
				))}
			</div>
		</div>
	)
}

export function defaultSelectedControl() {
	return TIME_CONTROLS.rapid[0]
}
