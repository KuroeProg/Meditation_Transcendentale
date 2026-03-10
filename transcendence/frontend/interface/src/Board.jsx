import { useState } from 'react'
import { Chess } from 'chess.js'

// const initialGame = new Chess();

function toSquare(row, col) {
	const files = 'abcdefgh';
	const ranks = '87654321';
	return files[col] + ranks[row];
}

	function Board({ game, setGame}) {
	// const [game, setGame] = useState(initialGame);
	const [selected, setSelected] = useState(null);
	const [possibleMoves, setPossibleMoves] = useState([]);

	function handleClick(row, col) {
		const square = toSquare(row, col);

		//nothing clicked on ->
		if (selected === null) {
		const moves = game.moves({ square, verbose: true });
			if (moves.length > 0) {
				setSelected(square);
				setPossibleMoves(moves.map(m => m.to));
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
				}
				setSelected(null);
				setPossibleMoves([]);
			}
	}
}

	const position = game.board();

	return (
		<div id="board">
			{position.map((row, rowIndex) =>
			row.map((piece, colIndex) => {	//creating 8x8 board w chess.js so double for loop
			const sq = toSquare(rowIndex, colIndex);
			const isSelected = selected === sq;
			const isPossibleMove = possibleMoves.includes(sq) && !piece; //add en-passant
			const isPossibleCapture = possibleMoves.includes(sq) && piece;

			return (
				<div
					key={`${rowIndex}-${colIndex}`}
					className={`cell
					${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}
					${isSelected ? 'selected' : ''}
					${isPossibleMove ? 'possible-move' : ''}
					${isPossibleCapture ? 'possible-capture' : ''}`}

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
	);
	}

export default Board;