const BOARD_SIZE = 8;

const PIECE_SYMBOLS = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙"
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟"
  }
};

const PIECE_LABELS = {
  king: "國王",
  queen: "皇后",
  rook: "城堡",
  bishop: "主教",
  knight: "騎士",
  pawn: "兵"
};

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1]
];

const KING_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const BISHOP_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

const ROOK_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

function createPiece(color, type) {
  return { color, type, moved: false };
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getPlayerLabel(color) {
  return color === "white" ? "白方" : "黑方";
}

function getOpponent(color) {
  return color === "white" ? "black" : "white";
}

function getPieceLabel(piece) {
  return PIECE_LABELS[piece.type];
}

function buildInitialBoard() {
  const board = createEmptyBoard();
  const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

  backRank.forEach((type, col) => {
    board[0][col] = createPiece("black", type);
    board[7][col] = createPiece("white", type);
  });

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    board[1][col] = createPiece("black", "pawn");
    board[6][col] = createPiece("white", "pawn");
  }

  return board;
}

function findKing(board, color) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.color === color && piece.type === "king") {
        return { row, col };
      }
    }
  }

  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  const pawnRow = row + (byColor === "white" ? 1 : -1);
  for (const colOffset of [-1, 1]) {
    const pawnCol = col + colOffset;
    if (!isInsideBoard(pawnRow, pawnCol)) {
      continue;
    }

    const pawn = board[pawnRow][pawnCol];
    if (pawn && pawn.color === byColor && pawn.type === "pawn") {
      return true;
    }
  }

  for (const [rowOffset, colOffset] of KNIGHT_OFFSETS) {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (!isInsideBoard(nextRow, nextCol)) {
      continue;
    }

    const piece = board[nextRow][nextCol];
    if (piece && piece.color === byColor && piece.type === "knight") {
      return true;
    }
  }

  for (const [rowStep, colStep] of BISHOP_DIRECTIONS) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol)) {
      const piece = board[nextRow][nextCol];
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === "bishop" || piece.type === "queen")
        ) {
          return true;
        }
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  }

  for (const [rowStep, colStep] of ROOK_DIRECTIONS) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol)) {
      const piece = board[nextRow][nextCol];
      if (piece) {
        if (
          piece.color === byColor &&
          (piece.type === "rook" || piece.type === "queen")
        ) {
          return true;
        }
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  }

  for (const [rowOffset, colOffset] of KING_OFFSETS) {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (!isInsideBoard(nextRow, nextCol)) {
      continue;
    }

    const piece = board[nextRow][nextCol];
    if (piece && piece.color === byColor && piece.type === "king") {
      return true;
    }
  }

  return false;
}

function isKingInCheck(board, color) {
  const kingPosition = findKing(board, color);
  if (!kingPosition) {
    return true;
  }

  return isSquareAttacked(board, kingPosition.row, kingPosition.col, getOpponent(color));
}

function pushMoveIfAvailable(moves, board, row, col, color, extra = {}) {
  if (!isInsideBoard(row, col)) {
    return;
  }

  const target = board[row][col];
  if (!target) {
    moves.push({ row, col, ...extra });
    return;
  }

  if (target.color !== color && target.type !== "king") {
    moves.push({ row, col, isCapture: true, ...extra });
  }
}

function getSlidingMoves(board, row, col, piece, directions) {
  const moves = [];

  directions.forEach(([rowStep, colStep]) => {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol)) {
      const target = board[nextRow][nextCol];
      if (!target) {
        moves.push({ row: nextRow, col: nextCol });
      } else {
        if (target.color !== piece.color && target.type !== "king") {
          moves.push({ row: nextRow, col: nextCol, isCapture: true });
        }
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  });

  return moves;
}

function getPawnMoves(board, row, col, piece, enPassantTarget) {
  const moves = [];
  const direction = piece.color === "white" ? -1 : 1;
  const startRow = piece.color === "white" ? 6 : 1;
  const promotionRow = piece.color === "white" ? 0 : 7;
  const forwardRow = row + direction;

  if (isInsideBoard(forwardRow, col) && !board[forwardRow][col]) {
    moves.push({
      row: forwardRow,
      col,
      promotionType: forwardRow === promotionRow ? "queen" : undefined
    });

    const doubleForwardRow = row + direction * 2;
    if (row === startRow && !board[doubleForwardRow][col]) {
      moves.push({ row: doubleForwardRow, col });
    }
  }

  for (const colOffset of [-1, 1]) {
    const captureCol = col + colOffset;
    const captureRow = row + direction;
    if (!isInsideBoard(captureRow, captureCol)) {
      continue;
    }

    const target = board[captureRow][captureCol];
    if (target && target.color !== piece.color && target.type !== "king") {
      moves.push({
        row: captureRow,
        col: captureCol,
        isCapture: true,
        promotionType: captureRow === promotionRow ? "queen" : undefined
      });
      continue;
    }

    if (
      enPassantTarget &&
      enPassantTarget.color === getOpponent(piece.color) &&
      enPassantTarget.row === captureRow &&
      enPassantTarget.col === captureCol
    ) {
      const adjacentPawn = board[row][captureCol];
      if (
        adjacentPawn &&
        adjacentPawn.color === getOpponent(piece.color) &&
        adjacentPawn.type === "pawn"
      ) {
        moves.push({
          row: captureRow,
          col: captureCol,
          isCapture: true,
          isEnPassant: true,
          captureRow: row,
          captureCol
        });
      }
    }
  }

  return moves;
}

