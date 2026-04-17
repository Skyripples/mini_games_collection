import { t } from "../core/i18n.js";

const PLAYER_SPEED_X = 340;
const PLAYER_SPEED_Y = 280;
const PLAYER_INVULNERABLE_MS = 700;
const BULLET_SPEED = 560;
const BULLET_INTERVAL_MS = 160;
const MIN_BULLET_INTERVAL_MS = 80;
const PLAYER_BULLET_LEVEL_MAX = 2;
const PLAYER_BULLET_SPREAD = 12;
const ENEMY_BULLET_SPEED = 300;
const ENEMY_MIN_SPAWN_MS = 360;
const ENEMY_MAX_SPAWN_MS = 760;
const STAR_COUNT = 72;
const START_HP = 3;
const SCREEN_CLEAR_USES = 3;
const POWER_UP_SPEED_MIN = 120;
const POWER_UP_SPEED_MAX = 180;

const POWER_UP_TYPES = {
  heart: {
    width: 20,
    height: 20,
    fillColor: "#ef4444",
    accentColor: "#fee2e2",
    label: "♥"
  },
  bomb: {
    width: 20,
    height: 20,
    fillColor: "#111827",
    accentColor: "#94a3b8",
    label: ""
  },
  power: {
    width: 22,
    height: 22,
    fillColor: "#2563eb",
    accentColor: "#dbeafe",
    label: "P"
  },
  speed: {
    width: 22,
    height: 22,
    fillColor: "#16a34a",
    accentColor: "#dcfce7",
    label: "S"
  }
};

const POWER_UP_DROP_TYPES = ["heart", "bomb", "power", "speed"];

const ENEMY_TYPES = {
  red: {
    width: 36,
    height: 30,
    speedMin: 95,
    speedMax: 165,
    hp: 1,
    score: 10,
    bodyColor: "#ef4444",
    accentColor: "#fecaca",
    canShoot: true,
    shootMinMs: 950,
    shootMaxMs: 1650
  },
  yellow: {
    width: 34,
    height: 28,
    speedMin: 190,
    speedMax: 280,
    hp: 1,
    score: 12,
    bodyColor: "#facc15",
    accentColor: "#fef08a",
    canShoot: false
  },
  green: {
    width: 42,
    height: 34,
    speedMin: 80,
    speedMax: 130,
    hp: 3,
    score: 24,
    bodyColor: "#22c55e",
    accentColor: "#bbf7d0",
    canShoot: false
  },
  purple: {
    width: 40,
    height: 32,
    speedMin: 92,
    speedMax: 150,
    hp: 2,
    score: 30,
    bodyColor: "#a855f7",
    accentColor: "#f3e8ff",
    canShoot: false
  }
};

const ENEMY_TYPE_WEIGHTS = [
  { type: "red", weight: 0.39 },
  { type: "yellow", weight: 0.31 },
  { type: "green", weight: 0.22 },
  { type: "purple", weight: 0.08 }
];

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

function drawRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
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

function pickEnemyType() {
  const totalWeight = ENEMY_TYPE_WEIGHTS.reduce(function (sum, item) {
    return sum + item.weight;
  }, 0);
  let roll = Math.random() * totalWeight;

  for (let index = 0; index < ENEMY_TYPE_WEIGHTS.length; index += 1) {
    roll -= ENEMY_TYPE_WEIGHTS[index].weight;
    if (roll <= 0) {
      return ENEMY_TYPE_WEIGHTS[index].type;
    }
  }

  return ENEMY_TYPE_WEIGHTS[ENEMY_TYPE_WEIGHTS.length - 1].type;
}

function drawPlayerShip(context, player, bulletLevel) {
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

  if (bulletLevel >= 2) {
    context.fillStyle = "#0f172a";
    context.fillRect(player.x + 6, player.y + 10, 6, 8);
    context.fillRect(player.x + player.width - 12, player.y + 10, 6, 8);
  }

  context.restore();
}

