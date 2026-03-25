import { useState, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Chess } from 'chess.js'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'
import { ChessPieceImg } from '../chess/ChessPiecePng.jsx'
import { BOARD_TILES, buildTileUrlFlat, themeHasTileAssets } from '../chess/boardTiles.js'

function toSquare(row, col) {
	const files = 'abcdefgh';
	const ranks = '87654321';
	return files[col] + ranks[row];
}

function findKingSquare(game) {
	const board = game.board();
	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
		const piece = board[row][col];
		if (piece && piece.type === 'k' && piece.color === game.turn()) {
			return toSquare(row, col);
		}
		}
	}
	return null;
}

	function Board({ game, setGame, winner, setWinner, tilePatternSeed }) {
	const { user } = useAuth()
	const coalitionSlug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const pieceTheme = coalitionSlug

	const [selected, setSelected] = useState(null);
	const [possibleMoves, setPossibleMoves] = useState([]);
	const [kingFlash, setKingFlash] = useState(false);
	const [illegalFlashSq, setIllegalFlashSq] = useState(null);

	const [popupOpen, setPopupOpen] = useState(false);
	const illegalTimerRef = useRef(null);

	useEffect(() => {
		if (winner) setPopupOpen(true)
	}, [winner])

	const winnerRef = useRef (null);
	useEffect(() => {
		winnerRef.current = winner;
	}, [winner]);


	function flashKing() {
		setKingFlash(true);
		setTimeout(() => setKingFlash(false), 600);
	}

	function flashIllegalSquare(square) {
		if (illegalTimerRef.current) {
			clearTimeout(illegalTimerRef.current)
			illegalTimerRef.current = null
		}
		setIllegalFlashSq(square)
		illegalTimerRef.current = setTimeout(() => {
			setIllegalFlashSq(null)
			illegalTimerRef.current = null
		}, 480)
	}

	function handleClick(row, col) {

		console.log('winnerRef:', winnerRef.current, 'winner:', winner)
		if (winnerRef.current) return;

		const square = toSquare(row, col);

		//nothing clicked on ->
		if (selected === null) {
		const moves = game.moves({ square, verbose: true });
			if (moves.length > 0) {
				setSelected(square);
				setPossibleMoves(moves.map(m => m.to));
			} else if (game.inCheck()) {
				flashKing();
			}
		}
		//if this square already selected, unselect it
		else if (selected === square) {
			setSelected(null);
			setPossibleMoves([]);
		}
		else {
			const clickedPiece = game.get(square);
			//if piece of great color
			if (clickedPiece && clickedPiece.color === game.turn()) {
				const moves = game.moves({ square, verbose: true });
				//if can moove
				if (moves.length > 0) {
					setSelected(square);
					setPossibleMoves(moves.map(m => m.to));
				}
				//if can t moove reset
				else if (moves.length === 0) {
					setSelected(null);
					setPossibleMoves([]);
				}
			}
			//try to moove the selected piece
			else {

				if (!possibleMoves.includes(square)) {
					flashIllegalSquare(square)
					setSelected(null);
					setPossibleMoves([]);
					return ;
				}

				const newGame = new Chess(game.fen());
				const move = newGame.move({ from: selected, to: square, promotion: 'q' });
				if (move) {
					setGame(newGame);
					if (newGame.isCheckmate()) {
						const gameWinner = newGame.turn() ==='b' ? 'White' : 'Black';
						setWinner(gameWinner);
					} else if (newGame.isStalemate()) {
						setWinner('Nulle');
					} else if (newGame.isInsufficientMaterial()) {
						setWinner('Nulle');
					} else if (newGame.isThreefoldRepetition()) {
						setWinner('Nulle');
					}
				}
				setSelected(null);
				setPossibleMoves([]);
			}
	}
}

	const kingCheckSquare = game.inCheck() ? findKingSquare(game) : null;
	const position = game.board();

	const useTiles = BOARD_TILES.active && themeHasTileAssets(coalitionSlug)
	const tileSeed = tilePatternSeed ?? BOARD_TILES.seed
	const tilePattern = useMemo(
		() => (useTiles ? buildTileUrlFlat(tileSeed, coalitionSlug) : null),
		[useTiles, tileSeed, coalitionSlug]
	)

function getPopupContent(winner) {
	if (winner === 'Nulle') {
		return {
			title: 'Draw !',
			subtitle: 'Equal position'
		}
	}
	else if (winner === 'White-Timeout' || winner === 'Black-Timeout') {
		const color = winner === 'White-Timeout' ? 'White' : 'Black';
		return {
			title: 'Time is up !',
			subtitle: `${color} wins on time`
		}
	}
	return {
		title: 'Checkmate !',
		subtitle: `${winner} wins`
	}
}

	useEffect(() => {
	if (popupOpen) {
		setSelected(null);
		setPossibleMoves([]);
		setKingFlash(false);
		setIllegalFlashSq(null);
		if (illegalTimerRef.current) {
			clearTimeout(illegalTimerRef.current)
			illegalTimerRef.current = null
		}
	}
	}, [popupOpen]);

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
			<button className="popup-close" onClick={() => setPopupOpen(false)}>✕</button>  {} //gerer correctement les fin de parties, removes class de css.
			<p className="popup-title">{getPopupContent(winner).title}</p>
			<p className="popup-winner">{getPopupContent(winner).subtitle}</p>
		</div>

		</div>
		)}

			<div id="board">
				{position.flatMap((row, rowIndex) =>
					row.map((piece, colIndex) => {
						const sq = toSquare(rowIndex, colIndex);
						const isLight = (rowIndex + colIndex) % 2 === 0
						const isSelected = selected === sq;
						const isPossibleMove = possibleMoves.includes(sq) && !piece;
						const isPossibleCapture = possibleMoves.includes(sq) && piece;
						const isKingCheckCell = kingCheckSquare != null && sq === kingCheckSquare
						const isIllegalFlash = illegalFlashSq === sq
						const tileSrc = tilePattern ? tilePattern[rowIndex * 8 + colIndex] : null

						return (
							<div
								key={sq}
								data-square={sq}
								className={`cell
								${isLight ? 'light' : 'dark'}
								${useTiles ? 'board-tiles' : ''}
								${isSelected ? 'selected' : ''}
								${isPossibleMove ? 'possible-move' : ''}
								${isPossibleCapture ? 'possible-capture' : ''}
								${isKingCheckCell ? 'king-check' : ''}
								${kingFlash && isKingCheckCell ? 'king-check-attn' : ''}
								${isIllegalFlash ? 'illegal-move-flash' : ''}`}
								onClick={() => handleClick(rowIndex, colIndex)}
							>
								{useTiles && tileSrc && (
									<span className="cell-tile-stack" aria-hidden>
										<img
											className="cell-tile"
											src={tileSrc}
											alt=""
											draggable={false}
											data-tile-theme={coalitionSlug}
											data-tile-shade={isLight ? 'light' : 'dark'}
										/>
									</span>
								)}
								{piece && (
									<motion.div
										className="piece-wrap"
										key={`${sq}-${piece.color}-${piece.type}`}
										initial={{ scale: 0.9, opacity: 0.55 }}
										animate={{ scale: 1, opacity: 1 }}
										transition={{
											type: 'spring',
											stiffness: 420,
											damping: 28,
											mass: 0.82,
										}}
									>
										<ChessPieceImg
											theme={pieceTheme}
											pieceType={piece.type}
											pieceColor={piece.color}
											className="piece"
										/>
									</motion.div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
		);
	}

export default Board;