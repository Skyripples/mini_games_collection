import { t } from "../core/i18n.js";

const BOARD_SIZE = 8;

const PIECE_SYMBOLS = {
  white: {
    king: "\u2654",
    queen: "\u2655",
    rook: "\u2656",
    bishop: "\u2657",
    knight: "\u2658",
    pawn: "\u2659"
  },
  black: {
    king: "\u265A",
    queen: "\u265B",
    rook: "\u265C",
    bishop: "\u265D",
    knight: "\u265E",
    pawn: "\u265F"
  }
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
  return { color, type };
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, function () {
    return Array(BOARD_SIZE).fill(null);
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
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getPlayerLabel(color) {
  return t(color === "white" ? "players.whiteSide" : "players.blackSide");
}

function getOpponent(color) {
  return color === "white" ? "black" : "white";
}

function getPieceLabel(piece) {
  return t(`chess.piece.${piece.type}`);
}

function buildInitialBoard() {
  const board = createEmptyBoard();
  const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

  backRank.forEach(function (type, col) {
    board[0][col] = createPiece("black", type);
    board[7][col] = createPiece("white", type);
  });

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    board[1][col] = createPiece("black", "pawn");
    board[6][col] = createPiece("white", "pawn");
  }

  return board;
}

function pushMoveIfAvailable(moves, board, row, col, color) {
  if (!isInsideBoard(row, col)) {
    return;
  }

  const target = board[row][col];
  if (!target) {
    moves.push({ row, col });
    return;
  }

  if (target.color !== color) {
    moves.push({ row, col, isCapture: true });
  }
}

function getSlidingMoves(board, row, col, piece, directions) {
  const moves = [];

  directions.forEach(function ([rowStep, colStep]) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol)) {
      const target = board[nextRow][nextCol];

      if (!target) {
        moves.push({ row: nextRow, col: nextCol });
      } else {
        if (target.color !== piece.color) {
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

function getPawnMoves(board, row, col, piece) {
  const moves = [];
  const direction = piece.color === "white" ? -1 : 1;
  const startRow = piece.color === "white" ? 6 : 1;
  const promotionRow = piece.color === "white" ? 0 : 7;
  const forwardRow = row + direction;

  if (isInsideBoard(forwardRow, col) && !board[forwardRow][col]) {
    moves.push({
      row: forwardRow,
      col: col,
      promotionType: forwardRow === promotionRow ? "queen" : undefined
    });

    const doubleForwardRow = row + direction * 2;
    if (row === startRow && isInsideBoard(doubleForwardRow, col) && !board[doubleForwardRow][col]) {
      moves.push({ row: doubleForwardRow, col: col });
    }
  }

  [-1, 1].forEach(function (colOffset) {
    const captureRow = row + direction;
    const captureCol = col + colOffset;

    if (!isInsideBoard(captureRow, captureCol)) {
      return;
    }

    const target = board[captureRow][captureCol];
    if (!target || target.color === piece.color) {
      return;
    }

    moves.push({
      row: captureRow,
      col: captureCol,
      isCapture: true,
      promotionType: captureRow === promotionRow ? "queen" : undefined
    });
  });

  return moves;
}

function getKnightMoves(board, row, col, piece) {
  const moves = [];

  KNIGHT_OFFSETS.forEach(function ([rowOffset, colOffset]) {
    pushMoveIfAvailable(moves, board, row + rowOffset, col + colOffset, piece.color);
  });

  return moves;
}

function getKingMoves(board, row, col, piece) {
  const moves = [];

  KING_OFFSETS.forEach(function ([rowOffset, colOffset]) {
    pushMoveIfAvailable(moves, board, row + rowOffset, col + colOffset, piece.color);
  });

  return moves;
}

function getLegalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "pawn":
      return getPawnMoves(board, row, col, piece);
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
  const movingPiece = { ...nextBoard[fromRow][fromCol] };
  const capturedPiece = nextBoard[move.row][move.col];

  nextBoard[fromRow][fromCol] = null;
  if (move.promotionType) {
    movingPiece.type = move.promotionType;
  }
  nextBoard[move.row][move.col] = movingPiece;

  return {
    board: nextBoard,
    capturedPiece,
    movedPiece: movingPiece
  };
}

export function createChessGame({
  boardElement,
  btnAssist,
  btnRestart,
  turnText,
  message
}) {
  let board = [];
  let currentPlayer = "white";
  let selected = null;
  let legalMoves = [];
  let lastMove = null;
  let gameOver = false;
  let showHints = true;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function updateTurnText() {
    turnText.textContent = gameOver ? t("common.gameOver") : getPlayerLabel(currentPlayer);
  }

  function updateAssistButton() {
    btnAssist.classList.toggle("active", showHints);
  }

  function clearSelection() {
    selected = null;
    legalMoves = [];
  }

  function getMoveAt(row, col) {
    return legalMoves.find(function (move) {
      return move.row === row && move.col === col;
    });
  }

  function renderMessage() {
    switch (messageState.type) {
      case "noMoves":
        message.textContent = t("chess.message.noMoves", {
          player: getPlayerLabel(messageState.player),
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "selected":
        message.textContent = t("chess.message.selected", {
          player: getPlayerLabel(messageState.player),
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "selectionCleared":
        message.textContent = t("chess.message.selectionCleared", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "invalidMove":
        message.textContent = t("chess.message.invalidMove");
        return;
      case "selectOwnPiece":
        message.textContent = t("chess.message.selectOwnPiece", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "finished":
        message.textContent = t("chess.message.finished");
        return;
      case "turn":
        message.textContent = messageState.details
          .map(function (detail) {
            return t(detail.key, detail.params);
          })
          .join(" ");
        return;
      case "kingCaptured":
        message.textContent = [
          getPlayerLabel(messageState.player),
          t("chess.message.captured", {
            piece: getPieceLabel(messageState.piece)
          })
        ].join(" ");
        return;
      case "start":
      default:
        message.textContent = t("chess.message.start");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("div");
        const piece = board[row][col];
        const move = getMoveAt(row, col);
        const showMoveHint = showHints && Boolean(move);
        const isSelected = selected && selected.row === row && selected.col === col;
        const isLight = (row + col) % 2 === 0;

        cell.className = `chess-cell ${isLight ? "light" : "dark"}`;
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (isSelected) {
          cell.classList.add("selected");
        }
        if (showMoveHint) {
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

        if (piece) {
          const pieceElement = document.createElement("div");
          pieceElement.className = `chess-piece ${piece.color}`;
          pieceElement.textContent = PIECE_SYMBOLS[piece.color][piece.type];
          cell.appendChild(pieceElement);
        } else if (showMoveHint) {
          const dot = document.createElement("div");
          dot.className = "chess-move-dot";
          cell.appendChild(dot);
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
    currentPlayer = "white";
    lastMove = null;
    gameOver = false;
    clearSelection();
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.color !== currentPlayer) {
      return;
    }

    selected = { row, col };
    legalMoves = getLegalMoves(board, row, col);
    render();

    if (legalMoves.length === 0) {
      messageState = { type: "noMoves", player: currentPlayer, piece: piece };
    } else {
      messageState = { type: "selected", player: currentPlayer, piece: piece };
    }
    renderMessage();
  }

  function finishByKingCapture(winner, capturedPiece) {
    gameOver = true;
    clearSelection();
    messageState = { type: "kingCaptured", player: winner, piece: capturedPiece };
    render();
    renderMessage();
  }

  function moveSelectedPiece(move) {
    const fromRow = selected.row;
    const fromCol = selected.col;
    const movingColor = currentPlayer;
    const opponent = getOpponent(movingColor);
    const moveResult = applyMove(board, fromRow, fromCol, move);
    const details = [];

    board = moveResult.board;
    lastMove = { fromRow, fromCol, toRow: move.row, toCol: move.col };
    clearSelection();

    if (moveResult.capturedPiece && moveResult.capturedPiece.type === "king") {
      finishByKingCapture(movingColor, moveResult.capturedPiece);
      return;
    }

    if (moveResult.capturedPiece) {
      details.push({
        key: "chess.message.captured",
        params: { piece: getPieceLabel(moveResult.capturedPiece) }
      });
    }

    if (move.promotionType) {
      details.push({ key: "chess.message.promoted" });
    }

    currentPlayer = opponent;
    details.push({
      key: "chess.message.turn",
      params: { player: getPlayerLabel(currentPlayer) }
    });

    messageState = { type: "turn", details: details };
    render();
    renderMessage();
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".chess-cell");
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
    const move = getMoveAt(row, col);

    if (selected && selected.row === row && selected.col === col) {
      clearSelection();
      messageState = { type: "selectionCleared" };
      render();
      renderMessage();
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
