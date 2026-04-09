import { t } from "../core/i18n.js";

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
  return Array.from({ length: ROWS }, function () {
    return Array(COLS).fill(null);
  });
}

function cloneBoard(board) {
  return board.map(function (row) {
    return row.map(function (piece) {
      return piece ? { ...piece } : null;
    });
  });
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
  return t(side === "red" ? "players.redSide" : "players.blackCamp");
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

function getPieceLabel(piece) {
  return t(`xiangqi.piece.${piece.type}`);
}

function buildInitialBoard() {
  const board = createEmptyBoard();

  function place(row, col, side, type) {
    board[row][col] = createPiece(side, type);
  }

  ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"]
    .forEach(function (type, col) {
      place(0, col, "black", type);
      place(9, col, "red", type);
    });

  place(2, 1, "black", "cannon");
  place(2, 7, "black", "cannon");
  place(7, 1, "red", "cannon");
  place(7, 7, "red", "cannon");

  [0, 2, 4, 6, 8].forEach(function (col) {
    place(3, col, "black", "soldier");
    place(6, col, "red", "soldier");
  });

  return board;
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

function getGeneralMoves(board, row, col, piece) {
  const moves = [];

  ORTHOGONAL_DIRECTIONS.forEach(function ([rowStep, colStep]) {
    const nextRow = row + rowStep;
    const nextCol = col + colStep;
    if (isInsidePalace(piece.side, nextRow, nextCol)) {
      addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
    }
  });

  [-1, 1].forEach(function (rowStep) {
    let nextRow = row + rowStep;
    while (isInsideBoard(nextRow, col)) {
      const target = board[nextRow][col];
      if (target) {
        if (target.side !== piece.side && target.type === "general") {
          moves.push({ row: nextRow, col: col });
        }
        break;
      }
      nextRow += rowStep;
    }
  });

  return moves;
}

function getAdvisorMoves(board, row, col, piece) {
  const moves = [];

  ADVISOR_MOVES.forEach(function ([rowOffset, colOffset]) {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (isInsidePalace(piece.side, nextRow, nextCol)) {
      addMoveIfAvailable(board, moves, piece.side, nextRow, nextCol);
    }
  });

  return moves;
}

function getElephantMoves(board, row, col, piece) {
  const moves = [];

  ELEPHANT_MOVES.forEach(function ({
    rowOffset,
    colOffset,
    eyeRowOffset,
    eyeColOffset
  }) {
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

function getHorseMoves(board, row, col, piece) {
  const moves = [];

  HORSE_MOVES.forEach(function ({
    rowOffset,
    colOffset,
    legRowOffset,
    legColOffset
  }) {
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

function getSlidingMoves(board, row, col, piece, isCannon) {
  const moves = [];

  ORTHOGONAL_DIRECTIONS.forEach(function ([rowStep, colStep]) {
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

function getSoldierMoves(board, row, col, piece) {
  const moves = [];
  const forwardStep = piece.side === "red" ? -1 : 1;

  addMoveIfAvailable(board, moves, piece.side, row + forwardStep, col);

  if (hasCrossedRiver(piece.side, row)) {
    addMoveIfAvailable(board, moves, piece.side, row, col - 1);
    addMoveIfAvailable(board, moves, piece.side, row, col + 1);
  }

  return moves;
}

function getLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "general":
      return getGeneralMoves(board, row, col, piece);
    case "advisor":
      return getAdvisorMoves(board, row, col, piece);
    case "elephant":
      return getElephantMoves(board, row, col, piece);
    case "horse":
      return getHorseMoves(board, row, col, piece);
    case "chariot":
      return getSlidingMoves(board, row, col, piece, false);
    case "cannon":
      return getSlidingMoves(board, row, col, piece, true);
    case "soldier":
      return getSoldierMoves(board, row, col, piece);
    default:
      return [];
  }
}

function applyMove(board, fromRow, fromCol, toRow, toCol) {
  const nextBoard = cloneBoard(board);
  const capturedPiece = nextBoard[toRow][toCol];

  nextBoard[toRow][toCol] = nextBoard[fromRow][fromCol];
  nextBoard[fromRow][fromCol] = null;

  return {
    board: nextBoard,
    capturedPiece
  };
}

export function createXiangqiGame({
  boardElement,
  btnAssist,
  btnRestart,
  turnText,
  message
}) {
  let board = [];
  let currentSide = "red";
  let selected = null;
  let legalMoves = [];
  let gameOver = false;
  let showHints = true;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function updateTurnText() {
    turnText.textContent = gameOver ? t("common.gameOver") : getSideLabel(currentSide);
  }

  function updateAssistButton() {
    btnAssist.classList.toggle("active", showHints);
  }

  function resetSelection() {
    selected = null;
    legalMoves = [];
  }

  function renderMessage() {
    switch (messageState.type) {
      case "noMoves":
        message.textContent = t("xiangqi.message.noMoves", {
          player: getSideLabel(messageState.side),
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "selected":
        message.textContent = t("xiangqi.message.selected", {
          player: getSideLabel(messageState.side),
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "selectionCleared":
        message.textContent = t("xiangqi.message.selectionCleared", {
          player: getSideLabel(currentSide)
        });
        return;
      case "invalidMove":
        message.textContent = t("xiangqi.message.invalidMove");
        return;
      case "selectOwnPiece":
        message.textContent = t("xiangqi.message.selectOwnPiece", {
          player: getSideLabel(currentSide)
        });
        return;
      case "finished":
        message.textContent = t("common.gameOver");
        return;
      case "turn":
        message.textContent = t("xiangqi.message.turn", {
          player: getSideLabel(currentSide)
        });
        return;
      case "win":
        message.textContent = [
          getSideLabel(messageState.side),
          t("xiangqi.message.captureGeneral")
        ].join(" ");
        return;
      case "start":
      default:
        message.textContent = t("xiangqi.message.start");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const legalMoveSet = new Set(
      showHints
        ? legalMoves.map(function (move) {
            return keyForPosition(move.row, move.col);
          })
        : []
    );

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
    updateTurnText();
    updateAssistButton();
  }

  function startGame() {
    board = buildInitialBoard();
    currentSide = "red";
    gameOver = false;
    resetSelection();
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.side !== currentSide) {
      return;
    }

    selected = { row, col };
    legalMoves = getLegalMoves(board, row, col);
    render();

    if (legalMoves.length === 0) {
      messageState = { type: "noMoves", side: currentSide, piece: piece };
    } else {
      messageState = { type: "selected", side: currentSide, piece: piece };
    }
    renderMessage();
  }

  function moveSelectedPiece(toRow, toCol) {
    const fromRow = selected.row;
    const fromCol = selected.col;
    const movingSide = currentSide;
    const opponentSide = getOpponentSide(movingSide);
    const moveResult = applyMove(board, fromRow, fromCol, toRow, toCol);

    board = moveResult.board;
    resetSelection();

    if (moveResult.capturedPiece && moveResult.capturedPiece.type === "general") {
      gameOver = true;
      messageState = { type: "win", side: movingSide };
      render();
      renderMessage();
      return;
    }

    currentSide = opponentSide;
    messageState = { type: "turn" };
    render();
    renderMessage();
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".xiangqi-cell");
    if (!cell) {
      return;
    }

    if (gameOver) {
      messageState = { type: "finished" };
      renderMessage();
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = board[row][col];
    const isLegalMove = legalMoves.some(function (move) {
      return move.row === row && move.col === col;
    });

    if (selected && selected.row === row && selected.col === col) {
      resetSelection();
      messageState = { type: "selectionCleared" };
      render();
      renderMessage();
      return;
    }

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

    messageState = { type: selected ? "invalidMove" : "selectOwnPiece" };
    renderMessage();
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnAssist.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showHints = !showHints;
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
