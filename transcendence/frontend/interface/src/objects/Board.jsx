import {
	useState,
	useRef,
	useEffect,
	useMemo,
	useCallback,
	memo,
} from 'react'
import { Chess } from 'chess.js'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { getPieceThemeSlugForColor } from '../dev/mockGameOpponent.js'
import { ChessPieceImg } from '../chess/ChessPiecePng.jsx'
import { BOARD_TILES, buildTileUrlFlat, themeHasTileAssets } from '../chess/boardTiles.js'
import { collectChessGamePreloadUrls, preloadChessImages } from '../chess/chessAssetPreload.js'

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

const BoardCell = memo(function BoardCell({
	sq,
	isLight,
	useTiles,
	tileCoalitionSlug,
	tileSrc,
	pieceType,
	pieceColor,
	pieceThemeSlug,
	isSelected,
	isPossibleMove,
	isPossibleCapture,
	isKingCheckCell,
	kingCheckAttn,
	isIllegalFlash,
}) {
	const className = [
		'cell',
		isLight ? 'light' : 'dark',
		useTiles ? 'board-tiles' : '',
		isSelected ? 'selected' : '',
		isPossibleMove ? 'possible-move' : '',
		isPossibleCapture ? 'possible-capture' : '',
		isKingCheckCell ? 'king-check' : '',
		kingCheckAttn ? 'king-check-attn' : '',
		isIllegalFlash ? 'illegal-move-flash' : '',
	]
		.filter(Boolean)
		.join(' ')

	return (
		<div data-square={sq} className={className}>
			{useTiles && tileSrc && (
				<span className="cell-tile-stack" aria-hidden>
					<img
						className="cell-tile"
						src={tileSrc}
						alt=""
						draggable={false}
						decoding="async"
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
					/>
				</div>
			)}
		</div>
	)
})

