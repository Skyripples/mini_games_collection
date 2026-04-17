import { t } from "../core/i18n.js";

const GRID_SIZE = 25;
const TILE_SIZE = 24;
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

    shuffle([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ]).forEach(function (direction) {
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

function getOpenCells(grid) {
  const cells = [];

  for (let y = 1; y < GRID_SIZE - 1; y += 1) {
    for (let x = 1; x < GRID_SIZE - 1; x += 1) {
      if (!grid[y][x] && !(x === START_CELL.x && y === START_CELL.y) && !(x === EXIT_CELL.x && y === EXIT_CELL.y)) {
        cells.push({ x: x, y: y });
      }
    }
  }

  return cells;
}

function pickRandomCells(grid, count, forbiddenKeys) {
  const cells = shuffle(getOpenCells(grid));
  const result = [];
  const seen = new Set(forbiddenKeys || []);

  cells.forEach(function (cell) {
    if (result.length >= count) {
      return;
    }

    const key = `${cell.x}:${cell.y}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(cell);
  });

  return result;
}

function buildDistanceMap(grid, targetX, targetY) {
  const distances = Array.from({ length: GRID_SIZE }, function () {
    return Array.from({ length: GRID_SIZE }, function () {
      return Infinity;
    });
  });
  const queue = [{ x: targetX, y: targetY }];
  let head = 0;

  distances[targetY][targetX] = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const baseDistance = distances[current.y][current.x];

    [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ].forEach(function (direction) {
      const nextX = current.x + direction.x;
      const nextY = current.y + direction.y;

      if (
        nextX < 0 ||
        nextY < 0 ||
        nextX >= GRID_SIZE ||
        nextY >= GRID_SIZE ||
        grid[nextY][nextX] ||
        distances[nextY][nextX] !== Infinity
      ) {
        return;
      }

      distances[nextY][nextX] = baseDistance + 1;
      queue.push({ x: nextX, y: nextY });
    });
  }

  return distances;
}

function formatScore(value) {
  return String(value);
}

export function createRoguelikeGame({
  canvas,
  btnRestart,
  scoreText,
  hpText,
  floorText,
  message
}) {
  const context = canvas.getContext("2d");

  let grid = createPerfectMaze();
  let player = { x: START_CELL.x, y: START_CELL.y };
  let score = 0;
  let hp = 3;
  let floor = 1;
  let enemies = [];
  let gems = [];
  let exitOpen = false;
  let gameOver = false;
  let messageKey = "roguelike.message.start";
  let messageParams = {};

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

  function updateHud() {
    scoreText.textContent = formatScore(score);
    hpText.textContent = String(hp);
    floorText.textContent = String(floor);
  }

  function isWalkable(x, y) {
    return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE && !grid[y][x];
  }

  function hasEnemyAt(x, y) {
    return enemies.some(function (enemy) {
      return enemy.x === x && enemy.y === y;
    });
  }

  function removeEnemyAt(x, y) {
    enemies = enemies.filter(function (enemy) {
      return !(enemy.x === x && enemy.y === y);
    });
  }

  function removeGemAt(x, y) {
    gems = gems.filter(function (gem) {
      return !(gem.x === x && gem.y === y);
    });
  }

  function generateFloor() {
    grid = createPerfectMaze();
    player = { x: START_CELL.x, y: START_CELL.y };
    exitOpen = false;

    const gemCount = 3 + Math.min(3, floor);
    const enemyCount = 2 + Math.min(4, floor);
    const forbidden = new Set([
      `${START_CELL.x}:${START_CELL.y}`,
      `${EXIT_CELL.x}:${EXIT_CELL.y}`
    ]);

    gems = pickRandomCells(grid, gemCount, forbidden);
    gems.forEach(function (gem) {
      forbidden.add(`${gem.x}:${gem.y}`);
    });

    enemies = pickRandomCells(grid, enemyCount, forbidden).map(function (cell) {
      return { x: cell.x, y: cell.y };
    });
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (grid[y][x]) {
          context.fillStyle = "#1f2937";
          context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          context.fillStyle = (x + y) % 2 === 0 ? "#eef2ff" : "#f8fafc";
          context.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    context.fillStyle = exitOpen ? "#22c55e" : "#94a3b8";
    context.fillRect(EXIT_CELL.x * TILE_SIZE + 2, EXIT_CELL.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    gems.forEach(function (gem) {
      context.fillStyle = "#facc15";
      context.beginPath();
      context.moveTo(gem.x * TILE_SIZE + TILE_SIZE / 2, gem.y * TILE_SIZE + 4);
      context.lineTo(gem.x * TILE_SIZE + TILE_SIZE - 4, gem.y * TILE_SIZE + TILE_SIZE / 2);
      context.lineTo(gem.x * TILE_SIZE + TILE_SIZE / 2, gem.y * TILE_SIZE + TILE_SIZE - 4);
      context.lineTo(gem.x * TILE_SIZE + 4, gem.y * TILE_SIZE + TILE_SIZE / 2);
      context.closePath();
      context.fill();
    });

    enemies.forEach(function (enemy) {
      context.fillStyle = "#ef4444";
      context.beginPath();
      context.arc(
        enemy.x * TILE_SIZE + TILE_SIZE / 2,
        enemy.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE * 0.34,
        0,
        Math.PI * 2
      );
      context.fill();
    });

    context.fillStyle = "#2563eb";
    context.beginPath();
    context.arc(
      player.x * TILE_SIZE + TILE_SIZE / 2,
      player.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.36,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  function collectGemIfNeeded() {
    const index = gems.findIndex(function (gem) {
      return gem.x === player.x && gem.y === player.y;
    });

    if (index >= 0) {
      gems.splice(index, 1);
      score += 50;
      updateHud();
      if (gems.length === 0) {
        exitOpen = true;
        setMessage("roguelike.message.exitReady");
      }
    }
  }

  function advanceFloor() {
    score += 150 + floor * 25;
    floor += 1;
    generateFloor();
    updateHud();
    setMessage("roguelike.message.floorClear", { floor: floor - 1 });
    draw();
    canvas.focus({ preventScroll: true });
  }

  function applyEnemyTurn() {
    if (enemies.length === 0 || gameOver) {
      return;
    }

    const distanceMap = buildDistanceMap(grid, player.x, player.y);
    const occupied = new Set(enemies.map(function (enemy) {
      return `${enemy.x}:${enemy.y}`;
    }));
    let damageTaken = 0;

    enemies = enemies.map(function (enemy) {
      let bestX = enemy.x;
      let bestY = enemy.y;
      let bestDistance = distanceMap[enemy.y][enemy.x];

      [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 }
      ].forEach(function (direction) {
        const nextX = enemy.x + direction.x;
        const nextY = enemy.y + direction.y;
        const nextKey = `${nextX}:${nextY}`;

        if (
          nextX < 0 ||
          nextY < 0 ||
          nextX >= GRID_SIZE ||
          nextY >= GRID_SIZE ||
          grid[nextY][nextX] ||
          (occupied.has(nextKey) && !(nextX === enemy.x && nextY === enemy.y))
        ) {
          return;
        }

        const nextDistance = distanceMap[nextY][nextX];
        if (nextDistance < bestDistance) {
          bestDistance = nextDistance;
          bestX = nextX;
          bestY = nextY;
        }
      });

      if (bestX === player.x && bestY === player.y) {
        damageTaken += 1;
        return enemy;
      }

      occupied.delete(`${enemy.x}:${enemy.y}`);
      occupied.add(`${bestX}:${bestY}`);
      return { x: bestX, y: bestY };
    });

    if (damageTaken > 0) {
      hp = Math.max(0, hp - damageTaken);
      updateHud();
      if (hp <= 0) {
        gameOver = true;
        setMessage("roguelike.message.gameOver", { score: score });
      }
    }
  }

  function maybeClearFloor() {
    if (exitOpen && player.x === EXIT_CELL.x && player.y === EXIT_CELL.y) {
      advanceFloor();
      return true;
    }

    return false;
  }

  function movePlayer(deltaX, deltaY) {
    if (gameOver) {
      return;
    }

    const nextX = player.x + deltaX;
    const nextY = player.y + deltaY;

    if (!isWalkable(nextX, nextY)) {
      return;
    }

    player = { x: nextX, y: nextY };
    score += 1;

    if (hasEnemyAt(player.x, player.y)) {
      removeEnemyAt(player.x, player.y);
      score += 120;
    }

    collectGemIfNeeded();
    updateHud();

    if (gameOver) {
      draw();
      return;
    }

    if (maybeClearFloor()) {
      return;
    }

    applyEnemyTurn();
    draw();
    maybeClearFloor();
  }

  function handleKeyDown(event) {
    const delta = MOVE_KEYS.get(event.key);

    if (!delta) {
      return;
    }

    event.preventDefault();
    movePlayer(delta.x, delta.y);
  }

  function resetGame() {
    gameOver = false;
    score = 0;
    hp = 3;
    floor = 1;
    generateFloor();
    setMessage("roguelike.message.start");
    updateHud();
    draw();
    canvas.focus({ preventScroll: true });
  }

  if (btnRestart) {
    btnRestart.addEventListener("click", resetGame);
  }

  function enter() {
    resetGame();
  }

  function leave() {
    // Turn-based game, nothing to clean up.
  }

  function refreshLocale() {
    refreshMessage();
    updateHud();
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
