import { t } from "../core/i18n.js";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 640;
const LANE_COUNT = 4;
const HIT_LINE_Y = 540;
const NOTE_WIDTH_PADDING = 20;
const NOTE_HEIGHT = 18;
const NOTE_TRAVEL_MS = 1700;
const NOTE_START_Y = 80;
const SCROLL_SPEED = (HIT_LINE_Y - NOTE_START_Y) / NOTE_TRAVEL_MS;
const NOTE_INTERVAL_MS = 480;
const FIRST_NOTE_TIME = 1800;
const HIT_WINDOW_MS = 140;
const MISS_WINDOW_MS = 200;
const INITIAL_LIVES = 5;

const LANE_KEYS = new Map([
  ["ArrowLeft", 0],
  ["ArrowDown", 1],
  ["ArrowUp", 2],
  ["ArrowRight", 3]
]);

const BEAT_SEQUENCE = [
  0, 1, 2, 3,
  1, 2, 3, 2,
  0, 2, 1, 3,
  2, 1, 0, 1,
  0, 1, 3, 2,
  1, 3, 2, 0,
  0, 2, 1, 3,
  3, 2, 1, 0
];

const LANE_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];

function createChart() {
  return BEAT_SEQUENCE.map(function (lane, index) {
    return {
      lane: lane,
      time: FIRST_NOTE_TIME + index * NOTE_INTERVAL_MS,
      hit: false,
      missed: false
    };
  });
}

