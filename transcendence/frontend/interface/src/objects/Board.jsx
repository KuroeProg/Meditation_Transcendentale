import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { ChessPieceImg } from '../chess/ChessPiecePng.jsx'

function toSquare(row, col) {
	const files = 'abcdefgh'
	const ranks = '87654321'
	return files[col] + ranks[row]
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

function buildUciMove(from, to, movingPiece) {
	if (!from || !to) return null
	if (!movingPiece) return `${from}${to}`

	const destinationRank = to[1]
	const isPromotion = movingPiece.type === 'p' && (destinationRank === '8' || destinationRank === '1')
	return isPromotion ? `${from}${to}q` : `${from}${to}`
}

function Board({ game, winner, onMoveRequest, playerColor, moveFeedback }) {
	const { user } = useAuth()
	const coalitionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const pieceTheme = coalitionSlug

	const [selected, setSelected] = useState(null)
	const [possibleMoves, setPossibleMoves] = useState([])
	const [kingFlash, setKingFlash] = useState(false)
	const [localFeedback, setLocalFeedback] = useState(null)
	const [popupOpen, setPopupOpen] = useState(false)

	useEffect(() => {
		if (winner) setPopupOpen(true)
	}, [winner])

	const winnerRef = useRef(null)
	useEffect(() => {
		winnerRef.current = winner
	}, [winner])

	function flashKing() {
		setKingFlash(true)
		setTimeout(() => setKingFlash(false), 600)
	}

	function handleClick(row, col) {
		if (winnerRef.current) return

		const square = toSquare(row, col)
		setLocalFeedback(null)

		if (selected === null) {
			const clickedPiece = game.get(square)
			if (clickedPiece && playerColor && clickedPiece.color !== playerColor) {
				setLocalFeedback('Cette piece ne vous appartient pas.')
				return
			}

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
				if (playerColor && clickedPiece.color !== playerColor) {
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
			} else {
				if (!possibleMoves.includes(square)) {
					setSelected(null)
					setPossibleMoves([])
					return
				}

				if (playerColor && game.turn() !== playerColor) {
					setLocalFeedback("Ce n'est pas votre tour.")
					setSelected(null)
					setPossibleMoves([])
					return
				}

				const movingPiece = game.get(selected)
				const uciMove = buildUciMove(selected, square, movingPiece)
				if (uciMove && typeof onMoveRequest === 'function') {
					onMoveRequest({ move: uciMove })
				}
				setSelected(null)
				setPossibleMoves([])
			}
		}
	}

	const kingSquare = game.inCheck() ? findKingSquare(game) : null
	const position = game.board()

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
		if (popupOpen) {
			setSelected(null)
			setPossibleMoves([])
			setKingFlash(false)
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
				style={{ transform: playerColor === 'b' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
			>
				{position.map((row, rowIndex) =>
					row.map((piece, colIndex) => {
						const sq = toSquare(rowIndex, colIndex)
						const isSelected = selected === sq
						const isPossibleMove = possibleMoves.includes(sq) && !piece
						const isPossibleCapture = possibleMoves.includes(sq) && piece
						const isKingInCheck = sq === kingSquare && kingFlash

						return (
							<div
								key={`${rowIndex}-${colIndex}`}
								className={`cell
								${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}
								${isSelected ? 'selected' : ''}
								${isPossibleMove ? 'possible-move' : ''}
								${isPossibleCapture ? 'possible-capture' : ''}
								${isKingInCheck ? 'king-check' : ''}`}
								onClick={() => handleClick(rowIndex, colIndex)}
							>
								{piece && (
									<ChessPieceImg
										theme={pieceTheme}
										pieceType={piece.type}
										pieceColor={piece.color}
										rowIndex={rowIndex}
										colIndex={colIndex}
										className="piece"
										style={{ transform: playerColor === 'b' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
									/>
								)}
							</div>
						)
					}),
				)}
			</div>
		</div>
	)
}

export default Board