function getKnightMoves(board, row, col, piece) {
  const moves = [];

  KNIGHT_OFFSETS.forEach(([rowOffset, colOffset]) => {
    pushMoveIfAvailable(moves, board, row + rowOffset, col + colOffset, piece.color);
  });

  return moves;
}

function getKingMoves(board, row, col, piece) {
  const moves = [];
  const opponent = getOpponent(piece.color);

  KING_OFFSETS.forEach(([rowOffset, colOffset]) => {
    pushMoveIfAvailable(moves, board, row + rowOffset, col + colOffset, piece.color);
  });

  if (piece.moved || isKingInCheck(board, piece.color)) {
    return moves;
  }

  const rookKingSide = board[row][7];
  if (
    rookKingSide &&
    rookKingSide.color === piece.color &&
    rookKingSide.type === "rook" &&
    !rookKingSide.moved &&
    !board[row][5] &&
    !board[row][6] &&
    !isSquareAttacked(board, row, 5, opponent) &&
    !isSquareAttacked(board, row, 6, opponent)
  ) {
    moves.push({
      row,
      col: 6,
      isCastle: true,
      rookFromCol: 7,
      rookToCol: 5
    });
  }

  const rookQueenSide = board[row][0];
  if (
    rookQueenSide &&
    rookQueenSide.color === piece.color &&
    rookQueenSide.type === "rook" &&
    !rookQueenSide.moved &&
    !board[row][1] &&
    !board[row][2] &&
    !board[row][3] &&
    !isSquareAttacked(board, row, 3, opponent) &&
    !isSquareAttacked(board, row, 2, opponent)
  ) {
    moves.push({
      row,
      col: 2,
      isCastle: true,
      rookFromCol: 0,
      rookToCol: 3
    });
  }

  return moves;
}

function getPseudoMoves(board, row, col, enPassantTarget) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "pawn":
      return getPawnMoves(board, row, col, piece, enPassantTarget);
    case "knight":
      return getKnightMoves(board, row, col, piece);
    case "bishop":
      return getSlidingMoves(board, row, col, piece, BISHOP_DIRECTIONS);
    case "rook":
      return getSlidingMoves(board, row, col, piece, ROOK_DIRECTIONS);
    case "queen":
      return getSlidingMoves(board, row, col, piece, [
        ...BISHOP_DIRECTIONS,
        ...ROOK_DIRECTIONS
      ]);
    case "king":
      return getKingMoves(board, row, col, piece);
    default:
      return [];
  }
}

function applyMove(board, fromRow, fromCol, move) {
  const nextBoard = cloneBoard(board);
  const originalPiece = nextBoard[fromRow][fromCol];
  let movingPiece = { ...originalPiece, moved: true };
  let capturedPiece = nextBoard[move.row][move.col];

  nextBoard[fromRow][fromCol] = null;

  if (move.isEnPassant) {
    capturedPiece = nextBoard[move.captureRow][move.captureCol];
    nextBoard[move.captureRow][move.captureCol] = null;
  }

  if (move.isCastle) {
    const rook = { ...nextBoard[fromRow][move.rookFromCol], moved: true };
    nextBoard[fromRow][move.rookFromCol] = null;
    nextBoard[fromRow][move.rookToCol] = rook;
  }

  if (move.promotionType) {
    movingPiece = { ...movingPiece, type: move.promotionType };
  }

  nextBoard[move.row][move.col] = movingPiece;

  let nextEnPassantTarget = null;
  if (originalPiece.type === "pawn" && Math.abs(move.row - fromRow) === 2) {
    nextEnPassantTarget = {
      row: (move.row + fromRow) / 2,
      col: fromCol,
      color: originalPiece.color
    };
  }

  return {
    board: nextBoard,
    capturedPiece,
    originalPiece,
    movedPiece: movingPiece,
    nextEnPassantTarget
  };
}

function getLegalMoves(board, row, col, enPassantTarget) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  return getPseudoMoves(board, row, col, enPassantTarget).filter((move) => {
    const moveResult = applyMove(board, row, col, move);
    return !isKingInCheck(moveResult.board, piece.color);
  });
}

