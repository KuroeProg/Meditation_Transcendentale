import { CATEGORY_META, TIME_CONTROLS } from '../constants/timeControls.js'

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

export function TimeControlSection({ category, controls, selected, onSelect }) {
	const meta = CATEGORY_META[category]
	return (
		<div className="dash-tc-section">
			<h3 className="dash-tc-category" style={{ '--cat-color': meta.color }}>
				<i className={meta.icon} /> {meta.label}
			</h3>
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
