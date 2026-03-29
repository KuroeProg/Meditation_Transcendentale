import { Chess } from 'chess.js'

const PIECE_LABELS = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
}

const PIECE_ORDER = ['p', 'n', 'b', 'r', 'q', 'k']
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function materialBalance(chess) {
  const board = chess.board()
  let w = 0
  let b = 0
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue
      const v = PIECE_VAL[cell.type] ?? 0
      if (cell.color === 'w') w += v
      else b += v
    }
  }
  return +(w - b).toFixed(2)
}

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

export function getResultInfo(winner) {
  if (!winner) return { title: 'Partie en cours', subtitle: '' }
  if (winner === 'Nulle') return { title: 'Draw!', subtitle: 'Equal position' }
  if (winner === 'Black-Resign') return { title: 'Abandon', subtitle: 'Victoire des noirs' }
  if (winner === 'White-Resign') return { title: 'Abandon', subtitle: 'Victoire des blancs' }
  if (winner === 'White-Timeout' || winner === 'Black-Timeout') {
    const color = winner === 'White-Timeout' ? 'White' : 'Black'
    return { title: 'Time is up!', subtitle: `${color} wins on time` }
  }
  return { title: 'Checkmate!', subtitle: `${winner} wins` }
}

export function resultShortNotation(winner) {
  if (!winner) return null
  if (winner === 'Nulle') return '½–½'
  if (winner === 'White' || winner === 'White-Timeout') return '1–0'
  if (winner === 'Black' || winner === 'Black-Timeout' || winner === 'Black-Resign') return '0–1'
  if (winner === 'White-Resign') return '1–0'
  return null
}

export function buildPerfChartData(moveLog) {
  const byTurn = []
  for (let i = 0; i < moveLog.length; i += 2) {
    const wMove = moveLog[i]
    const bMove = moveLog[i + 1]
    const turn = Math.floor(i / 2) + 1
    byTurn.push({
      turn,
      white: wMove ? +(wMove.timeSpentMs / 1000).toFixed(1) : null,
      black: bMove ? +(bMove.timeSpentMs / 1000).toFixed(1) : null,
    })
  }
  return byTurn
}

export function buildMaterialChartData(moveLog) {
  const chess = new Chess()
  const data = []
  for (let i = 0; i < moveLog.length; i++) {
    const m = moveLog[i]
    if (!m || !m.san) {
      break
    }
    try {
      const r = chess.move(m.san, { sloppy: false })
      if (!r) {
        break
      }
      data.push({
        ply: i + 1,
        material: materialBalance(chess),
      })
    } catch {
      break
    }
  }
  return data
}

export function buildMovePieceUsageData(moveLog) {
  const total = { w: 0, b: 0 }
  const counts = {}
  for (const p of PIECE_ORDER) {
    counts[p] = { w: 0, b: 0 }
  }
  for (const m of moveLog) {
    const c = m.color
    total[c]++
    if (counts[m.piece]) counts[m.piece][c]++
  }
  return PIECE_ORDER.map((p) => ({
    piece: PIECE_LABELS[p],
    white: total.w ? +((counts[p].w / total.w) * 100).toFixed(1) : 0,
    black: total.b ? +((counts[p].b / total.b) * 100).toFixed(1) : 0,
  }))
}
