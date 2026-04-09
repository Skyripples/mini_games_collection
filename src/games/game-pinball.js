import { t } from "../core/i18n.js";

const WIDTH = 520;
const HEIGHT = 720;
const BALL_RADIUS = 10;
const BALL_DRAG = 0.996;
const BALL_GRAVITY = 0.24;
const BALL_MAX_SPEED = 15;
const LAUNCH_LANE_LEFT = WIDTH - 86;
const LAUNCH_LANE_WIDTH = 40;
const LAUNCH_LANE_TOP = 56;
const LAUNCH_LANE_BOTTOM = HEIGHT - 72;
const LAUNCH_RAIL_X = WIDTH - 96;
const RIGHT_WALL_BOTTOM = HEIGHT - 70;
const BALL_START_X = WIDTH - 66;
const BALL_START_Y = HEIGHT - 100;
const FLIPPER_LENGTH = 92;
const FLIPPER_THICKNESS = 18;
const FLIPPER_MOVE_SPEED = 0.24;
const FLIPPER_LEFT_PIVOT = { x: 182, y: 640 };
const FLIPPER_RIGHT_PIVOT = { x: 338, y: 640 };
const LEFT_REST_ANGLE = 0.46;
const LEFT_ACTIVE_ANGLE = -0.34;
const RIGHT_REST_ANGLE = Math.PI - 0.46;
const RIGHT_ACTIVE_ANGLE = Math.PI + 0.34;
const MAX_CHARGE = 18;
const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);
const LAUNCH_KEYS = new Set([" ", "Space"]);
const CONTROL_KEYS = new Set(["ArrowLeft", "a", "A", "ArrowRight", "d", "D", " ", "Space"]);

const TABLE_SEGMENTS = [
  { x1: 28, y1: 28, x2: WIDTH - 28, y2: 28, radius: 8, bounce: 0.95 },
  { x1: 28, y1: 28, x2: 28, y2: 560, radius: 8, bounce: 0.94 },
  { x1: WIDTH - 28, y1: 28, x2: WIDTH - 28, y2: RIGHT_WALL_BOTTOM, radius: 8, bounce: 0.94 },
  { x1: LAUNCH_RAIL_X, y1: 132, x2: LAUNCH_RAIL_X, y2: 654, radius: 6, bounce: 0.9 },
  { x1: 28, y1: 560, x2: 152, y2: HEIGHT - 28, radius: 8, bounce: 0.92 },
  { x1: WIDTH - 28, y1: RIGHT_WALL_BOTTOM, x2: WIDTH - 142, y2: HEIGHT - 28, radius: 8, bounce: 0.92 },
  { x1: 110, y1: 514, x2: 206, y2: 586, radius: 5, bounce: 0.96 },
  { x1: WIDTH - 110, y1: 514, x2: WIDTH - 206, y2: 586, radius: 5, bounce: 0.96 }
];

const BUMPER_LAYOUT = [
  { x: 162, y: 186, radius: 28, color: "#f87171", score: 150 },
  { x: 260, y: 134, radius: 24, color: "#facc15", score: 200 },
  { x: 360, y: 188, radius: 28, color: "#2dd4bf", score: 150 },
  { x: 188, y: 328, radius: 24, color: "#a78bfa", score: 125 },
  { x: 334, y: 328, radius: 24, color: "#60a5fa", score: 125 },
  { x: 260, y: 424, radius: 26, color: "#fb7185", score: 175 }
];

