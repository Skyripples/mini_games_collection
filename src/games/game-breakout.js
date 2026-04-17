import { t } from "../core/i18n.js";

const PADDLE_BASE_WIDTH = 96;
const PADDLE_MIN_WIDTH = 64;
const PADDLE_MAX_WIDTH = 160;
const PADDLE_HEIGHT = 12;
const PADDLE_BOTTOM_MARGIN = 28;
const PADDLE_SPEED = 7;

const BALL_BASE_RADIUS = 8;
const BALL_MIN_RADIUS = 5;
const BALL_MAX_RADIUS = 14;
const BALL_BASE_SPEED_X = 4;
const BALL_BASE_SPEED_Y = -4;
const BALL_RESET_OFFSET = 2;

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_PADDING = 8;
const BRICK_OFFSET_TOP = 52;
const BRICK_OFFSET_LEFT = 20;
const BRICK_HEIGHT = 22;
const BRICK_SPECIAL_CHANCE = 0.1;
const BRICK_NORMAL_SCORE = 10;
const BRICK_SPECIAL_SCORE = 20;

const POWER_UP_SIZE = 22;
const POWER_UP_SPEED = 1.9;
const POWER_UP_TYPES = {
  ballBig: {
    label: "B+",
    fillColor: "#f59e0b",
    accentColor: "#fffbeb"
  },
  ballSmall: {
    label: "B-",
    fillColor: "#3b82f6",
    accentColor: "#dbeafe"
  },
  paddleLong: {
    label: "P+",
    fillColor: "#10b981",
    accentColor: "#d1fae5"
  },
  paddleShort: {
    label: "P-",
    fillColor: "#ef4444",
    accentColor: "#fee2e2"
  }
};

const POWER_UP_DROP_TYPES = ["ballBig", "ballSmall", "paddleLong", "paddleShort"];

