
	const board = document.getElementById('board');
	const game = new Chess();
	let selected = null;
	let possibleMoves = [];


	function onCellClick(e) {
		const cell = e.currentTarget;
		const row = parseInt(cell.dataset.row);
		const col = parseInt(cell.dataset.col);
		const square = toSquare(row, col);

		if (selected === null) {
			const moves = game.moves({ square, verbose: true});
			if (moves.length > 0) {
				selected = square;
				possibleMoves = moves.map(m => m.to);
				renderBoard();

				highlightSelected(row, col);
			}
		}
		else if (selected === square)
		{
			selected = null;
			possibleMoves = [];
			clearHighlights()
		}
		else {
			const clickedPiece = game.get(square);
			if (clickedPiece && clickedPiece.color === game.turn()) {
				const moves = game.moves({ square, verbose: true});
				if (moves.length > 0) {
					selected = square;
					possibleMoves = moves.map(m => m.to);
					renderBoard();
					highlightSelected(row, col);
				}
				if (moves.length === 0) {
					selected = null;
					possibleMoves = [];
					clearHighlights()
				}
			}
			else {
			const move = game.move({ from: selected, to: square, promotion: 'q'});
			selected = null;
			possibleMoves = [];
			clearHighlights()
			if (move) renderBoard();
			}
		}
	}

	function highlightSelected(row, col) {
	const cells = document.querySelectorAll('.cell');
	cells.forEach(c => {
		if (parseInt(c.dataset.row) === row && parseInt(c.dataset.col) === col)
		c.classList.add('selected');
	});
	}



	function toSquare(row, col) {
		const files = 'abcdefgh';
		const ranks = '87654321';
		return files[col] + ranks[row];
	}

	function renderBoard() {
		board.innerHTML = '';

		const position = game.board();

		for (let row = 0; row < 8; row++) {
			for (let col = 0; col < 8; col++) {

				const cell = document.createElement('div');
				cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
				cell.dataset.row = row;
				cell.dataset.col = col;
				cell.addEventListener('click', (e) => onCellClick(e));

				const piece = position[row][col];
				if (piece) {
					const img = document.createElement('img');
					img.src = 'imgs/pieces/' + piece.color + piece.type + '.png';
					img.className = 'piece';
					cell.appendChild(img);
				}

				const sq = toSquare(row, col);
				if (possibleMoves.includes(sq)) {
					const target = position[row][col];
					if (target) {
						cell.classList.add('possible-capture');  //ad en -passant
					} else {
						cell.classList.add('possible-move');
					}
				}
			board.appendChild(cell);
			}
		}
	}
	renderBoard();



	function clearHighlights() {
	document.querySelectorAll('.cell').forEach(c => {
		c.classList.remove('selected', 'possible-move', 'possible-capture');
	});
	}