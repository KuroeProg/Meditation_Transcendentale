import { useState, useRef, useEffect, useMemo, memo, useCallback, useLayoutEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { getPieceThemeSlugForColor } from '../dev/mockGameOpponent.js'
import { ChessPieceImg } from '../chess/ChessPiecePng.jsx'
import { BOARD_TILES, buildTileUrlFlat, themeHasTileAssets } from '../chess/boardTiles.js'
import { collectChessGamePreloadUrls, preloadChessImages } from '../chess/chessAssetPreload.js'
import {
unlockGameAudio,
playPieceMoveFromFlags,
playMoveCheck,
playUiErrorDeny,
} from '../audio/gameSfx.js'
import { tryPlayGameBgm } from '../audio/gameBgm.js'

const MOVE_ANIM_MS = 200

function toSquare(row, col) {
const files = 'abcdefgh'
const ranks = '87654321'
return files[col] + ranks[row]
}

function squareToRowCol(sq) {
const col = sq.charCodeAt(0) - 97
const row = '87654321'.indexOf(sq[1])
return { row, col }
}

function findKingSquare(game) {
const board = game.board()
for (let row = 0; row < 8; row++) {
for (let col = 0; col < 8; col++) {
const piece = board[row][col]
if (piece && piece.type === 'k' && piece.color === game.turn()) {
return toSquare(row, col)
}
}
}
return null
}

function enPassantCapturedSquare(from, to) {
return to[0] + from[1]
}

function buildUciMove(from, to, movingPiece) {
if (!from || !to) return null
if (!movingPiece) return `${from}${to}`

const destinationRank = to[1]
const isPromotion = movingPiece.type === 'p' && (destinationRank === '8' || destinationRank === '1')
return isPromotion ? `${from}${to}q` : `${from}${to}`
}

const BoardCell = memo(function BoardCell({
sq,
isLight,
useTiles,
tileCoalitionSlug,
tileSrc,
tileRotation,
pieceType,
pieceColor,
pieceThemeSlug,
isSelected,
isPossibleMove,
isPossibleCapture,
isKingCheckCell,
isIllegalFlash,
onClick,
pieceRotation,
}) {
const className = [
'cell',
isLight ? 'light' : 'dark',
useTiles ? 'board-tiles' : '',
isSelected ? 'selected' : '',
isPossibleMove ? 'possible-move' : '',
isPossibleCapture ? 'possible-capture' : '',
isKingCheckCell ? 'king-check king-check-attn' : '',
isIllegalFlash ? 'illegal-move-flash' : '',
]
.filter(Boolean)
.join(' ')

return (
<div data-square={sq} className={className} onClick={onClick}>
{useTiles && tileSrc && (
<span className="cell-tile-stack" aria-hidden>
<img
className="cell-tile"
src={tileSrc}
alt=""
draggable={false}
decoding="async"
style={{ transform: tileRotation }}
data-tile-theme={tileCoalitionSlug}
data-tile-shade={isLight ? 'light' : 'dark'}
/>
</span>
)}

{pieceType && pieceColor && (
<div className="piece-wrap">
<ChessPieceImg
theme={pieceThemeSlug}
pieceType={pieceType}
pieceColor={pieceColor}
className="piece"
style={{ transform: pieceRotation }}
/>
</div>
)}
</div>
)
})

function Board({ game, winner, onMoveRequest, playerColor, whiteCoalition, blackCoalition, moveFeedback }) {
const { user } = useAuth()
const tileCoalitionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)

const [selected, setSelected] = useState(null)
const [possibleMoves, setPossibleMoves] = useState([])
const [kingFlash, setKingFlash] = useState(false)
const [localFeedback, setLocalFeedback] = useState(null)
const [popupOpen, setPopupOpen] = useState(false)
const [illegalFlashSq, setIllegalFlashSq] = useState(null)

const winnerRef = useRef(null)
const illegalTimerRef = useRef(null)

const pieceRotation = playerColor === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'
const tileRotation = playerColor === 'b' ? 'rotate(180deg)' : 'rotate(0deg)'
const tileSeed = BOARD_TILES.seed

const whitePieceThemeSlug = whiteCoalition
? coalitionToSlug(whiteCoalition)
: getPieceThemeSlugForColor('w', user)
const blackPieceThemeSlug = blackCoalition
? coalitionToSlug(blackCoalition)
: getPieceThemeSlugForColor('b', user)

useEffect(() => {
if (winner) setPopupOpen(true)
}, [winner])

useEffect(() => {
winnerRef.current = winner
}, [winner])

useEffect(() => {
const urls = collectChessGamePreloadUrls(user, tileCoalitionSlug, tileSeed)
let cancelled = false

preloadChessImages(urls).then(() => {
if (!cancelled && import.meta.env.DEV) {
console.debug('[chess] assets preloaded:', urls.length)
}
})

return () => {
cancelled = true
}
}, [user, tileCoalitionSlug, tileSeed])

useEffect(() => {
return () => {
if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current)
}
}, [])

const flashKing = useCallback(() => {
setKingFlash(true)
setTimeout(() => setKingFlash(false), 600)
}, [])

const flashIllegalSquare = useCallback((square) => {
playUiErrorDeny()
if (illegalTimerRef.current) {
clearTimeout(illegalTimerRef.current)
illegalTimerRef.current = null
}
setIllegalFlashSq(square)
illegalTimerRef.current = setTimeout(() => {
setIllegalFlashSq(null)
illegalTimerRef.current = null
}, 480)
}, [])

