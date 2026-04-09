import { t } from "../core/i18n.js";

const DIFFICULTY_SETTINGS = {
  easy: {
    pairs: 6,
    columns: 4,
    matchScore: 100,
    targetMs: 45000
  },
  normal: {
    pairs: 8,
    columns: 4,
    matchScore: 130,
    targetMs: 70000
  },
  hard: {
    pairs: 12,
    columns: 6,
    matchScore: 160,
    targetMs: 105000
  }
};

const THEME_DECKS = {
  playing: [
    { key: "ace-spade", label: "A", sublabel: "SPADE", accent: "#0f172a" },
    { key: "king-heart", label: "K", sublabel: "HEART", accent: "#dc2626" },
    { key: "queen-diamond", label: "Q", sublabel: "DIAMOND", accent: "#ef4444" },
    { key: "jack-club", label: "J", sublabel: "CLUB", accent: "#1f2937" },
    { key: "ten-spade", label: "10", sublabel: "SPADE", accent: "#0f172a" },
    { key: "nine-heart", label: "9", sublabel: "HEART", accent: "#dc2626" },
    { key: "eight-diamond", label: "8", sublabel: "DIAMOND", accent: "#ef4444" },
    { key: "seven-club", label: "7", sublabel: "CLUB", accent: "#1f2937" },
    { key: "six-spade", label: "6", sublabel: "SPADE", accent: "#0f172a" },
    { key: "five-heart", label: "5", sublabel: "HEART", accent: "#dc2626" },
    { key: "four-diamond", label: "4", sublabel: "DIAMOND", accent: "#ef4444" },
    { key: "three-club", label: "3", sublabel: "CLUB", accent: "#1f2937" }
  ],
  tarot: [
    { key: "sun", label: "SUN", sublabel: "XIX", accent: "#f59e0b" },
    { key: "moon", label: "MOON", sublabel: "XVIII", accent: "#6366f1" },
    { key: "star", label: "STAR", sublabel: "XVII", accent: "#38bdf8" },
    { key: "world", label: "WORLD", sublabel: "XXI", accent: "#22c55e" },
    { key: "fool", label: "FOOL", sublabel: "0", accent: "#ec4899" },
    { key: "mage", label: "MAGE", sublabel: "I", accent: "#8b5cf6" },
    { key: "lovers", label: "LOVERS", sublabel: "VI", accent: "#fb7185" },
    { key: "wheel", label: "WHEEL", sublabel: "X", accent: "#f97316" },
    { key: "justice", label: "JUST", sublabel: "XI", accent: "#10b981" },
    { key: "hermit", label: "HERMIT", sublabel: "IX", accent: "#64748b" },
    { key: "tower", label: "TOWER", sublabel: "XVI", accent: "#ef4444" },
    { key: "strength", label: "POWER", sublabel: "VIII", accent: "#14b8a6" }
  ],
  fruit: [
    { key: "apple", label: "APPLE", sublabel: "RED", accent: "#dc2626" },
    { key: "banana", label: "BANANA", sublabel: "YELLOW", accent: "#eab308" },
    { key: "grape", label: "GRAPE", sublabel: "PURPLE", accent: "#7c3aed" },
    { key: "orange", label: "ORANGE", sublabel: "CITRUS", accent: "#f97316" },
    { key: "watermelon", label: "MELON", sublabel: "GREEN", accent: "#16a34a" },
    { key: "peach", label: "PEACH", sublabel: "PINK", accent: "#fb7185" },
    { key: "kiwi", label: "KIWI", sublabel: "FRESH", accent: "#65a30d" },
    { key: "pear", label: "PEAR", sublabel: "LIGHT", accent: "#84cc16" },
    { key: "berry", label: "BERRY", sublabel: "SWEET", accent: "#e11d48" },
    { key: "plum", label: "PLUM", sublabel: "DARK", accent: "#6d28d9" },
    { key: "lemon", label: "LEMON", sublabel: "ZEST", accent: "#facc15" },
    { key: "mango", label: "MANGO", sublabel: "TROPIC", accent: "#fb923c" }
  ]
};

function shuffle(items) {
  const result = items.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}