function formatAccuracy(hitCount, totalCount) {
  if (totalCount <= 0) {
    return "100";
  }

  return String(Math.max(0, Math.min(100, Math.round((hitCount / totalCount) * 100))));
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

export function createRhythmGame({
  canvas,
  btnRestart,
  scoreText,
  comboText,
  livesText,
  message
}) {
  const context = canvas.getContext("2d");
  const laneWidth = CANVAS_WIDTH / LANE_COUNT;

  let animationFrameId = null;
  let lastTimestamp = 0;
  let gameState = "ready";
  let songTime = 0;
  let score = 0;
  let combo = 0;
  let lives = INITIAL_LIVES;
  let hits = 0;
  let misses = 0;
  let notes = createChart();
  let messageKey = "rhythm.message.start";
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
    scoreText.textContent = String(score);
    comboText.textContent = String(combo);
    livesText.textContent = String(lives);
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
    gameState = "ready";
    songTime = 0;
    score = 0;
    combo = 0;
    lives = INITIAL_LIVES;
    hits = 0;
    misses = 0;
    notes = createChart();
    setMessage("rhythm.message.start");
    updateStats();
    draw();
    canvas.focus({ preventScroll: true });
  }

  function startGame() {
    if (gameState === "running") {
      return;
    }

    gameState = "running";
    setMessage("rhythm.message.running");
    beginLoop();
    canvas.focus({ preventScroll: true });
  }

  function pauseGame() {
    if (gameState !== "running") {
      return;
    }

    gameState = "paused";
    stopLoop();
    setMessage("rhythm.message.paused");
    draw();
  }

  function resumeGame() {
    if (gameState !== "paused") {
      return;
    }

    gameState = "running";
    setMessage("rhythm.message.running");
    beginLoop();
  }

  function finishGame(key, params) {
    gameState = key === "rhythm.message.gameOver" ? "gameOver" : "clear";
    stopLoop();
    setMessage(key, params);
    draw();
  }

  function getBestNoteForLane(lane) {
    let bestNote = null;
    let smallestDistance = HIT_WINDOW_MS + 1;

    notes.forEach(function (note) {
      if (note.lane !== lane || note.hit || note.missed) {
        return;
      }

      const distance = Math.abs(note.time - songTime);
      if (distance <= HIT_WINDOW_MS && distance < smallestDistance) {
        bestNote = note;
        smallestDistance = distance;
      }
    });

    return bestNote;
  }

  function hitLane(lane) {
    if (gameState !== "running") {
      return;
    }

    const note = getBestNoteForLane(lane);
    if (!note) {
      return;
    }

    note.hit = true;
    hits += 1;
    combo += 1;
    score += 100 + combo * 10;
    updateStats();
  }

  function judgeMisses() {
    let stateChanged = false;

    notes.forEach(function (note) {
      if (note.hit || note.missed) {
        return;
      }

      if (songTime - note.time > MISS_WINDOW_MS) {
        note.missed = true;
        misses += 1;
        combo = 0;
        lives = Math.max(0, lives - 1);
        stateChanged = true;
      }
    });

    if (stateChanged) {
      updateStats();
      if (lives <= 0) {
        finishGame("rhythm.message.gameOver", { score: score });
      }
    }
  }

  function allNotesResolved() {
    return notes.every(function (note) {
      return note.hit || note.missed;
    });
  }

  function renderBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e293b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = "rgba(255,255,255,0.04)";
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      context.fillRect(lane * laneWidth, 0, 1, CANVAS_HEIGHT);
    }

    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fillRect(0, HIT_LINE_Y, CANVAS_WIDTH, 4);

    context.fillStyle = "#94a3b8";
    context.font = "bold 18px sans-serif";
    ["←", "↓", "↑", "→"].forEach(function (label, lane) {
      context.fillText(label, lane * laneWidth + laneWidth / 2 - 6, CANVAS_HEIGHT - 18);
    });
  }

  function renderNotes() {
    notes.forEach(function (note) {
      if (note.hit || note.missed) {
        return;
      }

      const y = HIT_LINE_Y - (note.time - songTime) * SCROLL_SPEED;
      if (y < -40 || y > CANVAS_HEIGHT + 40) {
        return;
      }

      const x = note.lane * laneWidth + NOTE_WIDTH_PADDING;
      const width = laneWidth - NOTE_WIDTH_PADDING * 2;

      context.fillStyle = LANE_COLORS[note.lane % LANE_COLORS.length];
      drawRoundedRect(context, x, y - NOTE_HEIGHT / 2, width, NOTE_HEIGHT, 8);
      context.fill();
    });
  }

  function renderReceptors() {
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const centerX = lane * laneWidth + laneWidth / 2;
      context.fillStyle = "rgba(255,255,255,0.08)";
      context.beginPath();
      context.arc(centerX, HIT_LINE_Y + 14, 20, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = LANE_COLORS[lane % LANE_COLORS.length];
      context.font = "bold 16px sans-serif";
      context.fillText(String(lane + 1), centerX - 5, HIT_LINE_Y + 20);
    }
  }

  function draw() {
    renderBackground();
    renderNotes();
    renderReceptors();

    context.fillStyle = "#f8fafc";
    context.font = "bold 22px sans-serif";
    context.fillText(`BEAT ${gameState === "paused" ? "PAUSED" : score}`, 16, 30);
  }

  function update(dt) {
    songTime += dt;
    judgeMisses();

    if (gameState !== "running") {
      return;
    }

    if (allNotesResolved() && songTime > notes[notes.length - 1].time + 1200) {
      const accuracy = formatAccuracy(hits, notes.length);
      finishGame("rhythm.message.clear", {
        score: score,
        accuracy: accuracy
      });
    }
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

    const dt = Math.min(34, timestamp - lastTimestamp || 16.6667);
    lastTimestamp = timestamp;

    update(dt);
    draw();

    if (gameState === "running") {
      animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  function handleKeyDown(event) {
    if (event.key === " " || event.key === "Space") {
      event.preventDefault();

      if (gameState === "ready") {
        startGame();
        return;
      }

      if (gameState === "running") {
        pauseGame();
        return;
      }

      if (gameState === "paused") {
        resumeGame();
        return;
      }

      if (gameState === "gameOver" || gameState === "clear") {
        resetGame();
        startGame();
      }

      return;
    }

    const lane = LANE_KEYS.get(event.key);
    if (lane === undefined) {
      return;
    }

    event.preventDefault();

    if (gameState === "running") {
      hitLane(lane);
    }
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