function drawEnemyShip(context, enemy) {
  const typeConfig = ENEMY_TYPES[enemy.type];
  context.save();
  context.fillStyle = typeConfig.bodyColor;
  context.beginPath();
  context.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
  context.lineTo(enemy.x, enemy.y);
  context.lineTo(enemy.x + enemy.width, enemy.y);
  context.closePath();
  context.fill();

  context.fillStyle = typeConfig.accentColor;
  context.fillRect(
    enemy.x + enemy.width * 0.35,
    enemy.y + enemy.height * 0.2,
    enemy.width * 0.3,
    enemy.height * 0.35
  );

  if (enemy.type === "red") {
    context.fillStyle = "#7f1d1d";
    context.fillRect(enemy.x + enemy.width / 2 - 2, enemy.y + enemy.height - 3, 4, 8);
  }

  if (enemy.maxHp > 1) {
    const pipColor = enemy.type === "green" ? "#14532d" : "#6b21a8";
    for (let index = 0; index < enemy.maxHp; index += 1) {
      context.fillStyle = index < enemy.hp ? pipColor : "rgba(15, 23, 42, 0.18)";
      context.fillRect(enemy.x + 7 + index * 8, enemy.y + 4, 5, 3);
    }
  }

  context.restore();
}

export function createRaidenGame({ canvas, btnRestart, scoreText, hpText, skillText, message }) {
  const context = canvas.getContext("2d");
  const controlKeys = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "a",
    "A",
    "d",
    "D",
    "w",
    "W",
    "s",
    "S"
  ]);

  let animationFrameId = null;
  let lastFrameTime = 0;
  let running = false;
  let gameState = "ready";
  let leftPressed = false;
  let rightPressed = false;
  let upPressed = false;
  let downPressed = false;

  let player = null;
  let bullets = [];
  let enemyBullets = [];
  let powerUps = [];
  let enemies = [];
  let stars = [];
  let score = 0;
  let hp = START_HP;
  let screenClearUses = SCREEN_CLEAR_USES;
  let fireCooldownMs = 0;
  let fireIntervalMs = BULLET_INTERVAL_MS;
  let bulletLevel = 1;
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
    enemyBullets = [];
    powerUps = [];
    enemies = [];
    stars = createStars(canvas.width, canvas.height);
    score = 0;
    hp = START_HP;
    screenClearUses = SCREEN_CLEAR_USES;
    fireCooldownMs = 0;
    fireIntervalMs = BULLET_INTERVAL_MS;
    bulletLevel = 1;
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
    upPressed = false;
    downPressed = false;
    lastFrameTime = 0;
  }

  function scheduleNextFrame() {
    if (!animationFrameId) {
      animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  function spawnBullet() {
    const bulletOffsets = bulletLevel >= 2 ? [-PLAYER_BULLET_SPREAD, PLAYER_BULLET_SPREAD] : [0];

    bulletOffsets.forEach(function (offset) {
      bullets.push({
        x: clamp(player.x + player.width / 2 - 3 + offset, 0, canvas.width - 6),
        y: player.y - 14,
        width: 6,
        height: 14,
        speed: BULLET_SPEED
      });
    });
  }

  function spawnEnemyBullet(enemy) {
    enemyBullets.push({
      x: enemy.x + enemy.width / 2 - 2.5,
      y: enemy.y + enemy.height - 2,
      width: 5,
      height: 14,
      speed: ENEMY_BULLET_SPEED
    });
  }

  function pickPowerUpType() {
    return POWER_UP_DROP_TYPES[Math.floor(Math.random() * POWER_UP_DROP_TYPES.length)];
  }

  function spawnPowerUp(x, y) {
    const type = pickPowerUpType();
    const typeConfig = POWER_UP_TYPES[type];

    powerUps.push({
      type: type,
      x: clamp(x - typeConfig.width / 2, 0, canvas.width - typeConfig.width),
      y: clamp(y - typeConfig.height / 2, 0, canvas.height - typeConfig.height),
      width: typeConfig.width,
      height: typeConfig.height,
      speed: randomRange(POWER_UP_SPEED_MIN, POWER_UP_SPEED_MAX)
    });
  }

  function spawnEnemy() {
    const enemyType = pickEnemyType();
    const typeConfig = ENEMY_TYPES[enemyType];

    enemies.push({
      type: enemyType,
      x: randomRange(0, canvas.width - typeConfig.width),
      y: -typeConfig.height - 6,
      width: typeConfig.width,
      height: typeConfig.height,
      speed: randomRange(typeConfig.speedMin, typeConfig.speedMax),
      hp: typeConfig.hp,
      maxHp: typeConfig.hp,
      shootCooldownMs: typeConfig.canShoot
        ? randomRange(typeConfig.shootMinMs, typeConfig.shootMaxMs)
        : 0
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
    const vertical = (downPressed ? 1 : 0) - (upPressed ? 1 : 0);

    if (horizontal !== 0) {
      player.x += horizontal * PLAYER_SPEED_X * deltaSeconds;
      player.x = clamp(player.x, 0, canvas.width - player.width);
    }

    if (vertical !== 0) {
      player.y += vertical * PLAYER_SPEED_Y * deltaSeconds;
      player.y = clamp(player.y, 0, canvas.height - player.height);
    }
  }

  function updateBullets(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    bullets = bullets.filter(function (bullet) {
      bullet.y -= bullet.speed * deltaSeconds;
      return bullet.y + bullet.height >= 0;
    });
  }

  function updateEnemyBullets(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    enemyBullets = enemyBullets.filter(function (bullet) {
      bullet.y += bullet.speed * deltaSeconds;
      return bullet.y <= canvas.height + bullet.height;
    });
  }

  function updatePowerUps(deltaMs) {
    const deltaSeconds = deltaMs / 1000;

    powerUps = powerUps.filter(function (powerUp) {
      powerUp.y += powerUp.speed * deltaSeconds;
      return powerUp.y <= canvas.height + powerUp.height;
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
      fireCooldownMs += fireIntervalMs;
    }
  }

  function handleEnemySpawn(deltaMs) {
    enemySpawnCooldownMs -= deltaMs;
    while (enemySpawnCooldownMs <= 0) {
      spawnEnemy();
      enemySpawnCooldownMs += randomRange(ENEMY_MIN_SPAWN_MS, ENEMY_MAX_SPAWN_MS);
    }
  }

  function handleEnemyFire(deltaMs) {
    enemies.forEach(function (enemy) {
      const typeConfig = ENEMY_TYPES[enemy.type];
      if (!typeConfig.canShoot) {
        return;
      }
      if (enemy.y + enemy.height < 0) {
        return;
      }

      enemy.shootCooldownMs -= deltaMs;
      while (enemy.shootCooldownMs <= 0) {
        spawnEnemyBullet(enemy);
        enemy.shootCooldownMs += randomRange(typeConfig.shootMinMs, typeConfig.shootMaxMs);
      }
    });
  }

  function handleBulletEnemyCollisions() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];
      let hitEnemyIndex = -1;

      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        if (overlaps(bullet, enemies[enemyIndex])) {
          hitEnemyIndex = enemyIndex;
          break;
        }
      }

      if (hitEnemyIndex === -1) {
        continue;
      }

      bullets.splice(bulletIndex, 1);
      const enemy = enemies[hitEnemyIndex];
      enemy.hp -= 1;

      if (enemy.hp <= 0) {
        const typeConfig = ENEMY_TYPES[enemy.type];
        if (enemy.type === "purple") {
          spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        }
        enemies.splice(hitEnemyIndex, 1);
        score += typeConfig.score;
        updateHud();
      }
    }
  }

  function applyPowerUp(powerUp) {
    switch (powerUp.type) {
      case "heart":
        hp += 1;
        updateHud();
        return;
      case "bomb":
        screenClearUses += 1;
        updateHud();
        return;
      case "power":
        bulletLevel = Math.min(PLAYER_BULLET_LEVEL_MAX, bulletLevel + 1);
        return;
      case "speed":
        fireIntervalMs = Math.max(MIN_BULLET_INTERVAL_MS, Math.round(fireIntervalMs * 0.82));
        fireCooldownMs = Math.min(fireCooldownMs, fireIntervalMs);
        return;
      default:
        return;
    }
  }

  function handlePowerUpCollisions() {
    for (let index = powerUps.length - 1; index >= 0; index -= 1) {
      const powerUp = powerUps[index];
      if (!overlaps(player, powerUp)) {
        continue;
      }

      powerUps.splice(index, 1);
      applyPowerUp(powerUp);
    }
  }

  function endGame() {
    stop();
    gameState = "gameOver";
    setMessage("raiden.message.gameOver", { score: score });
  }

  function damagePlayer() {
    if (playerInvulnerableMs > 0) {
      return;
    }

    hp -= 1;
    playerInvulnerableMs = PLAYER_INVULNERABLE_MS;
    updateHud();

    if (hp <= 0) {
      endGame();
    }
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
      const gainedScore = enemies.reduce(function (sum, enemy) {
        return sum + ENEMY_TYPES[enemy.type].score;
      }, 0);

      score += gainedScore;
      enemies = [];
      updateHud();
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
      damagePlayer();
      if (!running) {
        return;
      }
    }
  }

  function handlePlayerEnemyBulletCollisions() {
    for (let bulletIndex = enemyBullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = enemyBullets[bulletIndex];
      if (!overlaps(player, bullet)) {
        continue;
      }

      enemyBullets.splice(bulletIndex, 1);
      damagePlayer();
      if (!running) {
        return;
      }
    }
  }

  function drawPowerUp(context, powerUp) {
    const typeConfig = POWER_UP_TYPES[powerUp.type];

    context.save();
    context.translate(powerUp.x, powerUp.y);
    context.fillStyle = typeConfig.fillColor;
    context.strokeStyle = "rgba(15, 23, 42, 0.38)";
    context.lineWidth = 2;
    drawRoundedRectPath(context, 0, 0, powerUp.width, powerUp.height, 6);
    context.fill();
    context.stroke();

    if (powerUp.type === "bomb") {
      context.fillStyle = "#111827";
      context.beginPath();
      context.arc(powerUp.width / 2, powerUp.height / 2 + 1, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = typeConfig.accentColor;
      context.fillRect(powerUp.width / 2 - 1.5, 1, 3, 4);
      context.fillStyle = "#f97316";
      context.beginPath();
      context.arc(powerUp.width / 2 + 4, 4, 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = typeConfig.accentColor;
      context.font = `900 ${powerUp.type === "heart" ? 16 : 14}px "Trebuchet MS", "Microsoft JhengHei", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(typeConfig.label, powerUp.width / 2, powerUp.height / 2 + 1);
    }

    context.restore();
  }

  function update(deltaMs) {
    updateBackground(deltaMs);
    if (playerInvulnerableMs > 0) {
      playerInvulnerableMs = Math.max(0, playerInvulnerableMs - deltaMs);
    }

    updatePlayer(deltaMs);
    handleAutoFire(deltaMs);
    handleEnemySpawn(deltaMs);
    handleEnemyFire(deltaMs);
    updateBullets(deltaMs);
    updateEnemyBullets(deltaMs);
    updatePowerUps(deltaMs);
    updateEnemies(deltaMs);
    handleBulletEnemyCollisions();
    handlePlayerEnemyCollisions();
    if (!running) {
      return;
    }
    handlePlayerEnemyBulletCollisions();
    handlePowerUpCollisions();
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

    context.fillStyle = "#fb7185";
    enemyBullets.forEach(function (bullet) {
      context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
  }

  function drawEnemies() {
    enemies.forEach(function (enemy) {
      drawEnemyShip(context, enemy);
    });
  }

  function drawPowerUps() {
    powerUps.forEach(function (powerUp) {
      drawPowerUp(context, powerUp);
    });
  }

  function drawPlayer() {
    if (!player) {
      return;
    }

    if (playerInvulnerableMs > 0 && Math.floor(playerInvulnerableMs / 80) % 2 === 0) {
      return;
    }

    drawPlayerShip(context, player, bulletLevel);
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
    drawPowerUps();
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

  function setDirectionKey(key, value) {
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      leftPressed = value;
      return true;
    }

    if (key === "ArrowRight" || key === "d" || key === "D") {
      rightPressed = value;
      return true;
    }

    if (key === "ArrowUp" || key === "w" || key === "W") {
      upPressed = value;
      return true;
    }

    if (key === "ArrowDown" || key === "s" || key === "S") {
      downPressed = value;
      return true;
    }

    return false;
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

    setDirectionKey(event.key, true);
  }

  function handleKeyUp(event) {
    if (!controlKeys.has(event.key)) {
      return;
    }

    setDirectionKey(event.key, false);
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
