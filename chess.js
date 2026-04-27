const board = document.getElementById('board');
const status = document.getElementById('status');
const turnIndicator = document.getElementById('turnIndicator');
const capturedWhite = document.getElementById('capturedWhite');
const capturedBlack = document.getElementById('capturedBlack');

const pieces = {
    r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
    R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚', P: '♟'
};

function getPieceStyle(piece) {
    if (!piece) return '';
    const isWhite = piece === piece.toUpperCase();
    return isWhite ? 'color: #fff; text-shadow: 1px 1px 2px #000, -1px -1px 2px #000;' : 'color: #222; text-shadow: 1px 1px 2px #fff;';
}

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let boardState = [];
let selectedSquare = null;
let currentPlayer = 'white';
let moveList = [];
let capturedPieces = { white: [], black: [] };
let score = { wins: 0, losses: 0 };
let isGameOver = false;
let lastMove = null;

function initBoard() {
    boardState = initialBoard.map(row => [...row]);
    currentPlayer = 'white';
    selectedSquare = null;
    moveList = [];
    capturedPieces = { white: [], black: [] };
    isGameOver = false;
    lastMove = null;
    renderBoard();
    updateStatus('המשחק התחיל! אתה משחק לבן.');
    turnIndicator.textContent = 'תור: לבן ♔';
    turnIndicator.className = 'turn-indicator white';
    capturedWhite.innerHTML = '';
    capturedBlack.innerHTML = '';
}

function renderBoard() {
    board.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = boardState[row][col];
            if (piece) {
                square.innerHTML = `<span class="piece" style="color:${piece === piece.toUpperCase() ? '#fff' : '#222'};text-shadow:${piece === piece.toUpperCase() ? '1px 1px 3px #000, -1px -1px 3px #000' : '1px 1px 3px #fff'}">${pieces[piece]}</span>`;
            }

            if (lastMove && ((lastMove.from.row === row && lastMove.from.col === col) ||
                (lastMove.to.row === row && lastMove.to.col === col))) {
                square.style.background = 'rgba(255,255,0,0.4)';
            }

            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }

            if (isInCheck() && getKingPos(currentPlayer) === `${row},${col}`) {
                square.classList.add('check');
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            board.appendChild(square);
        }
    }
    showPossibleMoves();
}

function showPossibleMoves() {
    if (!selectedSquare) return;
    const moves = getLegalMoves(selectedSquare.row, selectedSquare.col);
    const squares = document.querySelectorAll('.square');
    moves.forEach(move => {
        const index = move.row * 8 + move.col;
        const square = squares[index];
        square.classList.add('possible-move');
        if (boardState[move.row][move.col]) {
            square.classList.add('possible-capture');
        }
    });
}

function getPieceColor(piece) {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function handleSquareClick(row, col) {
    if (isGameOver || currentPlayer !== 'white') return;

    const clickedPiece = boardState[row][col];

    if (selectedSquare) {
        const moves = getLegalMoves(selectedSquare.row, selectedSquare.col);
        const isValidMove = moves.some(m => m.row === row && m.col === col);

        if (isValidMove) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            selectedSquare = null;
            renderBoard();
            currentPlayer = 'black';
            turnIndicator.textContent = 'תור: שחור ♚';
            turnIndicator.className = 'turn-indicator black';

            if (!isGameOver) {
                setTimeout(computerMove, 500);
            }
            return;
        }
    }

    if (clickedPiece && getPieceColor(clickedPiece) === 'white') {
        selectedSquare = { row, col };
        renderBoard();
    } else {
        selectedSquare = null;
        renderBoard();
    }
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = boardState[fromRow][fromCol];
    const captured = boardState[toRow][toCol];

    if (captured) {
        const color = getPieceColor(captured);
        capturedPieces[color].push(captured);
        updateCapturedDisplay();
    }

    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = '';

    if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
        boardState[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
    }

    moveList.push({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, piece, captured });
    lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };

    if (isCheckmate()) {
        isGameOver = true;
        updateStatus(`♔ שחמט! ${currentPlayer === 'white' ? 'ניצחת!' : 'הפסדת!'}`);
        if (currentPlayer === 'white') score.wins++;
        else score.losses++;
        updateScore();
    } else if (isInCheck()) {
        updateStatus(`שח! ${currentPlayer === 'white' ? 'שח לך!' : 'שח למחשב!'}`);
    }
}

