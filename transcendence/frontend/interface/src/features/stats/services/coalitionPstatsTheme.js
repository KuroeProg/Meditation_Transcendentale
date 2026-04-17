/** Couleurs accent pour la page Statistiques (alignées sur data-coalition). */

export const COALITION_PSTATS_THEME = {
	feu: {
		accent: '#fb923c',
		accentSoft: 'rgba(251, 146, 60, 0.22)',
		accentBorder: 'rgba(251, 146, 60, 0.45)',
		draw: '#fde047',
		allPlayersLine: 'rgba(255, 255, 255, 0.42)',
		donutTrack: 'rgba(255, 255, 255, 0.1)',
	},
	eau: {
		accent: '#38bdf8',
		accentSoft: 'rgba(56, 189, 248, 0.2)',
		accentBorder: 'rgba(56, 189, 248, 0.45)',
		draw: '#7dd3fc',
		allPlayersLine: 'rgba(186, 230, 253, 0.45)',
		donutTrack: 'rgba(255, 255, 255, 0.1)',
	},
	terre: {
		accent: '#a3e635',
		accentSoft: 'rgba(163, 230, 53, 0.2)',
		accentBorder: 'rgba(163, 230, 53, 0.45)',
		draw: '#fef08a',
		allPlayersLine: 'rgba(217, 249, 157, 0.4)',
		donutTrack: 'rgba(255, 255, 255, 0.1)',
	},
	air: {
		accent: '#c4b5fd',
		accentSoft: 'rgba(196, 181, 253, 0.22)',
		accentBorder: 'rgba(196, 181, 253, 0.45)',
		draw: '#ddd6fe',
		allPlayersLine: 'rgba(237, 233, 254, 0.45)',
		donutTrack: 'rgba(255, 255, 255, 0.1)',
	},
}

export function getPstatsTheme(slug) {
	return COALITION_PSTATS_THEME[slug] ?? COALITION_PSTATS_THEME.feu
}
