import { t } from "../core/i18n.js";

const GRID_SIZE = 31;
const TILE_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;
const START_CELL = { x: 1, y: 1 };
const EXIT_CELL = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
const MOVE_KEYS = new Map([
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
  ["w", { x: 0, y: -1 }],
  ["W", { x: 0, y: -1 }],
  ["a", { x: -1, y: 0 }],
  ["A", { x: -1, y: 0 }],
  ["s", { x: 0, y: 1 }],
  ["S", { x: 0, y: 1 }],
  ["d", { x: 1, y: 0 }],
  ["D", { x: 1, y: 0 }]
]);

function shuffle(items) {
  const result = items.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = temp;
  }

  return result;
}

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, function () {
    return Array.from({ length: GRID_SIZE }, function () {
      return true;
    });
  });
}

function createPerfectMaze() {
  const grid = createEmptyGrid();
  const visited = Array.from({ length: (GRID_SIZE - 1) / 2 }, function () {
    return Array.from({ length: (GRID_SIZE - 1) / 2 }, function () {
      return false;
    });
  });

  function carve(cellX, cellY) {
    visited[cellY][cellX] = true;
    grid[cellY * 2 + 1][cellX * 2 + 1] = false;

    const directions = shuffle([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ]);

    directions.forEach(function (direction) {
      const nextX = cellX + direction.x;
      const nextY = cellY + direction.y;

      if (
        nextX < 0 ||
        nextY < 0 ||
        nextX >= visited[0].length ||
        nextY >= visited.length ||
        visited[nextY][nextX]
      ) {
        return;
      }

      grid[cellY * 2 + 1 + direction.y][cellX * 2 + 1 + direction.x] = false;
      carve(nextX, nextY);
    });
  }

  carve(0, 0);
  grid[START_CELL.y][START_CELL.x] = false;
  grid[EXIT_CELL.y][EXIT_CELL.x] = false;

  return grid;
}

function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function drawCell(context, x, y, color) {
  context.fillStyle = color;
  context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

export function createMazeGame({
  canvas,
  btnRestart,
  stepsText,
  timeText,
  message
}) {
  const context = canvas.getContext("2d");

  let grid = createPerfectMaze();
  let player = { x: START_CELL.x, y: START_CELL.y };
  let steps = 0;
  let gameState = "ready";
  let messageKey = "maze.message.start";
  let messageParams = {};
  let timerId = null;
  let startedAt = Date.now();
  let completedElapsedMs = 0;

  canvas.tabIndex = 0;
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  function setMessage(key, params) {
    messageKey = key;
    messageParams = params || {};
    message.textContent = t(key, messageParams);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function updateStats() {
    stepsText.textContent = String(steps);
    const elapsedMs = gameState === "finished" ? completedElapsedMs : Date.now() - startedAt;
    timeText.textContent = formatElapsedTime(elapsedMs);
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(updateStats, 250);
  }

  function isWalkable(x, y) {
    return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE && !grid[y][x];
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (grid[y][x]) {
          drawCell(context, x, y, "#1e293b");
        } else {
          drawCell(context, x, y, y === 0 || x === 0 ? "#f8fafc" : "#eef2ff");
        }
      }
    }

    context.fillStyle = "#22c55e";
    context.fillRect(EXIT_CELL.x * TILE_SIZE + 2, EXIT_CELL.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    context.fillStyle = "#f59e0b";
    context.beginPath();
    context.arc(
      player.x * TILE_SIZE + TILE_SIZE / 2,
      player.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.34,
      0,
      Math.PI * 2
    );
    context.fill();

    context.fillStyle = "#ffffff";
    context.font = "bold 18px sans-serif";
    context.fillText(gameState === "finished" ? "FINISH" : "START", 14, 24);
  }

  function resetGame() {
    stopTimer();
    grid = createPerfectMaze();
    player = { x: START_CELL.x, y: START_CELL.y };
    steps = 0;
    gameState = "playing";
    startedAt = Date.now();
    completedElapsedMs = 0;
    setMessage("maze.message.start");
    updateStats();
    draw();
    startTimer();
    canvas.focus({ preventScroll: true });
  }

  function finishGame() {
    gameState = "finished";
    completedElapsedMs = Date.now() - startedAt;
    stopTimer();
    updateStats();
    setMessage("maze.message.win", {
      steps: steps,
      time: formatElapsedTime(completedElapsedMs)
    });
    draw();
  }

  function movePlayer(deltaX, deltaY) {
    if (gameState !== "playing") {
      return;
    }

    const nextX = player.x + deltaX;
    const nextY = player.y + deltaY;

    if (!isWalkable(nextX, nextY)) {
      return;
    }

    player = { x: nextX, y: nextY };
    steps += 1;
    updateStats();
    draw();

    if (player.x === EXIT_CELL.x && player.y === EXIT_CELL.y) {
      finishGame();
    }
  }

  function handleKeyDown(event) {
    const delta = MOVE_KEYS.get(event.key);

    if (!delta) {
      return;
    }

    event.preventDefault();
    movePlayer(delta.x, delta.y);
  }

  if (btnRestart) {
    btnRestart.addEventListener("click", resetGame);
  }

  function enter() {
    resetGame();
  }

  function leave() {
    stopTimer();
  }

  function refreshLocale() {
    refreshMessage();
    updateStats();
    draw();
  }

  resetGame();

  return {
    enter: enter,
    leave: leave,
    refreshLocale: refreshLocale,
    handleKeyDown: handleKeyDown
  };
}
