import { getLeaderboardApiCandidates, onLeaderboardApiModeChange } from "../core/api.js";
import { t } from "../core/i18n.js";

const BASE_STEP_MS = 140;
const BOOSTED_STEP_MS = 105;
const FEATHER_SPAWN_DELAY_MS = 10000;
const FEATHER_EFFECT_MS = 5000;
const SKULL_SPAWN_DELAY_MS = 20000;
const SKULL_VISIBLE_MS = 10000;
const STAR_FRUIT_THRESHOLD = 10;
const MAX_SPAWN_ATTEMPTS = 5000;
const SKULL_HEAD_BUFFER = 6;
const LEADERBOARD_LIMIT = 10;

const FRUIT_DEFS = [
  { kind: "watermelon", points: 1, popup: "+1", color: "#ef4444" },
  { kind: "banana", points: 1, popup: "+1", color: "#facc15" },
  { kind: "grapes", points: 1, popup: "+1", color: "#7c3aed" },
  { kind: "apple", points: 1, popup: "+1", color: "#dc2626" },
  { kind: "orange", points: 1, popup: "+1", color: "#f97316" }
];

export function createSnakeGame({
  canvas,
  btnStart,
  btnUp,
  btnLeft,
  btnDown,
  btnRight,
  scoreText,
  message,
  leaderboardStatus,
  leaderboardList
}) {
  const context = canvas.getContext("2d");
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;
  const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  canvas.tabIndex = 0;

  let snake = [];
  let fruits = [];
  let star = null;
  let feather = null;
  let skull = null;
  let floatingTexts = [];
  let direction = { x: 1, y: 0 };
  let queuedDirection = null;
  let score = 0;
  let eatenFruitCount = 0;
  let pendingStarSpawns = 0;
  let speedBoostRemainingMs = 0;
  let featherCountdownMs = FEATHER_SPAWN_DELAY_MS;
  let skullCountdownMs = SKULL_SPAWN_DELAY_MS;
  let skullRemainingMs = 0;
  let animationFrameId = null;
  let lastFrameTime = 0;
  let moveAccumulator = 0;
  let gameState = "ready";
  let messageKey = "snake.message.start";
  let messageParams = {};
  let hasSubmittedScore = false;
  let leaderboardStatusKey = "snake.leaderboard.loading";
  let leaderboardStatusParams = {};
  let leaderboardRequestId = 0;
  let isActive = false;

  function setMessage(key, params) {
    messageKey = key;
    messageParams = params || {};
    message.textContent = t(key, messageParams);
  }

  function refreshMessage() {
    message.textContent = t(messageKey, messageParams);
  }

  function updateScoreDisplay() {
    scoreText.textContent = String(score);
  }

  function normalizeLeaderboardItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.leaderboard)) {
      return payload.leaderboard;
    }

    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.results)) {
      return payload.results;
    }

    return [];
  }

  function getLeaderboardName(item) {
    if (item && item.__placeholder) {
      return t("leaderboard.placeholderName");
    }

    if (item && item.player_name !== undefined && item.player_name !== null) {
      const name = String(item.player_name).trim();
      return name ? name : t("leaderboard.placeholderName");
    }

    if (item && item.playerName !== undefined && item.playerName !== null) {
      const name = String(item.playerName).trim();
      return name ? name : t("leaderboard.placeholderName");
    }

    if (item && item.name !== undefined && item.name !== null) {
      const name = String(item.name).trim();
      return name ? name : t("leaderboard.placeholderName");
    }

    return t("leaderboard.placeholderName");
  }

  function getLeaderboardScore(item) {
    const score = Number(item && item.score);
    return Number.isFinite(score) ? String(score) : "0";
  }

  function createPlaceholderLeaderboardItem() {
    return {
      __placeholder: true,
      player_name: "",
      score: 0
    };
  }

  function buildLeaderboardDisplayItems(items) {
    const displayItems = Array.isArray(items) ? items.slice(0, LEADERBOARD_LIMIT) : [];

    while (displayItems.length < LEADERBOARD_LIMIT) {
      displayItems.push(createPlaceholderLeaderboardItem());
    }

    return displayItems;
  }

  function setLeaderboardStatus(key, params) {
    leaderboardStatusKey = key || "";
    leaderboardStatusParams = params || {};

    if (!leaderboardStatus) {
      return;
    }

    leaderboardStatus.textContent = leaderboardStatusKey ? t(leaderboardStatusKey, leaderboardStatusParams) : "";
  }

  function refreshLeaderboardStatus() {
    if (!leaderboardStatus) {
      return;
    }

    leaderboardStatus.textContent = leaderboardStatusKey ? t(leaderboardStatusKey, leaderboardStatusParams) : "";
  }

  function renderLeaderboard(items) {
    if (!leaderboardList) {
      return;
    }

    const entries = buildLeaderboardDisplayItems(items);
    leaderboardList.innerHTML = "";

    entries.forEach(function (item, index) {
      const li = document.createElement("li");
      li.className = "snake-leaderboard-item";

      const rank = document.createElement("span");
      rank.className = "snake-leaderboard-rank";
      rank.textContent = `${index + 1}.`;

      const name = document.createElement("span");
      name.className = "snake-leaderboard-name";
      name.textContent = getLeaderboardName(item);

      const scoreValue = Number(item.score);
      const scoreNode = document.createElement("span");
      scoreNode.className = "snake-leaderboard-score";
      scoreNode.textContent = Number.isFinite(scoreValue) ? String(scoreValue) : getLeaderboardScore(item);

      li.append(rank, name, scoreNode);
      leaderboardList.appendChild(li);
    });
  }

  async function loadLeaderboard() {
    const requestId = ++leaderboardRequestId;

    if (!leaderboardList && !leaderboardStatus) {
      return;
    }

    renderLeaderboard([]);
    setLeaderboardStatus("snake.leaderboard.loading");

    try {
      if (typeof fetch !== "function") {
        throw new Error("fetch is not available");
      }

      let lastError = null;
      let payload = [];

      for (const apiUrl of getLeaderboardApiCandidates()) {
        try {
          const response = await fetch(`${apiUrl}?gameId=snake&limit=${LEADERBOARD_LIMIT}`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const text = await response.text();
          payload = text ? JSON.parse(text) : [];
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      if (requestId !== leaderboardRequestId) {
        return;
      }

      const items = normalizeLeaderboardItems(payload);
      renderLeaderboard(items);
      setLeaderboardStatus("");
    } catch (error) {
      if (requestId !== leaderboardRequestId) {
        return;
      }

      console.error("Failed to load snake leaderboard:", error);
      renderLeaderboard([]);
      setLeaderboardStatus("snake.leaderboard.failed");
    }
  }

  async function submitSnakeScore() {
    if (hasSubmittedScore) {
      return;
    }

    hasSubmittedScore = true;

    try {
      if (typeof fetch !== "function") {
        throw new Error("fetch is not available");
      }

      const requestBody = JSON.stringify({
        gameId: "snake",
        playerName: "Master",
        score
      });
      let lastError = null;

      for (const apiUrl of getLeaderboardApiCandidates()) {
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: requestBody
          });

          if (response.ok) {
            return;
          }

          lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
          lastError = error;
        }
      }

      if (lastError) {
        throw lastError;
      }
    } catch (error) {
      console.error("Failed to submit snake score:", error);
    }
  }

  onLeaderboardApiModeChange(function () {
    if (isActive) {
      void loadLeaderboard();
    }
  });

  function getMoveDelay() {
    return speedBoostRemainingMs > 0 ? BOOSTED_STEP_MS : BASE_STEP_MS;
  }

  function createInitialSnake() {
    const center = Math.floor(tileCount / 2);
    return [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center }
    ];
  }

  function isSameCell(item, x, y) {
    return Boolean(item) && item.x === x && item.y === y;
  }

  function isCellNearHead(x, y, minDistance) {
    if (!snake[0]) {
      return false;
    }

    return Math.max(Math.abs(snake[0].x - x), Math.abs(snake[0].y - y)) < minDistance;
  }

  function isOccupiedCell(x, y, options) {
    const settings = options || {};

    if (
      snake.some(function (part) {
        return part.x === x && part.y === y;
      })
    ) {
      return true;
    }

    if (
      fruits.some(function (fruit) {
        if (settings.ignoreFruitKind && fruit.kind === settings.ignoreFruitKind) {
          return false;
        }

        return fruit.x === x && fruit.y === y;
      })
    ) {
      return true;
    }

    if (!settings.ignoreStar && isSameCell(star, x, y)) {
      return true;
    }

    if (!settings.ignoreFeather && isSameCell(feather, x, y)) {
      return true;
    }

    if (!settings.ignoreSkull && isSameCell(skull, x, y)) {
      return true;
    }

    if (settings.avoidNearHead && isCellNearHead(x, y, settings.minHeadDistance || SKULL_HEAD_BUFFER)) {
      return true;
    }

    return false;
  }

  function findOpenCell(options) {
    for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt += 1) {
      const candidate = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };

      if (!isOccupiedCell(candidate.x, candidate.y, options)) {
        return candidate;
      }
    }

    return null;
  }

  function syncFruits() {
    FRUIT_DEFS.forEach(function (fruitDef) {
      const exists = fruits.some(function (fruit) {
        return fruit.kind === fruitDef.kind;
      });

      if (exists) {
        return;
      }

      const nextCell = findOpenCell({ ignoreFruitKind: fruitDef.kind });
      if (!nextCell) {
        return;
      }

      fruits.push({
        kind: fruitDef.kind,
        points: fruitDef.points,
        popup: fruitDef.popup,
        color: fruitDef.color,
        x: nextCell.x,
        y: nextCell.y
      });
    });
  }

  function spawnPendingStar() {
    if (star || pendingStarSpawns <= 0) {
      return;
    }

    const nextCell = findOpenCell();
    if (!nextCell) {
      return;
    }

    star = {
      x: nextCell.x,
      y: nextCell.y,
      points: 5
    };
    pendingStarSpawns -= 1;
  }

  function spawnFeather() {
    const nextCell = findOpenCell({ ignoreFeather: true });
    if (!nextCell) {
      featherCountdownMs = FEATHER_SPAWN_DELAY_MS;
      return;
    }

    feather = {
      x: nextCell.x,
      y: nextCell.y
    };
    featherCountdownMs = 0;
  }

  function spawnSkull() {
    const nextCell = findOpenCell({
      avoidNearHead: true,
      minHeadDistance: SKULL_HEAD_BUFFER,
      ignoreSkull: true
    });
    if (!nextCell) {
      skullCountdownMs = SKULL_SPAWN_DELAY_MS;
      return;
    }

    skull = {
      x: nextCell.x,
      y: nextCell.y
    };
    skullRemainingMs = SKULL_VISIBLE_MS;
    skullCountdownMs = 0;
  }

  function addFloatingText(text, x, y, color) {
    floatingTexts.push({
      text,
      color,
      x: x * gridSize + gridSize / 2,
      y: y * gridSize + gridSize / 2,
      ageMs: 0,
      durationMs: 850
    });
  }

  function drawRoundedRect(x, y, width, height, radius, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fill();
  }

  function drawCircle(centerX, centerY, radius, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawStar(centerX, centerY, outerRadius, innerRadius, fillStyle) {
    context.save();
    context.fillStyle = fillStyle;
    context.beginPath();

    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (Math.PI / 5) * point;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (point === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.closePath();
    context.shadowColor = "rgba(250, 204, 21, 0.6)";
    context.shadowBlur = 14;
    context.fill();
    context.restore();
  }

  function drawWatermelon(centerX, centerY) {
    drawCircle(centerX, centerY, 8, "#166534");
    drawCircle(centerX, centerY, 6.5, "#ef4444");
    drawCircle(centerX, centerY, 5.3, "#f87171");

    context.fillStyle = "#111827";
    [
      [-2.5, -1.5],
      [2.5, -0.5],
      [-1, 2.5],
      [2, 2.2]
    ].forEach(function ([offsetX, offsetY]) {
      context.beginPath();
      context.ellipse(centerX + offsetX, centerY + offsetY, 0.9, 1.6, 0, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawBanana(centerX, centerY) {
    context.save();
    context.lineCap = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#facc15";
    context.beginPath();
    context.arc(centerX - 1, centerY + 1, 6.2, Math.PI * 0.1, Math.PI * 1.1);
    context.stroke();

    context.lineWidth = 1.5;
    context.strokeStyle = "#ca8a04";
    context.beginPath();
    context.arc(centerX - 1, centerY + 1, 6.2, Math.PI * 0.14, Math.PI * 1.06);
    context.stroke();

    drawCircle(centerX + 5, centerY + 3, 1, "#713f12");
    drawCircle(centerX - 7, centerY - 2, 1, "#713f12");
    context.restore();
  }

  function drawGrapes(centerX, centerY) {
    const grapeOffsets = [
      [0, -4],
      [-4, 0],
      [0, 0],
      [4, 0],
      [-2, 4],
      [2, 4]
    ];

    grapeOffsets.forEach(function ([offsetX, offsetY], index) {
      drawCircle(centerX + offsetX, centerY + offsetY, 3, index % 2 === 0 ? "#7c3aed" : "#8b5cf6");
    });

    context.strokeStyle = "#166534";
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(centerX, centerY - 8);
    context.lineTo(centerX + 2, centerY - 11);
    context.stroke();
    drawCircle(centerX + 3, centerY - 10, 1.5, "#22c55e");
  }

  function drawApple(centerX, centerY) {
    drawCircle(centerX, centerY + 1, 6.8, "#dc2626");
    drawCircle(centerX - 3.5, centerY - 1.5, 3.8, "#dc2626");
    drawCircle(centerX + 3.5, centerY - 1.5, 3.8, "#dc2626");

    context.strokeStyle = "#7c2d12";
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(centerX, centerY - 6);
    context.lineTo(centerX + 1, centerY - 10);
    context.stroke();

    context.fillStyle = "#22c55e";
    context.beginPath();
    context.ellipse(centerX + 4.5, centerY - 8, 3, 1.8, -0.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawOrange(centerX, centerY) {
    drawCircle(centerX, centerY, 7, "#f97316");
    drawCircle(centerX - 1.5, centerY - 1.5, 5.8, "#fb923c");
    drawCircle(centerX + 3, centerY - 5.5, 1.5, "#15803d");
    context.fillStyle = "rgba(255, 255, 255, 0.28)";
    context.beginPath();
    context.ellipse(centerX - 2, centerY - 2, 2.5, 1.7, -0.5, 0, Math.PI * 2);
    context.fill();
  }

  function drawFeather(centerX, centerY) {
    context.save();
    context.strokeStyle = "#0891b2";
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(centerX - 1, centerY + 7);
    context.lineTo(centerX + 2, centerY - 7);
    context.stroke();

    context.fillStyle = "#dbeafe";
    context.beginPath();
    context.moveTo(centerX + 2, centerY - 7);
    context.quadraticCurveTo(centerX + 8, centerY - 2, centerX + 4, centerY + 7);
    context.quadraticCurveTo(centerX, centerY + 5, centerX - 1, centerY + 7);
    context.quadraticCurveTo(centerX - 5, centerY + 1, centerX + 2, centerY - 7);
    context.fill();
    context.restore();
  }

  function drawSkull(centerX, centerY) {
    drawCircle(centerX, centerY - 1, 7.3, "#f8fafc");
    drawRoundedRect(centerX - 5.5, centerY + 2, 11, 6, 2.5, "#f8fafc");
    drawCircle(centerX - 2.8, centerY - 2, 1.8, "#0f172a");
    drawCircle(centerX + 2.8, centerY - 2, 1.8, "#0f172a");

    context.fillStyle = "#0f172a";
    context.beginPath();
    context.moveTo(centerX, centerY + 0.5);
    context.lineTo(centerX - 1.4, centerY + 3.5);
    context.lineTo(centerX + 1.4, centerY + 3.5);
    context.closePath();
    context.fill();

    context.strokeStyle = "#0f172a";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(centerX - 2.8, centerY + 5.5);
    context.lineTo(centerX - 2.8, centerY + 8);
    context.moveTo(centerX, centerY + 5.5);
    context.lineTo(centerX, centerY + 8);
    context.moveTo(centerX + 2.8, centerY + 5.5);
    context.lineTo(centerX + 2.8, centerY + 8);
    context.stroke();
  }

  function drawItem(item, drawer) {
    const centerX = item.x * gridSize + gridSize / 2;
    const centerY = item.y * gridSize + gridSize / 2;
    drawer(centerX, centerY);
  }

  function getSegmentDirection(part, nextPart, fallback) {
    if (!part || !nextPart) {
      return fallback;
    }

    const directionX = Math.sign(part.x - nextPart.x);
    const directionY = Math.sign(part.y - nextPart.y);

    if (directionX === 0 && directionY === 0) {
      return fallback;
    }

    return {
      x: directionX,
      y: directionY
    };
  }

  function drawXEye(centerX, centerY) {
    context.strokeStyle = "#111827";
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(centerX - 2.2, centerY - 2.2);
    context.lineTo(centerX + 2.2, centerY + 2.2);
    context.moveTo(centerX + 2.2, centerY - 2.2);
    context.lineTo(centerX - 2.2, centerY + 2.2);
    context.stroke();
  }

  function drawBodySegment(part) {
    const inset = 2;
    const baseColor = speedBoostRemainingMs > 0 ? "#2dd4bf" : "#22c55e";
    const shadowColor = speedBoostRemainingMs > 0 ? "rgba(45, 212, 191, 0.55)" : "transparent";

    context.save();
    if (speedBoostRemainingMs > 0) {
      context.shadowColor = shadowColor;
      context.shadowBlur = 10;
    }

    drawRoundedRect(
      part.x * gridSize + inset,
      part.y * gridSize + inset,
      gridSize - inset * 2,
      gridSize - inset * 2,
      6,
      baseColor
    );

    if (speedBoostRemainingMs > 0) {
      drawRoundedRect(
        part.x * gridSize + 5,
        part.y * gridSize + 5,
        gridSize - 10,
        gridSize - 12,
        4,
        "rgba(240, 253, 250, 0.35)"
      );
    }
    context.restore();
  }

  function drawTail(part, tailDirection) {
    const inset = 4;
    const x = part.x * gridSize + inset;
    const y = part.y * gridSize + inset;
    const size = gridSize - inset * 2;
    const centerX = part.x * gridSize + gridSize / 2;
    const centerY = part.y * gridSize + gridSize / 2;

    context.save();
    if (speedBoostRemainingMs > 0) {
      context.shadowColor = "rgba(45, 212, 191, 0.55)";
      context.shadowBlur = 10;
    }

    drawRoundedRect(x, y, size, size, 6, speedBoostRemainingMs > 0 ? "#0f766e" : "#15803d");

    context.fillStyle = "#166534";
    context.beginPath();
    if (tailDirection.x === 1) {
      context.moveTo(centerX + size / 2, centerY);
      context.lineTo(centerX + 2, centerY - 5);
      context.lineTo(centerX + 2, centerY + 5);
    } else if (tailDirection.x === -1) {
      context.moveTo(centerX - size / 2, centerY);
      context.lineTo(centerX - 2, centerY - 5);
      context.lineTo(centerX - 2, centerY + 5);
    } else if (tailDirection.y === 1) {
      context.moveTo(centerX, centerY + size / 2);
      context.lineTo(centerX - 5, centerY + 2);
      context.lineTo(centerX + 5, centerY + 2);
    } else {
      context.moveTo(centerX, centerY - size / 2);
      context.lineTo(centerX - 5, centerY - 2);
      context.lineTo(centerX + 5, centerY - 2);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawHead(part, headDirection) {
    const inset = 1;
    const x = part.x * gridSize + inset;
    const y = part.y * gridSize + inset;
    const size = gridSize - inset * 2;
    const centerX = part.x * gridSize + gridSize / 2;
    const centerY = part.y * gridSize + gridSize / 2;
    const dead = gameState === "gameOver";

    context.save();
    if (speedBoostRemainingMs > 0 && !dead) {
      context.shadowColor = "rgba(45, 212, 191, 0.65)";
      context.shadowBlur = 12;
    }

    drawRoundedRect(x, y, size, size, 7, speedBoostRemainingMs > 0 && !dead ? "#14b8a6" : "#16a34a");
    drawCircle(centerX, centerY, 3, dead ? "#7f1d1d" : "#14532d");

    if (dead) {
      drawXEye(centerX - 4, centerY - 3);
      drawXEye(centerX + 4, centerY + 3);
      context.restore();
      return;
    }

    let eyeOffsetX = 4;
    let eyeOffsetY = 4;

    if (headDirection.x === 1) {
      eyeOffsetX = 6;
      eyeOffsetY = 4;
    } else if (headDirection.x === -1) {
      eyeOffsetX = -6;
      eyeOffsetY = 4;
    } else if (headDirection.y === 1) {
      eyeOffsetX = 4;
      eyeOffsetY = 6;
    } else {
      eyeOffsetX = 4;
      eyeOffsetY = -6;
    }

    if (headDirection.x !== 0) {
      drawCircle(centerX + eyeOffsetX, centerY - 3, 2.2, "#ffffff");
      drawCircle(centerX + eyeOffsetX, centerY + 3, 2.2, "#ffffff");
      drawCircle(centerX + eyeOffsetX + Math.sign(headDirection.x), centerY - 3, 1, "#111827");
      drawCircle(centerX + eyeOffsetX + Math.sign(headDirection.x), centerY + 3, 1, "#111827");
      context.restore();
      return;
    }

    drawCircle(centerX - 3, centerY + eyeOffsetY, 2.2, "#ffffff");
    drawCircle(centerX + 3, centerY + eyeOffsetY, 2.2, "#ffffff");
    drawCircle(centerX - 3, centerY + eyeOffsetY + Math.sign(headDirection.y), 1, "#111827");
    drawCircle(centerX + 3, centerY + eyeOffsetY + Math.sign(headDirection.y), 1, "#111827");
    context.restore();
  }

  function drawBackground() {
    context.fillStyle = "#020617";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(148, 163, 184, 0.14)";
    context.lineWidth = 1;
    for (let index = 0; index <= tileCount; index += 1) {
      const offset = index * gridSize;
      context.beginPath();
      context.moveTo(offset + 0.5, 0);
      context.lineTo(offset + 0.5, canvas.height);
      context.stroke();

      context.beginPath();
      context.moveTo(0, offset + 0.5);
      context.lineTo(canvas.width, offset + 0.5);
      context.stroke();
    }
  }

  function drawFloatingTexts() {
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = '700 24px "Courier New", monospace';
    context.lineWidth = 4;
    context.strokeStyle = "rgba(15, 23, 42, 0.55)";

    floatingTexts.forEach(function (item) {
      const progress = item.ageMs / item.durationMs;
      const alpha = 1 - progress;
      const y = item.y - progress * 28;

      context.globalAlpha = alpha;
      context.fillStyle = item.color;
      context.strokeText(item.text, item.x, y);
      context.fillText(item.text, item.x, y);
    });

    context.restore();
  }

  function drawOverlayPanel(lines, hint, customHeight) {
    const panelWidth = Math.min(canvas.width * 0.8, 520);
    const panelHeight = customHeight || (hint ? 250 : 190);
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    const centerX = canvas.width / 2;

    context.save();
    context.fillStyle = "rgba(15, 23, 42, 0.28)";
    context.fillRect(panelX + 18, panelY + 18, panelWidth, panelHeight);

    context.fillStyle = "#99dfdd";
    context.fillRect(panelX, panelY, panelWidth, panelHeight);
    context.fillStyle = "#6ca9a6";
    context.fillRect(panelX + 14, panelY + 14, panelWidth - 28, panelHeight - 28);
    context.fillStyle = "#b6ece9";
    context.fillRect(panelX + 14, panelY + 14, panelWidth - 28, (panelHeight - 28) / 2);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#020617";
    context.shadowColor = "#5b8f8b";
    context.shadowBlur = 0;
    context.shadowOffsetX = 8;
    context.shadowOffsetY = 8;
    context.font = '700 56px "Courier New", monospace';

    lines.forEach(function (line, index) {
      const lineY = panelY + 80 + index * 64;
      context.fillText(line, centerX, lineY);
    });

    if (hint) {
      context.shadowOffsetX = 4;
      context.shadowOffsetY = 4;
      context.font = '700 22px "Courier New", monospace';
      context.fillText(hint, centerX, panelY + panelHeight - 42);
    }

    context.restore();
  }

  function drawKeycap(x, y, width, height, label, fontSize) {
    context.save();
    context.fillStyle = "#dff7f5";
    context.fillRect(x, y, width, height);
    context.fillStyle = "#a7d7d4";
    context.fillRect(x + 4, y + 4, width - 8, height - 8);
    context.strokeStyle = "#020617";
    context.lineWidth = 4;
    context.strokeRect(x + 2, y + 2, width - 4, height - 4);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#020617";
    context.font = `700 ${fontSize}px "Courier New", monospace`;
    context.fillText(label, x + width / 2, y + height / 2 + 1);
    context.restore();
  }

  function drawSpaceKey(x, y) {
    drawKeycap(x, y, 170, 42, "SPACE", 18);
  }

  function drawArrowKeyCluster(centerX, y) {
    const keySize = 38;
    const gap = 8;
    const totalWidth = keySize * 4 + gap * 3;
    const startX = centerX - totalWidth / 2;

    drawKeycap(startX, y, keySize, keySize, "\u2190", 22);
    drawKeycap(startX + (keySize + gap), y, keySize, keySize, "\u2191", 22);
    drawKeycap(startX + (keySize + gap) * 2, y, keySize, keySize, "\u2193", 22);
    drawKeycap(startX + (keySize + gap) * 3, y, keySize, keySize, "\u2192", 22);
  }

  function drawStartOverlay() {
    drawOverlayPanel([t("snake.overlay.startLine1"), t("snake.overlay.startLine2")], "", 250);

    const panelWidth = Math.min(canvas.width * 0.8, 520);
    const panelHeight = 250;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    const centerX = canvas.width / 2;

    drawSpaceKey(centerX - 85, panelY + 92);

    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#020617";
    context.shadowColor = "#5b8f8b";
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 4;
    context.font = '700 22px "Courier New", monospace';
    drawArrowKeyCluster(centerX, panelY + panelHeight - 86);
    context.fillText(t("snake.overlay.moveHint"), centerX, panelY + panelHeight - 28);
    context.restore();
  }

  function drawPausedOverlay() {
    drawOverlayPanel([t("snake.overlay.paused")], "");

    const panelWidth = Math.min(canvas.width * 0.8, 520);
    const panelHeight = 190;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    const centerX = canvas.width / 2;

    drawSpaceKey(centerX - 85, panelY + 94);

    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#020617";
    context.shadowColor = "#5b8f8b";
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 4;
    context.font = '700 22px "Courier New", monospace';
    context.fillText(t("snake.overlay.resume"), centerX, panelY + panelHeight - 28);
    context.restore();
  }

  function draw() {
    drawBackground();

    fruits.forEach(function (fruit) {
      drawItem(fruit, function (centerX, centerY) {
        switch (fruit.kind) {
          case "watermelon":
            drawWatermelon(centerX, centerY);
            break;
          case "banana":
            drawBanana(centerX, centerY);
            break;
          case "grapes":
            drawGrapes(centerX, centerY);
            break;
          case "apple":
            drawApple(centerX, centerY);
            break;
          case "orange":
          default:
            drawOrange(centerX, centerY);
            break;
        }
      });
    });

    if (star) {
      drawItem(star, function (centerX, centerY) {
        drawStar(centerX, centerY, 8, 3.6, "#facc15");
      });
    }

    if (feather) {
      drawItem(feather, drawFeather);
    }

    if (skull) {
      drawItem(skull, drawSkull);
    }

    snake.slice(1, -1).forEach(drawBodySegment);

    if (snake.length > 1) {
      const tailDirection = getSegmentDirection(snake[snake.length - 1], snake[snake.length - 2], {
        x: -direction.x,
        y: -direction.y
      });
      drawTail(snake[snake.length - 1], tailDirection);
    }

    if (snake[0]) {
      const headDirection = getSegmentDirection(snake[0], snake[1], direction);
      drawHead(snake[0], headDirection);
    }

    drawFloatingTexts();

    if (gameState === "paused") {
      drawPausedOverlay();
    }
  }

  function updateFloatingTexts(deltaMs) {
    floatingTexts = floatingTexts.filter(function (item) {
      item.ageMs += deltaMs;
      return item.ageMs < item.durationMs;
    });
  }

  function stopLoop() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    lastFrameTime = 0;
    moveAccumulator = 0;
  }

  function requestFrame() {
    if (!animationFrameId) {
      animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  function applyQueuedDirection() {
    if (!queuedDirection) {
      return;
    }

    if (queuedDirection.x === -direction.x && queuedDirection.y === -direction.y) {
      queuedDirection = null;
      return;
    }

    direction = queuedDirection;
    queuedDirection = null;
  }

  function triggerGameOver() {
    gameState = "gameOver";
    setMessage("snake.message.gameOver", { score });
    void submitSnakeScore().finally(function () {
      void loadLeaderboard();
    });
    stopLoop();
    draw();
  }

  function triggerWin() {
    gameState = "win";
    setMessage("snake.message.win", { score });
    stopLoop();
    draw();
  }

  function updateTimedItems(deltaMs) {
    if (speedBoostRemainingMs > 0) {
      speedBoostRemainingMs = Math.max(0, speedBoostRemainingMs - deltaMs);
      if (speedBoostRemainingMs === 0) {
        featherCountdownMs = FEATHER_SPAWN_DELAY_MS;
        if (gameState === "running") {
          setMessage("snake.message.running");
        }
      }
    } else if (!feather) {
      featherCountdownMs -= deltaMs;
      if (featherCountdownMs <= 0) {
        spawnFeather();
      }
    }

    if (skull) {
      skullRemainingMs -= deltaMs;
      if (skullRemainingMs <= 0) {
        skull = null;
        skullRemainingMs = 0;
        skullCountdownMs = SKULL_SPAWN_DELAY_MS;
      }
    } else {
      skullCountdownMs -= deltaMs;
      if (skullCountdownMs <= 0) {
        spawnSkull();
      }
    }
  }

  function step() {
    applyQueuedDirection();

    const head = {
      x: (snake[0].x + direction.x + tileCount) % tileCount,
      y: (snake[0].y + direction.y + tileCount) % tileCount
    };
    const eatenFruitIndex = fruits.findIndex(function (fruit) {
      return fruit.x === head.x && fruit.y === head.y;
    });
    const willGrow = eatenFruitIndex !== -1;
    const snakeBody = willGrow ? snake : snake.slice(0, -1);
    const hitsSelf = snakeBody.some(function (part) {
      return part.x === head.x && part.y === head.y;
    });

    if (hitsSelf) {
      snake.unshift(head);
      triggerGameOver();
      return;
    }

    if (isSameCell(skull, head.x, head.y)) {
      snake.unshift(head);
      triggerGameOver();
      return;
    }

    snake.unshift(head);

    if (willGrow) {
      const fruit = fruits[eatenFruitIndex];
      fruits.splice(eatenFruitIndex, 1);
      eatenFruitCount += 1;
      score += fruit.points;
      updateScoreDisplay();
      addFloatingText(fruit.popup, head.x, head.y, fruit.color);

      if (eatenFruitCount % STAR_FRUIT_THRESHOLD === 0) {
        pendingStarSpawns += 1;
      }
    } else {
      snake.pop();
    }

    if (isSameCell(star, head.x, head.y)) {
      star = null;
      score += 5;
      updateScoreDisplay();
      addFloatingText("+5", head.x, head.y, "#facc15");
    }

    if (isSameCell(feather, head.x, head.y)) {
      feather = null;
      speedBoostRemainingMs = FEATHER_EFFECT_MS;
      addFloatingText("SPEED UP", head.x, head.y, "#38bdf8");
      setMessage("snake.message.running");
    }

    syncFruits();
    spawnPendingStar();

    if (snake.length >= tileCount * tileCount) {
      triggerWin();
      return;
    }
  }

  function loop(timestamp) {
    animationFrameId = null;

    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const deltaMs = Math.min(timestamp - lastFrameTime, 120);
    lastFrameTime = timestamp;
    let shouldContinue = false;

    if (gameState === "running") {
      updateTimedItems(deltaMs);
      moveAccumulator += deltaMs;

      while (moveAccumulator >= getMoveDelay() && gameState === "running") {
        moveAccumulator -= getMoveDelay();
        step();
      }
    }

    if (floatingTexts.length > 0) {
      updateFloatingTexts(deltaMs);
    }

    shouldContinue = gameState === "running" || floatingTexts.length > 0;
    draw();

    if (shouldContinue) {
      requestFrame();
    } else {
      lastFrameTime = 0;
    }
  }

  function resetToReady() {
    stopLoop();
    snake = createInitialSnake();
    fruits = [];
    star = null;
    feather = null;
    skull = null;
    floatingTexts = [];
    direction = { x: 1, y: 0 };
    queuedDirection = null;
    score = 0;
    eatenFruitCount = 0;
    pendingStarSpawns = 0;
    speedBoostRemainingMs = 0;
    featherCountdownMs = FEATHER_SPAWN_DELAY_MS;
    skullCountdownMs = SKULL_SPAWN_DELAY_MS;
    skullRemainingMs = 0;
    gameState = "ready";
    hasSubmittedScore = false;
    updateScoreDisplay();
    syncFruits();
    setMessage("snake.message.start");
    draw();
    canvas.focus({ preventScroll: true });
  }

  function startFreshRun() {
    resetToReady();
    gameState = "running";
    setMessage("snake.message.running");
    requestFrame();
  }

  function enterGame() {
    isActive = true;
    resetToReady();
    void loadLeaderboard();
  }

  function leaveGame() {
    isActive = false;
    stopLoop();
  }

  function togglePauseOrStart() {
    if (gameState === "ready") {
      gameState = "running";
      setMessage("snake.message.running");
      requestFrame();
      return;
    }

    if (gameState === "paused") {
      gameState = "running";
      setMessage("snake.message.running");
      requestFrame();
      return;
    }

    if (gameState === "running") {
      gameState = "paused";
      stopLoop();
      setMessage("snake.message.paused");
      draw();
      return;
    }

    startFreshRun();
  }

  function applyDirection(key) {
    if (gameState !== "running" && gameState !== "paused" && gameState !== "ready") {
      return;
    }

    if (key === "ArrowUp") {
      queuedDirection = { x: 0, y: -1 };
    } else if (key === "ArrowDown") {
      queuedDirection = { x: 0, y: 1 };
    } else if (key === "ArrowLeft") {
      queuedDirection = { x: -1, y: 0 };
    } else if (key === "ArrowRight") {
      queuedDirection = { x: 1, y: 0 };
    }
  }

  function handleKeyDown(event) {
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) {
        togglePauseOrStart();
      }
      return;
    }

    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();
    applyDirection(event.key);
  }

  function bindDirectionButton(button, key) {
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.currentTarget.blur();
      applyDirection(key);
      canvas.focus({ preventScroll: true });
    });
  }

  btnStart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetToReady();
  });
  bindDirectionButton(btnUp, "ArrowUp");
  bindDirectionButton(btnLeft, "ArrowLeft");
  bindDirectionButton(btnDown, "ArrowDown");
  bindDirectionButton(btnRight, "ArrowRight");

  return {
    enter: enterGame,
    leave: leaveGame,
    handleKeyDown,
    refreshLocale: function () {
      refreshMessage();
      refreshLeaderboardStatus();
      draw();
    }
  };
}
