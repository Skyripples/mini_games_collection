import { t } from "../core/i18n.js";

const PLAYER_SPEED = 340;
const PLAYER_INVULNERABLE_MS = 700;
const BULLET_SPEED = 560;
const BULLET_INTERVAL_MS = 160;
const ENEMY_MIN_SPAWN_MS = 360;
const ENEMY_MAX_SPAWN_MS = 760;
const ENEMY_MIN_SPEED = 90;
const ENEMY_MAX_SPEED = 180;
const STAR_COUNT = 72;
const START_HP = 3;
const SCREEN_CLEAR_USES = 3;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function overlaps(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function createStars(width, height) {
  return Array.from({ length: STAR_COUNT }, function () {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: randomRange(0.7, 1.8),
      speed: randomRange(30, 130)
    };
  });
}

function drawPlayerShip(context, player) {
  const noseX = player.x + player.width / 2;
  const noseY = player.y;
  const tailLeftX = player.x;
  const tailLeftY = player.y + player.height;
  const tailRightX = player.x + player.width;
  const tailRightY = player.y + player.height;

  context.save();
  context.fillStyle = "#38bdf8";
  context.beginPath();
  context.moveTo(noseX, noseY);
  context.lineTo(tailLeftX, tailLeftY);
  context.lineTo(tailRightX, tailRightY);
  context.closePath();
  context.fill();

  context.fillStyle = "#f8fafc";
  context.beginPath();
  context.moveTo(noseX, player.y + 6);
  context.lineTo(player.x + 14, player.y + player.height - 4);
  context.lineTo(player.x + player.width - 14, player.y + player.height - 4);
  context.closePath();
  context.fill();

  context.fillStyle = "#f97316";
  context.fillRect(player.x + 8, player.y + player.height - 2, 6, 10);
  context.fillRect(player.x + player.width - 14, player.y + player.height - 2, 6, 10);
  context.restore();
}

function drawEnemyShip(context, enemy) {
  context.save();
  context.fillStyle = "#ef4444";
  context.beginPath();
  context.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
  context.lineTo(enemy.x, enemy.y);
  context.lineTo(enemy.x + enemy.width, enemy.y);
  context.closePath();
  context.fill();

  context.fillStyle = "#fecaca";
  context.fillRect(enemy.x + enemy.width * 0.35, enemy.y + enemy.height * 0.2, enemy.width * 0.3, enemy.height * 0.35);
  context.restore();
}