function updateCapturedDisplay() {
    capturedWhite.innerHTML = capturedPieces.white.map(p =>
        `<span style="${getPieceStyle(p)}">${pieces[p]}</span>`
    ).join('');
    capturedBlack.innerHTML = capturedPieces.black.map(p =>
        `<span style="${getPieceStyle(p)}">${pieces[p]}</span>`
    ).join('');
}

function updateStatus(message) {
    status.textContent = message;
    status.style.animation = 'none';
    status.offsetHeight;
    status.style.animation = 'fadeIn 0.5s ease';
}

function updateScore() {
    document.getElementById('score').textContent = `נצ: ${score.wins} | הפס: ${score.losses}`;
}

function getKingPos(color) {
    const king = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardState[r][c] === king) return `${r},${c}`;
        }
    }
    return null;
}

function getLegalMoves(row, col) {
    const piece = boardState[row][col];
    if (!piece) return [];
    return getPossibleMoves(row, col).filter(move => !wouldBeInCheck(row, col, move.row, move.col));
}

function getPossibleMoves(row, col) {
    const piece = boardState[row][col];
    if (!piece) return [];

    const moves = [];
    const color = getPieceColor(piece);
    const type = piece.toLowerCase();

    switch (type) {
        case 'p':
            const dir = color === 'white' ? -1 : 1;
            const startRow = color === 'white' ? 6 : 1;

            if (!boardState[row + dir]?.[col]) {
                moves.push({ row: row + dir, col });
                if (row === startRow && !boardState[row + dir * 2]?.[col]) {
                    moves.push({ row: row + dir * 2, col });
                }
            }
            for (const dc of [-1, 1]) {
                const newCol = col + dc;
                if (newCol >= 0 && newCol <= 7 && boardState[row + dir]?.[newCol]) {
                    if (getPieceColor(boardState[row + dir][newCol]) !== color) {
                        moves.push({ row: row + dir, col: newCol });
                    }
                }
            }
            break;

        case 'r':
            addLinearMoves(moves, row, col, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
            break;

        case 'n':
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    if (getPieceColor(boardState[nr][nc]) !== color) {
                        moves.push({ row: nr, col: nc });
                    }
                }
            }
            break;

        case 'b':
            addLinearMoves(moves, row, col, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
            break;

        case 'q':
            addLinearMoves(moves, row, col, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
            break;

        case 'k':
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                        if (getPieceColor(boardState[nr][nc]) !== color) {
                            moves.push({ row: nr, col: nc });
                        }
                    }
                }
            }
            break;
    }

    return moves;
}

function addLinearMoves(moves, row, col, directions) {
    const piece = boardState[row][col];
    const color = getPieceColor(piece);

    for (const [dr, dc] of directions) {
        let nr = row + dr, nc = col + dc;
        while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
            const target = boardState[nr][nc];
            if (!target) {
                moves.push({ row: nr, col: nc });
            } else {
                if (getPieceColor(target) !== color) {
                    moves.push({ row: nr, col: nc });
                }
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
}

function wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
    const tempBoard = boardState.map(r => [...r]);
    const piece = boardState[fromRow][fromCol];

    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = '';

    const inCheck = isInCheck(getPieceColor(piece));

    boardState.forEach((r, i) => boardState[i] = tempBoard[i]);

    return inCheck;
}

function isInCheck(color = currentPlayer) {
    const kingPos = getKingPos(color);
    if (!kingPos) return false;

    const [kRow, kCol] = kingPos.split(',').map(Number);
    const enemyColor = color === 'white' ? 'black' : 'white';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardState[r][c]) === enemyColor) {
                if (getPossibleMoves(r, c).some(m => m.row === kRow && m.col === kCol)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate() {
    if (!isInCheck()) return false;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardState[r][c]) === currentPlayer) {
                if (getLegalMoves(r, c).length > 0) return false;
            }
        }
    }
    return true;
}

