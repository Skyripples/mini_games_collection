const ROWS = 10;
const COLS = 9;

const PIECE_CHARS = {
  red: {
    general: "帥",
    advisor: "仕",
    elephant: "相",
    horse: "傌",
    chariot: "俥",
    cannon: "炮",
    soldier: "兵"
  },
  black: {
    general: "將",
    advisor: "士",
    elephant: "象",
    horse: "馬",
    chariot: "車",
    cannon: "砲",
    soldier: "卒"
  }
};

const PIECE_NAMES = {
  general: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  chariot: "車",
  cannon: "炮",
  soldier: "兵"
};

const HORSE_MOVES = [
  { rowOffset: -2, colOffset: -1, legRowOffset: -1, legColOffset: 0 },
  { rowOffset: -2, colOffset: 1, legRowOffset: -1, legColOffset: 0 },
  { rowOffset: 2, colOffset: -1, legRowOffset: 1, legColOffset: 0 },
  { rowOffset: 2, colOffset: 1, legRowOffset: 1, legColOffset: 0 },
  { rowOffset: -1, colOffset: -2, legRowOffset: 0, legColOffset: -1 },
  { rowOffset: 1, colOffset: -2, legRowOffset: 0, legColOffset: -1 },
  { rowOffset: -1, colOffset: 2, legRowOffset: 0, legColOffset: 1 },
  { rowOffset: 1, colOffset: 2, legRowOffset: 0, legColOffset: 1 }
];

const ELEPHANT_MOVES = [
  { rowOffset: -2, colOffset: -2, eyeRowOffset: -1, eyeColOffset: -1 },
  { rowOffset: -2, colOffset: 2, eyeRowOffset: -1, eyeColOffset: 1 },
  { rowOffset: 2, colOffset: -2, eyeRowOffset: 1, eyeColOffset: -1 },
  { rowOffset: 2, colOffset: 2, eyeRowOffset: 1, eyeColOffset: 1 }
];

const ADVISOR_MOVES = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

const ORTHOGONAL_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function isInsideBoard(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function isInsidePalace(side, row, col) {
  if (col < 3 || col > 5) {
    return false;
  }

  if (side === "red") {
    return row >= 7 && row <= 9;
  }

  return row >= 0 && row <= 2;
}

function hasCrossedRiver(side, row) {
  return side === "red" ? row <= 4 : row >= 5;
}

function getSideLabel(side) {
  return side === "red" ? "紅方" : "黑方";
}

function getOpponentSide(side) {
  return side === "red" ? "black" : "red";
}

function createPiece(side, type) {
  return { side, type };
}

function keyForPosition(row, col) {
  return `${row},${col}`;
}

function buildInitialBoard() {
  const board = createEmptyBoard();

  const place = (row, col, side, type) => {
    board[row][col] = createPiece(side, type);
  };

  ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"]
    .forEach((type, col) => {
      place(0, col, "black", type);
      place(9, col, "red", type);
    });

  place(2, 1, "black", "cannon");
  place(2, 7, "black", "cannon");
  place(7, 1, "red", "cannon");
  place(7, 7, "red", "cannon");

  [0, 2, 4, 6, 8].forEach((col) => {
    place(3, col, "black", "soldier");
    place(6, col, "red", "soldier");
  });

  return board;
}

function getGeneralPosition(board, side) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (piece && piece.side === side && piece.type === "general") {
        return { row, col };
      }
    }
  }

  return null;
}

function addMoveIfAvailable(board, moves, side, row, col) {
  if (!isInsideBoard(row, col)) {
    return;
  }

  const target = board[row][col];
  if (!target || target.side !== side) {
    moves.push({ row, col });
  }
}

function getGeneralRawMoves(board, row, col, piece) {
  const moves = [];

  ORTHOGONAL_DIRECTIONS.forEach(([rowStep, colStep]) => {
    const nextRow = row + rowStep;
    const nextCol = col + colStep;
    if (isInsidePalace(piece.side, nextRow, nextCol)) {
      addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
    }
  });

  for (const rowStep of [-1, 1]) {
    let nextRow = row + rowStep;
    while (isInsideBoard(nextRow, col)) {
      const target = board[nextRow][col];
      if (target) {
        if (target.side !== piece.side && target.type === "general") {
          moves.push({ row: nextRow, col });
        }
        break;
      }
      nextRow += rowStep;
    }
  }

  return moves;
}