export function createRaidenGame({ canvas, btnRestart, scoreText, hpText, skillText, message }) {
  const context = canvas.getContext("2d");
  const controlKeys = new Set(["ArrowLeft", "ArrowRight", "a", "A", "d", "D"]);

  let animationFrameId = null;
  let lastFrameTime = 0;
  let running = false;
  let gameState = "ready";
  let leftPressed = false;
  let rightPressed = false;

  let player = null;
  let bullets = [];
  let enemies = [];
  let stars = [];
  let score = 0;
  let hp = START_HP;
  let screenClearUses = SCREEN_CLEAR_USES;
  let fireCooldownMs = 0;
  let enemySpawnCooldownMs = 0;
  let playerInvulnerableMs = 0;
  let messageKey = "raiden.message.ready";
  let messageParams = {};

  canvas.tabIndex = 0;

  function setMessage(key, params) {
    messageKey = key;
    messageParams = params || {};
    message.textContent = t(key, messageParams);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function updateHud() {
    scoreText.textContent = String(score);
    hpText.textContent = String(hp);
    if (skillText) {
      skillText.textContent = String(screenClearUses);
    }
  }

  function resetPlayer() {
    const width = 44;
    const height = 34;

    player = {
      x: (canvas.width - width) / 2,
      y: canvas.height - 74,
      width: width,
      height: height
    };
  }

  function resetState() {
    bullets = [];
    enemies = [];
    stars = createStars(canvas.width, canvas.height);
    score = 0;
    hp = START_HP;
    screenClearUses = SCREEN_CLEAR_USES;
    fireCooldownMs = 0;
    enemySpawnCooldownMs = randomRange(ENEMY_MIN_SPAWN_MS, ENEMY_MAX_SPAWN_MS);
    playerInvulnerableMs = 0;
    resetPlayer();
    updateHud();
  }

  function stop() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    running = false;
    leftPressed = false;
    rightPressed = false;
    lastFrameTime = 0;
  }

  function scheduleNextFrame() {
    if (!animationFrameId) {
      animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  function spawnBullet() {
    bullets.push({
      x: player.x + player.width / 2 - 3,
      y: player.y - 14,
      width: 6,
      height: 14,
      speed: BULLET_SPEED
    });
  }

  function spawnEnemy() {
    const width = randomRange(28, 42);
    const height = randomRange(24, 34);
    enemies.push({
      x: randomRange(0, canvas.width - width),
      y: -height - 6,
      width: width,
      height: height,
      speed: randomRange(ENEMY_MIN_SPEED, ENEMY_MAX_SPEED)
    });
  }

  function updateBackground(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    stars.forEach(function (star) {
      star.y += star.speed * deltaSeconds;
      if (star.y > canvas.height + 2) {
        star.y = -2;
        star.x = Math.random() * canvas.width;
      }
    });
  }

  function updatePlayer(deltaMs) {
    const deltaSeconds = deltaMs / 1000;
    const horizontal = (rightPressed ? 1 : 0) - (leftPressed ? 1 : 0);

    if (horizontal !== 0) {
      player.x += horizontal * PLAYER_SPEED * deltaSeconds;
      player.x = clamp(player.x, 0, canvas.width - player.width);
    }
  }

  function updateBullets(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    bullets = bullets.filter(function (bullet) {
      bullet.y -= bullet.speed * deltaSeconds;
      return bullet.y + bullet.height >= 0;
    });
  }

  function updateEnemies(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    enemies = enemies.filter(function (enemy) {
      enemy.y += enemy.speed * deltaSeconds;
      return enemy.y <= canvas.height + enemy.height;
    });
  }

  function handleAutoFire(deltaMs) {
    fireCooldownMs -= deltaMs;
    while (fireCooldownMs <= 0) {
      spawnBullet();
      fireCooldownMs += BULLET_INTERVAL_MS;
    }
  }

  function handleEnemySpawn(deltaMs) {
    enemySpawnCooldownMs -= deltaMs;
    while (enemySpawnCooldownMs <= 0) {
      spawnEnemy();
      enemySpawnCooldownMs += randomRange(ENEMY_MIN_SPAWN_MS, ENEMY_MAX_SPAWN_MS);
    }
  }

  function handleBulletEnemyCollisions() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];
      let hitEnemyIndex = -1;

      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = enemies[enemyIndex];

        if (overlaps(bullet, enemy)) {
          hitEnemyIndex = enemyIndex;
          break;
        }
      }

      if (hitEnemyIndex !== -1) {
        bullets.splice(bulletIndex, 1);
        enemies.splice(hitEnemyIndex, 1);
        score += 10;
        updateHud();
      }
    }
  }

  function endGame() {
    stop();
    gameState = "gameOver";
    setMessage("raiden.message.gameOver", { score: score });
  }

  function useScreenClear() {
    if (!running) {
      return;
    }

    if (screenClearUses <= 0) {
      setMessage("raiden.message.screenClearEmpty");
      return;
    }

    const destroyed = enemies.length;
    if (destroyed > 0) {
      score += destroyed * 10;
      enemies = [];
    }

    screenClearUses -= 1;
    updateHud();

    setMessage("raiden.message.screenClearUsed", {
      count: destroyed,
      left: screenClearUses
    });
  }

  function handlePlayerEnemyCollisions() {
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];

      if (!overlaps(player, enemy)) {
        continue;
      }

      enemies.splice(enemyIndex, 1);

      if (playerInvulnerableMs > 0) {
        continue;
      }

      hp -= 1;
      playerInvulnerableMs = PLAYER_INVULNERABLE_MS;
      updateHud();

      if (hp <= 0) {
        endGame();
        return;
      }
    }
  }

  function update(deltaMs) {
    updateBackground(deltaMs);
    if (playerInvulnerableMs > 0) {
      playerInvulnerableMs = Math.max(0, playerInvulnerableMs - deltaMs);
    }

    updatePlayer(deltaMs);
    handleAutoFire(deltaMs);
    handleEnemySpawn(deltaMs);
    updateBullets(deltaMs);
    updateEnemies(deltaMs);
    handleBulletEnemyCollisions();
    handlePlayerEnemyCollisions();
  }

  function drawBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#020617");
    gradient.addColorStop(0.5, "#0f172a");
    gradient.addColorStop(1, "#111827");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.fillStyle = "rgba(186, 230, 253, 0.85)";
    stars.forEach(function (star) {
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function drawBullets() {
    context.fillStyle = "#38bdf8";
    bullets.forEach(function (bullet) {
      context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
  }

  function drawEnemies() {
    enemies.forEach(function (enemy) {
      drawEnemyShip(context, enemy);
    });
  }

  function drawPlayer() {
    if (!player) {
      return;
    }

    if (playerInvulnerableMs > 0 && Math.floor(playerInvulnerableMs / 80) % 2 === 0) {
      return;
    }

    drawPlayerShip(context, player);
  }

  function drawGameOverOverlay() {
    if (running) {
      return;
    }

    if (messageKey !== "raiden.message.gameOver") {
      return;
    }

    context.save();
    context.fillStyle = "rgba(2, 6, 23, 0.58)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f8fafc";
    context.font = '700 34px "Trebuchet MS", "Microsoft JhengHei", sans-serif';
    context.fillText(t("common.gameOver"), canvas.width / 2, canvas.height / 2 - 18);

    context.font = '600 20px "Trebuchet MS", "Microsoft JhengHei", sans-serif';
    context.fillStyle = "#bae6fd";
    context.fillText(t("raiden.message.gameOver", { score: score }), canvas.width / 2, canvas.height / 2 + 24);
    context.restore();
  }

  function render() {
    drawBackground();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawGameOverOverlay();
  }

  function loop(timestamp) {
    animationFrameId = null;

    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const deltaMs = Math.min(timestamp - lastFrameTime, 50);
    lastFrameTime = timestamp;

    if (running) {
      update(deltaMs);
    }

    render();

    if (running) {
      scheduleNextFrame();
    } else {
      lastFrameTime = 0;
    }
  }

  function resetToReady() {
    stop();
    resetState();
    gameState = "ready";
    setMessage("raiden.message.ready");
    render();
    canvas.focus({ preventScroll: true });
  }

  function startFreshRun() {
    stop();
    resetState();
    running = true;
    gameState = "running";
    setMessage("raiden.message.running");
    render();
    scheduleNextFrame();
    canvas.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (!running) {
      return;
    }

    stop();
    gameState = "paused";
    setMessage("raiden.message.paused");
    render();
  }

  function resumeGame() {
    if (gameState !== "paused") {
      return;
    }

    running = true;
    gameState = "running";
    setMessage("raiden.message.running");
    scheduleNextFrame();
    canvas.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.code === "Space") {
      if (event.repeat) {
        return;
      }

      event.preventDefault();

      if (gameState === "running") {
        pauseGame();
        return;
      }

      if (gameState === "paused") {
        resumeGame();
        return;
      }

      startFreshRun();
      return;
    }

    if (event.code === "KeyX") {
      if (event.repeat) {
        return;
      }

      event.preventDefault();
      useScreenClear();
      return;
    }

    if (!controlKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (!running) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      leftPressed = true;
      return;
    }

    rightPressed = true;
  }

  function handleKeyUp(event) {
    if (!controlKeys.has(event.key)) {
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      leftPressed = false;
      return;
    }

    rightPressed = false;
  }

  resetState();
  gameState = "ready";
  setMessage("raiden.message.ready");
  render();

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetToReady();
  });

  return {
    enter: resetToReady,
    leave: stop,
    handleKeyDown,
    handleKeyUp,
    refreshLocale: function () {
      refreshMessage();
      render();
    }
  };
}