function Board({ game, setGame, winner, setWinner, tilePatternSeed }) {
	const { user } = useAuth()
	const tileCoalitionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)

	const [selected, setSelected] = useState(null)
	const [possibleMoves, setPossibleMoves] = useState([])
	const [kingFlash, setKingFlash] = useState(false)
	const [illegalFlashSq, setIllegalFlashSq] = useState(null)

	const [popupOpen, setPopupOpen] = useState(false)
	const illegalTimerRef = useRef(null)

	const winnerRef = useRef(null)
	useEffect(() => {
		winnerRef.current = winner
	}, [winner])

	const tileSeed = tilePatternSeed ?? BOARD_TILES.seed

	useEffect(() => {
		const urls = collectChessGamePreloadUrls(user, tileCoalitionSlug, tileSeed)
		let cancelled = false
		preloadChessImages(urls).then(() => {
			if (!cancelled && import.meta.env.DEV) {
				console.debug('[chess] assets préchargés:', urls.length)
			}
		})
		return () => {
			cancelled = true
		}
	}, [user, tileCoalitionSlug, tileSeed])

	/* Sync UI : fin de partie → popup (pattern déjà utilisé dans ce composant) */
	/* eslint-disable react-hooks/set-state-in-effect */
	useEffect(() => {
		if (winner) setPopupOpen(true)
	}, [winner])
	/* eslint-enable react-hooks/set-state-in-effect */

	const flashKing = useCallback(() => {
		setKingFlash(true)
		setTimeout(() => setKingFlash(false), 600)
	}, [])

	const flashIllegalSquare = useCallback((square) => {
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

	const runClickRef = useRef(() => {})

	useEffect(() => {
		runClickRef.current = (row, col) => {
			if (winnerRef.current) return

			const square = toSquare(row, col)

			if (selected === null) {
				const moves = game.moves({ square, verbose: true })
				if (moves.length > 0) {
					setSelected(square)
					setPossibleMoves(moves.map((m) => m.to))
				} else if (game.inCheck()) {
					flashKing()
				}
			} else if (selected === square) {
				setSelected(null)
				setPossibleMoves([])
			} else {
				const clickedPiece = game.get(square)
				if (clickedPiece && clickedPiece.color === game.turn()) {
					const moves = game.moves({ square, verbose: true })
					if (moves.length > 0) {
						setSelected(square)
						setPossibleMoves(moves.map((m) => m.to))
					} else {
						setSelected(null)
						setPossibleMoves([])
					}
				} else {
					if (!possibleMoves.includes(square)) {
						flashIllegalSquare(square)
						setSelected(null)
						setPossibleMoves([])
						return
					}

					const newGame = new Chess(game.fen())
					const move = newGame.move({ from: selected, to: square, promotion: 'q' })
					if (move) {
						setGame(newGame)
						if (newGame.isCheckmate()) {
							const gameWinner = newGame.turn() === 'b' ? 'White' : 'Black'
							setWinner(gameWinner)
						} else if (newGame.isStalemate()) {
							setWinner('Nulle')
						} else if (newGame.isInsufficientMaterial()) {
							setWinner('Nulle')
						} else if (newGame.isThreefoldRepetition()) {
							setWinner('Nulle')
						}
					}
					setSelected(null)
					setPossibleMoves([])
				}
			}
		}
	}, [game, selected, possibleMoves, setGame, setWinner, flashKing, flashIllegalSquare])

	const handleBoardClick = useCallback((e) => {
		const el = e.target.closest?.('.cell[data-square]')
		if (!el || !(el instanceof HTMLElement)) return
		const sq = el.dataset.square
		if (!sq || sq.length < 2) return
		const { row, col } = squareToRowCol(sq)
		if (row < 0 || col < 0 || col > 7) return
		runClickRef.current(row, col)
	}, [])

	const kingCheckSquare = game.inCheck() ? findKingSquare(game) : null
	const position = game.board()

	const useTiles = BOARD_TILES.active && themeHasTileAssets(tileCoalitionSlug)
	const tilePattern = useMemo(
		() => (useTiles ? buildTileUrlFlat(tileSeed, tileCoalitionSlug) : null),
		[useTiles, tileSeed, tileCoalitionSlug],
	)

	function getPopupContent(w) {
		if (w === 'Nulle') {
			return { title: 'Draw !', subtitle: 'Equal position' }
		}
		if (w === 'White-Timeout' || w === 'Black-Timeout') {
			const color = w === 'White-Timeout' ? 'White' : 'Black'
			return { title: 'Time is up !', subtitle: `${color} wins on time` }
		}
		return { title: 'Checkmate !', subtitle: `${w} wins` }
	}

	/* eslint-disable react-hooks/set-state-in-effect */
	useEffect(() => {
		if (popupOpen) {
			setSelected(null)
			setPossibleMoves([])
			setKingFlash(false)
			setIllegalFlashSq(null)
			if (illegalTimerRef.current) {
				clearTimeout(illegalTimerRef.current)
				illegalTimerRef.current = null
			}
		}
	}, [popupOpen])
	/* eslint-enable react-hooks/set-state-in-effect */

	useEffect(() => {
		return () => {
			if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current)
		}
	}, [])

	return (
		<div>
			{popupOpen && (
				<div className="popup-overlay">
					<div className="popup-checkmate">
						<button type="button" className="popup-close" onClick={() => setPopupOpen(false)}>
							✕
						</button>
						<p className="popup-title">{getPopupContent(winner).title}</p>
						<p className="popup-winner">{getPopupContent(winner).subtitle}</p>
					</div>
				</div>
			)}

			<div id="board" role="presentation" onClick={handleBoardClick}>
				{position.flatMap((row, rowIndex) =>
					row.map((piece, colIndex) => {
						const sq = toSquare(rowIndex, colIndex)
						const isLight = (rowIndex + colIndex) % 2 === 0
						const isSelected = selected === sq
						const isPossibleMove = possibleMoves.includes(sq) && !piece
						const isPossibleCapture = possibleMoves.includes(sq) && !!piece
						const isKingCheckCell = kingCheckSquare != null && sq === kingCheckSquare
						const isIllegalFlash = illegalFlashSq === sq
						const tileSrc = tilePattern ? tilePattern[rowIndex * 8 + colIndex] : null

						return (
							<BoardCell
								key={sq}
								sq={sq}
								isLight={isLight}
								useTiles={useTiles}
								tileCoalitionSlug={tileCoalitionSlug}
								tileSrc={tileSrc}
								pieceType={piece ? piece.type : null}
								pieceColor={piece ? piece.color : null}
								pieceThemeSlug={
									piece ? getPieceThemeSlugForColor(piece.color, user) : ''
								}
								isSelected={isSelected}
								isPossibleMove={isPossibleMove}
								isPossibleCapture={isPossibleCapture}
								isKingCheckCell={isKingCheckCell}
								kingCheckAttn={kingFlash && isKingCheckCell}
								isIllegalFlash={isIllegalFlash}
							/>
						)
					}),
				)}
			</div>
		</div>
	)
}

export default Board