function formatElapsedTime(elapsedMs) {
  const totalTenths = Math.floor(elapsedMs / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function buildDeck(themeKey, difficultyKey) {
  const settings = DIFFICULTY_SETTINGS[difficultyKey] || DIFFICULTY_SETTINGS.normal;
  const sourceDeck = shuffle(THEME_DECKS[themeKey] || THEME_DECKS.playing).slice(0, settings.pairs);
  const duplicatedCards = [];

  sourceDeck.forEach(function (template, pairIndex) {
    duplicatedCards.push({
      id: `${template.key}-a-${pairIndex}`,
      pairKey: template.key,
      label: template.label,
      sublabel: template.sublabel,
      accent: template.accent,
      matched: false,
      flipped: false
    });
    duplicatedCards.push({
      id: `${template.key}-b-${pairIndex}`,
      pairKey: template.key,
      label: template.label,
      sublabel: template.sublabel,
      accent: template.accent,
      matched: false,
      flipped: false
    });
  });

  return shuffle(duplicatedCards);
}

export function createMemoryGame({
  boardElement,
  difficultySelect,
  themeSelect,
  btnRestart,
  timeText,
  scoreText,
  streakText,
  message
}) {
  let initialized = false;
  let currentDifficulty = "normal";
  let currentTheme = "playing";
  let cards = [];
  let openIndices = [];
  let elapsedMs = 0;
  let score = 0;
  let streak = 0;
  let previewCountdown = 3;
  let gameState = "ready";
  let status = { type: "ready" };
  let previewIntervalId = null;
  let resolveTimeoutId = null;
  let timerFrameId = null;
  let lastFrameTimestamp = 0;

  boardElement.tabIndex = 0;

  function updateStats() {
    timeText.textContent = formatElapsedTime(elapsedMs);
    scoreText.textContent = String(score);
    streakText.textContent = String(streak);
  }

  function renderMessage() {
    if (status.type === "preview") {
      message.textContent = t("memory.message.preview", { count: previewCountdown });
      return;
    }

    if (status.type === "match") {
      message.textContent = t("memory.message.match", {
        streak: streak,
        bonus: status.bonus
      });
      return;
    }

    if (status.type === "mismatch") {
      message.textContent = t("memory.message.mismatch");
      return;
    }

    if (status.type === "finished") {
      message.textContent = t("memory.message.finished", {
        time: formatElapsedTime(elapsedMs),
        score: score
      });
      return;
    }

    if (gameState === "playing") {
      message.textContent = t("memory.message.playing");
      return;
    }

    message.textContent = t("memory.message.ready");
  }

  function updateBoardLayout() {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty] || DIFFICULTY_SETTINGS.normal;
    boardElement.style.setProperty("--memory-columns", String(settings.columns));
    boardElement.dataset.theme = currentTheme;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const revealAll = gameState === "preview";

    boardElement.innerHTML = "";
    updateBoardLayout();

    cards.forEach(function (card, index) {
      const button = document.createElement("button");
      const inner = document.createElement("span");
      const front = document.createElement("span");
      const back = document.createElement("span");
      const label = document.createElement("span");
      const sublabel = document.createElement("span");

      button.type = "button";
      button.className = "memory-card";
      button.dataset.index = String(index);
      button.disabled = gameState !== "playing" || card.matched || card.flipped;

      if (revealAll || card.flipped || card.matched) {
        button.classList.add("is-flipped");
      }

      if (card.matched) {
        button.classList.add("is-matched");
      }

      inner.className = "memory-card__inner";

      front.className = "memory-card__face memory-card__face--front";
      front.style.setProperty("--memory-accent", card.accent);

      label.className = "memory-card__label";
      label.textContent = card.label;

      sublabel.className = "memory-card__sublabel";
      sublabel.textContent = card.sublabel;

      front.append(label, sublabel);

      back.className = "memory-card__face memory-card__face--back";
      back.innerHTML = '<span class="memory-card__back-mark"></span>';

      inner.append(front, back);
      button.appendChild(inner);
      fragment.appendChild(button);
    });

    boardElement.appendChild(fragment);
    updateStats();
    renderMessage();
  }

  function stopTimer() {
    if (timerFrameId) {
      window.cancelAnimationFrame(timerFrameId);
      timerFrameId = null;
    }
    lastFrameTimestamp = 0;
  }

  function clearAsyncWork() {
    if (previewIntervalId) {
      window.clearInterval(previewIntervalId);
      previewIntervalId = null;
    }

    if (resolveTimeoutId) {
      window.clearTimeout(resolveTimeoutId);
      resolveTimeoutId = null;
    }

    stopTimer();
  }

  function tickTimer(timestamp) {
    if (gameState !== "playing") {
      timerFrameId = null;
      lastFrameTimestamp = 0;
      return;
    }

    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    } else {
      elapsedMs += timestamp - lastFrameTimestamp;
      lastFrameTimestamp = timestamp;
      updateStats();
    }

    timerFrameId = window.requestAnimationFrame(tickTimer);
  }

  function startTimer() {
    stopTimer();
    timerFrameId = window.requestAnimationFrame(tickTimer);
  }

  function prepareNewGame() {
    clearAsyncWork();
    currentDifficulty = difficultySelect.value || "normal";
    currentTheme = themeSelect.value || "playing";
    cards = buildDeck(currentTheme, currentDifficulty);
    openIndices = [];
    elapsedMs = 0;
    score = 0;
    streak = 0;
    previewCountdown = 3;
    gameState = "ready";
    status = { type: "ready" };
    initialized = true;
    renderBoard();
    boardElement.focus({ preventScroll: true });
  }

  function finishGame() {
    const settings = DIFFICULTY_SETTINGS[currentDifficulty] || DIFFICULTY_SETTINGS.normal;
    const timeBonus = Math.max(0, Math.round((settings.targetMs - elapsedMs) / 60));

    if (timeBonus > 0) {
      score += timeBonus;
      updateStats();
    }

    gameState = "finished";
    status = { type: "finished" };
    stopTimer();
    renderBoard();
  }

  function resolveOpenCards() {
    const [firstIndex, secondIndex] = openIndices;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.pairKey === secondCard.pairKey) {
      streak += 1;
      const settings = DIFFICULTY_SETTINGS[currentDifficulty] || DIFFICULTY_SETTINGS.normal;
      const bonus = (streak - 1) * 35;
      score += settings.matchScore + bonus;
      firstCard.matched = true;
      secondCard.matched = true;
      openIndices = [];
      status = { type: "match", bonus: bonus };

      if (cards.every(function (card) { return card.matched; })) {
        finishGame();
        return;
      }

      renderBoard();
      return;
    }

    streak = 0;
    status = { type: "mismatch" };
    gameState = "resolving";
    renderBoard();

    resolveTimeoutId = window.setTimeout(function () {
      cards[firstIndex].flipped = false;
      cards[secondIndex].flipped = false;
      openIndices = [];
      gameState = "playing";
      status = { type: "playing" };
      resolveTimeoutId = null;
      renderBoard();
    }, 650);
  }

  function startPreview() {
    if (gameState !== "ready") {
      return;
    }

    cards.forEach(function (card) {
      card.flipped = false;
    });
    previewCountdown = 3;
    gameState = "preview";
    status = { type: "preview" };
    renderBoard();

    previewIntervalId = window.setInterval(function () {
      previewCountdown -= 1;

      if (previewCountdown <= 0) {
        window.clearInterval(previewIntervalId);
        previewIntervalId = null;
        gameState = "playing";
        status = { type: "playing" };
        renderBoard();
        startTimer();
        return;
      }

      renderMessage();
    }, 1000);
  }

  function handleCardClick(event) {
    const cardElement = event.target.closest(".memory-card");
    if (!cardElement || gameState !== "playing") {
      return;
    }

    const index = Number(cardElement.dataset.index);
    const card = cards[index];
    if (!card || card.flipped || card.matched || openIndices.length >= 2) {
      return;
    }

    if (status.type === "match") {
      status = { type: "playing" };
    }

    card.flipped = true;
    openIndices.push(index);
    renderBoard();

    if (openIndices.length === 2) {
      resolveOpenCards();
    }
  }

  function handleKeyDown(event) {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();
    if (!event.repeat) {
      startPreview();
    }
  }

  boardElement.addEventListener("click", handleCardClick);
  difficultySelect.addEventListener("change", function () {
    prepareNewGame();
  });
  themeSelect.addEventListener("change", function () {
    prepareNewGame();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    prepareNewGame();
  });

  return {
    enter: function () {
      if (!initialized) {
        currentDifficulty = difficultySelect.value || "normal";
        currentTheme = themeSelect.value || "playing";
        prepareNewGame();
        return;
      }

      renderBoard();
      boardElement.focus({ preventScroll: true });
    },
    leave: clearAsyncWork,
    handleKeyDown: handleKeyDown,
    refreshLocale: function () {
      renderBoard();
    }
  };
}
