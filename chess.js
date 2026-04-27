const board = document.getElementById('board');
const status = document.getElementById('status');
const turnIndicator = document.getElementById('turnIndicator');
const capturedWhite = document.getElementById('capturedWhite');
const capturedBlack = document.getElementById('capturedBlack');

const pieces = {
    r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟',
    R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚', P: '♟'
};

let boardState = [];
let selectedSquare = null;
let currentPlayer = 'white';
let moveList = [];
let capturedPieces = { white: [], black: [] };
let score = { wins: 0, losses: 0 };
let isGameOver = false;
let lastMove = null;
let whiteKingMoved = false;
let blackKingMoved = false;
let whiteRooksMoved = { left: false, right: false };
let blackRooksMoved = { left: false, right: false };
let difficulty = 'medium';

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

function initBoard() {
    boardState = initialBoard.map(row => [...row]);
    currentPlayer = 'white';
    selectedSquare = null;
    moveList = [];
    capturedPieces = { white: [], black: [] };
    isGameOver = false;
    lastMove = null;
    whiteKingMoved = false;
    blackKingMoved = false;
    whiteRooksMoved = { left: false, right: false };
    blackRooksMoved = { left: false, right: false };
    renderBoard();
    updateStatus('המשחק התחיל! אתה משחק לבן.');
    turnIndicator.textContent = 'תור: לבן ♔';
    turnIndicator.className = 'turn-indicator white';
    capturedWhite.innerHTML = '';
    capturedBlack.innerHTML = '';
    document.getElementById('difficulty').value = difficulty;
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
        if (boardState[move.row][move.col] || move.castle) {
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
        const move = moves.find(m => m.row === row && m.col === col);

        if (move) {
            if (move.castle) {
                doCastle(move.side);
            } else {
                makeMove(selectedSquare.row, selectedSquare.col, row, col);
            }
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

function canCastle(color, side) {
    const row = color === 'white' ? 7 : 0;
    const kingCol = 4;
    const rookCol = side === 'left' ? 0 : 7;

    if (isInCheck(color)) return false;

    if (color === 'white') {
        if (whiteKingMoved) return false;
        if (side === 'left' && whiteRooksMoved.left) return false;
        if (side === 'right' && whiteRooksMoved.right) return false;
    } else {
        if (blackKingMoved) return false;
        if (side === 'left' && blackRooksMoved.left) return false;
        if (side === 'right' && blackRooksMoved.right) return false;
    }

    if (boardState[row][rookCol]?.toLowerCase() !== 'r') return false;

    const dir = side === 'left' ? 1 : -1;
    const start = Math.min(kingCol, rookCol) + 1;
    const end = Math.max(kingCol, rookCol);

    for (let c = start; c < end; c++) {
        if (boardState[row][c]) return false;
    }

    if (squareUnderAttack(row, kingCol, color)) return false;
    if (squareUnderAttack(row, kingCol + dir, color)) return false;
    if (squareUnderAttack(row, kingCol + dir * 2, color)) return false;

    return true;
}

function squareUnderAttack(row, col, defendingColor) {
    const enemyColor = defendingColor === 'white' ? 'black' : 'white';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(boardState[r][c]) === enemyColor) {
                const attacks = getAttacks(r, c);
                if (attacks.some(a => a.row === row && a.col === col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function doCastle(side) {
    const row = 0;
    const kingCol = 4;
    const dir = side === 'left' ? -1 : 1;
    const newKingCol = kingCol + dir * 2;
    const newRookCol = side === 'left' ? 3 : 5;

    boardState[row][newKingCol] = boardState[row][kingCol];
    boardState[row][kingCol] = '';
    boardState[row][newRookCol] = boardState[row][side === 'left' ? 0 : 7];
    boardState[row][side === 'left' ? 0 : 7] = '';

    blackKingMoved = true;
    if (side === 'left') blackRooksMoved.left = true;
    else blackRooksMoved.right = true;

    moveList.push({ castle: true, side, color: 'black' });
    lastMove = { from: { row, col: kingCol }, to: { row, col: newKingCol } };
}

function getCastleMoves(color) {
    const moves = [];
    if (canCastle(color, 'left')) {
        moves.push({ row: color === 'white' ? 7 : 0, col: 2, castle: true, side: 'left' });
    }
    if (canCastle(color, 'right')) {
        moves.push({ row: color === 'white' ? 7 : 0, col: 6, castle: true, side: 'right' });
    }
    return moves;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = boardState[fromRow][fromCol];
    const captured = boardState[toRow][toCol];

    if (piece.toLowerCase() === 'k') {
        if (getPieceColor(piece) === 'white') whiteKingMoved = true;
        else blackKingMoved = true;
    }
    if (piece.toLowerCase() === 'r') {
        if (fromCol === 0) {
            if (getPieceColor(piece) === 'white') whiteRooksMoved.left = true;
            else blackRooksMoved.left = true;
        }
        if (fromCol === 7) {
            if (getPieceColor(piece) === 'white') whiteRooksMoved.right = true;
            else blackRooksMoved.right = true;
        }
    }

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
        `<span style="color:#222">${pieces[p]}</span>`
    ).join('');
    capturedBlack.innerHTML = capturedPieces.black.map(p =>
        `<span style="color:#fff">${pieces[p]}</span>`
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
    const color = getPieceColor(piece);
    let moves = getPossibleMoves(row, col);

    if (piece.toLowerCase() === 'k') {
        moves = moves.concat(getCastleMoves(color));
    }

    return moves.filter(move => {
        if (move.castle) return true;
        return !wouldBeInCheck(row, col, move.row, move.col);
    });
}

function getAttacks(row, col) {
    const piece = boardState[row][col];
    if (!piece) return [];
    const color = getPieceColor(piece);
    const type = piece.toLowerCase();
    const attacks = [];

    switch (type) {
        case 'p':
            const dir = color === 'white' ? -1 : 1;
            for (const dc of [-1, 1]) {
                const nc = col + dc;
                if (nc >= 0 && nc <= 7) {
                    attacks.push({ row: row + dir, col: nc });
                }
            }
            break;
        case 'n':
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    attacks.push({ row: nr, col: nc });
                }
            }
            break;
        case 'k':
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr !== 0 || dc !== 0) {
                        const nr = row + dr, nc = col + dc;
                        if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                            attacks.push({ row: nr, col: nc });
                        }
                    }
                }
            }
            break;
        default:
            const dirs = type === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] :
                type === 'r' ? [[0, 1], [0, -1], [1, 0], [-1, 0]] :
                    [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [dr, dc] of dirs) {
                let nr = row + dr, nc = col + dc;
                while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                    attacks.push({ row: nr, col: nc });
                    if (boardState[nr][nc]) break;
                    nr += dr;
                    nc += dc;
                }
            }
    }
    return attacks;
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
    return squareUnderAttack(kRow, kCol, color);
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

    if (move.castle) {
        const row = 0;
        const dir = move.side === 'left' ? -1 : 1;
        boardState[row][4] = '';
        boardState[row][move.side === 'left' ? 0 : 7] = '';
        boardState[row][4 + dir * 2] = 'k';
        boardState[row][4 + dir] = 'r';
        blackKingMoved = true;
        if (move.side === 'left') blackRooksMoved.left = true;
        else blackRooksMoved.right = true;
        lastMove = { from: { row, col: 4 }, to: { row, col: 4 + dir * 2 } };
    } else {
        makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
    }

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

    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 200 };

    const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
    const extendedCenter = [[2,2],[2,3],[2,4],[2,5],[3,2],[3,5],[4,2],[4,5],[5,2],[5,3],[5,4],[5,5]];

    moves.forEach(m => {
        m.score = 0;
        
        const piece = m.to.row !== undefined ? boardState[m.from.row]?.[m.from.col] : null;
        const captured = m.to.row !== undefined ? boardState[m.to.row]?.[m.to.col] : null;
        
        if (captured) {
            m.score += pieceValues[captured.toLowerCase()] * 100;
        }

        if (m.to.row !== undefined && m.to.col !== undefined) {
            const toRow = m.to.row;
            const toCol = m.to.col;
            
            if (centerSquares.some(s => s[0] === toRow && s[1] === toCol)) {
                m.score += 15;
            } else if (extendedCenter.some(s => s[0] === toRow && s[1] === toCol)) {
                m.score += 8;
            }

            if (piece && piece.toLowerCase() === 'p') {
                m.score += (7 - toRow) * 3;
            }
            if (piece && piece.toLowerCase() === 'n') {
                if ([toRow, toCol].some(c => c >= 2 && c <= 5)) m.score += 5;
            }
            if (piece && piece.toLowerCase() === 'b') {
                if ([toRow, toCol].some(c => c >= 2 && c <= 5)) m.score += 3;
            }
            if (piece && piece.toLowerCase() === 'r') {
                if (toCol === 3 || toCol === 4) m.score += 5;
            }

            if (piece && piece.toLowerCase() === 'q' || piece.toLowerCase() === 'r') {
                m.score += getAttackCount(m.to.row, m.to.col) * 2;
            }
        }

        if (!m.castle && piece) {
            const tempBoard = boardState.map(row => [...row]);
            boardState[m.to.row][m.to.col] = piece;
            boardState[m.from.row][m.from.col] = '';
            
            if (isInCheck('white')) m.score += 30;
            
            const myKingRow = 0;
            const myKingCol = 4;
            if (squareUnderAttack(myKingRow, myKingCol, 'black')) m.score -= 20;
            
            boardState.forEach((row, i) => boardState[i] = tempBoard[i]);
        }

        if (m.castle) m.score += 10;
    });

    moves.sort((a, b) => b.score - a.score);

    if (difficulty === 'easy') {
        const topMoves = moves.slice(0, Math.min(5, moves.length));
        return topMoves[Math.floor(Math.random() * topMoves.length)];
    }

    if (difficulty === 'medium') {
        const bestScore = moves[0].score;
        const goodMoves = moves.filter(m => m.score >= bestScore - 10);
        return goodMoves[Math.floor(Math.random() * goodMoves.length)];
    }

    return moves[0];
}