function getAdvisorRawMoves(board, row, col, piece) {
  const moves = [];

  ADVISOR_MOVES.forEach(([rowOffset, colOffset]) => {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (isInsidePalace(piece.side, nextRow, nextCol)) {
      addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
    }
  });

  return moves;
}

function getElephantRawMoves(board, row, col, piece) {
  const moves = [];

  ELEPHANT_MOVES.forEach(({ rowOffset, colOffset, eyeRowOffset, eyeColOffset }) => {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    const eyeRow = row + eyeRowOffset;
    const eyeCol = col + eyeColOffset;

    if (!isInsideBoard(nextRow, nextCol) || board[eyeRow][eyeCol]) {
      return;
    }

    if (piece.side === "red" && nextRow < 5) {
      return;
    }

    if (piece.side === "black" && nextRow > 4) {
      return;
    }

    addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
  });

  return moves;
}

function getHorseRawMoves(board, row, col, piece) {
  const moves = [];

  HORSE_MOVES.forEach(({ rowOffset, colOffset, legRowOffset, legColOffset }) => {
    const legRow = row + legRowOffset;
    const legCol = col + legColOffset;
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;

    if (!isInsideBoard(nextRow, nextCol) || board[legRow][legCol]) {
      return;
    }

    addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
  });

  return moves;
}

function getSlidingRawMoves(board, row, col, piece, isCannon) {
  const moves = [];

  ORTHOGONAL_DIRECTIONS.forEach(([rowStep, colStep]) => {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;
    let jumped = false;

    while (isInsideBoard(nextRow, nextCol)) {
      const target = board[nextRow][nextCol];

      if (!isCannon) {
        if (!target) {
          moves.push({ row: nextRow, col: nextCol });
        } else {
          if (target.side !== piece.side) {
            moves.push({ row: nextRow, col: nextCol });
          }
          break;
        }
      } else if (!jumped) {
        if (!target) {
          moves.push({ row: nextRow, col: nextCol });
        } else {
          jumped = true;
        }
      } else if (target) {
        if (target.side !== piece.side) {
          moves.push({ row: nextRow, col: nextCol });
        }
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  });

  return moves;
}

function getSoldierRawMoves(board, row, col, piece) {
  const moves = [];
  const forwardStep = piece.side === "red" ? -1 : 1;

  addMoveIfAvailable(board, moves, piece.side, row + forwardStep, col);

  if (hasCrossedRiver(piece.side, row)) {
    addMoveIfAvailable(board, moves, piece.side, row, col - 1);
    addMoveIfAvailable(board, moves, piece.side, row, col + 1);
  }

  return moves;
}

function getRawMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "general":
      return getGeneralRawMoves(board, row, col, piece);
    case "advisor":
      return getAdvisorRawMoves(board, row, col, piece);
    case "elephant":
      return getElephantRawMoves(board, row, col, piece);
    case "horse":
      return getHorseRawMoves(board, row, col, piece);
    case "chariot":
      return getSlidingRawMoves(board, row, col, piece, false);
    case "cannon":
      return getSlidingRawMoves(board, row, col, piece, true);
    case "soldier":
      return getSoldierRawMoves(board, row, col, piece);
    default:
      return [];
  }
}

function applyMove(board, fromRow, fromCol, toRow, toCol) {
  const nextBoard = cloneBoard(board);
  nextBoard[toRow][toCol] = nextBoard[fromRow][fromCol];
  nextBoard[fromRow][fromCol] = null;
  return nextBoard;
}

function isGeneralThreatened(board, side) {
  const generalPosition = getGeneralPosition(board, side);
  if (!generalPosition) {
    return true;
  }

  const opponentSide = getOpponentSide(side);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== opponentSide) {
        continue;
      }

      const moves = getRawMoves(board, row, col);
      if (
        moves.some(
          (move) =>
            move.row === generalPosition.row && move.col === generalPosition.col
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function getLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  return getRawMoves(board, row, col).filter((move) => {
    const nextBoard = applyMove(board, row, col, move.row, move.col);
    return !isGeneralThreatened(nextBoard, piece.side);
  });
}

function hasAnyLegalMoves(board, side) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (piece && piece.side === side && getLegalMoves(board, row, col).length > 0) {
        return true;
      }
    }
  }

  return false;
}

