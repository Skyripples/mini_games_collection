import { t } from "../core/i18n.js";

const GRID_SIZE = 4;
const DEFAULT_CELL_SIZE = 75;
const DEFAULT_GAP_SIZE = 8;
const MOVE_DURATION = 150;

export function createGame2048({ boardElement, btnRestart, scoreText, message }) {
  const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  let board = [];
  let score = 0;
  let gameOver = false;
  let hasWon = false;
  let animating = false;
  let animationTimeoutId = null;
  let messageKey = "2048.message.start";

  boardElement.tabIndex = 0;

  function setMessage(key) {
    messageKey = key;
    message.textContent = t(key);
  }

  function createEmptyBoard() {
    board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  }

  function copyBoard() {
    return board.map((row) => [...row]);
  }

  function boardsEqual(boardA, boardB) {
    return JSON.stringify(boardA) === JSON.stringify(boardB);
  }

  function getEmptyCells() {
    const emptyCells = [];

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    return emptyCells;
  }

  function addRandomTile() {
    const emptyCells = getEmptyCells();
    if (emptyCells.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    board[row][col] = Math.random() < 0.9 ? 2 : 4;
    return { row, col };
  }

  function getTileClass(value) {
    if (value > 2048) {
      return "tile-super";
    }

    return `tile-${value}`;
  }

  function getBoardMetrics() {
    const boardStyles = window.getComputedStyle(boardElement);
    const padding = parseFloat(boardStyles.paddingLeft) || DEFAULT_GAP_SIZE;
    const backgroundElement = boardElement.querySelector(".board-2048-background");
    const backgroundStyles = backgroundElement
      ? window.getComputedStyle(backgroundElement)
      : null;
    const gap = backgroundStyles
      ? parseFloat(backgroundStyles.columnGap) || DEFAULT_GAP_SIZE
      : DEFAULT_GAP_SIZE;
    const contentWidth = boardElement.clientWidth - padding * 2;
    const cellSize =
      contentWidth > 0
        ? (contentWidth - gap * (GRID_SIZE - 1)) / GRID_SIZE
        : DEFAULT_CELL_SIZE;

    return {
      cellSize,
      gap
    };
  }

  function getTileOffset(row, col) {
    const { cellSize, gap } = getBoardMetrics();
    const distance = cellSize + gap;
    return {
      x: col * distance,
      y: row * distance
    };
  }

  function createBoardShell() {
    const background = document.createElement("div");
    background.className = "board-2048-background";

    for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
      const cell = document.createElement("div");
      cell.className = "board-2048-bg-cell";
      background.appendChild(cell);
    }

    const tilesLayer = document.createElement("div");
    tilesLayer.className = "board-2048-tiles-layer";

    boardElement.innerHTML = "";
    boardElement.appendChild(background);
    boardElement.appendChild(tilesLayer);

    return tilesLayer;
  }

  function render(renderBoard = board, options = {}) {
    const {
      mergedCells = [],
      newCells = [],
      showTiles = true
    } = options;
    const mergedSet = new Set(mergedCells.map(({ row, col }) => `${row},${col}`));
    const newSet = new Set(newCells.map(({ row, col }) => `${row},${col}`));
    const tilesLayer = createBoardShell();

    if (showTiles) {
      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
          const value = renderBoard[row][col];
          if (value === 0) {
            continue;
          }

          const tile = document.createElement("div");
          const { x, y } = getTileOffset(row, col);
          tile.className = `tile-2048-cell board-2048-tile ${getTileClass(value)}`;
          tile.style.transform = `translate(${x}px, ${y}px)`;
          tile.textContent = String(value);

          const key = `${row},${col}`;
          if (mergedSet.has(key)) {
            tile.classList.add("merged-tile");
          }
          if (newSet.has(key)) {
            tile.classList.add("new-tile");
          }

          tilesLayer.appendChild(tile);
        }
      }
    }

    scoreText.textContent = String(score);
  }

  function getLinePositions(direction, lineIndex) {
    if (direction === "left") {
      return Array.from({ length: GRID_SIZE }, (_, index) => ({ row: lineIndex, col: index }));
    }

    if (direction === "right") {
      return Array.from({ length: GRID_SIZE }, (_, index) => ({
        row: lineIndex,
        col: GRID_SIZE - 1 - index
      }));
    }

    if (direction === "up") {
      return Array.from({ length: GRID_SIZE }, (_, index) => ({ row: index, col: lineIndex }));
    }

    return Array.from({ length: GRID_SIZE }, (_, index) => ({
      row: GRID_SIZE - 1 - index,
      col: lineIndex
    }));
  }

  function processLine(sourceBoard, positions) {
    const entries = positions
      .map(({ row, col }) => ({
        row,
        col,
        value: sourceBoard[row][col]
      }))
      .filter((entry) => entry.value !== 0);

    const values = Array(GRID_SIZE).fill(0);
    const moves = [];
    const mergedCells = [];
    let scoreDelta = 0;
    let targetIndex = 0;
    let entryIndex = 0;

    while (entryIndex < entries.length) {
      const current = entries[entryIndex];
      const target = positions[targetIndex];
      const next = entries[entryIndex + 1];

      if (next && next.value === current.value) {
        values[targetIndex] = current.value * 2;
        scoreDelta += current.value * 2;
        mergedCells.push({ row: target.row, col: target.col });

        moves.push({
          fromRow: current.row,
          fromCol: current.col,
          toRow: target.row,
          toCol: target.col,
          value: current.value
        });
        moves.push({
          fromRow: next.row,
          fromCol: next.col,
          toRow: target.row,
          toCol: target.col,
          value: next.value
        });

        entryIndex += 2;
      } else {
        values[targetIndex] = current.value;
        moves.push({
          fromRow: current.row,
          fromCol: current.col,
          toRow: target.row,
          toCol: target.col,
          value: current.value
        });
        entryIndex += 1;
      }

      targetIndex += 1;
    }

    return {
      values,
      moves,
      mergedCells,
      scoreDelta
    };
  }

  function getMoveResult(direction) {
    const sourceBoard = copyBoard();
    const nextBoard = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    const moves = [];
    const mergedCells = [];
    let scoreDelta = 0;

    for (let lineIndex = 0; lineIndex < GRID_SIZE; lineIndex += 1) {
      const positions = getLinePositions(direction, lineIndex);
      const result = processLine(sourceBoard, positions);
      scoreDelta += result.scoreDelta;
      moves.push(...result.moves);
      mergedCells.push(...result.mergedCells);

      result.values.forEach((value, index) => {
        const target = positions[index];
        nextBoard[target.row][target.col] = value;
      });
    }

    return {
      sourceBoard,
      nextBoard,
      moves,
      mergedCells,
      scoreDelta,
      moved: !boardsEqual(sourceBoard, nextBoard)
    };
  }

  function createMovingTile(move) {
    const tile = document.createElement("div");
    const fromOffset = getTileOffset(move.fromRow, move.fromCol);
    const toOffset = getTileOffset(move.toRow, move.toCol);

    tile.className = `tile-2048-cell board-2048-tile board-2048-moving-tile ${getTileClass(move.value)}`;
    tile.style.transform = `translate(${fromOffset.x}px, ${fromOffset.y}px)`;
    tile.textContent = String(move.value);

    requestAnimationFrame(() => {
      tile.style.transform = `translate(${toOffset.x}px, ${toOffset.y}px)`;
    });

    return tile;
  }

  function clearAnimationTimeout() {
    if (animationTimeoutId) {
      clearTimeout(animationTimeoutId);
      animationTimeoutId = null;
    }
  }

  function checkWin() {
    return board.some((row) => row.some((value) => value === 2048));
  }

  function canMove() {
    if (getEmptyCells().length > 0) {
      return true;
    }

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const value = board[row][col];

        if (row < GRID_SIZE - 1 && board[row + 1][col] === value) {
          return true;
        }

        if (col < GRID_SIZE - 1 && board[row][col + 1] === value) {
          return true;
        }
      }
    }

    return false;
  }

  function finalizeMove(nextBoard, mergedCells) {
    board = nextBoard.map((row) => [...row]);
    const newTile = addRandomTile();
    animating = false;
    render(board, {
      mergedCells,
      newCells: newTile ? [newTile] : []
    });

    if (!hasWon && checkWin()) {
      hasWon = true;
      message.textContent = "恭喜，你達成 2048 了！";
    } else if (!canMove()) {
      gameOver = true;
      message.textContent = "遊戲結束，已經沒有可以移動的空間。";
    }
  }

  function animateMove(result) {
    animating = true;
    render(result.sourceBoard, { showTiles: false });

    const animationLayer = document.createElement("div");
    animationLayer.className = "board-2048-animation-layer";

    result.moves.forEach((move) => {
      animationLayer.appendChild(createMovingTile(move));
    });

    boardElement.appendChild(animationLayer);
    scoreText.textContent = String(score + result.scoreDelta);
    clearAnimationTimeout();
    animationTimeoutId = window.setTimeout(() => {
      score += result.scoreDelta;
      finalizeMove(result.nextBoard, result.mergedCells);
    }, MOVE_DURATION + 20);
  }

  function reset() {
    clearAnimationTimeout();
    createEmptyBoard();
    score = 0;
    gameOver = false;
    hasWon = false;
    animating = false;
    message.textContent = "用方向鍵操作，上下左右滑動方塊。";
    addRandomTile();
    addRandomTile();
    render();
    boardElement.focus({ preventScroll: true });
  }

  function handleResize() {
    if (animating || boardElement.offsetParent === null || boardElement.clientWidth === 0) {
      return;
    }

    render();
  }

  function handleKeyDown(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (gameOver || animating) {
      return;
    }

    let direction = null;
    if (event.key === "ArrowLeft") {
      direction = "left";
    } else if (event.key === "ArrowRight") {
      direction = "right";
    } else if (event.key === "ArrowUp") {
      direction = "up";
    } else if (event.key === "ArrowDown") {
      direction = "down";
    }

    if (!direction) {
      return;
    }

    const result = getMoveResult(direction);
    if (!result.moved) {
      return;
    }

    animateMove(result);
  }

  function leave() {
    clearAnimationTimeout();
    animating = false;
  }

  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    reset();
  });
  window.addEventListener("resize", handleResize);

  return {
    enter: reset,
    leave,
    handleKeyDown
  };
}
