import { t } from "../core/i18n.js";

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 32;
const PREVIEW_CELL_SIZE = 28;
const DROP_INTERVALS = [800, 720, 640, 560, 480, 420, 360, 300, 250, 210];
const HORIZONTAL_REPEAT_DELAY = 100;
const HORIZONTAL_REPEAT_INTERVAL = 38;
const KEY_SET = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Enter",
  "Shift",
  "ShiftLeft",
  "ShiftRight"
]);

const PIECES = {
  I: {
    color: "#38bdf8",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  },
  O: {
    color: "#facc15",
    matrix: [
      [1, 1],
      [1, 1]
    ]
  },
  T: {
    color: "#a855f7",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  S: {
    color: "#22c55e",
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ]
  },
  Z: {
    color: "#ef4444",
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ]
  },
  J: {
    color: "#2563eb",
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ]
  },
  L: {
    color: "#f97316",
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  }
};

function createEmptyBoard() {
  return Array.from({ length: ROWS }, function () {
    return Array(COLS).fill(null);
  });
}

function cloneMatrix(matrix) {
  return matrix.map(function (row) {
    return row.slice();
  });
}

function createShuffledBag() {
  const bag = Object.keys(PIECES);

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = bag[index];
    bag[index] = bag[swapIndex];
    bag[swapIndex] = current;
  }

  return bag;
}

function rotateMatrixClockwise(matrix) {
  const size = matrix.length;
  return Array.from({ length: size }, function (_, row) {
    return Array.from({ length: size }, function (_, col) {
      return matrix[size - col - 1][row];
    });
  });
}

function getDropInterval(level) {
  return DROP_INTERVALS[Math.min(level - 1, DROP_INTERVALS.length - 1)];
}

function createPiece(type) {
  const definition = PIECES[type];
  return {
    type: type,
    color: definition.color,
    matrix: cloneMatrix(definition.matrix),
    row: 0,
    col: Math.floor((COLS - definition.matrix[0].length) / 2)
  };
}

