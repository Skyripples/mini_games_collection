import { t } from "../core/i18n.js";

const BOARD_COLS = 4;
const BOARD_ROWS = 5;
const EXIT_COL = 1;
const EXIT_ROW = 3;

const DIFFICULTY_SETTINGS = {
  easy: {
    labelKey: "common.easy",
    shuffleSteps: 14
  },
  normal: {
    labelKey: "common.normal",
    shuffleSteps: 42
  },
  hard: {
    labelKey: "common.hard",
    shuffleSteps: 88
  }
};

const DIRECTIONS = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 }
};

const OPPOSITE_DIRECTION = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

const BASE_PIECES = [
  { id: "cao", w: 2, h: 2, row: EXIT_ROW, col: EXIT_COL, labelKey: "huarongdao.piece.cao", tone: "cao" },
  { id: "zhang", w: 1, h: 2, row: 0, col: 0, labelKey: "huarongdao.piece.zhang", tone: "general" },
  { id: "zhao", w: 1, h: 2, row: 0, col: 3, labelKey: "huarongdao.piece.zhao", tone: "general" },
  { id: "ma", w: 1, h: 2, row: 2, col: 0, labelKey: "huarongdao.piece.ma", tone: "general" },
  { id: "huang", w: 1, h: 2, row: 2, col: 3, labelKey: "huarongdao.piece.huang", tone: "general" },
  { id: "guan", w: 2, h: 1, row: 1, col: 1, labelKey: "huarongdao.piece.guan", tone: "general" },
  { id: "soldier-1", w: 1, h: 1, row: 0, col: 1, labelKey: "huarongdao.piece.soldier", tone: "soldier" },
  { id: "soldier-2", w: 1, h: 1, row: 0, col: 2, labelKey: "huarongdao.piece.soldier", tone: "soldier" },
  { id: "soldier-3", w: 1, h: 1, row: 4, col: 0, labelKey: "huarongdao.piece.soldier", tone: "soldier" },
  { id: "soldier-4", w: 1, h: 1, row: 4, col: 3, labelKey: "huarongdao.piece.soldier", tone: "soldier" }
];

function clonePiecesById(piecesById) {
  return Object.fromEntries(
    Object.entries(piecesById).map(function ([id, piece]) {
      return [id, { ...piece }];
    })
  );
}

function createSolvedPiecesById() {
  return Object.fromEntries(
    BASE_PIECES.map(function (piece) {
      return [piece.id, { ...piece }];
    })
  );
}

function createOccupancyGrid(piecesById) {
  const grid = Array.from({ length: BOARD_ROWS }, function () {
    return Array.from({ length: BOARD_COLS }, function () {
      return null;
    });
  });

  Object.values(piecesById).forEach(function (piece) {
    for (let row = piece.row; row < piece.row + piece.h; row += 1) {
      for (let col = piece.col; col < piece.col + piece.w; col += 1) {
        grid[row][col] = piece.id;
      }
    }
  });

  return grid;
}

function canMovePiece(piecesById, pieceId, direction) {
  const piece = piecesById[pieceId];
  if (!piece) {
    return false;
  }

  const offset = DIRECTIONS[direction];
  if (!offset) {
    return false;
  }

  const targetRow = piece.row + offset.row;
  const targetCol = piece.col + offset.col;
  if (
    targetRow < 0 ||
    targetCol < 0 ||
    targetRow + piece.h > BOARD_ROWS ||
    targetCol + piece.w > BOARD_COLS
  ) {
    return false;
  }

  const occupancy = createOccupancyGrid(piecesById);
  for (let row = targetRow; row < targetRow + piece.h; row += 1) {
    for (let col = targetCol; col < targetCol + piece.w; col += 1) {
      const occupant = occupancy[row][col];
      if (occupant && occupant !== pieceId) {
        return false;
      }
    }
  }

  return true;
}

