import { t } from "../core/i18n.js";

export function createBreakoutGame({ canvas, btnStart, scoreText, livesText, message }) {
  const context = canvas.getContext("2d");
  const arrowKeys = new Set(["ArrowLeft", "ArrowRight", "Space", " "]);
  const paddleWidth = 96;
  const paddleHeight = 12;
  const paddleSpeed = 7;
  const ballRadius = 8;
  const brickRows = 5;
  const brickCols = 8;
  const brickPadding = 8;
  const brickOffsetTop = 52;
  const brickOffsetLeft = 20;
  const brickHeight = 22;
  const brickWidth =
    (canvas.width - brickOffsetLeft * 2 - brickPadding * (brickCols - 1)) / brickCols;
  const brickColors = ["#ef476f", "#f78c6b", "#ffd166", "#06d6a0", "#118ab2"];

  let animationFrameId = null;
  let leftPressed = false;
  let rightPressed = false;
  let paddleX = 0;
  let ballX = 0;
  let ballY = 0;
  let ballDx = 0;
  let ballDy = 0;
  let score = 0;
  let lives = 3;
  let running = false;
  let launched = false;
  let bricks = [];
  let messageKey = "breakout.message.ready";

  canvas.tabIndex = 0;

  function setMessage(key, params) {
    messageKey = key;
    message.textContent = t(key, params);
  }

  function refreshMessage() {
    if (messageKey === "breakout.message.life") {
      message.textContent = t(messageKey, { lives });
      return;
    }

    if (messageKey === "breakout.message.win" || messageKey === "breakout.message.gameOver") {
      message.textContent = t(messageKey, { score });
      return;
    }

    message.textContent = t(messageKey);
  }

  function createBricks() {
    bricks = [];
    for (let row = 0; row < brickRows; row += 1) {
      const currentRow = [];
      for (let col = 0; col < brickCols; col += 1) {
        currentRow.push({
          x: brickOffsetLeft + col * (brickWidth + brickPadding),
          y: brickOffsetTop + row * (brickHeight + brickPadding),
          broken: false,
          color: brickColors[row % brickColors.length]
        });
      }
      bricks.push(currentRow);
    }
  }

  function resetBallAndPaddle() {
    paddleX = (canvas.width - paddleWidth) / 2;
    ballX = paddleX + paddleWidth / 2;
    ballY = canvas.height - 28 - ballRadius - 2;
    ballDx = Math.random() < 0.5 ? -4 : 4;
    ballDy = -4;
    launched = false;
  }

  function updateStats() {
    scoreText.textContent = String(score);
    livesText.textContent = String(lives);
  }

  function drawPaddle() {
    context.fillStyle = "#222";
    context.fillRect(paddleX, canvas.height - 28, paddleWidth, paddleHeight);
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

        context.fillStyle = brick.color;
        context.fillRect(brick.x, brick.y, brickWidth, brickHeight);
      });
    });
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8f9fb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawBall();
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

  function allBricksCleared() {
    return bricks.every(function (row) {
      return row.every(function (brick) {
        return brick.broken;
      });
    });
  }

  function resetLife() {
    resetBallAndPaddle();
    setMessage("breakout.message.life", { lives });
  }

  function handleBrickCollisions() {
    for (const row of bricks) {
      for (const brick of row) {
        if (brick.broken) {
          continue;
        }

        const hitX = ballX + ballRadius > brick.x && ballX - ballRadius < brick.x + brickWidth;
        const hitY = ballY + ballRadius > brick.y && ballY - ballRadius < brick.y + brickHeight;

        if (hitX && hitY) {
          brick.broken = true;
          ballDy = -ballDy;
          score += 10;
          updateStats();

          if (allBricksCleared()) {
            stop();
            setMessage("breakout.message.win", { score });
          }

          return;
        }
      }
    }
  }

  function update() {
    if (leftPressed) {
      paddleX = Math.max(0, paddleX - paddleSpeed);
    }
    if (rightPressed) {
      paddleX = Math.min(canvas.width - paddleWidth, paddleX + paddleSpeed);
    }

    if (!launched) {
      ballX = paddleX + paddleWidth / 2;
      ballY = canvas.height - 28 - ballRadius - 2;
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

    const paddleTop = canvas.height - 28;
    const hitsPaddle =
      ballY + ballRadius >= paddleTop &&
      ballY + ballRadius <= paddleTop + paddleHeight + Math.abs(ballDy) &&
      ballX >= paddleX &&
      ballX <= paddleX + paddleWidth &&
      ballDy > 0;

    if (hitsPaddle) {
      const hitOffset = (ballX - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
      ballDx = hitOffset * 5;
      ballDy = -Math.max(3.5, Math.abs(ballDy));
    }

    handleBrickCollisions();

    if (ballY - ballRadius > canvas.height) {
      lives -= 1;
      updateStats();

      if (lives <= 0) {
        stop();
        setMessage("breakout.message.gameOver", { score });
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
    score = 0;
    lives = 3;
    createBricks();
    resetBallAndPaddle();
    updateStats();
    setMessage("breakout.message.ready");
    draw();
    running = true;
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function launchBall() {
    if (!running || launched) {
      return;
    }

    launched = true;
    setMessage("breakout.message.launched");
  }

  function handleKeyDown(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.key === " " || event.key === "Space") {
      launchBall();
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

  return {
    enter: start,
    leave: stop,
    handleKeyDown,
    handleKeyUp,
    refreshLocale: refreshMessage
  };
}