const handleBoardClick = useCallback((e) => {
unlockGameAudio()
void tryPlayGameBgm()
const el = e.target.closest?.('.cell[data-square]')
if (!el || !(el instanceof HTMLElement)) return
const sq = el.dataset.square
if (!sq || sq.length < 2) return
const { row, col } = squareToRowCol(sq)
if (row < 0 || col < 0 || col > 7) return

if (winnerRef.current) return

const square = toSquare(row, col)
setLocalFeedback(null)

if (selected === null) {
const clickedPiece = game.get(square)
if (clickedPiece && playerColor && clickedPiece.color !== playerColor) {
playUiErrorDeny()
setLocalFeedback('Cette pièce ne vous appartient pas.')
return
}

const moves = game.moves({ square, verbose: true })
if (moves.length > 0) {
setSelected(square)
setPossibleMoves(moves.map((m) => m.to))
} else if (game.inCheck()) {
flashKing()
}
return
}

if (selected === square) {
setSelected(null)
setPossibleMoves([])
return
}

const clickedPiece = game.get(square)
if (clickedPiece && clickedPiece.color === game.turn()) {
if (playerColor && clickedPiece.color !== playerColor) {
playUiErrorDeny()
setLocalFeedback("Ce n'est pas votre couleur.")
setSelected(null)
setPossibleMoves([])
return
}

const moves = game.moves({ square, verbose: true })
if (moves.length > 0) {
setSelected(square)
setPossibleMoves(moves.map((m) => m.to))
} else {
setSelected(null)
setPossibleMoves([])
}
return
}

if (!possibleMoves.includes(square)) {
flashIllegalSquare(square)
setSelected(null)
setPossibleMoves([])
return
}

if (playerColor && game.turn() !== playerColor) {
playUiErrorDeny()
setLocalFeedback("Ce n'est pas votre tour.")
setSelected(null)
setPossibleMoves([])
return
}

const movingPiece = game.get(selected)
const moves = game.moves({ square: selected, verbose: true })
const move = moves.find((m) => m.to === square)

if (move) {
playPieceMoveFromFlags(move.flags ?? '')
if (!game.inCheck() && game.inCheck()) {
playMoveCheck()
}
}

const uciMove = buildUciMove(selected, square, movingPiece)
if (uciMove && typeof onMoveRequest === 'function') {
onMoveRequest({ move: uciMove })
}
setSelected(null)
setPossibleMoves([])
}, [game, selected, possibleMoves, playerColor, flashKing, flashIllegalSquare, onMoveRequest])

const kingSquare = game.inCheck() ? findKingSquare(game) : null
const position = game.board()
const useTiles = BOARD_TILES.active && themeHasTileAssets(tileCoalitionSlug)
const tilePattern = useMemo(
() => (useTiles ? buildTileUrlFlat(tileSeed, tileCoalitionSlug) : null),
[useTiles, tileSeed, tileCoalitionSlug],
)

function getPopupContent(currentWinner) {
if (currentWinner === 'Nulle') {
return {
title: 'Draw !',
subtitle: 'Equal position',
}
}
if (currentWinner === 'White-Timeout' || currentWinner === 'Black-Timeout') {
const color = currentWinner === 'White-Timeout' ? 'White' : 'Black'
return {
title: 'Time is up !',
subtitle: `${color} wins on time`,
}
}
return {
title: 'Checkmate !',
subtitle: `${currentWinner} wins`,
}
}

useEffect(() => {
if (!popupOpen) return

setSelected(null)
setPossibleMoves([])
setKingFlash(false)
setIllegalFlashSq(null)
if (illegalTimerRef.current) {
clearTimeout(illegalTimerRef.current)
illegalTimerRef.current = null
}
}, [popupOpen])

return (
<div>
{(localFeedback || moveFeedback) && <p className="popup-winner">{localFeedback || moveFeedback}</p>}

{popupOpen && (
<div className="popup-overlay">
<div className="popup-checkmate">
<button className="popup-close" onClick={() => setPopupOpen(false)}>
x
</button>
<p className="popup-title">{getPopupContent(winner).title}</p>
<p className="popup-winner">{getPopupContent(winner).subtitle}</p>
</div>
</div>
)}

<div
id="board"
role="presentation"
onClick={handleBoardClick}
style={{
transform: playerColor === 'b' ? 'rotate(180deg)' : 'rotate(0deg)',
}}
>
{position.map((row, rowIndex) =>
row.map((piece, colIndex) => {
const sq = toSquare(rowIndex, colIndex)
const isLight = (rowIndex + colIndex) % 2 === 0
const isSelected = selected === sq
const isPossibleMove = possibleMoves.includes(sq) && !piece
const isPossibleCapture = possibleMoves.includes(sq) && !!piece
const isKingInCheck = sq === kingSquare && kingFlash
const isIllegal = illegalFlashSq === sq
const tileSrc = tilePattern ? tilePattern[rowIndex * 8 + colIndex] : null

return (
<BoardCell
key={`${rowIndex}-${colIndex}`}
sq={sq}
isLight={isLight}
useTiles={useTiles}
tileCoalitionSlug={tileCoalitionSlug}
tileSrc={tileSrc}
tileRotation={tileRotation}
pieceType={piece ? piece.type : null}
pieceColor={piece ? piece.color : null}
pieceThemeSlug={
piece
? piece.color === 'w'
? whitePieceThemeSlug
: blackPieceThemeSlug
: ''
}
isSelected={isSelected}
isPossibleMove={isPossibleMove}
isPossibleCapture={isPossibleCapture}
isKingCheckCell={isKingInCheck}
isIllegalFlash={isIllegal}
onClick={() => handleBoardClick({target: {closest: () => document.querySelector(`[data-square="${sq}"]`)}})}
pieceRotation={pieceRotation}
/>
)
}),
)}
</div>
</div>
)
}

export default Board