function movePiece(piecesById, pieceId, direction) {
  const piece = piecesById[pieceId];
  const offset = DIRECTIONS[direction];

  piece.row += offset.row;
  piece.col += offset.col;
}

function getAvailableMoves(piecesById, pieceId) {
  return Object.keys(DIRECTIONS).filter(function (direction) {
    return canMovePiece(piecesById, pieceId, direction);
  });
}

function getAllMoves(piecesById) {
  return Object.values(piecesById).flatMap(function (piece) {
    return getAvailableMoves(piecesById, piece.id).map(function (direction) {
      return {
        pieceId: piece.id,
        direction: direction
      };
    });
  });
}

function isSolved(piecesById) {
  const cao = piecesById.cao;
  return cao.row === EXIT_ROW && cao.col === EXIT_COL;
}

function createShuffledPiecesByDifficulty(difficulty) {
  const setting = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
  const pieces = createSolvedPiecesById();
  let previousMove = null;
  let guard = 0;

  while (guard < setting.shuffleSteps) {
    let moves = getAllMoves(pieces);
    if (previousMove) {
      moves = moves.filter(function (move) {
        return !(
          move.pieceId === previousMove.pieceId &&
          move.direction === OPPOSITE_DIRECTION[previousMove.direction]
        );
      });
    }

    if (moves.length === 0) {
      break;
    }

    const move = moves[Math.floor(Math.random() * moves.length)];
    movePiece(pieces, move.pieceId, move.direction);
    previousMove = move;
    guard += 1;
  }

  if (isSolved(pieces)) {
    return createShuffledPiecesByDifficulty(difficulty);
  }

  return pieces;
}