function getAttackCount(row, col) {
    let count = 0;
    const piece = boardState[row]?.[col];
    if (!piece) return 0;
    const type = piece.toLowerCase();
    
    const directions = {
        r: [[0,1],[0,-1],[1,0],[-1,0]],
        b: [[1,1],[1,-1],[-1,1],[-1,-1]],
        q: [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
        n: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
        k: [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    };
    
    if (directions[type]) {
        for (const [dr, dc] of directions[type]) {
            if (type === 'n' || type === 'k') {
                const nr = row + dr, nc = col + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && boardState[nr][nc]) count++;
            } else {
                let nr = row + dr, nc = col + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (boardState[nr][nc]) { count++; break; }
                    nr += dr; nc += dc;
                }
            }
        }
    }
    return count;
}

function setDifficulty(level) {
    difficulty = level;
}

function undoMove() {
    if (moveList.length < 2 || isGameOver) return;

    const lastMove = moveList.pop();
    if (lastMove.castle) {
        const row = 0;
        const dir = lastMove.side === 'left' ? -1 : 1;
        boardState[row][4] = 'k';
        boardState[row][4 + dir * 2] = '';
        boardState[row][4 + dir] = '';
        boardState[row][lastMove.side === 'left' ? 0 : 7] = 'r';
        blackKingMoved = false;
        if (lastMove.side === 'left') blackRooksMoved.left = false;
        else blackRooksMoved.right = false;
    } else {
        const whiteMove = moveList.pop();
        boardState[whiteMove.from.row][whiteMove.from.col] = whiteMove.piece;
        boardState[whiteMove.to.row][whiteMove.to.col] = whiteMove.captured || '';
        boardState[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        boardState[lastMove.to.row][lastMove.to.col] = lastMove.captured || '';

        if (lastMove.captured) {
            const color = getPieceColor(lastMove.captured);
            const idx = capturedPieces[color].lastIndexOf(lastMove.captured);
            if (idx > -1) capturedPieces[color].splice(idx, 1);
        }
        if (whiteMove.captured) {
            const color = getPieceColor(whiteMove.captured);
            const idx = capturedPieces[color].lastIndexOf(whiteMove.captured);
            if (idx > -1) capturedPieces[color].splice(idx, 1);
        }
        updateCapturedDisplay();
    }

    currentPlayer = 'white';
    turnIndicator.textContent = 'תור: לבן ♔';
    turnIndicator.className = 'turn-indicator white';
    selectedSquare = null;
    isGameOver = false;
    renderBoard();
    updateStatus('חזרת למצב קודם.');
}

function newGame() {
    initBoard();
}