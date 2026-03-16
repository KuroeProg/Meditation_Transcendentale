import { useState, useRef, useEffect } from 'react'
import { Chess } from 'chess.js'

// const initialGame = new Chess();

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

	function Board({ game, setGame, winner, setWinner }) {
	const [selected, setSelected] = useState(null);
	const [possibleMoves, setPossibleMoves] = useState([]);
	const [kingFlash, setKingFlash] = useState(false);

	const [popupOpen, setPopupOpen] = useState(false);

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

	const kingSquare = game.inCheck() ? findKingSquare(game) : null;
	const position = game.board();

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
	}
	}, [popupOpen]);

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
				{position.map((row, rowIndex) =>
				row.map((piece, colIndex) => {	//creating 8x8 board w chess.js so double for loop
				const sq = toSquare(rowIndex, colIndex);
				const isSelected = selected === sq;
				const isPossibleMove = possibleMoves.includes(sq) && !piece; //add en-passant
				const isPossibleCapture = possibleMoves.includes(sq) && piece;
				const isKingInCheck = sq === kingSquare && kingFlash;

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
						<img
						src={`/imgs/pieces/${piece.color}${piece.type}.png`}
						className="piece"
						/>
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