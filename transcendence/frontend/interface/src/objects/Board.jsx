import {
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
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

/** Case du pion capturé en prise en passant (coordonnées from/to SAN). */
function enPassantCapturedSquare(from, to) {
	return to[0] + from[1]
}

function checkEndGame(newGame, setWinner) {
	if (newGame.isCheckmate()) {
		setWinner(newGame.turn() === 'b' ? 'White' : 'Black')
	} else if (newGame.isStalemate()) {
		setWinner('Nulle')
	} else if (newGame.isInsufficientMaterial()) {
		setWinner('Nulle')
	} else if (newGame.isThreefoldRepetition()) {
		setWinner('Nulle')
	}
}

function pieceSuppressed(sq, anim) {
	if (!anim || anim.phase === 'done') return false
	if (sq === anim.from) return true
	if (anim.enPassantSq && sq === anim.enPassantSq) return true
	if (anim.captureOnTo && sq === anim.to) return true
	return false
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
	suppressPiece,
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

	const showPiece = pieceType && pieceColor && !suppressPiece

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
			{showPiece && (
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

/**
 * @typedef {{ from: string, to: string, promotion?: string }} RemoteMove
 */

function Board({
	game,
	setGame,
	winner,
	setWinner,
	tilePatternSeed,
	onMove,
	remoteMove = null,
	onRemoteMoveConsumed,
	viewFen = null,
}) {
	const { user } = useAuth()
	const tileCoalitionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)

	const [selected, setSelected] = useState(null)
	const [possibleMoves, setPossibleMoves] = useState([])
	const [kingFlash, setKingFlash] = useState(false)
	const [illegalFlashSq, setIllegalFlashSq] = useState(null)

	const illegalTimerRef = useRef(null)

	const winnerRef = useRef(null)
	useEffect(() => {
		winnerRef.current = winner
	}, [winner])

	const previewGame = useMemo(() => {
		if (!viewFen) return null
		try {
			return new Chess(viewFen)
		} catch {
			return null
		}
	}, [viewFen])

	const boardGame = previewGame ?? game
	const isViewOnly = previewGame != null

	const boardRootRef = useRef(null)
	const activeAnimRef = useRef(false)
	const animRef = useRef(null)
	const finishAnimLockRef = useRef(false)

	const [activeMoveAnim, setActiveMoveAnim] = useState(null)

	useEffect(() => {
		activeAnimRef.current = activeMoveAnim != null
		animRef.current = activeMoveAnim
	}, [activeMoveAnim])

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

	const onMoveRef = useRef(onMove)
	useEffect(() => { onMoveRef.current = onMove }, [onMove])

	const beginAnimatedMove = useCallback(
		({ from, to, fenAfter, movingPiece, themeSlug, captureOnTo, enPassantSq, san }) => {
			finishAnimLockRef.current = false
			setSelected(null)
			setPossibleMoves([])
			setActiveMoveAnim({
				key: Date.now(),
				from,
				to,
				fenAfter,
				moving: movingPiece,
				themeSlug,
				captureOnTo,
				enPassantSq,
				san,
				phase: 'measure',
			})
		},
		[],
	)

	useLayoutEffect(() => {
		const a = activeMoveAnim
		if (!a || a.phase !== 'measure') return
		const board = boardRootRef.current
		const elFrom = board?.querySelector(`[data-square="${a.from}"]`)
		const elTo = board?.querySelector(`[data-square="${a.to}"]`)
		if (!board || !elFrom || !elTo) {
			queueMicrotask(() => {
				const ng = new Chess(a.fenAfter)
				setGame(ng)
				onMoveRef.current?.({
					color: a.moving.color,
					piece: a.moving.type,
					from: a.from,
					to: a.to,
					san: a.san ?? '',
				})
				checkEndGame(ng, setWinner)
				setActiveMoveAnim(null)
			})
			return
		}
		const br = board.getBoundingClientRect()
		const rf = elFrom.getBoundingClientRect()
		const rt = elTo.getBoundingClientRect()
		const x0 = rf.left + rf.width / 2 - br.left
		const y0 = rf.top + rf.height / 2 - br.top
		const x1 = rt.left + rt.width / 2 - br.left
		const y1 = rt.top + rt.height / 2 - br.top
		const size = Math.min(rf.width, rf.height) * 0.88
		const dx = x1 - x0
		const dy = y1 - y0
		setActiveMoveAnim((prev) =>
			prev && prev.key === a.key ? { ...prev, phase: 'slide', x0, y0, dx, dy, size } : prev,
		)
	}, [activeMoveAnim, setGame, setWinner])

	useEffect(() => {
		const a = activeMoveAnim
		if (!a || a.phase !== 'slide') return
		let id2
		const id1 = requestAnimationFrame(() => {
			id2 = requestAnimationFrame(() => {
				setActiveMoveAnim((prev) =>
					prev && prev.key === a.key ? { ...prev, phase: 'sliding' } : prev,
				)
			})
		})
		return () => {
			cancelAnimationFrame(id1)
			if (id2) cancelAnimationFrame(id2)
		}
		// Dépendances volontairement réduites : éviter de relancer la phase slide à chaque update d’anim
		// eslint-disable-next-line react-hooks/exhaustive-deps -- activeMoveAnim?.key / phase suffisent
	}, [activeMoveAnim?.key, activeMoveAnim?.phase])

	const finishAnimatedMove = useCallback(() => {
		if (finishAnimLockRef.current) return
		const a = animRef.current
		if (!a) return
		finishAnimLockRef.current = true
		const ng = new Chess(a.fenAfter)
		setActiveMoveAnim(null)
		setGame(ng)
		onMoveRef.current?.({
			color: a.moving.color,
			piece: a.moving.type,
			from: a.from,
			to: a.to,
			san: a.san ?? '',
		})
		checkEndGame(ng, setWinner)
		queueMicrotask(() => {
			finishAnimLockRef.current = false
		})
	}, [setGame, setWinner])

	const onGhostTransitionEnd = useCallback(
		(e) => {
			if (e.target !== e.currentTarget) return
			if (e.propertyName !== 'transform') return
			finishAnimatedMove()
		},
		[finishAnimatedMove],
	)

	/** Coup reçu (WebSocket / API) : même animation que le coup local. */
	useEffect(() => {
		if (!remoteMove) return
		if (winnerRef.current || activeAnimRef.current) return

		const pieceBefore = game.get(remoteMove.from)
		if (!pieceBefore) return

		const g = new Chess(game.fen())
		const m = g.move({
			from: remoteMove.from,
			to: remoteMove.to,
			promotion: remoteMove.promotion ?? 'q',
		})
		if (!m) return

		onRemoteMoveConsumed?.()

		const hadCaptureOnTo = !!game.get(remoteMove.to)
		let enPassantSq = null
		if (typeof m.flags === 'string' && m.flags.includes('e')) {
			enPassantSq = enPassantCapturedSquare(m.from, m.to)
		}

		beginAnimatedMove({
			from: remoteMove.from,
			to: remoteMove.to,
			fenAfter: g.fen(),
			movingPiece: pieceBefore,
			themeSlug: getPieceThemeSlugForColor(pieceBefore.color, user),
			captureOnTo: hadCaptureOnTo,
			enPassantSq,
			san: m.san,
		})
	}, [remoteMove, game, user, beginAnimatedMove, onRemoteMoveConsumed])

	const runClickRef = useRef(() => {})

	useEffect(() => {
		if (isViewOnly) {
			setSelected(null)
			setPossibleMoves([])
		}
	}, [isViewOnly])

	useEffect(() => {
		runClickRef.current = (row, col) => {
			if (isViewOnly || winnerRef.current || activeAnimRef.current) return

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

					const movingPiece = game.get(selected)
					if (!movingPiece) return

					const g = new Chess(game.fen())
					const m = g.move({ from: selected, to: square, promotion: 'q' })
					if (!m) {
						setSelected(null)
						setPossibleMoves([])
						return
					}

					const hadCaptureOnTo = !!game.get(square)
					let enPassantSq = null
					if (typeof m.flags === 'string' && m.flags.includes('e')) {
						enPassantSq = enPassantCapturedSquare(m.from, m.to)
					}

					beginAnimatedMove({
						from: selected,
						to: square,
						fenAfter: g.fen(),
						movingPiece,
						themeSlug: getPieceThemeSlugForColor(movingPiece.color, user),
						captureOnTo: hadCaptureOnTo,
						enPassantSq,
						san: m.san,
					})
				}
			}
		}
	}, [
		game,
		selected,
		possibleMoves,
		flashKing,
		flashIllegalSquare,
		beginAnimatedMove,
		user,
		isViewOnly,
	])

	const handleBoardClick = useCallback((e) => {
		const el = e.target.closest?.('.cell[data-square]')
		if (!el || !(el instanceof HTMLElement)) return
		const sq = el.dataset.square
		if (!sq || sq.length < 2) return
		const { row, col } = squareToRowCol(sq)
		if (row < 0 || col < 0 || col > 7) return
		runClickRef.current(row, col)
	}, [])

	const kingCheckSquare = boardGame.inCheck() ? findKingSquare(boardGame) : null
	const position = boardGame.board()

	const useTiles = BOARD_TILES.active && themeHasTileAssets(tileCoalitionSlug)
	const tilePattern = useMemo(
		() => (useTiles ? buildTileUrlFlat(tileSeed, tileCoalitionSlug) : null),
		[useTiles, tileSeed, tileCoalitionSlug],
	)

	useEffect(() => {
		if (!winner) return
		queueMicrotask(() => {
			setSelected(null)
			setPossibleMoves([])
			setKingFlash(false)
			setIllegalFlashSq(null)
			if (illegalTimerRef.current) {
				clearTimeout(illegalTimerRef.current)
				illegalTimerRef.current = null
			}
		})
	}, [winner])

	useEffect(() => {
		return () => {
			if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current)
		}
	}, [])

	/** Si transform ne déclenche pas (dx=dy=0), appliquer le coup au bout du délai anim. */
	useEffect(() => {
		if (!activeMoveAnim || activeMoveAnim.phase !== 'sliding') return
		const t = window.setTimeout(() => {
			if (animRef.current?.phase === 'sliding') finishAnimatedMove()
		}, MOVE_ANIM_MS + 80)
		return () => window.clearTimeout(t)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- idem : pas tout activeMoveAnim
	}, [activeMoveAnim?.key, activeMoveAnim?.phase, finishAnimatedMove])

	const ghost =
		!isViewOnly &&
		activeMoveAnim &&
		(activeMoveAnim.phase === 'slide' || activeMoveAnim.phase === 'sliding') &&
		activeMoveAnim.size != null ? (
			<div
				className={`board-move-ghost ${activeMoveAnim.phase === 'sliding' ? 'board-move-ghost--sliding' : ''}`}
				style={{
					'--ghost-x0': `${activeMoveAnim.x0}px`,
					'--ghost-y0': `${activeMoveAnim.y0}px`,
					'--ghost-dx': `${activeMoveAnim.dx}px`,
					'--ghost-dy': `${activeMoveAnim.dy}px`,
					'--ghost-size': `${activeMoveAnim.size}px`,
					'--ghost-dur': `${MOVE_ANIM_MS}ms`,
				}}
				onTransitionEnd={onGhostTransitionEnd}
			>
				<ChessPieceImg
					theme={activeMoveAnim.themeSlug}
					pieceType={activeMoveAnim.moving.type}
					pieceColor={activeMoveAnim.moving.color}
					className="piece board-move-ghost__img"
				/>
			</div>
		) : null

	return (
		<div>
			<div className="board-root" ref={boardRootRef}>
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
							const suppressPiece = isViewOnly ? false : pieceSuppressed(sq, activeMoveAnim)

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
									suppressPiece={suppressPiece}
								/>
							)
						}),
					)}
				</div>
				{ghost}
			</div>
		</div>
	)
}

export default Board