function hasAnyLegalMoves(board, color, enPassantTarget) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (
        piece &&
        piece.color === color &&
        getLegalMoves(board, row, col, enPassantTarget).length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

export function createChessGame({
  boardElement,
  btnRestart,
  turnText,
  message
}) {
  let board = [];
  let currentPlayer = "white";
  let selected = null;
  let legalMoves = [];
  let enPassantTarget = null;
  let lastMove = null;
  let gameOver = false;

  boardElement.tabIndex = 0;

  function updateTurnText() {
    turnText.textContent = gameOver ? "對局結束" : getPlayerLabel(currentPlayer);
  }

  function clearSelection() {
    selected = null;
    legalMoves = [];
  }

  function getMoveAt(row, col) {
    return legalMoves.find((move) => move.row === row && move.col === col);
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const checkedKing =
      !gameOver && isKingInCheck(board, currentPlayer)
        ? findKing(board, currentPlayer)
        : null;

    boardElement.innerHTML = "";
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("div");
        const piece = board[row][col];
        const move = getMoveAt(row, col);
        const isSelected = selected && selected.row === row && selected.col === col;
        const isLight = (row + col) % 2 === 0;

        cell.className = `chess-cell ${isLight ? "light" : "dark"}`;
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (isSelected) {
          cell.classList.add("selected");
        }
        if (move) {
          cell.classList.add("valid");
          if (move.isCapture) {
            cell.classList.add("capture");
          }
        }
        if (lastMove) {
          if (lastMove.fromRow === row && lastMove.fromCol === col) {
            cell.classList.add("last-from");
          }
          if (lastMove.toRow === row && lastMove.toCol === col) {
            cell.classList.add("last-to");
          }
        }
        if (checkedKing && checkedKing.row === row && checkedKing.col === col) {
          cell.classList.add("checked");
        }

        if (piece) {
          const pieceElement = document.createElement("div");
          pieceElement.className = `chess-piece ${piece.color}`;
          pieceElement.textContent = PIECE_SYMBOLS[piece.color][piece.type];
          cell.appendChild(pieceElement);
        } else if (move) {
          const dot = document.createElement("div");
          dot.className = "chess-move-dot";
          cell.appendChild(dot);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateTurnText();
  }

  function startGame() {
    board = buildInitialBoard();
    currentPlayer = "white";
    enPassantTarget = null;
    lastMove = null;
    gameOver = false;
    clearSelection();
    render();
    message.textContent = "白方先手，請選擇棋子。";
    boardElement.focus({ preventScroll: true });
  }

  function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.color !== currentPlayer) {
      return;
    }

    selected = { row, col };
    legalMoves = getLegalMoves(board, row, col, enPassantTarget);
    render();

    if (legalMoves.length === 0) {
      message.textContent = `${getPlayerLabel(currentPlayer)}的${getPieceLabel(piece)}目前沒有合法走法。`;
    } else {
      message.textContent = `${getPlayerLabel(currentPlayer)}已選擇${getPieceLabel(piece)}。`;
    }
  }

  function finishGame(resultMessage) {
    gameOver = true;
    clearSelection();
    render();
    message.textContent = resultMessage;
  }

  function moveSelectedPiece(move) {
    const fromRow = selected.row;
    const fromCol = selected.col;
    const movingColor = currentPlayer;
    const opponent = getOpponent(movingColor);
    const moveResult = applyMove(board, fromRow, fromCol, move);
    const detailMessages = [];

    board = moveResult.board;
    enPassantTarget = moveResult.nextEnPassantTarget;
    lastMove = { fromRow, fromCol, toRow: move.row, toCol: move.col };
    clearSelection();

    if (move.isCastle) {
      detailMessages.push("完成王車易位。");
    }
    if (moveResult.capturedPiece) {
      detailMessages.push(`吃掉了對方的${getPieceLabel(moveResult.capturedPiece)}。`);
    }
    if (move.promotionType) {
      detailMessages.push("兵已自動升變為皇后。");
    }

    const opponentInCheck = isKingInCheck(board, opponent);
    const opponentHasMoves = hasAnyLegalMoves(board, opponent, enPassantTarget);

    if (!opponentHasMoves) {
      if (opponentInCheck) {
        finishGame(`${getPlayerLabel(movingColor)}將死，${getPlayerLabel(movingColor)}獲勝！`);
      } else {
        finishGame("雙方無法再走出合法步，這局和棋。");
      }
      return;
    }

    currentPlayer = opponent;
    render();

    if (opponentInCheck) {
      detailMessages.push(`${getPlayerLabel(opponent)}被將軍，請解圍。`);
    } else {
      detailMessages.push(`${getPlayerLabel(opponent)}回合，請走棋。`);
    }

    message.textContent = detailMessages.join("");
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".chess-cell");
    if (!cell) {
      return;
    }

    if (gameOver) {
      message.textContent = "這局已經結束了，請重新開始。";
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = board[row][col];
    const move = getMoveAt(row, col);

    if (selected && selected.row === row && selected.col === col) {
      clearSelection();
      render();
      message.textContent = `${getPlayerLabel(currentPlayer)}回合，請重新選擇棋子。`;
      return;
    }

    if (selected && move) {
      moveSelectedPiece(move);
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (piece && piece.color === currentPlayer) {
      selectPiece(row, col);
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (selected) {
      message.textContent = "這一步不合法，請選擇標示的格子。";
    } else {
      message.textContent = `${getPlayerLabel(currentPlayer)}回合，請先選擇自己的棋子。`;
    }
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame
  };
}
