const TILE_SIZE = 24;
const MAP_TEMPLATE = [
  "#####################",
  "#o........#........o#",
  "#.###.###.#.###.###.#",
  "#.#.....#...#.....#.#",
  "#.#.###.###.###.###.#",
  "#...................#",
  "#.###.#.#######.#.###",
  "#.....#....#....#...#",
  "#####.###.....###.###",
  "#.........#.........#",
  "#.###.##.....##.###.#",
  "#.#...#.......#...#.#",
  "#.#.###.##.##.###.#.#",
  "#...................#",
  "#.###.#.#######.#.###",
  "#...#.#...#...#.#...#",
  "###.#.###.#.###.#.###",
  "#o..#.....P.....#..o#",
  "#.####.###.#.###.####",
  "#...................#",
  "#####################"
];

const ROWS = MAP_TEMPLATE.length;
const COLS = MAP_TEMPLATE[0].length;
const WIDTH = COLS * TILE_SIZE;
const HEIGHT = ROWS * TILE_SIZE;
const PLAYER_SPEED = 0.108;
const GHOST_SPEED = 0.1;
const FRIGHTENED_SPEED = 0.076;
const RETURNING_SPEED = 0.145;
const FRIGHTENED_DURATION = 7 * 60;
const TURN_THRESHOLD = 0.14;
const PHASES = [
  { mode: "scatter", duration: 7 * 60 },
  { mode: "chase", duration: 20 * 60 },
  { mode: "scatter", duration: 7 * 60 },
  { mode: "chase", duration: 20 * 60 },
  { mode: "scatter", duration: 5 * 60 },
  { mode: "chase", duration: Infinity }
];
const GHOST_EAT_SCORES = [200, 400, 800, 1600];
const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  " ": "up",
  Space: "up",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right"
};
const DIRECTION_ORDER = ["up", "left", "down", "right"];
const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
const OPPOSITE_DIRECTIONS = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

