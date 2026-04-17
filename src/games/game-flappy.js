import { t } from "../core/i18n.js";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const BIRD_X = 120;
const BIRD_RADIUS = 16;
const GRAVITY = 0.42;
const FLAP_VELOCITY = -7.8;
const PIPE_WIDTH = 74;
const PIPE_GAP = 180;
const PIPE_SPEED = 2.8;
const PIPE_SPAWN_MS = 1450;
const PIPE_EDGE_MARGIN = 96;
const GROUND_HEIGHT = 16;
const HIT_RADIUS = 18;

function createPipe() {
  const minGapCenter = PIPE_EDGE_MARGIN + PIPE_GAP / 2;
  const maxGapCenter = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_EDGE_MARGIN - PIPE_GAP / 2;
  const gapCenter = minGapCenter + Math.random() * Math.max(1, maxGapCenter - minGapCenter);

  return {
    x: CANVAS_WIDTH + 40,
    gapCenter: gapCenter,
    scored: false
  };
}

function circleRectCollision(circleX, circleY, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.height));
  const dx = circleX - nearestX;
  const dy = circleY - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function formatScore(score) {
  return String(score);
}

export function createFlappyGame({
  canvas,
  btnRestart,
  scoreText,
  message
}) {
  const context = canvas.getContext("2d");

  let animationFrameId = null;
  let lastTimestamp = 0;
  let pipeAccumulator = 0;
  let gameState = "ready";
  let birdY = CANVAS_HEIGHT / 2;
  let birdVy = 0;
  let pipes = [];
  let score = 0;
  let messageKey = "flappy.message.start";
  let messageParams = {};

  canvas.tabIndex = 0;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  function setMessage(key, params) {
    messageKey = key;
    messageParams = params || {};
    message.textContent = t(key, messageParams);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function updateStats() {
    scoreText.textContent = formatScore(score);
  }

  function stopLoop() {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function beginLoop() {
    if (animationFrameId !== null) {
      return;
    }

    animationFrameId = window.requestAnimationFrame(loop);
  }

  function resetGame() {
    stopLoop();
    lastTimestamp = 0;
    pipeAccumulator = 0;
    gameState = "ready";
    birdY = CANVAS_HEIGHT / 2;
    birdVy = 0;
    pipes = [];
    score = 0;
    setMessage("flappy.message.start");
    updateStats();
    draw();
    canvas.focus({ preventScroll: true });
  }

  function flap() {
    if (gameState === "gameOver") {
      return;
    }

    if (gameState === "ready") {
      gameState = "running";
      setMessage("flappy.message.running");
      beginLoop();
    }

    if (gameState === "running") {
      birdVy = FLAP_VELOCITY;
      canvas.focus({ preventScroll: true });
    }
  }

  function gameOver() {
    gameState = "gameOver";
    stopLoop();
    setMessage("flappy.message.gameOver", { score: score });
    draw();
  }

  function update(dt) {
    birdVy += GRAVITY * (dt / 16.6667);
    birdY += birdVy * (dt / 16.6667);

    if (birdY - BIRD_RADIUS < 0 || birdY + BIRD_RADIUS > CANVAS_HEIGHT - GROUND_HEIGHT) {
      gameOver();
      return;
    }

    pipeAccumulator += dt;
    while (pipeAccumulator >= PIPE_SPAWN_MS) {
      pipes.push(createPipe());
      pipeAccumulator -= PIPE_SPAWN_MS;
    }

    pipes.forEach(function (pipe) {
      pipe.x -= PIPE_SPEED * (dt / 16.6667);

      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
        pipe.scored = true;
        score += 1;
        updateStats();
      }
    });

    pipes = pipes.filter(function (pipe) {
      return pipe.x + PIPE_WIDTH > -30;
    });

    const birdRect = {
      x: BIRD_X - BIRD_RADIUS,
      y: birdY - BIRD_RADIUS,
      width: BIRD_RADIUS * 2,
      height: BIRD_RADIUS * 2
    };

    for (let index = 0; index < pipes.length; index += 1) {
      const pipe = pipes[index];
      const topRect = {
        x: pipe.x,
        y: 0,
        width: PIPE_WIDTH,
        height: pipe.gapCenter - PIPE_GAP / 2
      };
      const bottomRect = {
        x: pipe.x,
        y: pipe.gapCenter + PIPE_GAP / 2,
        width: PIPE_WIDTH,
        height: CANVAS_HEIGHT - GROUND_HEIGHT - (pipe.gapCenter + PIPE_GAP / 2)
      };

      if (
        circleRectCollision(BIRD_X, birdY, HIT_RADIUS, topRect) ||
        circleRectCollision(BIRD_X, birdY, HIT_RADIUS, bottomRect)
      ) {
        gameOver();
        return;
      }
    }

    if (birdRect.y + birdRect.height >= CANVAS_HEIGHT - GROUND_HEIGHT) {
      gameOver();
      return;
    }
  }

  function drawPipes() {
    pipes.forEach(function (pipe) {
      const topHeight = pipe.gapCenter - PIPE_GAP / 2;
      const bottomY = pipe.gapCenter + PIPE_GAP / 2;

      context.fillStyle = "#16a34a";
      context.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
      context.fillRect(pipe.x - 6, topHeight - 20, PIPE_WIDTH + 12, 20);

      context.fillStyle = "#15803d";
      context.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY - 16);
      context.fillRect(pipe.x - 6, bottomY, PIPE_WIDTH + 12, 20);
    });
  }

  function drawBird() {
    context.fillStyle = "#facc15";
    context.beginPath();
    context.arc(BIRD_X, birdY, BIRD_RADIUS, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#0f172a";
    context.beginPath();
    context.arc(BIRD_X + 5, birdY - 4, 2.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#fb923c";
    context.beginPath();
    context.moveTo(BIRD_X + 14, birdY);
    context.lineTo(BIRD_X + 24, birdY - 4);
    context.lineTo(BIRD_X + 24, birdY + 4);
    context.closePath();
    context.fill();
  }

  function drawGround() {
    context.fillStyle = "#86efac";
    context.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    context.fillStyle = "#16a34a";
    context.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT - 4, CANVAS_WIDTH, 4);
  }

  function draw() {
    context.fillStyle = "#dbeafe";
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#bfdbfe");
    gradient.addColorStop(1, "#eff6ff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = "#ffffff";
    for (let index = 0; index < 3; index += 1) {
      const cloudX = 60 + index * 140;
      context.beginPath();
      context.arc(cloudX, 84 + index * 20, 18, 0, Math.PI * 2);
      context.arc(cloudX + 18, 78 + index * 20, 22, 0, Math.PI * 2);
      context.arc(cloudX + 42, 84 + index * 20, 16, 0, Math.PI * 2);
      context.fill();
    }

    drawPipes();
    drawBird();
    drawGround();

    context.fillStyle = "#0f172a";
    context.font = "bold 22px sans-serif";
    context.fillText(`SCORE ${score}`, 16, 30);
  }

  function loop(timestamp) {
    animationFrameId = null;

    if (gameState !== "running") {
      draw();
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const dt = Math.min(32, timestamp - lastTimestamp || 16.6667);
    lastTimestamp = timestamp;

    update(dt);
    draw();

    if (gameState === "running") {
      animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(event) {
    if (event.key === " " || event.key === "Space" || event.key === "ArrowUp") {
      event.preventDefault();

      if (gameState === "gameOver") {
        return;
      }

      flap();
    }
  }

  if (canvas) {
    canvas.addEventListener("pointerdown", function () {
      flap();
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener("click", resetGame);
  }

  function enter() {
    resetGame();
  }

  function leave() {
    stopLoop();
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
