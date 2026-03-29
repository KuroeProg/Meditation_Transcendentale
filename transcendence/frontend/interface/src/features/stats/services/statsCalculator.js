export function buildPieceUsageRows(pieceUsage, pieceMode) {
  return pieceUsage.map((piece) => ({
    ...piece,
    barPlayer: pieceMode === 'percentage' ? piece.player : piece.playerRaw,
    barAll: pieceMode === 'percentage' ? piece.allPlayers : piece.allPlayersRaw,
  }))
}

export function buildStatsPageStyle(theme) {
  return {
    '--pstats-accent': theme.accent,
    '--pstats-accent-soft': theme.accentSoft,
    '--pstats-accent-border': theme.accentBorder,
    '--pstats-all-line': theme.allPlayersLine,
  }
}

export function calculateWinrate(wins, losses, draws = 0) {
  const total = Number(wins || 0) + Number(losses || 0) + Number(draws || 0)
  if (total <= 0) return 0
  return Math.round((Number(wins || 0) / total) * 100)
}