const brickColors = ["#ef476f", "#f78c6b", "#ffd166", "#06d6a0", "#118ab2"];
const brickStepY = BRICK_HEIGHT + BRICK_PADDING;
const brickWidth = (canvas => (canvas.width - BRICK_OFFSET_LEFT * 2 - BRICK_PADDING * (BRICK_COLS - 1)) / BRICK_COLS);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function overlaps(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function createBreakoutGame({ canvas, btnStart, btnMode, scoreText, livesText, message }) {
  const context = canvas.getContext("2d");
  const brickCellWidth = brickWidth(canvas);
  const arrowKeys = new Set(["ArrowLeft", "ArrowRight", "Space", " "]);

  let animationFrameId = null;
  let leftPressed = false;
  let rightPressed = false;
  let paddleWidth = PADDLE_BASE_WIDTH;
  let paddleX = 0;
  let ballRadius = BALL_BASE_RADIUS;
  let ballX = 0;
  let ballY = 0;
  let ballDx = 0;
  let ballDy = 0;
  let score = 0;
  let lives = 3;
  let running = false;
  let paused = false;
  let sessionEnded = false;
  let launched = false;
  let mode = "classic";
  let nextRowColorIndex = 0;
  let bricks = [];
  let powerUps = [];
  let messageKey = "breakout.message.ready";
  let messageParams = {};

  canvas.tabIndex = 0;

  function getPaddleTop() {
    return canvas.height - PADDLE_BOTTOM_MARGIN;
  }

  function getModeLabelKey() {
    return mode === "endless" ? "breakout.mode.endless" : "breakout.mode.classic";
  }

  function getIdleMessageKey() {
    return mode === "endless" ? "breakout.message.endlessReady" : "breakout.message.ready";
  }

  function setMessage(key, params = {}) {
    messageKey = key;
    messageParams = params;
    message.textContent = t(key, params);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function updateModeButton() {
    if (!btnMode) {
      return;
    }

    btnMode.textContent = t(getModeLabelKey());
    btnMode.classList.toggle("active", mode === "endless");
  }

  function updateStats() {
    scoreText.textContent = String(score);
    livesText.textContent = String(lives);
  }

  function createBrickRow(y, colorIndex, specialChance) {
    const rowColor = brickColors[colorIndex % brickColors.length];

    return Array.from({ length: BRICK_COLS }, function (_, col) {
      return {
        x: BRICK_OFFSET_LEFT + col * (brickCellWidth + BRICK_PADDING),
        y: y,
        broken: false,
        color: rowColor,
        special: Math.random() < specialChance
      };
    });
  }

  function createBricks() {
    bricks = [];
    for (let row = 0; row < BRICK_ROWS; row += 1) {
      bricks.push(
        createBrickRow(
          BRICK_OFFSET_TOP + row * brickStepY,
          nextRowColorIndex,
          mode === "endless" ? BRICK_SPECIAL_CHANCE : 0
        )
      );
      nextRowColorIndex += 1;
    }
  }

  function resetBallAndPaddle() {
    paddleWidth = PADDLE_BASE_WIDTH;
    ballRadius = BALL_BASE_RADIUS;
    paddleX = (canvas.width - paddleWidth) / 2;
    ballX = paddleX + paddleWidth / 2;
    ballY = getPaddleTop() - ballRadius - BALL_RESET_OFFSET;
    ballDx = Math.random() < 0.5 ? -BALL_BASE_SPEED_X : BALL_BASE_SPEED_X;
    ballDy = BALL_BASE_SPEED_Y;
    launched = false;
  }

  function stop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    running = false;
    leftPressed = false;
    rightPressed = false;
  }

  function beginLoop() {
    if (running) {
      return;
    }

    running = true;
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!running) {
      return;
    }

    stop();
    paused = true;
    setMessage("breakout.message.paused");
    draw();
  }

  function resumeGame() {
    if (!paused) {
      return;
    }

    paused = false;
    setMessage(launched ? "breakout.message.launched" : getIdleMessageKey());
    beginLoop();
  }

  function allBricksCleared() {
    return bricks.every(function (row) {
      return row.every(function (brick) {
        return brick.broken;
      });
    });
  }

  function isBottomRowCleared() {
    if (bricks.length === 0) {
      return false;
    }

    return bricks[bricks.length - 1].every(function (brick) {
      return brick.broken;
    });
  }

  function bricksReachedPaddle() {
    const paddleTop = getPaddleTop();

    return bricks.some(function (row) {
      return row.some(function (brick) {
        return !brick.broken && brick.y + BRICK_HEIGHT >= paddleTop;
      });
    });
  }

  function drawPaddle() {
    context.fillStyle = "#222";
    context.fillRect(paddleX, getPaddleTop(), paddleWidth, PADDLE_HEIGHT);
  }

  function drawBall() {
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "#118ab2";
    context.fill();
    context.closePath();
  }

  function drawBricks() {
    bricks.forEach(function (row) {
      row.forEach(function (brick) {
        if (brick.broken) {
          return;
        }

        if (brick.special) {
          context.save();
          context.fillStyle = "#8b5cf6";
          context.shadowColor = "rgba(139, 92, 246, 0.35)";
          context.shadowBlur = 8;
          context.fillRect(brick.x, brick.y, brickCellWidth, BRICK_HEIGHT);
          context.shadowBlur = 0;
          context.fillStyle = "rgba(255,255,255,0.92)";
          context.font = '700 14px "Trebuchet MS", "Microsoft JhengHei", sans-serif';
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText("★", brick.x + brickCellWidth / 2, brick.y + BRICK_HEIGHT / 2 + 1);
          context.restore();
          return;
        }

        context.fillStyle = brick.color;
        context.fillRect(brick.x, brick.y, brickCellWidth, BRICK_HEIGHT);
      });
    });
  }

  function drawPowerUps() {
    powerUps.forEach(function (powerUp) {
      const typeConfig = POWER_UP_TYPES[powerUp.type];

      context.save();
      context.translate(powerUp.x, powerUp.y);
      context.fillStyle = typeConfig.fillColor;
      context.strokeStyle = "rgba(15, 23, 42, 0.32)";
      context.lineWidth = 2;
      createRoundedRectPath(context, 0, 0, powerUp.width, powerUp.height, 6);
      context.fill();
      context.stroke();

      context.fillStyle = typeConfig.accentColor;
      context.font = '900 14px "Trebuchet MS", "Microsoft JhengHei", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(typeConfig.label, powerUp.width / 2, powerUp.height / 2 + 1);
      context.restore();
    });
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8f9fb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPowerUps();
    drawPaddle();
    drawBall();
  }

  function spawnPowerUp(brick) {
    const type = POWER_UP_DROP_TYPES[Math.floor(Math.random() * POWER_UP_DROP_TYPES.length)];

    powerUps.push({
      type: type,
      x: brick.x + brickCellWidth / 2 - POWER_UP_SIZE / 2,
      y: brick.y + BRICK_HEIGHT / 2 - POWER_UP_SIZE / 2,
      width: POWER_UP_SIZE,
      height: POWER_UP_SIZE,
      speed: POWER_UP_SPEED
    });
  }

  function applyPowerUp(powerUp) {
    const previousCenter = paddleX + paddleWidth / 2;

    switch (powerUp.type) {
      case "ballBig":
        ballRadius = Math.min(BALL_MAX_RADIUS, ballRadius + 2);
        setMessage("breakout.message.ballBig");
        break;
      case "ballSmall":
        ballRadius = Math.max(BALL_MIN_RADIUS, ballRadius - 2);
        setMessage("breakout.message.ballSmall");
        break;
      case "paddleLong":
        paddleWidth = Math.min(PADDLE_MAX_WIDTH, paddleWidth + 20);
        paddleX = clamp(previousCenter - paddleWidth / 2, 0, canvas.width - paddleWidth);
        setMessage("breakout.message.paddleLong");
        break;
      case "paddleShort":
        paddleWidth = Math.max(PADDLE_MIN_WIDTH, paddleWidth - 20);
        paddleX = clamp(previousCenter - paddleWidth / 2, 0, canvas.width - paddleWidth);
        setMessage("breakout.message.paddleShort");
        break;
      default:
        break;
    }
  }

  function updatePowerUps() {
    powerUps = powerUps.filter(function (powerUp) {
      powerUp.y += powerUp.speed;
      return powerUp.y <= canvas.height + powerUp.height;
    });
  }

  function handlePowerUpCollisions() {
    const paddleTop = getPaddleTop();

    for (let index = powerUps.length - 1; index >= 0; index -= 1) {
      const powerUp = powerUps[index];
      const hitsPaddle =
        powerUp.y + powerUp.height >= paddleTop &&
        powerUp.y <= paddleTop + PADDLE_HEIGHT &&
        powerUp.x + powerUp.width >= paddleX &&
        powerUp.x <= paddleX + paddleWidth;

      if (!hitsPaddle) {
        continue;
      }

      powerUps.splice(index, 1);
      applyPowerUp(powerUp);
    }
  }

  function advanceEndlessBoard() {
    bricks.forEach(function (row) {
      row.forEach(function (brick) {
        brick.y += brickStepY;
      });
    });

    bricks.unshift(
      createBrickRow(BRICK_OFFSET_TOP, nextRowColorIndex, BRICK_SPECIAL_CHANCE)
    );
    nextRowColorIndex += 1;
    bricks.pop();

    if (bricksReachedPaddle()) {
      stop();
      paused = false;
      sessionEnded = true;
      setMessage("breakout.message.gameOver", { score: score });
      return;
    }

    setMessage("breakout.message.rowShift");
  }

  function resolveBoardProgress() {
    if (mode === "endless") {
      if (isBottomRowCleared()) {
        advanceEndlessBoard();
      }
      return;
    }

    if (allBricksCleared()) {
      stop();
      paused = false;
      sessionEnded = true;
      setMessage("breakout.message.win", { score: score });
    }
  }

  function handleBrickCollisions() {
    for (const row of bricks) {
      for (const brick of row) {
        if (brick.broken) {
          continue;
        }

        const hitX = ballX + ballRadius > brick.x && ballX - ballRadius < brick.x + brickCellWidth;
        const hitY = ballY + ballRadius > brick.y && ballY - ballRadius < brick.y + BRICK_HEIGHT;

        if (!hitX || !hitY) {
          continue;
        }

        brick.broken = true;
        ballDy = -ballDy;
        score += brick.special ? BRICK_SPECIAL_SCORE : BRICK_NORMAL_SCORE;
        updateStats();

        if (brick.special) {
          spawnPowerUp(brick);
        }

        resolveBoardProgress();
        return;
      }
    }
  }

  function update() {
    if (leftPressed) {
      paddleX = Math.max(0, paddleX - PADDLE_SPEED);
    }

    if (rightPressed) {
      paddleX = Math.min(canvas.width - paddleWidth, paddleX + PADDLE_SPEED);
    }

    if (!launched) {
      ballX = paddleX + paddleWidth / 2;
      ballY = getPaddleTop() - ballRadius - BALL_RESET_OFFSET;
      return;
    }

    ballX += ballDx;
    ballY += ballDy;

    if (ballX + ballRadius >= canvas.width || ballX - ballRadius <= 0) {
      ballDx = -ballDx;
    }

    if (ballY - ballRadius <= 0) {
      ballDy = -ballDy;
    }

    const paddleTop = getPaddleTop();
    const hitsPaddle =
      ballY + ballRadius >= paddleTop &&
      ballY + ballRadius <= paddleTop + PADDLE_HEIGHT + Math.abs(ballDy) &&
      ballX >= paddleX &&
      ballX <= paddleX + paddleWidth &&
      ballDy > 0;

    if (hitsPaddle) {
      const hitOffset = (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
      ballDx = hitOffset * 5;
      ballDy = -Math.max(3.5, Math.abs(ballDy));
    }

    handleBrickCollisions();
    updatePowerUps();
    handlePowerUpCollisions();

    if (ballY - ballRadius > canvas.height) {
      lives -= 1;
      updateStats();

      if (lives <= 0) {
        stop();
        paused = false;
        sessionEnded = true;
        setMessage("breakout.message.gameOver", { score: score });
        return;
      }

      resetLife();
    }
  }

  function loop() {
    update();
    draw();

    if (running) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function start() {
    stop();
    paused = false;
    sessionEnded = false;
    score = 0;
    lives = 3;
    powerUps = [];
    nextRowColorIndex = 0;
    createBricks();
    resetBallAndPaddle();
    updateModeButton();
    updateStats();
    setMessage(getIdleMessageKey());
    draw();
  }

  function resetLife() {
    resetBallAndPaddle();
    setMessage("breakout.message.life", { lives: lives });
  }

  function launchBall() {
    if (!running || launched || sessionEnded) {
      return;
    }

    launched = true;
    setMessage("breakout.message.launched");
  }

  function toggleMode() {
    mode = mode === "classic" ? "endless" : "classic";
    start();
  }

  function handleSpaceAction() {
    if (running) {
      if (!launched) {
        launchBall();
        return;
      }

      pauseGame();
      return;
    }

    if (paused) {
      resumeGame();
      return;
    }

    if (sessionEnded) {
      start();
    }

    beginLoop();
    launchBall();
  }

  function handleKeyDown(event) {
    const isSpace = event.code === "Space" || event.key === " " || event.key === "Space";

    if (!isSpace && !arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (isSpace) {
      if (!event.repeat) {
        handleSpaceAction();
      }
      return;
    }

    if (!running) {
      return;
    }

    if (event.key === "ArrowLeft") {
      leftPressed = true;
    } else if (event.key === "ArrowRight") {
      rightPressed = true;
    }
  }

  function handleKeyUp(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    if (event.key === "ArrowLeft") {
      leftPressed = false;
    } else if (event.key === "ArrowRight") {
      rightPressed = false;
    }
  }

  btnStart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    start();
  });

  if (btnMode) {
    btnMode.addEventListener("click", function (event) {
      event.currentTarget.blur();
      toggleMode();
    });
  }

  start();

  return {
    enter: start,
    leave: function () {
      stop();
      paused = false;
    },
    handleKeyDown: handleKeyDown,
    handleKeyUp: handleKeyUp,
    refreshLocale: function () {
      updateModeButton();
      refreshMessage();
      draw();
    }
  };
}