const GHOST_DEFINITIONS = [
  {
    name: "blinky",
    color: "#ef4444",
    start: { col: 10, row: 10, dir: "left" },
    scatterTarget: { col: COLS - 2, row: 1 }
  },
  {
    name: "pinky",
    color: "#f472b6",
    start: { col: 9, row: 10, dir: "up" },
    scatterTarget: { col: 1, row: 1 }
  },
  {
    name: "inky",
    color: "#22d3ee",
    start: { col: 11, row: 10, dir: "up" },
    scatterTarget: { col: COLS - 2, row: ROWS - 2 }
  },
  {
    name: "clyde",
    color: "#fb923c",
    start: { col: 10, row: 11, dir: "left" },
    scatterTarget: { col: 1, row: ROWS - 2 }
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isNearCenter(value) {
  return Math.abs(value - Math.round(value)) <= TURN_THRESHOLD;
}

function snapToCenter(value) {
  return Math.round(value);
}

function isHorizontalDirection(dir) {
  return dir === "left" || dir === "right";
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function cloneMap() {
  return MAP_TEMPLATE.map(function (row) {
    return row.split("");
  });
}

function findPlayerStart() {
  for (let row = 0; row < ROWS; row += 1) {
    const col = MAP_TEMPLATE[row].indexOf("P");
    if (col !== -1) {
      return { col: col, row: row };
    }
  }

  return { col: 10, row: 17 };
}

function getTileCenterPixels(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2
  };
}

function createGhost(definition) {
  return {
    name: definition.name,
    color: definition.color,
    startCol: definition.start.col,
    startRow: definition.start.row,
    startDir: definition.start.dir,
    scatterTarget: definition.scatterTarget,
    col: definition.start.col,
    row: definition.start.row,
    dir: definition.start.dir,
    forceReverse: false,
    returning: false,
    animTime: 0
  };
}

export function createPacmanGame({
  canvas,
  btnRestart,
  btnUp,
  btnLeft,
  btnDown,
  btnRight,
  scoreText,
  livesText,
  message
}) {
  const context = canvas.getContext("2d");
  const playerStart = findPlayerStart();

  let level = cloneMap();
  let pelletsRemaining = 0;
  let ghosts = [];
  let pacman = null;
  let score = 0;
  let lives = 3;
  let running = false;
  let gameOver = false;
  let phaseIndex = 0;
  let phaseTimer = 0;
  let frightenedTimer = 0;
  let ghostEatChain = 0;
  let animationFrameId = null;
  let lastTimestamp = 0;

  canvas.tabIndex = 0;

  function tileAt(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
      return "#";
    }

    return level[row][col];
  }

  function isWall(col, row) {
    return tileAt(col, row) === "#";
  }

  function countPellets() {
    let total = 0;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (level[row][col] === "." || level[row][col] === "o") {
          total += 1;
        }
      }
    }

    pelletsRemaining = total;
  }

  function resetActors() {
    pacman = {
      col: playerStart.col,
      row: playerStart.row,
      dir: "left",
      queuedDir: "left",
      mouthTime: 0
    };

    ghosts = GHOST_DEFINITIONS.map(function (definition) {
      return createGhost(definition);
    });

    phaseIndex = 0;
    phaseTimer = 0;
    frightenedTimer = 0;
    ghostEatChain = 0;
  }

  function updateStats() {
    scoreText.textContent = String(score);
    livesText.textContent = String(lives);
  }

  function startNewGame() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    level = cloneMap();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (level[row][col] === "P") {
          level[row][col] = " ";
        }
      }
    }

    countPellets();
    score = 0;
    lives = 3;
    running = true;
    gameOver = false;
    lastTimestamp = 0;
    resetActors();
    updateStats();
    message.textContent = "用方向鍵控制小精靈，吃光所有豆子並避開鬼。";
    render();
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function resetAfterLifeLoss() {
    resetActors();
    running = true;
    gameOver = false;
    lastTimestamp = 0;
    message.textContent = `被鬼抓到了，剩下 ${lives} 條命。`;
    render();
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function isWalkableFrom(col, row, dir) {
    if (!dir) {
      return false;
    }

    const baseCol = Math.round(col);
    const baseRow = Math.round(row);
    const vector = DIRECTION_VECTORS[dir];
    const nextCol = baseCol + vector.x;
    const nextRow = baseRow + vector.y;
    return !isWall(nextCol, nextRow);
  }

  function canTurn(entity, dir) {
    if (!dir) {
      return false;
    }

    if (!isNearCenter(entity.col) || !isNearCenter(entity.row)) {
      return false;
    }

    return isWalkableFrom(snapToCenter(entity.col), snapToCenter(entity.row), dir);
  }

  function snapEntityToLane(entity, dir) {
    if (!dir) {
      return;
    }

    if (isHorizontalDirection(dir)) {
      entity.row = snapToCenter(entity.row);
      return;
    }

    entity.col = snapToCenter(entity.col);
  }

  function canContinueMoving(entity, dir) {
    if (!dir) {
      return false;
    }

    const row = snapToCenter(entity.row);
    const col = snapToCenter(entity.col);

    if (dir === "left") {
      return !isWall(Math.ceil(entity.col) - 1, row);
    }

    if (dir === "right") {
      return !isWall(Math.floor(entity.col) + 1, row);
    }

    if (dir === "up") {
      return !isWall(col, Math.ceil(entity.row) - 1);
    }

    return !isWall(col, Math.floor(entity.row) + 1);
  }

  function applyDirectionToPosition(position, dir) {
    const vector = DIRECTION_VECTORS[dir];
    return {
      col: Math.round(position.col) + vector.x,
      row: Math.round(position.row) + vector.y
    };
  }

  function consumeTile(col, row) {
    const tile = tileAt(col, row);
    if (tile !== "." && tile !== "o") {
      return;
    }

    level[row][col] = " ";
    pelletsRemaining -= 1;

    if (tile === ".") {
      score += 10;
    } else {
      score += 50;
      frightenedTimer = FRIGHTENED_DURATION;
      ghostEatChain = 0;
      ghosts.forEach(function (ghost) {
        if (!ghost.returning) {
          ghost.forceReverse = true;
        }
      });
      message.textContent = "能量豆啟動，現在可以反吃鬼。";
    }

    updateStats();

    if (pelletsRemaining <= 0) {
      running = false;
      gameOver = true;
      message.textContent = `你把迷宮清空了，總分 ${score}。`;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  }

  function updatePacman(delta) {
    pacman.mouthTime += delta;

    const steps = Math.max(1, Math.ceil(delta));
    const stepDistance = (PLAYER_SPEED * delta) / steps;

    for (let step = 0; step < steps; step += 1) {
      if (canTurn(pacman, pacman.queuedDir)) {
        pacman.col = snapToCenter(pacman.col);
        pacman.row = snapToCenter(pacman.row);
        pacman.dir = pacman.queuedDir;
      }

      if (!pacman.dir) {
        break;
      }

      snapEntityToLane(pacman, pacman.dir);

      if (!canContinueMoving(pacman, pacman.dir)) {
        pacman.col = snapToCenter(pacman.col);
        pacman.row = snapToCenter(pacman.row);
        pacman.dir = null;
        break;
      }

      pacman.col += DIRECTION_VECTORS[pacman.dir].x * stepDistance;
      pacman.row += DIRECTION_VECTORS[pacman.dir].y * stepDistance;
    }

    pacman.col = clamp(pacman.col, 1, COLS - 2);
    pacman.row = clamp(pacman.row, 1, ROWS - 2);
    consumeTile(Math.round(pacman.col), Math.round(pacman.row));
  }

  function getCurrentMode() {
    if (frightenedTimer > 0) {
      return "frightened";
    }

    return PHASES[phaseIndex].mode;
  }

  function getDistanceSquared(fromCol, fromRow, toCol, toRow) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    return dx * dx + dy * dy;
  }

  function getBlinkyPosition() {
    for (let index = 0; index < ghosts.length; index += 1) {
      if (ghosts[index].name === "blinky") {
        return {
          col: Math.round(ghosts[index].col),
          row: Math.round(ghosts[index].row)
        };
      }
    }

    return { col: Math.round(pacman.col), row: Math.round(pacman.row) };
  }

  function getGhostTarget(ghost) {
    if (ghost.returning) {
      return { col: ghost.startCol, row: ghost.startRow };
    }

    const mode = getCurrentMode();
    if (mode === "scatter") {
      return ghost.scatterTarget;
    }

    if (mode === "frightened") {
      return null;
    }

    const pacmanTile = {
      col: Math.round(pacman.col),
      row: Math.round(pacman.row)
    };
    const pacmanDirection = DIRECTION_VECTORS[pacman.dir] || { x: 0, y: 0 };

    if (ghost.name === "blinky") {
      return pacmanTile;
    }

    if (ghost.name === "pinky") {
      return {
        col: clamp(pacmanTile.col + pacmanDirection.x * 4, 1, COLS - 2),
        row: clamp(pacmanTile.row + pacmanDirection.y * 4, 1, ROWS - 2)
      };
    }

    if (ghost.name === "inky") {
      const blinkyTile = getBlinkyPosition();
      const aheadTile = {
        col: pacmanTile.col + pacmanDirection.x * 2,
        row: pacmanTile.row + pacmanDirection.y * 2
      };
      return {
        col: clamp(aheadTile.col * 2 - blinkyTile.col, 1, COLS - 2),
        row: clamp(aheadTile.row * 2 - blinkyTile.row, 1, ROWS - 2)
      };
    }

    const distanceToPacman = Math.sqrt(
      getDistanceSquared(Math.round(ghost.col), Math.round(ghost.row), pacmanTile.col, pacmanTile.row)
    );

    if (distanceToPacman > 6) {
      return pacmanTile;
    }

    return ghost.scatterTarget;
  }

  function chooseGhostDirection(ghost) {
    const currentCol = Math.round(ghost.col);
    const currentRow = Math.round(ghost.row);
    const reverseDirection = ghost.dir ? OPPOSITE_DIRECTIONS[ghost.dir] : null;
    let options = DIRECTION_ORDER.filter(function (dir) {
      return isWalkableFrom(currentCol, currentRow, dir);
    });

    if (ghost.forceReverse && reverseDirection && options.indexOf(reverseDirection) !== -1) {
      ghost.forceReverse = false;
      ghost.dir = reverseDirection;
      return;
    }

    if (options.length === 0) {
      ghost.dir = reverseDirection;
      return;
    }

    if (options.length > 1 && reverseDirection) {
      options = options.filter(function (dir) {
        return dir !== reverseDirection;
      });
    }

    if (getCurrentMode() === "frightened" && !ghost.returning) {
      const randomIndex = Math.floor(Math.random() * options.length);
      ghost.dir = options[randomIndex];
      return;
    }

    const target = getGhostTarget(ghost);
    let bestDirection = options[0];
    let bestDistance = Infinity;

    options.forEach(function (dir) {
      const nextTile = applyDirectionToPosition({ col: currentCol, row: currentRow }, dir);
      const distance = getDistanceSquared(
        nextTile.col,
        nextTile.row,
        target.col,
        target.row
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestDirection = dir;
      }
    });

    ghost.dir = bestDirection;
  }

  function moveGhost(ghost, delta) {
    ghost.animTime += delta;

    if (
      ghost.returning &&
      Math.round(ghost.col) === ghost.startCol &&
      Math.round(ghost.row) === ghost.startRow
    ) {
      ghost.returning = false;
      ghost.forceReverse = true;
    }

    chooseGhostDirection(ghost);

    const speed = ghost.returning
      ? RETURNING_SPEED
      : frightenedTimer > 0
        ? FRIGHTENED_SPEED
        : GHOST_SPEED;
    const steps = Math.max(1, Math.ceil(delta));
    const stepDistance = (speed * delta) / steps;

    for (let step = 0; step < steps; step += 1) {
      const currentCol = Math.round(ghost.col);
      const currentRow = Math.round(ghost.row);

      if (!isWalkableFrom(currentCol, currentRow, ghost.dir)) {
        chooseGhostDirection(ghost);
      }

      if (!ghost.dir || !isWalkableFrom(currentCol, currentRow, ghost.dir)) {
        break;
      }

      ghost.col += DIRECTION_VECTORS[ghost.dir].x * stepDistance;
      ghost.row += DIRECTION_VECTORS[ghost.dir].y * stepDistance;
    }
  }

  function handleGhostCollision(ghost) {
    const distance = Math.hypot(ghost.col - pacman.col, ghost.row - pacman.row);
    if (distance > 0.5 || ghost.returning) {
      return false;
    }

    if (frightenedTimer > 0) {
      const chainIndex = Math.min(ghostEatChain, GHOST_EAT_SCORES.length - 1);
      score += GHOST_EAT_SCORES[chainIndex];
      ghostEatChain += 1;
      ghost.returning = true;
      ghost.forceReverse = true;
      updateStats();
      message.textContent = `吃掉 ${ghost.name}，加了 ${GHOST_EAT_SCORES[chainIndex]} 分。`;
      return false;
    }

    lives -= 1;
    updateStats();

    if (lives <= 0) {
      running = false;
      gameOver = true;
      message.textContent = `遊戲結束，最終分數 ${score}。`;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return true;
    }

    running = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    resetAfterLifeLoss();
    return true;
  }

  function updateGhosts(delta) {
    for (let index = 0; index < ghosts.length; index += 1) {
      moveGhost(ghosts[index], delta);
      if (handleGhostCollision(ghosts[index])) {
        return;
      }
    }
  }

  function updateModes(delta) {
    if (frightenedTimer > 0) {
      frightenedTimer = Math.max(0, frightenedTimer - delta);
      if (frightenedTimer === 0 && running && !gameOver) {
        message.textContent = "能量效果結束，鬼恢復追擊。";
      }
      return;
    }

    const phase = PHASES[phaseIndex];
    if (!phase || !isFinite(phase.duration)) {
      return;
    }

    phaseTimer += delta;
    if (phaseTimer < phase.duration) {
      return;
    }

    phaseTimer = 0;
    phaseIndex = Math.min(phaseIndex + 1, PHASES.length - 1);
    ghosts.forEach(function (ghost) {
      if (!ghost.returning) {
        ghost.forceReverse = true;
      }
    });
  }

  function update(delta) {
    updateModes(delta);
    updatePacman(delta);
    if (!running || gameOver) {
      return;
    }
    updateGhosts(delta);
  }

  function drawMaze() {
    context.fillStyle = "#020617";
    context.fillRect(0, 0, WIDTH, HEIGHT);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const tile = tileAt(col, row);
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        if (tile === "#") {
          context.fillStyle = "#1d4ed8";
          drawRoundedRect(context, x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 7);
          context.fill();
          context.fillStyle = "#60a5fa";
          drawRoundedRect(context, x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10, 4);
          context.fill();
          continue;
        }

        if (tile === "." || tile === "o") {
          const center = getTileCenterPixels(col, row);
          context.beginPath();
          context.arc(center.x, center.y, tile === "o" ? 5 : 2.5, 0, Math.PI * 2);
          context.fillStyle = tile === "o" ? "#fef08a" : "#fde68a";
          context.fill();
        }
      }
    }
  }

  function drawPacman() {
    const center = getTileCenterPixels(pacman.col, pacman.row);
    const mouthAmount = 0.18 + (Math.sin(pacman.mouthTime * 0.4) + 1) * 0.11;
    let baseAngle = 0;

    if (pacman.dir === "left") {
      baseAngle = Math.PI;
    } else if (pacman.dir === "up") {
      baseAngle = -Math.PI / 2;
    } else if (pacman.dir === "down") {
      baseAngle = Math.PI / 2;
    }

    context.fillStyle = "#facc15";
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.arc(
      center.x,
      center.y,
      TILE_SIZE * 0.38,
      baseAngle + mouthAmount,
      baseAngle + Math.PI * 2 - mouthAmount
    );
    context.closePath();
    context.fill();
  }

  function drawGhost(ghost) {
    const center = getTileCenterPixels(ghost.col, ghost.row);
    const x = center.x - TILE_SIZE * 0.42;
    const y = center.y - TILE_SIZE * 0.42;
    const bodyWidth = TILE_SIZE * 0.84;
    const bodyHeight = TILE_SIZE * 0.84;
    const frightened = frightenedTimer > 0 && !ghost.returning;
    const bodyColor = frightened
      ? "#60a5fa"
      : ghost.returning
        ? "#cbd5e1"
        : ghost.color;

    context.fillStyle = bodyColor;
    context.beginPath();
    context.arc(center.x, y + TILE_SIZE * 0.28, TILE_SIZE * 0.34, Math.PI, 0);
    context.lineTo(x + bodyWidth, y + bodyHeight);

    const waveHeight = bodyHeight * 0.18;
    for (let index = 0; index < 4; index += 1) {
      const waveX = x + bodyWidth - index * (bodyWidth / 4);
      const direction = index % 2 === 0 ? 1 : -1;
      context.lineTo(waveX - bodyWidth / 8, y + bodyHeight - waveHeight * direction);
      context.lineTo(waveX - bodyWidth / 4, y + bodyHeight);
    }

    context.closePath();
    context.fill();

    if (ghost.returning) {
      context.fillStyle = "#0f172a";
      context.beginPath();
      context.arc(center.x - 5, center.y - 4, 3, 0, Math.PI * 2);
      context.arc(center.x + 5, center.y - 4, 3, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(center.x - 5, center.y - 2, 4.5, 0, Math.PI * 2);
    context.arc(center.x + 5, center.y - 2, 4.5, 0, Math.PI * 2);
    context.fill();

    const vector = DIRECTION_VECTORS[ghost.dir] || { x: 0, y: 0 };
    context.fillStyle = frightened ? "#1e293b" : "#0f172a";
    context.beginPath();
    context.arc(center.x - 5 + vector.x * 2, center.y - 2 + vector.y * 2, 2.2, 0, Math.PI * 2);
    context.arc(center.x + 5 + vector.x * 2, center.y - 2 + vector.y * 2, 2.2, 0, Math.PI * 2);
    context.fill();
  }

  function drawHud() {
    context.fillStyle = "rgba(2, 6, 23, 0.55)";
    drawRoundedRect(context, 10, 10, 150, 40, 12);
    context.fill();
    context.fillStyle = "#f8fafc";
    context.font = "bold 18px Arial";
    context.textAlign = "left";
    context.fillText(`豆子 ${pelletsRemaining}`, 24, 36);

    const phaseLabel = frightenedTimer > 0 ? "驚慌" : PHASES[phaseIndex].mode === "scatter" ? "散開" : "追擊";
    context.fillStyle = "rgba(2, 6, 23, 0.55)";
    drawRoundedRect(context, WIDTH - 122, 10, 112, 40, 12);
    context.fill();
    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.fillText(phaseLabel, WIDTH - 66, 36);
  }

  function render() {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    drawMaze();
    drawPacman();
    ghosts.forEach(drawGhost);
    drawHud();
  }

  function loop(timestamp) {
    if (!running) {
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const delta = clamp((timestamp - lastTimestamp) / 16.6667, 0.6, 1.8);
    lastTimestamp = timestamp;

    update(delta);
    render();

    if (running) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function queueDirection(direction) {
    pacman.queuedDir = direction;
  }

  function handleKeyDown(event) {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) {
      return;
    }

    event.preventDefault();
    if (!running || gameOver) {
      return;
    }

    queueDirection(direction);
  }

  function bindDirectionButton(button, direction) {
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.currentTarget.blur();
      if (!running || gameOver) {
        return;
      }
      queueDirection(direction);
      canvas.focus({ preventScroll: true });
    });
  }

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startNewGame();
  });

  bindDirectionButton(btnUp, "up");
  bindDirectionButton(btnLeft, "left");
  bindDirectionButton(btnDown, "down");
  bindDirectionButton(btnRight, "right");

  return {
    enter: startNewGame,
    leave: function () {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      running = false;
      gameOver = false;
    },
    handleKeyDown: handleKeyDown
  };
}