function computerMove() {
    if (isGameOver) return;

    const move = findBestMove();
    if (!move) {
        if (isInCheck()) {
            isGameOver = true;
            updateStatus('ניצחת! המחשב לא יכול לזוז.');
            score.wins++;
            updateScore();
        } else {
            updateStatus('תיקו!');
        }
        return;
    }

    makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
    currentPlayer = 'white';
    turnIndicator.textContent = 'תור: לבן ♔';
    turnIndicator.className = 'turn-indicator white';
    renderBoard();

    if (isGameOver) return;

    if (isCheckmate()) {
        isGameOver = true;
        updateStatus(`♔ שחמט! הפסדת!`);
        score.losses++;
        updateScore();
    } else if (isInCheck()) {
        updateStatus('שח! שח לך!');
    }
}

function findBestMove() {
    const moves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardState[r][c]) === 'black') {
                const pieceMoves = getLegalMoves(r, c);
                pieceMoves.forEach(to => {
                    moves.push({ from: { row: r, col: c }, to });
                });
            }
        }
    }

    if (moves.length === 0) return null;

    const captureMoves = moves.filter(m => boardState[m.to.row][m.to.col]);
    const nonCaptureMoves = moves.filter(m => !boardState[m.to.row][m.to.col]);

    const shuffledCaptures = captureMoves.sort(() => Math.random() - 0.5);
    const shuffledNonCaptures = nonCaptureMoves.sort(() => Math.random() - 0.5);

    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    shuffledCaptures.sort((a, b) => {
        const valA = pieceValues[boardState[a.to.row][a.to.col].toLowerCase()];
        const valB = pieceValues[boardState[b.to.row][b.to.col].toLowerCase()];
        return valB - valA;
    });

    const checkMoves = moves.filter(m => {
        const tempBoard = boardState.map(r => [...r]);
        const piece = boardState[m.from.row][m.from.col];
        boardState[m.to.row][m.to.col] = piece;
        boardState[m.from.row][m.from.col] = '';
        const inCheck = isInCheck('white');
        boardState = tempBoard;
        return inCheck;
    });

    if (checkMoves.length > 0 && Math.random() > 0.3) {
        return checkMoves[Math.floor(Math.random() * checkMoves.length)];
    }

    if (shuffledCaptures.length > 0 && Math.random() > 0.5) {
        return shuffledCaptures[0];
    }

    return [...shuffledCaptures, ...shuffledNonCaptures][0];
}

function undoMove() {
    if (moveList.length < 2 || isGameOver) return;

    const blackMove = moveList.pop();
    const whiteMove = moveList.pop();

    boardState[whiteMove.from.row][whiteMove.from.col] = whiteMove.piece;
    boardState[whiteMove.to.row][whiteMove.to.col] = whiteMove.captured || '';

    boardState[blackMove.from.row][blackMove.from.col] = blackMove.piece;
    boardState[blackMove.to.row][blackMove.to.col] = blackMove.captured || '';

    if (whiteMove.captured) {
        const color = getPieceColor(whiteMove.captured);
        const idx = capturedPieces[color].lastIndexOf(whiteMove.captured);
        if (idx > -1) capturedPieces[color].splice(idx, 1);
        updateCapturedDisplay();
    }
    if (blackMove.captured) {
        const color = getPieceColor(blackMove.captured);
        const idx = capturedPieces[color].lastIndexOf(blackMove.captured);
        if (idx > -1) capturedPieces[color].splice(idx, 1);
        updateCapturedDisplay();
    }

    currentPlayer = 'white';
    turnIndicator.textContent = 'תור: לבן ♔';
    turnIndicator.className = 'turn-indicator white';
    selectedSquare = null;
    isGameOver = false;
    lastMove = null;
    renderBoard();
    updateStatus('חזרת למצב קודם.');
}

function newGame() {
    initBoard();
}

initBoard();