export function createHuarongdaoGame({
  boardElement,
  difficultySelect,
  difficultyLabel,
  btnRestart,
  movesText,
  message
}) {
  let piecesById = createSolvedPiecesById();
  let selectedPieceId = null;
  let moveCount = 0;
  let gameFinished = false;
  let currentDifficulty = "normal";
  let messageState = { type: "start", pieceId: null };

  boardElement.tabIndex = 0;

  function getPieceLabel(pieceId) {
    const piece = piecesById[pieceId];
    if (!piece) {
      return "";
    }
    return t(piece.labelKey);
  }

  function setMessageState(type, pieceId = null) {
    messageState = { type: type, pieceId: pieceId };
  }

  function updateStats() {
    movesText.textContent = String(moveCount);
    difficultyLabel.textContent = t(DIFFICULTY_SETTINGS[currentDifficulty].labelKey);
  }

  function renderMessage() {
    if (messageState.type === "win") {
      message.textContent = t("huarongdao.message.win", { moves: moveCount });
      return;
    }

    if (messageState.type === "selected") {
      message.textContent = t("huarongdao.message.selected", {
        piece: getPieceLabel(messageState.pieceId)
      });
      return;
    }

    if (messageState.type === "blocked") {
      message.textContent = t("huarongdao.message.blocked", {
        piece: getPieceLabel(messageState.pieceId)
      });
      return;
    }

    if (messageState.type === "choose") {
      message.textContent = t("huarongdao.message.choose");
      return;
    }

    message.textContent = t("huarongdao.message.start", {
      difficulty: t(DIFFICULTY_SETTINGS[currentDifficulty].labelKey)
    });
  }

  function getMoveMarkerPosition(piece, direction) {
    const offset = DIRECTIONS[direction];
    const centerRow = piece.row + offset.row + piece.h / 2;
    const centerCol = piece.col + offset.col + piece.w / 2;

    return {
      top: `calc(var(--huarongdao-padding) + (${centerRow}) * var(--huarongdao-cell))`,
      left: `calc(var(--huarongdao-padding) + (${centerCol}) * var(--huarongdao-cell))`
    };
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const orderedPieces = Object.values(piecesById).sort(function (left, right) {
      return left.w * left.h - right.w * right.h;
    });

    boardElement.innerHTML = "";

    orderedPieces.forEach(function (piece) {
      const pieceButton = document.createElement("button");

      pieceButton.type = "button";
      pieceButton.className = `huarongdao-piece huarongdao-piece--${piece.tone}`;
      pieceButton.dataset.pieceId = piece.id;
      pieceButton.style.top = `calc(var(--huarongdao-padding) + (${piece.row}) * var(--huarongdao-cell))`;
      pieceButton.style.left = `calc(var(--huarongdao-padding) + (${piece.col}) * var(--huarongdao-cell))`;
      pieceButton.style.width = `calc(${piece.w} * var(--huarongdao-cell))`;
      pieceButton.style.height = `calc(${piece.h} * var(--huarongdao-cell))`;
      pieceButton.textContent = getPieceLabel(piece.id);
      if (piece.id === selectedPieceId && !gameFinished) {
        pieceButton.classList.add("is-selected");
      }

      fragment.appendChild(pieceButton);
    });

    if (selectedPieceId && !gameFinished) {
      const selectedPiece = piecesById[selectedPieceId];
      const availableMoves = getAvailableMoves(piecesById, selectedPieceId);

      availableMoves.forEach(function (direction) {
        const marker = document.createElement("button");
        const position = getMoveMarkerPosition(selectedPiece, direction);

        marker.type = "button";
        marker.className = "huarongdao-move-mark";
        marker.dataset.direction = direction;
        marker.style.top = position.top;
        marker.style.left = position.left;
        marker.textContent = "•";
        fragment.appendChild(marker);
      });
    }

    boardElement.appendChild(fragment);
    updateStats();
    renderMessage();
  }

  function attemptMove(pieceId, direction) {
    if (gameFinished || !canMovePiece(piecesById, pieceId, direction)) {
      setMessageState("blocked", pieceId);
      renderMessage();
      return;
    }

    movePiece(piecesById, pieceId, direction);
    moveCount += 1;
    selectedPieceId = pieceId;

    if (isSolved(piecesById)) {
      gameFinished = true;
      setMessageState("win");
    } else {
      setMessageState("selected", pieceId);
    }

    renderBoard();
  }

  function selectPiece(pieceId) {
    if (gameFinished) {
      return;
    }

    selectedPieceId = pieceId;
    const availableMoves = getAvailableMoves(piecesById, pieceId);

    if (availableMoves.length === 0) {
      setMessageState("blocked", pieceId);
    } else {
      setMessageState("selected", pieceId);
    }

    renderBoard();
    boardElement.focus({ preventScroll: true });
  }

  function resetGame() {
    currentDifficulty = difficultySelect.value || "normal";
    piecesById = createShuffledPiecesByDifficulty(currentDifficulty);
    selectedPieceId = null;
    moveCount = 0;
    gameFinished = false;
    setMessageState("start");
    renderBoard();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const marker = event.target.closest(".huarongdao-move-mark");
    if (marker && selectedPieceId) {
      attemptMove(selectedPieceId, marker.dataset.direction);
      return;
    }

    const piece = event.target.closest(".huarongdao-piece");
    if (piece) {
      selectPiece(piece.dataset.pieceId);
    }
  }

  function handleKeyDown(event) {
    if (!(event.key in { ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true })) {
      return;
    }

    event.preventDefault();

    if (gameFinished) {
      return;
    }

    if (!selectedPieceId) {
      setMessageState("choose");
      renderMessage();
      return;
    }

    const direction = event.key.replace("Arrow", "").toLowerCase();
    attemptMove(selectedPieceId, direction);
  }

  boardElement.addEventListener("click", handleBoardClick);
  difficultySelect.addEventListener("change", function (event) {
    currentDifficulty = event.target.value;
    resetGame();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetGame();
  });

  return {
    enter: resetGame,
    handleKeyDown: handleKeyDown,
    refreshLocale: renderBoard
  };
}