function drawCell(context, x, y, size, fillStyle) {
  context.fillStyle = fillStyle;
  context.fillRect(x, y, size, size);
  context.strokeStyle = "rgba(15, 23, 42, 0.22)";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function hexToRgba(hexColor, alpha) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function createTetrisGame({
  canvas,
  holdCanvas,
  nextCanvas,
  btnRestart,
  scoreText,
  linesText,
  levelText,
  message
}) {
  const context = canvas.getContext("2d");
  const holdContext = holdCanvas.getContext("2d");
  const nextContext = nextCanvas.getContext("2d");

  let board = [];
  let currentPiece = null;
  let holdPiece = null;
  let nextPiece = null;
  let bag = [];
  let score = 0;
  let lines = 0;
  let level = 1;
  let timer = null;
  let running = false;
  let playState = "ready";
  let holdUsed = false;
  let horizontalRepeatTimeoutId = null;
  let horizontalRepeatIntervalId = null;
  let activeHorizontalDirection = 0;

  canvas.tabIndex = 0;

  function clearHorizontalRepeat() {
    if (horizontalRepeatTimeoutId) {
      clearTimeout(horizontalRepeatTimeoutId);
      horizontalRepeatTimeoutId = null;
    }

    if (horizontalRepeatIntervalId) {
      clearInterval(horizontalRepeatIntervalId);
      horizontalRepeatIntervalId = null;
    }

    activeHorizontalDirection = 0;
  }

  function refillBagIfNeeded() {
    if (bag.length === 0) {
      bag = createShuffledBag();
    }
  }

  function drawBoardGrid() {
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        drawCell(context, col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, "#111827");
      }
    }

    context.strokeStyle = "rgba(148, 163, 184, 0.18)";
    context.lineWidth = 1;

    for (let col = 0; col <= COLS; col += 1) {
      const x = col * CELL_SIZE + 0.5;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }

    for (let row = 0; row <= ROWS; row += 1) {
      const y = row * CELL_SIZE + 0.5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
  }

  function drawPlacedBlocks() {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const color = board[row][col];
        if (!color) {
          continue;
        }

        drawCell(context, col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, color);
      }
    }
  }

  function getGhostRow() {
    if (!currentPiece) {
      return 0;
    }

    let dropOffset = 0;
    while (!collides(currentPiece, dropOffset + 1, 0)) {
      dropOffset += 1;
    }

    return currentPiece.row + dropOffset;
  }

  function drawGhostPiece() {
    if (!currentPiece) {
      return;
    }

    const ghostRow = getGhostRow();
    if (ghostRow <= currentPiece.row) {
      return;
    }

    const fillColor = hexToRgba(currentPiece.color, 0.2);
    const strokeColor = hexToRgba(currentPiece.color, 0.58);

    currentPiece.matrix.forEach(function (pieceRow, rowOffset) {
      pieceRow.forEach(function (cell, colOffset) {
        if (!cell) {
          return;
        }

        const drawRow = ghostRow + rowOffset;
        const drawCol = currentPiece.col + colOffset;
        if (drawRow < 0) {
          return;
        }

        context.fillStyle = fillColor;
        context.fillRect(drawCol * CELL_SIZE, drawRow * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        context.strokeStyle = strokeColor;
        context.lineWidth = 1;
        context.strokeRect(drawCol * CELL_SIZE + 0.5, drawRow * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      });
    });
  }

  function drawActivePiece() {
    if (!currentPiece) {
      return;
    }

    currentPiece.matrix.forEach(function (pieceRow, rowOffset) {
      pieceRow.forEach(function (cell, colOffset) {
        if (!cell) {
          return;
        }

        const drawRow = currentPiece.row + rowOffset;
        const drawCol = currentPiece.col + colOffset;
        if (drawRow < 0) {
          return;
        }

        drawCell(
          context,
          drawCol * CELL_SIZE,
          drawRow * CELL_SIZE,
          CELL_SIZE,
          currentPiece.color
        );
      });
    });
  }

  function drawPreview(previewContext, previewCanvas, piece) {
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.fillStyle = "#f8fafc";
    previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewContext.strokeStyle = "rgba(203, 213, 225, 0.75)";
    previewContext.lineWidth = 1;
    previewContext.strokeRect(0.5, 0.5, previewCanvas.width - 1, previewCanvas.height - 1);

    if (!piece) {
      return;
    }

    const matrixWidth = piece.matrix[0].length;
    const matrixHeight = piece.matrix.length;
    const offsetX = Math.floor((previewCanvas.width - matrixWidth * PREVIEW_CELL_SIZE) / 2);
    const offsetY = Math.floor((previewCanvas.height - matrixHeight * PREVIEW_CELL_SIZE) / 2);

    piece.matrix.forEach(function (pieceRow, rowIndex) {
      pieceRow.forEach(function (cell, colIndex) {
        if (!cell) {
          return;
        }

        drawCell(
          previewContext,
          offsetX + colIndex * PREVIEW_CELL_SIZE,
          offsetY + rowIndex * PREVIEW_CELL_SIZE,
          PREVIEW_CELL_SIZE,
          piece.color
        );
      });
    });
  }

  function render() {
    drawBoardGrid();
    drawPlacedBlocks();
    drawGhostPiece();
    drawActivePiece();
    drawPreview(holdContext, holdCanvas, holdPiece);
    drawPreview(nextContext, nextCanvas, nextPiece);
  }

  function updateStats() {
    scoreText.textContent = String(score);
    linesText.textContent = String(lines);
    levelText.textContent = String(level);
  }

  function updateStateMessage() {
    if (playState === "gameOver") {
      message.textContent = t("tetris.message.gameOver", { score });
      return;
    }

    if (playState === "paused") {
      message.textContent = t("tetris.message.paused");
      return;
    }

    if (playState === "running") {
      message.textContent = t("tetris.message.running");
      return;
    }

    message.textContent = t("tetris.message.start");
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    clearHorizontalRepeat();
    running = false;
  }

  function startLoop() {
    if (!running) {
      return;
    }

    if (timer) {
      clearInterval(timer);
    }

    timer = window.setInterval(function () {
      dropPiece();
    }, getDropInterval(level));
  }

  function collides(piece, rowOffset, colOffset, matrix) {
    const nextRowOffset = typeof rowOffset === "number" ? rowOffset : 0;
    const nextColOffset = typeof colOffset === "number" ? colOffset : 0;
    const nextMatrix = matrix || piece.matrix;

    for (let row = 0; row < nextMatrix.length; row += 1) {
      for (let col = 0; col < nextMatrix[row].length; col += 1) {
        if (!nextMatrix[row][col]) {
          continue;
        }

        const nextRow = piece.row + row + nextRowOffset;
        const nextCol = piece.col + col + nextColOffset;

        if (nextCol < 0 || nextCol >= COLS || nextRow >= ROWS) {
          return true;
        }

        if (nextRow >= 0 && board[nextRow][nextCol]) {
          return true;
        }
      }
    }

    return false;
  }

  function mergePiece() {
    currentPiece.matrix.forEach(function (pieceRow, rowOffset) {
      pieceRow.forEach(function (cell, colOffset) {
        if (!cell) {
          return;
        }

        const targetRow = currentPiece.row + rowOffset;
        const targetCol = currentPiece.col + colOffset;
        if (targetRow >= 0) {
          board[targetRow][targetCol] = currentPiece.color;
        }
      });
    });
  }

  function clearLines() {
    let cleared = 0;

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row].every(Boolean)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared += 1;
        row += 1;
      }
    }

    if (cleared === 0) {
      return;
    }

    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;

    const nextLevel = Math.floor(lines / 10) + 1;
    if (nextLevel !== level) {
      level = nextLevel;
      startLoop();
    }

    updateStats();
    message.textContent = t("tetris.message.cleared", { count: cleared });
  }

  function drawFromBag() {
    refillBagIfNeeded();
    return createPiece(bag.pop());
  }

  function resetPiecePosition(piece) {
    piece.row = 0;
    piece.col = Math.floor((COLS - piece.matrix[0].length) / 2);
  }

  function gameOver() {
    stop();
    playState = "gameOver";
    render();
    updateStateMessage();
  }

  function spawnPiece() {
    currentPiece = nextPiece || drawFromBag();
    resetPiecePosition(currentPiece);
    nextPiece = drawFromBag();
    holdUsed = false;

    if (collides(currentPiece, 0, 0)) {
      render();
      gameOver();
      return false;
    }

    render();
    return true;
  }

  function lockCurrentPiece() {
    mergePiece();
    clearLines();
    return spawnPiece();
  }

  function movePiece(colOffset) {
    if (!running || !currentPiece) {
      return false;
    }

    if (!collides(currentPiece, 0, colOffset)) {
      currentPiece.col += colOffset;
      render();
      return true;
    }

    return false;
  }

  function startHorizontalRepeat(direction) {
    clearHorizontalRepeat();

    if (!running) {
      return;
    }

    activeHorizontalDirection = direction;
    movePiece(direction);
    horizontalRepeatTimeoutId = window.setTimeout(function () {
      horizontalRepeatIntervalId = window.setInterval(function () {
        movePiece(direction);
      }, HORIZONTAL_REPEAT_INTERVAL);
    }, HORIZONTAL_REPEAT_DELAY);
  }

  function rotatePiece() {
    if (!running || !currentPiece) {
      return;
    }

    const rotated = rotateMatrixClockwise(currentPiece.matrix);
    const kicks = [0, -1, 1, -2, 2];

    for (let index = 0; index < kicks.length; index += 1) {
      const kick = kicks[index];
      if (!collides(currentPiece, 0, kick, rotated)) {
        currentPiece.matrix = rotated;
        currentPiece.col += kick;
        render();
        return;
      }
    }
  }

  function holdCurrentPiece() {
    if (!running || !currentPiece || holdUsed) {
      return;
    }

    const currentType = currentPiece.type;

    if (holdPiece) {
      const swappedPiece = createPiece(holdPiece.type);
      holdPiece = createPiece(currentType);
      currentPiece = swappedPiece;
      resetPiecePosition(currentPiece);
    } else {
      holdPiece = createPiece(currentType);
      currentPiece = nextPiece || drawFromBag();
      resetPiecePosition(currentPiece);
      nextPiece = drawFromBag();
    }

    holdUsed = true;

    if (collides(currentPiece, 0, 0)) {
      render();
      gameOver();
      return;
    }

    render();
  }

  function dropPiece() {
    if (!running || !currentPiece) {
      return false;
    }

    if (!collides(currentPiece, 1, 0)) {
      currentPiece.row += 1;
      render();
      return true;
    }

    return lockCurrentPiece();
  }

  function softDrop() {
    if (!running || !currentPiece) {
      return;
    }

    const moved = dropPiece();
    if (moved) {
      score += 1;
      updateStats();
    }
  }

  function hardDrop() {
    if (!running || !currentPiece) {
      return;
    }

    let distance = 0;
    while (!collides(currentPiece, 1, 0)) {
      currentPiece.row += 1;
      distance += 1;
    }

    if (distance > 0) {
      score += distance * 2;
      updateStats();
    }

    render();
    lockCurrentPiece();
  }

  function resetToReady() {
    stop();
    board = createEmptyBoard();
    bag = [];
    score = 0;
    lines = 0;
    level = 1;
    currentPiece = null;
    holdPiece = null;
    holdUsed = false;
    nextPiece = drawFromBag();
    playState = "ready";
    updateStats();
    spawnPiece();
    updateStateMessage();
    canvas.focus({ preventScroll: true });
  }

  function startGame() {
    if (playState === "gameOver") {
      resetToReady();
    }

    if (playState === "running") {
      return;
    }

    running = true;
    playState = "running";
    updateStateMessage();
    startLoop();
    canvas.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (playState !== "running") {
      return;
    }

    stop();
    playState = "paused";
    updateStateMessage();
    render();
  }

  function resumeGame() {
    if (playState !== "paused") {
      return;
    }

    running = true;
    playState = "running";
    updateStateMessage();
    startLoop();
    canvas.focus({ preventScroll: true });
  }

  function handleSpaceToggle() {
    if (playState === "running") {
      pauseGame();
      return;
    }

    if (playState === "paused") {
      resumeGame();
      return;
    }

    startGame();
  }

  function handleKeyDown(event) {
    if (event.code === "Space") {
      if (!event.repeat) {
        event.preventDefault();
        handleSpaceToggle();
      }
      return;
    }

    if (!KEY_SET.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (!running) {
      return;
    }

    if (event.key === "ArrowLeft") {
      if (!event.repeat) {
        startHorizontalRepeat(-1);
      }
      return;
    }

    if (event.key === "ArrowRight") {
      if (!event.repeat) {
        startHorizontalRepeat(1);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      rotatePiece();
      return;
    }

    if (event.key === "ArrowDown") {
      softDrop();
      return;
    }

    if (event.key === "Enter") {
      hardDrop();
      return;
    }

    if (event.key === "Shift" || event.key === "ShiftLeft" || event.key === "ShiftRight") {
      holdCurrentPiece();
    }
  }

  function handleKeyUp(event) {
    if (event.key === "ArrowLeft" && activeHorizontalDirection === -1) {
      clearHorizontalRepeat();
      return;
    }

    if (event.key === "ArrowRight" && activeHorizontalDirection === 1) {
      clearHorizontalRepeat();
    }
  }

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetToReady();
  });

  return {
    enter: resetToReady,
    leave: stop,
    handleKeyDown: handleKeyDown,
    handleKeyUp: handleKeyUp,
    refreshLocale: function () {
      updateStateMessage();
    }
  };
}
