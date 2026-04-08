const WIDTH = 800;
const HEIGHT = 240;
const GROUND_Y = 188;
const DINO_X = 74;
const STAND_WIDTH = 42;
const STAND_HEIGHT = 48;
const DUCK_WIDTH = 56;
const DUCK_HEIGHT = 30;
const GRAVITY = 0.72;
const JUMP_VELOCITY = -13.5;
const INITIAL_SPEED = 6.4;
const MAX_SPEED = 14;
const MIN_SPAWN_GAP = 150;
const MAX_SPAWN_GAP = 260;
const KEY_SET = new Set(["ArrowUp", "ArrowDown", " ", "Space", "w", "W", "s", "S"]);

const CACTUS_TYPES = [
  { width: 20, height: 42, score: 20 },
  { width: 32, height: 50, score: 28 },
  { width: 46, height: 36, score: 34 }
];

const BIRD_TYPES = [
  { width: 42, height: 26, y: 132, score: 42 },
  { width: 42, height: 26, y: 160, score: 46 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
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

export function createDinoGame({
  canvas,
  btnRestart,
  btnJump,
  btnDuck,
  scoreText,
  speedText,
  message
}) {
  const context = canvas.getContext("2d");

  let animationFrameId = null;
  let running = false;
  let gameOver = false;
  let score = 0;
  let speed = INITIAL_SPEED;
  let spawnTimer = 0;
  let nextSpawnDelay = 0;
  let groundOffset = 0;
  let lastTimestamp = 0;
  let clouds = [];
  let obstacles = [];
  let dino = null;

  canvas.tabIndex = 0;

  function updateStats() {
    scoreText.textContent = String(Math.floor(score));
    speedText.textContent = `${speed.toFixed(1)}x`;
  }

  function createDinoState() {
    return {
      x: DINO_X,
      y: GROUND_Y,
      vy: 0,
      width: STAND_WIDTH,
      height: STAND_HEIGHT,
      onGround: true,
      ducking: false,
      animationTime: 0
    };
  }

  function createCloud() {
    return {
      x: WIDTH + randomBetween(0, 220),
      y: randomBetween(36, 106),
      width: randomBetween(34, 52),
      height: randomBetween(16, 24),
      speedMultiplier: randomBetween(0.2, 0.48)
    };
  }

  function seedClouds() {
    clouds = [];
    for (let index = 0; index < 4; index += 1) {
      const cloud = createCloud();
      cloud.x = index * 210 + randomBetween(0, 80);
      clouds.push(cloud);
    }
  }

  function getNextSpawnDelay() {
    const difficultyFactor = clamp((speed - INITIAL_SPEED) / 8, 0, 1);
    const minGap = MIN_SPAWN_GAP - difficultyFactor * 18;
    const maxGap = MAX_SPAWN_GAP - difficultyFactor * 24;
    return randomBetween(minGap, maxGap);
  }

  function resetSpawnCycle() {
    spawnTimer = 0;
    nextSpawnDelay = getNextSpawnDelay();
  }

  function resetGame() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    running = true;
    gameOver = false;
    score = 0;
    speed = INITIAL_SPEED;
    groundOffset = 0;
    lastTimestamp = 0;
    obstacles = [];
    dino = createDinoState();
    seedClouds();
    resetSpawnCycle();
    updateStats();
    message.textContent = "按空白鍵或上方向鍵跳躍，下方向鍵可以蹲下閃避。";
    render();
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function buildObstacle() {
    const wantsBird = score > 120 && Math.random() < 0.34;

    if (wantsBird) {
      const birdTemplate = BIRD_TYPES[Math.floor(Math.random() * BIRD_TYPES.length)];
      return {
        kind: "bird",
        x: WIDTH + randomBetween(20, 140),
        y: birdTemplate.y,
        width: birdTemplate.width,
        height: birdTemplate.height,
        score: birdTemplate.score,
        flapTime: 0
      };
    }

    const cactusTemplate = CACTUS_TYPES[Math.floor(Math.random() * CACTUS_TYPES.length)];
    return {
      kind: "cactus",
      x: WIDTH + randomBetween(12, 120),
      y: GROUND_Y,
      width: cactusTemplate.width,
      height: cactusTemplate.height,
      score: cactusTemplate.score
    };
  }

  function canSpawnObstacle(candidate) {
    const lastObstacle = obstacles[obstacles.length - 1];

    if (!lastObstacle) {
      return true;
    }

    const pairGap =
      (lastObstacle.kind === "bird" || candidate.kind === "bird" ? 250 : 220) +
      lastObstacle.width * 0.55 +
      candidate.width * 0.45 +
      speed * 10;

    return candidate.x - lastObstacle.x >= pairGap;
  }

  function spawnObstacle() {
    const candidate = buildObstacle();

    if (!canSpawnObstacle(candidate)) {
      return false;
    }

    obstacles.push(candidate);
    return true;
  }

  function jump() {
    if (!running || gameOver || !dino.onGround) {
      return;
    }

    dino.vy = JUMP_VELOCITY;
    dino.onGround = false;
    dino.ducking = false;
  }

  function setDuck(ducking) {
    if (!running || gameOver) {
      return;
    }

    if (!dino.onGround) {
      if (ducking && dino.vy < 10.8) {
        dino.vy += 1.4;
      }
      return;
    }

    dino.ducking = ducking;
  }

  function updateDino(delta) {
    dino.animationTime += delta;
    dino.width = dino.ducking && dino.onGround ? DUCK_WIDTH : STAND_WIDTH;
    dino.height = dino.ducking && dino.onGround ? DUCK_HEIGHT : STAND_HEIGHT;

    if (!dino.onGround) {
      dino.vy += GRAVITY * delta;
      dino.y += dino.vy * delta;

      if (dino.y >= GROUND_Y) {
        dino.y = GROUND_Y;
        dino.vy = 0;
        dino.onGround = true;
      }
    } else {
      dino.y = GROUND_Y;
    }
  }

  function updateClouds(delta) {
    clouds.forEach((cloud) => {
      cloud.x -= speed * cloud.speedMultiplier * delta;
      if (cloud.x + cloud.width < -20) {
        const replacement = createCloud();
        cloud.x = WIDTH + replacement.width + randomBetween(40, 220);
        cloud.y = replacement.y;
        cloud.width = replacement.width;
        cloud.height = replacement.height;
        cloud.speedMultiplier = replacement.speedMultiplier;
      }
    });
  }

  function updateObstacles(delta) {
    obstacles.forEach((obstacle) => {
      obstacle.x -= speed * delta;
      if (obstacle.kind === "bird") {
        obstacle.flapTime += delta;
      }
    });

    while (obstacles.length > 0 && obstacles[0].x + obstacles[0].width < -40) {
      addObstacleScore(obstacles[0].score);
      obstacles.shift();
    }

    spawnTimer += speed * delta;
    if (spawnTimer >= nextSpawnDelay) {
      if (spawnObstacle()) {
        resetSpawnCycle();
      }
    }
  }

  function addObstacleScore(points) {
    score += points;
    updateStats();
  }

  function getDinoBounds() {
    const marginX = dino.ducking ? 8 : 7;
    const marginTop = 4;
    const marginBottom = 2;

    return {
      left: dino.x + marginX,
      right: dino.x + dino.width - marginX,
      top: dino.y - dino.height + marginTop,
      bottom: dino.y - marginBottom
    };
  }

  function getObstacleBounds(obstacle) {
    if (obstacle.kind === "bird") {
      return {
        left: obstacle.x + 5,
        right: obstacle.x + obstacle.width - 5,
        top: obstacle.y - obstacle.height + 4,
        bottom: obstacle.y - 4
      };
    }

    return {
      left: obstacle.x + 4,
      right: obstacle.x + obstacle.width - 4,
      top: obstacle.y - obstacle.height + 4,
      bottom: obstacle.y - 2
    };
  }

  function rectanglesIntersect(rectA, rectB) {
    return (
      rectA.left < rectB.right &&
      rectA.right > rectB.left &&
      rectA.top < rectB.bottom &&
      rectA.bottom > rectB.top
    );
  }

  function checkCollision() {
    const dinoBounds = getDinoBounds();

    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacleBounds = getObstacleBounds(obstacles[index]);
      if (rectanglesIntersect(dinoBounds, obstacleBounds)) {
        gameOver = true;
        running = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        message.textContent = `撞上障礙了，最終分數 ${Math.floor(score)}。`;
        render();
        return true;
      }
    }

    return false;
  }

  function updateGround(delta) {
    groundOffset += speed * 5.6 * delta;
    if (groundOffset >= WIDTH) {
      groundOffset -= WIDTH;
    }
  }

  function update(delta) {
    speed = Math.min(MAX_SPEED, INITIAL_SPEED + score / 450);
    updateDino(delta);
    updateClouds(delta);
    updateObstacles(delta);
    updateGround(delta);
    score += delta * 1.9;
    updateStats();
    checkCollision();
  }

  function drawSky() {
    const skyGradient = context.createLinearGradient(0, 0, 0, HEIGHT);
    skyGradient.addColorStop(0, "#f8fafc");
    skyGradient.addColorStop(1, "#e2e8f0");
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawCloud(cloud) {
    context.fillStyle = "rgba(148, 163, 184, 0.38)";
    context.beginPath();
    context.ellipse(cloud.x, cloud.y, cloud.width * 0.36, cloud.height * 0.34, 0, 0, Math.PI * 2);
    context.ellipse(
      cloud.x + cloud.width * 0.24,
      cloud.y - 5,
      cloud.width * 0.3,
      cloud.height * 0.42,
      0,
      0,
      Math.PI * 2
    );
    context.ellipse(
      cloud.x + cloud.width * 0.52,
      cloud.y,
      cloud.width * 0.34,
      cloud.height * 0.3,
      0,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  function drawGround() {
    context.fillStyle = "#94a3b8";
    context.fillRect(0, GROUND_Y + 3, WIDTH, 3);
    context.fillStyle = "#64748b";
    context.fillRect(0, GROUND_Y + 6, WIDTH, HEIGHT - GROUND_Y - 6);

    context.strokeStyle = "#475569";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-groundOffset, HEIGHT - 18);
    for (let x = -groundOffset; x <= WIDTH + 40; x += 34) {
      const y = HEIGHT - 18 + ((Math.floor(x / 34) % 2 === 0) ? 2 : -2);
      context.lineTo(x, y);
    }
    context.stroke();
  }

  function drawDino() {
    const left = dino.x;
    const top = dino.y - dino.height;
    const legFrame = Math.floor(dino.animationTime / 7) % 2;

    context.fillStyle = "#0f172a";

    if (dino.ducking && dino.onGround) {
      context.fillRect(left + 6, top + 8, 34, 18);
      context.fillRect(left + 18, top, 16, 12);
      context.fillRect(left + 36, top + 2, 16, 10);
      context.fillRect(left + 44, top + 6, 10, 6);
      context.fillRect(left, top + 12, 10, 10);
      context.fillRect(left + 10, top + 18, 14, 8);
      context.fillRect(left + 12, top + 22, 6, 8);
      context.fillRect(left + 30, top + 22, 6, 8);
      context.fillRect(left + 10, top + 28, 5, 2);
      context.fillRect(left + 32, top + 28, 5, 2);
    } else {
      context.fillRect(left + 12, top + 10, 22, 28);
      context.fillRect(left + 24, top, 16, 18);
      context.fillRect(left + 36, top + 4, 14, 10);
      context.fillRect(left + 43, top + 8, 8, 6);
      context.fillRect(left + 8, top + 16, 10, 8);
      context.fillRect(left + 10, top + 22, 6, 10);
      context.fillRect(left + 18, top + 38, 6, 10);
      context.fillRect(left + 28, top + 38, 6, 10);

      if (legFrame === 0) {
        context.fillRect(left + 16, top + 38, 6, 10);
        context.fillRect(left + 30, top + 38, 6, 6);
      } else {
        context.fillRect(left + 16, top + 38, 6, 6);
        context.fillRect(left + 30, top + 38, 6, 10);
      }
    }

    context.fillStyle = "#f8fafc";
    context.fillRect(left + (dino.ducking ? 36 : 31), top + 5, 4, 4);

    if (gameOver) {
      context.fillStyle = "#ef4444";
      context.fillRect(left + 28, top + 6, 4, 2);
      context.fillRect(left + 36, top + 6, 4, 2);
    }
  }

  function drawCactus(obstacle) {
    const left = obstacle.x;
    const top = obstacle.y - obstacle.height;

    context.fillStyle = "#14532d";
    context.fillRect(left + 6, top, obstacle.width - 12, obstacle.height);
    context.fillRect(left + 2, top + 10, 6, 16);
    context.fillRect(left + obstacle.width - 8, top + 16, 6, 14);

    if (obstacle.width > 24) {
      context.fillRect(left + 14, top + 8, 6, 14);
      context.fillRect(left + obstacle.width - 20, top + 4, 6, 18);
    }
  }

  function drawBird(obstacle) {
    const top = obstacle.y - obstacle.height;
    const wingUp = Math.floor(obstacle.flapTime / 8) % 2 === 0;

    context.fillStyle = "#334155";
    context.fillRect(obstacle.x + 8, top + 8, 20, 10);
    context.fillRect(obstacle.x + 24, top + 10, 10, 6);
    context.fillRect(obstacle.x + 32, top + 6, 10, 4);
    context.fillRect(obstacle.x + 6, top + 6, 8, 4);

    context.beginPath();
    if (wingUp) {
      context.moveTo(obstacle.x + 12, top + 12);
      context.lineTo(obstacle.x + 2, top + 4);
      context.lineTo(obstacle.x + 16, top + 14);
      context.lineTo(obstacle.x + 30, top + 4);
      context.lineTo(obstacle.x + 22, top + 14);
    } else {
      context.moveTo(obstacle.x + 12, top + 12);
      context.lineTo(obstacle.x + 4, top + 22);
      context.lineTo(obstacle.x + 18, top + 14);
      context.lineTo(obstacle.x + 30, top + 22);
      context.lineTo(obstacle.x + 22, top + 14);
    }
    context.closePath();
    context.fill();
  }

  function drawObstacle(obstacle) {
    if (obstacle.kind === "bird") {
      drawBird(obstacle);
      return;
    }

    drawCactus(obstacle);
  }

  function drawScoreBanner() {
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    drawRoundedRect(context, WIDTH - 170, 16, 146, 38, 14);
    context.fill();
    context.fillStyle = "#0f172a";
    context.font = "bold 18px Arial";
    context.textAlign = "center";
    context.fillText(`HI ${Math.floor(score).toString().padStart(5, "0")}`, WIDTH - 97, 41);
  }

  function render() {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    drawSky();
    clouds.forEach(drawCloud);
    drawGround();
    obstacles.forEach(drawObstacle);
    drawDino();
    drawScoreBanner();
  }

  function loop(timestamp) {
    if (!running) {
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const delta = clamp((timestamp - lastTimestamp) / 16.6667, 0.75, 2.1);
    lastTimestamp = timestamp;

    update(delta);
    render();

    if (running) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(event) {
    if (!KEY_SET.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      setDuck(true);
      return;
    }

    jump();
  }

  function handleKeyUp(event) {
    if (!KEY_SET.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      setDuck(false);
    }
  }

  function bindPressControl(button, onPress, onRelease) {
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.currentTarget.blur();
      onPress();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      button.addEventListener(type, function () {
        if (typeof onRelease === "function") {
          onRelease();
        }
      });
    });
  }

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetGame();
  });

  bindPressControl(btnJump, jump);
  bindPressControl(btnDuck, function () {
    setDuck(true);
  }, function () {
    setDuck(false);
  });

  return {
    enter: resetGame,
    leave: function () {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      running = false;
      gameOver = false;
    },
    handleKeyDown: handleKeyDown,
    handleKeyUp: handleKeyUp
  };
}
