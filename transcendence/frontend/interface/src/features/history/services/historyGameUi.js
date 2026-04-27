/** Formate une durée en secondes (API) en chaîne type « 5:34 » pour l’UI in-game / historique. */
function formatDurationFromSeconds(sec) {
	if (sec == null || Number.isNaN(Number(sec))) return '—'
	const s = Math.floor(Number(sec))
	const m = Math.floor(s / 60)
	const r = s % 60
	return `${m}:${String(r).padStart(2, '0')}`
}

/**
 * Complète les champs attendus par l’UI (page Historique, panneau « Parties » in-game)
 * à partir d’un objet partie renvoyé par GET /api/game/history.
 */
export function enrichGameForUi(g) {
	const date = g.date ?? null
	const relativeDate =
		g.relativeDate ??
		(date
			? new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(
					Math.round((new Date(date) - Date.now()) / 86400000),
					'day',
				)
			: '—')
	const fmt = g.format ?? 'rapid'
	const duration =
		typeof g.duration === 'string'
			? g.duration
			: formatDurationFromSeconds(g.duration_seconds ?? g.duration)
	return {
		...g,
		id: typeof g.id === 'string' && g.id.startsWith('game-') ? g.id.replace(/^game-/, '') : g.id,
		result: g.result ?? 'draw',
		score: g.score ?? '½-½',
		format: fmt,
		formatLabel: g.formatLabel ?? (fmt.charAt(0).toUpperCase() + fmt.slice(1)),
		date: date ?? new Date().toISOString(),
		relativeDate,
		duration,
		opponent: {
			username: g.opponent?.username ?? 'Inconnu',
			coalition: g.opponent?.coalition ?? null,
			elo: g.opponent?.elo ?? null,
			isBot: g.opponent?.isBot ?? false,
		},
		moveCount: g.moveCount ?? 0,
		competitive: g.competitive ?? false,
		player: {
			username: g.player?.username ?? '',
			coalition: g.player?.coalition ?? null,
			eloAfter: g.player?.eloAfter ?? null,
			eloChange: g.player?.eloChange ?? 0,
		},
		accuracy: g.accuracy ?? null,
		evalTrend: g.advantage_curve ?? g.evalTrend ?? [],
		pgn: g.pgn ?? '',
		shortPgn: g.shortPgn ?? g.pgn?.slice(0, 50) ?? '',
		capturedByMe: g.capturedByMe ?? {},
		capturedByOpponent: g.capturedByOpponent ?? {},
		analysisStatus: g.analysisStatus ?? 'pending',
		blunders: g.blunders ?? 0,
		missedWins: g.missedWins ?? 0,
		gameMode: g.gameMode ?? 'standard',
	}
}
