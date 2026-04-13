import { CATEGORY_META, CATEGORY_RATING_FIELD, TIME_CONTROLS } from '../constants/timeControls.js'

export function TimeControlButton({ control, selected, onSelect }) {
	const isSelected = selected?.label === control.label
	return (
		<button
			className={`dash-tc-btn ${isSelected ? 'dash-tc-btn--selected' : ''}`}
			type="button"
			onClick={() => onSelect(control)}
		>
			{control.label}
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
					<i className={meta.icon} /> {meta.label}
				</h3>
				{isCompetitive && (
					<div className="dash-tc-category-elo" aria-label={`ELO ${meta.label}`}>
						<span className="dash-tc-category-elo-val">{ratingVal}</span>
						<span className="dash-tc-category-elo-lbl">ELO</span>
					</div>
				)}
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