export function createXiangqiGame({
  boardElement,
  btnRestart,
  turnText,
  message
}) {
  let board = [];
  let currentSide = "red";
  let selected = null;
  let legalMoves = [];
  let gameOver = false;

  boardElement.tabIndex = 0;

  function updateTurnText() {
    turnText.textContent = getSideLabel(currentSide);
  }

  function resetSelection() {
    selected = null;
    legalMoves = [];
  }

  function getPieceLabel(piece) {
    return PIECE_NAMES[piece.type];
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const legalMoveSet = new Set(legalMoves.map((move) => keyForPosition(move.row, move.col)));

    boardElement.innerHTML = "";

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cell = document.createElement("div");
        const piece = board[row][col];
        const isSelected = selected && selected.row === row && selected.col === col;
        const isValidMove = legalMoveSet.has(keyForPosition(row, col));

        cell.className = "xiangqi-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (row === 4 || row === 5) {
          cell.classList.add("river");
        }
        if (isSelected) {
          cell.classList.add("selected");
        }
        if (isValidMove) {
          cell.classList.add("valid");
        }

        if (piece) {
          const pieceElement = document.createElement("div");
          pieceElement.className = `xiangqi-piece ${piece.side}`;
          pieceElement.textContent = PIECE_CHARS[piece.side][piece.type];
          cell.appendChild(pieceElement);
        } else if (isValidMove) {
          const moveDot = document.createElement("div");
          moveDot.className = "xiangqi-move-dot";
          cell.appendChild(moveDot);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
  }

  function finishGame(winnerSide, detail) {
    gameOver = true;
    currentSide = winnerSide;
    updateTurnText();
    resetSelection();
    render();
    message.textContent = `${getSideLabel(winnerSide)}獲勝！${detail}`;
  }

  function startGame() {
    board = buildInitialBoard();
    currentSide = "red";
    gameOver = false;
    updateTurnText();
    resetSelection();
    render();
    message.textContent = "紅方先手，請先選擇棋子。";
    boardElement.focus({ preventScroll: true });
  }

  function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.side !== currentSide) {
      return;
    }

    const nextLegalMoves = getLegalMoves(board, row, col);
    selected = { row, col };
    legalMoves = nextLegalMoves;
    render();

    if (nextLegalMoves.length === 0) {
      message.textContent = `${getSideLabel(currentSide)}的${getPieceLabel(piece)}目前沒有合法走法。`;
    } else {
      message.textContent = `${getSideLabel(currentSide)}已選擇${getPieceLabel(piece)}，請點選目標位置。`;
    }
  }

  function moveSelectedPiece(toRow, toCol) {
    const fromRow = selected.row;
    const fromCol = selected.col;
    const movingPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    const movingSide = currentSide;
    const opponentSide = getOpponentSide(movingSide);

    board = applyMove(board, fromRow, fromCol, toRow, toCol);
    resetSelection();

    if (capturedPiece && capturedPiece.type === "general") {
      finishGame(movingSide, "成功吃掉對方的將。");
      return;
    }

    const opponentInCheck = isGeneralThreatened(board, opponentSide);
    const opponentHasLegalMoves = hasAnyLegalMoves(board, opponentSide);

    if (!opponentHasLegalMoves) {
      finishGame(
        movingSide,
        opponentInCheck ? "對方無法解將。" : "對方已無合法走法。"
      );
      return;
    }

    currentSide = opponentSide;
    updateTurnText();
    render();

    if (opponentInCheck) {
      message.textContent = `${getSideLabel(currentSide)}被將軍，請應將。`;
    } else {
      message.textContent = `${getSideLabel(currentSide)}回合，請走棋。`;
    }
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".xiangqi-cell");
    if (!cell || gameOver) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = board[row][col];

    if (selected && selected.row === row && selected.col === col) {
      resetSelection();
      render();
      message.textContent = `${getSideLabel(currentSide)}回合，請重新選擇棋子。`;
      return;
    }

    const isLegalMove = legalMoves.some(
      (move) => move.row === row && move.col === col
    );

    if (selected && isLegalMove) {
      moveSelectedPiece(row, col);
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (piece && piece.side === currentSide) {
      selectPiece(row, col);
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (selected) {
      message.textContent = "這個位置不能這樣走。";
    } else {
      message.textContent = `${getSideLabel(currentSide)}回合，請先選擇自己的棋子。`;
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