const STANDUP_LAYOUT = [
  { x: 98, y: 108, width: 20, height: 56, color: "#fb7185", score: 250 },
  { x: 402, y: 108, width: 20, height: 56, color: "#38bdf8", score: 250 },
  { x: 250, y: 246, width: 20, height: 62, color: "#34d399", score: 300 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function approach(current, target, step) {
  if (Math.abs(target - current) <= step) {
    return target;
  }

  return current + Math.sign(target - current) * step;
}

function closestPointOnSegment(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return { x: x1, y: y1, t: 0 };
  }

  const t = clamp(((x - x1) * dx + (y - y1) * dy) / lengthSquared, 0, 1);
  return {
    x: x1 + dx * t,
    y: y1 + dy * t,
    t: t
  };
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return {
    x: x / length,
    y: y / length
  };
}

function createBumpers() {
  return BUMPER_LAYOUT.map(function (bumper) {
    return {
      x: bumper.x,
      y: bumper.y,
      radius: bumper.radius,
      color: bumper.color,
      score: bumper.score,
      flash: 0,
      cooldown: 0
    };
  });
}

function createStandups() {
  return STANDUP_LAYOUT.map(function (target) {
    return {
      x: target.x,
      y: target.y,
      width: target.width,
      height: target.height,
      color: target.color,
      score: target.score,
      flash: 0,
      cooldown: 0
    };
  });
}

function createFlipper(side) {
  const isLeft = side === "left";
  return {
    side: side,
    pivotX: isLeft ? FLIPPER_LEFT_PIVOT.x : FLIPPER_RIGHT_PIVOT.x,
    pivotY: isLeft ? FLIPPER_LEFT_PIVOT.y : FLIPPER_RIGHT_PIVOT.y,
    restAngle: isLeft ? LEFT_REST_ANGLE : RIGHT_REST_ANGLE,
    activeAngle: isLeft ? LEFT_ACTIVE_ANGLE : RIGHT_ACTIVE_ANGLE,
    angle: isLeft ? LEFT_REST_ANGLE : RIGHT_REST_ANGLE,
    lastAngle: isLeft ? LEFT_REST_ANGLE : RIGHT_REST_ANGLE,
    angularVelocity: 0,
    pressed: false
  };
}

function getFlipperTip(flipper) {
  return {
    x: flipper.pivotX + Math.cos(flipper.angle) * FLIPPER_LENGTH,
    y: flipper.pivotY + Math.sin(flipper.angle) * FLIPPER_LENGTH
  };
}

export function createPinballGame({
  canvas,
  btnRestart,
  btnLeft,
  btnLaunch,
  btnRight,
  scoreText,
  ballsText,
  message
}) {
  const context = canvas.getContext("2d");

  let animationFrameId = null;
  let lastTimestamp = 0;
  let score = 0;
  let ballsRemaining = 3;
  let launched = false;
  let chargingLaunch = false;
  let launchCharge = 0;
  let running = false;
  let gameOver = false;
  let messageKey = "pinball.message.ready";
  let ball = {
    x: BALL_START_X,
    y: BALL_START_Y,
    vx: 0,
    vy: 0
  };
  let bumpers = createBumpers();
  let standups = createStandups();
  const leftFlipper = createFlipper("left");
  const rightFlipper = createFlipper("right");

  canvas.tabIndex = 0;

  function setMessage(key, params) {
    messageKey = key;
    message.textContent = t(key, params);
  }

  function refreshMessage() {
    if (messageKey === "pinball.message.gameOver") {
      message.textContent = t(messageKey, { score: score });
      return;
    }

    if (messageKey === "pinball.message.nextBall") {
      message.textContent = t(messageKey, { balls: ballsRemaining });
      return;
    }

    message.textContent = t(messageKey);
  }

  function updateStats() {
    scoreText.textContent = String(score);
    ballsText.textContent = String(ballsRemaining);
  }

  function addScore(points) {
    score += points;
    updateStats();
  }

  function stop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    running = false;
    chargingLaunch = false;
    leftFlipper.pressed = false;
    rightFlipper.pressed = false;
  }

  function resetBall() {
    launched = false;
    chargingLaunch = false;
    launchCharge = 0;
    ball = {
      x: BALL_START_X,
      y: BALL_START_Y,
      vx: 0,
      vy: 0
    };
  }

  function startNewGame() {
    stop();
    score = 0;
    ballsRemaining = 3;
    gameOver = false;
    bumpers = createBumpers();
    standups = createStandups();
    leftFlipper.angle = leftFlipper.restAngle;
    leftFlipper.lastAngle = leftFlipper.restAngle;
    leftFlipper.angularVelocity = 0;
    rightFlipper.angle = rightFlipper.restAngle;
    rightFlipper.lastAngle = rightFlipper.restAngle;
    rightFlipper.angularVelocity = 0;
    resetBall();
    updateStats();
    setMessage("pinball.message.ready");
    render();
    running = true;
    lastTimestamp = 0;
    canvas.focus({ preventScroll: true });
    animationFrameId = requestAnimationFrame(loop);
  }

  function beginLaunchCharge() {
    if (!running || launched || gameOver) {
      return;
    }

    chargingLaunch = true;
  }

  function releaseLaunchCharge() {
    if (!running || launched || gameOver) {
      chargingLaunch = false;
      return;
    }

    if (!chargingLaunch && launchCharge === 0) {
      return;
    }

    const normalizedCharge = Math.max(0.35, launchCharge / MAX_CHARGE);
    chargingLaunch = false;
    launchCharge = 0;
    launched = true;
    ball.vx = -(2.2 + normalizedCharge * 2.8);
    ball.vy = -(8 + normalizedCharge * 8.5);
    setMessage("pinball.message.launch");
  }

  function setFlipperPressed(side, pressed) {
    if (side === "left") {
      leftFlipper.pressed = pressed;
      return;
    }

    rightFlipper.pressed = pressed;
  }

  function syncFlippers(delta) {
    [leftFlipper, rightFlipper].forEach(function (flipper) {
      const targetAngle = flipper.pressed ? flipper.activeAngle : flipper.restAngle;
      flipper.lastAngle = flipper.angle;
      flipper.angle = approach(flipper.angle, targetAngle, FLIPPER_MOVE_SPEED * delta);
      flipper.angularVelocity = flipper.angle - flipper.lastAngle;
    });
  }

  function reflectBall(nx, ny, bounce) {
    const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
    if (velocityAlongNormal < 0) {
      ball.vx -= (1 + bounce) * velocityAlongNormal * nx;
      ball.vy -= (1 + bounce) * velocityAlongNormal * ny;
    }
  }

  function collideWithSegment(segment, extraImpulse) {
    const closest = closestPointOnSegment(
      ball.x,
      ball.y,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );
    const dx = ball.x - closest.x;
    const dy = ball.y - closest.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = BALL_RADIUS + segment.radius;

    if (distance >= minDistance) {
      return false;
    }

    const normal =
      distance > 0
        ? { x: dx / distance, y: dy / distance }
        : normalizeVector(-(segment.y2 - segment.y1), segment.x2 - segment.x1);
    const overlap = minDistance - distance;

    ball.x += normal.x * overlap;
    ball.y += normal.y * overlap;
    reflectBall(normal.x, normal.y, segment.bounce);

    if (extraImpulse) {
      ball.vx += extraImpulse.x;
      ball.vy += extraImpulse.y;
    }

    return true;
  }

  function collideWithBumpers() {
    bumpers.forEach(function (bumper) {
      bumper.flash = Math.max(0, bumper.flash - 1);
      bumper.cooldown = Math.max(0, bumper.cooldown - 1);

      const dx = ball.x - bumper.x;
      const dy = ball.y - bumper.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = BALL_RADIUS + bumper.radius;

      if (distance >= minDistance) {
        return;
      }

      const normal = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: -1 };
      const overlap = minDistance - distance;

      ball.x += normal.x * overlap;
      ball.y += normal.y * overlap;
      reflectBall(normal.x, normal.y, 1.08);
      ball.vx += normal.x * 1.8;
      ball.vy += normal.y * 1.8;

      if (bumper.cooldown === 0) {
        bumper.cooldown = 6;
        bumper.flash = 10;
        addScore(bumper.score);
      }
    });
  }

  function collideWithStandups() {
    standups.forEach(function (target) {
      target.flash = Math.max(0, target.flash - 1);
      target.cooldown = Math.max(0, target.cooldown - 1);

      const nearestX = clamp(ball.x, target.x, target.x + target.width);
      const nearestY = clamp(ball.y, target.y, target.y + target.height);
      const dx = ball.x - nearestX;
      const dy = ball.y - nearestY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared >= BALL_RADIUS * BALL_RADIUS) {
        return;
      }

      let nx = 0;
      let ny = 0;

      if (Math.abs(dx) > Math.abs(dy)) {
        nx = dx >= 0 ? 1 : -1;
      } else {
        ny = dy >= 0 ? 1 : -1;
      }

      if (nx === 0 && ny === 0) {
        ny = -1;
      }

      ball.x += nx * 3;
      ball.y += ny * 3;
      reflectBall(nx, ny, 0.92);

      if (target.cooldown === 0) {
        target.cooldown = 8;
        target.flash = 10;
        addScore(target.score);
      }
    });
  }

  function collideWithFlipper(flipper) {
    const tip = getFlipperTip(flipper);
    const upwardMotion =
      flipper.side === "left"
        ? Math.max(0, -flipper.angularVelocity)
        : Math.max(0, flipper.angularVelocity);
    const boost = upwardMotion * 40 + (flipper.pressed ? 0.6 : 0);
    const impulse = boost
      ? {
          x: flipper.side === "left" ? 0.55 + boost * 0.22 : -0.55 - boost * 0.22,
          y: -1.2 - boost * 0.72
        }
      : null;

    return collideWithSegment(
      {
        x1: flipper.pivotX,
        y1: flipper.pivotY,
        x2: tip.x,
        y2: tip.y,
        radius: FLIPPER_THICKNESS / 2,
        bounce: 0.96
      },
      impulse
    );
  }

  function clampBallSpeed() {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= BALL_MAX_SPEED) {
      return;
    }

    const scale = BALL_MAX_SPEED / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }

  function handleDrain() {
    if (ball.y - BALL_RADIUS <= HEIGHT + 30) {
      return;
    }

    ballsRemaining -= 1;
    updateStats();

    if (ballsRemaining <= 0) {
      gameOver = true;
      stop();
      setMessage("pinball.message.gameOver", { score: score });
      render();
      return;
    }

    resetBall();
    setMessage("pinball.message.nextBall", { balls: ballsRemaining });
  }

  function updateBall(delta) {
    if (!launched) {
      if (chargingLaunch) {
        launchCharge = Math.min(MAX_CHARGE, launchCharge + delta * 0.7);
      }

      ball.x = BALL_START_X;
      ball.y = BALL_START_Y + launchCharge * 1.35;
      return;
    }

    const steps = Math.max(1, Math.ceil(delta));
    const stepDelta = delta / steps;

    for (let step = 0; step < steps; step += 1) {
      ball.vy += BALL_GRAVITY * stepDelta;

      const drag = Math.pow(BALL_DRAG, stepDelta);
      ball.vx *= drag;
      ball.vy *= drag;

      ball.x += ball.vx * stepDelta;
      ball.y += ball.vy * stepDelta;

      TABLE_SEGMENTS.forEach(function (segment) {
        collideWithSegment(segment);
      });

      collideWithBumpers();
      collideWithStandups();
      collideWithFlipper(leftFlipper);
      collideWithFlipper(rightFlipper);
      clampBallSpeed();
      handleDrain();

      if (!launched || gameOver) {
        break;
      }
    }
  }

  function drawRoundedRect(x, y, width, height, radius, fillStyle) {
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
    context.fillStyle = fillStyle;
    context.fill();
  }

  function drawRails() {
    context.lineCap = "round";
    context.lineJoin = "round";

    TABLE_SEGMENTS.forEach(function (segment) {
      context.strokeStyle = "#f8fafc";
      context.lineWidth = segment.radius * 2;
      context.beginPath();
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
      context.stroke();

      context.strokeStyle = "rgba(15, 23, 42, 0.26)";
      context.lineWidth = Math.max(2, segment.radius * 0.45);
      context.beginPath();
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
      context.stroke();
    });
  }

  function drawBumpers() {
    bumpers.forEach(function (bumper) {
      const glowAlpha = bumper.flash > 0 ? 0.28 + bumper.flash * 0.035 : 0.2;
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius + 11, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 255, 255, ${glowAlpha.toFixed(3)})`;
      context.fill();

      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      context.fillStyle = bumper.color;
      context.fill();

      context.beginPath();
      context.arc(bumper.x - 7, bumper.y - 8, bumper.radius * 0.38, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, 0.35)";
      context.fill();
    });
  }

  function drawStandups() {
    standups.forEach(function (target) {
      const fillColor = target.flash > 0 ? "#fef3c7" : target.color;

      drawRoundedRect(target.x, target.y, target.width, target.height, 8, fillColor);
      context.strokeStyle = "rgba(15, 23, 42, 0.25)";
      context.lineWidth = 2;
      context.strokeRect(target.x + 1, target.y + 1, target.width - 2, target.height - 2);
    });
  }

  function drawFlipper(flipper) {
    const tip = getFlipperTip(flipper);

    context.strokeStyle = flipper.pressed ? "#f97316" : "#fb7185";
    context.lineWidth = FLIPPER_THICKNESS;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(flipper.pivotX, flipper.pivotY);
    context.lineTo(tip.x, tip.y);
    context.stroke();

    context.fillStyle = "#fff1f2";
    context.beginPath();
    context.arc(flipper.pivotX, flipper.pivotY, 10, 0, Math.PI * 2);
    context.fill();
  }

  function drawBall() {
    context.beginPath();
    context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    context.fillStyle = "#f8fafc";
    context.fill();

    context.beginPath();
    context.arc(ball.x - 3, ball.y - 4, BALL_RADIUS * 0.36, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 255, 255, 0.45)";
    context.fill();
  }

  function drawLaunchLane() {
    drawRoundedRect(
      LAUNCH_LANE_LEFT,
      LAUNCH_LANE_TOP,
      LAUNCH_LANE_WIDTH,
      LAUNCH_LANE_BOTTOM - LAUNCH_LANE_TOP,
      16,
      "rgba(255, 255, 255, 0.08)"
    );

    context.fillStyle = "rgba(255, 255, 255, 0.12)";
    context.fillRect(LAUNCH_LANE_LEFT + 8, HEIGHT - 198, 24, 130);

    const meterHeight = 112;
    const meterFill = (launchCharge / MAX_CHARGE) * meterHeight;
    context.fillStyle = "rgba(15, 23, 42, 0.35)";
    context.fillRect(LAUNCH_LANE_LEFT + 10, HEIGHT - 192, 20, meterHeight);
    context.fillStyle = "#f97316";
    context.fillRect(LAUNCH_LANE_LEFT + 10, HEIGHT - 80 - meterFill, 20, meterFill);
  }

  function drawPlayfield() {
    const background = context.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, "#10203b");
    background.addColorStop(0.55, "#16365d");
    background.addColorStop(1, "#0b1324");
    drawRoundedRect(0, 0, WIDTH, HEIGHT, 0, background);

    drawRoundedRect(20, 20, WIDTH - 40, HEIGHT - 40, 26, "rgba(255, 255, 255, 0.06)");
    drawLaunchLane();

    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.font = "bold 20px Arial";
    context.textAlign = "center";
    context.fillText("PINBALL", WIDTH / 2, 62);
  }

  function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayfield();
    drawStandups();
    drawBumpers();
    drawRails();
    drawFlipper(leftFlipper);
    drawFlipper(rightFlipper);
    drawBall();
  }

  function loop(timestamp) {
    if (!running) {
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const delta = Math.min(2.2, (timestamp - lastTimestamp) / 16.6667);
    lastTimestamp = timestamp;

    syncFlippers(delta);
    updateBall(delta);
    render();

    if (running) {
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(event) {
    if (!CONTROL_KEYS.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (LEFT_KEYS.has(event.key)) {
      setFlipperPressed("left", true);
      return;
    }

    if (RIGHT_KEYS.has(event.key)) {
      setFlipperPressed("right", true);
      return;
    }

    if (LAUNCH_KEYS.has(event.key)) {
      beginLaunchCharge();
    }
  }

  function handleKeyUp(event) {
    if (!CONTROL_KEYS.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (LEFT_KEYS.has(event.key)) {
      setFlipperPressed("left", false);
      return;
    }

    if (RIGHT_KEYS.has(event.key)) {
      setFlipperPressed("right", false);
      return;
    }

    if (LAUNCH_KEYS.has(event.key)) {
      releaseLaunchCharge();
    }
  }

  function bindHoldControl(element, onPress, onRelease) {
    element.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.currentTarget.blur();
      onPress();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      element.addEventListener(type, function () {
        onRelease();
      });
    });
  }

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startNewGame();
  });

  bindHoldControl(
    btnLeft,
    function () {
      setFlipperPressed("left", true);
    },
    function () {
      setFlipperPressed("left", false);
    }
  );
  bindHoldControl(
    btnRight,
    function () {
      setFlipperPressed("right", true);
    },
    function () {
      setFlipperPressed("right", false);
    }
  );
  bindHoldControl(btnLaunch, beginLaunchCharge, releaseLaunchCharge);

  return {
    enter: startNewGame,
    leave: stop,
    refreshLocale: refreshMessage,
    handleKeyDown: handleKeyDown,
    handleKeyUp: handleKeyUp
  };
}
