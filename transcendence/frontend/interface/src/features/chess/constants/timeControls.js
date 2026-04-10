/** Presets de cadence (secondes + incrément) — alignés matchmaking / partie. */

export const TIME_CONTROLS = {
	bullet: [
		{ label: '1 min', time: 60, increment: 0 },
		{ label: '1 | 1', time: 60, increment: 1 },
		{ label: '2 | 1', time: 120, increment: 1 },
	],
	blitz: [
		{ label: '3 min', time: 180, increment: 0 },
		{ label: '3 | 2', time: 180, increment: 2 },
		{ label: '5 min', time: 300, increment: 0 },
	],
	rapid: [
		{ label: '10 min', time: 600, increment: 0 },
		{ label: '15 | 10', time: 900, increment: 10 },
		{ label: '30 min', time: 1800, increment: 0 },
	],
	correspondence: [
		{ label: '1 jour', time: 86400, increment: 0 },
		{ label: '3 jours', time: 259200, increment: 0 },
		{ label: '7 jours', time: 604800, increment: 0 },
	],
}

export const CATEGORY_META = {
	bullet: { icon: 'ri-speed-up-line', label: 'Bullet', color: '#ff6b6b' },
	blitz: { icon: 'ri-flashlight-line', label: 'Blitz', color: '#ffd93d' },
	rapid: { icon: 'ri-timer-line', label: 'Rapide', color: '#6bcb77' },
	correspondence: { icon: 'ri-sun-line', label: 'Correspondance', color: '#4d96ff' },
}

export const CATEGORY_RATING_FIELD = {
	bullet: 'elo_bullet',
	blitz: 'elo_blitz',
	rapid: 'elo_rapid',
	correspondence: 'elo_rapid',
}
