import { t } from "../core/i18n.js";

const ROUND_SECONDS = 30;
const BOMB_CHANCE = 0;
const EFFECT_MS = 240;
const MISS_RETRACT_MS = 220;
const BOMB_PENALTY = 2;

const DIFFICULTY_SETTINGS = {
  easy: {
    rows: 3,
    cols: 3,
    concurrentCount: 1,
    spawnIntervalMs: 1450,
    activeMs: 1300,
    spawnStaggerMs: 0,
    labelKey: "common.easy"
  },
  normal: {
    rows: 4,
    cols: 4,
    concurrentCount: 2,
    spawnIntervalMs: 1050,
    activeMs: 1100,
    spawnStaggerMs: 180,
    labelKey: "common.normal"
  },
  hard: {
    rows: 5,
    cols: 5,
    concurrentCount: 3,
    spawnIntervalMs: 780,
    activeMs: 900,
    spawnStaggerMs: 120,
    labelKey: "common.hard"
  }
};

export function createWhackAMoleGame({
  boardElement,
  difficultySelect,
  difficultyLabel,
  btnStart,
  btnRestart,
  scoreText,
  timeText,
  message
}) {
  let activeItems = [];
  let effectItems = [];
  let score = 0;
  let timeRemaining = ROUND_SECONDS;
  let isRunning = false;
  let isPaused = false;
  let roundFinished = false;
  let messageState = "ready";
  let lastSpawnIndex = -1;
  let difficulty = "normal";
  let nextItemId = 1;
  let nextEffectId = 1;
  let spawnWaveTimeoutId = null;
  let spawnStepTimeoutIds = [];
  let timerIntervalId = null;
  let effectTimeoutIds = [];

  boardElement.tabIndex = 0;

  function getDifficultySetting() {
    return DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
  }

  function getHoleCount() {
    const setting = getDifficultySetting();
    return setting.rows * setting.cols;
  }

  function updateDifficultyUi() {
    const setting = getDifficultySetting();
    boardElement.style.setProperty("--whack-columns", String(setting.cols));

    if (difficultyLabel) {
      difficultyLabel.textContent = t(setting.labelKey);
    }

    if (difficultySelect && difficultySelect.value !== difficulty) {
      difficultySelect.value = difficulty;
    }
  }

  function setDifficulty(nextDifficulty) {
    if (!DIFFICULTY_SETTINGS[nextDifficulty]) {
      difficulty = "normal";
      return;
    }

    difficulty = nextDifficulty;
  }

  function updateStats() {
    scoreText.textContent = String(score);
    timeText.textContent = String(timeRemaining);
    updateDifficultyUi();
  }

  function renderMessage() {
    switch (messageState) {
      case "running":
        message.textContent = t("whack.message.running");
        return;
      case "hit":
        message.textContent = t("whack.message.hit");
        return;
      case "bomb":
        message.textContent = t("whack.message.bomb");
        return;
      case "finished":
        message.textContent = t("whack.message.finished", { score: score });
        return;
      case "paused":
        message.textContent = t("whack.message.paused");
        return;
      case "ready":
      default:
        message.textContent = t("whack.message.ready");
    }
  }

  function createEntity(type, options = {}) {
    const isFresh = options.isFresh === true;
    const isRetracting = options.isRetracting === true;
    const entity = document.createElement("span");

    if (type === "bomb" || type === "bomb-hit") {
      entity.className = "whack-bomb";
      if (isFresh) {
        entity.classList.add("whack-bomb--spawn");
      }
      if (isRetracting) {
        entity.classList.add("whack-bomb--miss");
      }
      if (type === "bomb-hit") {
        entity.classList.add("whack-bomb--hit");
      }
      return entity;
    }

    entity.className = "whack-mole";
    if (isFresh) {
      entity.classList.add("whack-mole--spawn");
    }
    if (isRetracting) {
      entity.classList.add("whack-mole--miss");
    }
    if (type === "mole-hit") {
      entity.classList.add("whack-mole--hit");
    }
    return entity;
  }

  function createBurst(type) {
    const burst = document.createElement("span");

    burst.className = "whack-burst";
    if (type === "bomb-hit") {
      burst.classList.add("whack-burst--bomb");
      burst.textContent = `-${BOMB_PENALTY}`;
    } else {
      burst.textContent = "POW!";
    }

    return burst;
  }

  function getActiveItemByIndex(index) {
    return activeItems.find(function (item) {
      return item.index === index;
    }) || null;
  }

  function getEffectItemByIndex(index) {
    return effectItems.find(function (item) {
      return item.index === index;
    }) || null;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const holeCount = getHoleCount();

    boardElement.innerHTML = "";

    for (let index = 0; index < holeCount; index += 1) {
      const hole = document.createElement("button");
      const tunnel = document.createElement("span");
      const activeItem = getActiveItemByIndex(index);
      const effectItem = getEffectItemByIndex(index);

      hole.type = "button";
      hole.className = "whack-hole";
      hole.dataset.index = String(index);
      hole.disabled = !isRunning;

      tunnel.className = "whack-hole__tunnel";
      hole.appendChild(tunnel);

      if (activeItem) {
        tunnel.appendChild(
          createEntity(activeItem.type, {
            isFresh: activeItem.isFresh,
            isRetracting: activeItem.isRetracting
          })
        );
      }

      if (effectItem) {
        tunnel.appendChild(createEntity(effectItem.type));
        tunnel.appendChild(createBurst(effectItem.type));
      }

      fragment.appendChild(hole);
    }

    boardElement.appendChild(fragment);
    activeItems.forEach(function (item) {
      item.isFresh = false;
    });
    updateStats();
  }

  function clearSpawnTimers() {
    if (spawnWaveTimeoutId) {
      clearTimeout(spawnWaveTimeoutId);
      spawnWaveTimeoutId = null;
    }

    spawnStepTimeoutIds.forEach(function (timeoutId) {
      clearTimeout(timeoutId);
    });
    spawnStepTimeoutIds = [];
  }

  function clearRoundTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  function clearActiveItems() {
    activeItems.forEach(function (item) {
      if (item.hideTimeoutId) {
        clearTimeout(item.hideTimeoutId);
      }
      if (item.retractTimeoutId) {
        clearTimeout(item.retractTimeoutId);
      }
    });
    activeItems = [];
  }

  function clearEffectItems() {
    effectTimeoutIds.forEach(function (timeoutId) {
      clearTimeout(timeoutId);
    });
    effectTimeoutIds = [];
    effectItems = [];
  }

  function clearTimers() {
    clearSpawnTimers();
    clearRoundTimer();
    clearActiveItems();
    clearEffectItems();
  }

  function chooseNextHole() {
    const holeCount = getHoleCount();
    const reservedIndices = new Set();

    activeItems.forEach(function (item) {
      reservedIndices.add(item.index);
    });
    effectItems.forEach(function (item) {
      reservedIndices.add(item.index);
    });

    const choices = Array.from({ length: holeCount }, function (_, index) {
      return index;
    }).filter(function (index) {
      return index !== lastSpawnIndex && !reservedIndices.has(index);
    });

    const fallback = Array.from({ length: holeCount }, function (_, index) {
      return index;
    }).filter(function (index) {
      return !reservedIndices.has(index);
    });

    const pool = choices.length > 0 ? choices : fallback.length > 0 ? fallback : [];
    if (pool.length === 0) {
      return null;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  function removeActiveItemById(itemId) {
    const index = activeItems.findIndex(function (item) {
      return item.id === itemId;
    });
    if (index === -1) {
      return null;
    }

    const [removed] = activeItems.splice(index, 1);
    if (removed.hideTimeoutId) {
      clearTimeout(removed.hideTimeoutId);
      removed.hideTimeoutId = null;
    }
    if (removed.retractTimeoutId) {
      clearTimeout(removed.retractTimeoutId);
      removed.retractTimeoutId = null;
    }

    return removed;
  }

  function removeActiveItemByIndex(holeIndex) {
    const item = activeItems.find(function (candidate) {
      return candidate.index === holeIndex;
    });
    if (!item) {
      return null;
    }

    return removeActiveItemById(item.id);
  }

  function startItemRetract(itemId) {
    const item = activeItems.find(function (candidate) {
      return candidate.id === itemId;
    });

    if (!item || item.isRetracting) {
      return;
    }

    if (item.hideTimeoutId) {
      clearTimeout(item.hideTimeoutId);
      item.hideTimeoutId = null;
    }

    item.isFresh = false;
    item.isRetracting = true;
    renderBoard();

    item.retractTimeoutId = window.setTimeout(function () {
      removeActiveItemById(item.id);
      renderBoard();
    }, MISS_RETRACT_MS);
  }

  function spawnOneItem() {
    const setting = getDifficultySetting();
    if (activeItems.length >= setting.concurrentCount) {
      return;
    }

    const nextIndex = chooseNextHole();
    if (nextIndex === null) {
      return;
    }

    const nextType = Math.random() < BOMB_CHANCE ? "bomb" : "mole";
    const item = {
      id: nextItemId,
      index: nextIndex,
      type: nextType,
      hideTimeoutId: null,
      retractTimeoutId: null,
      isFresh: true,
      isRetracting: false
    };

    nextItemId += 1;
    item.hideTimeoutId = window.setTimeout(function () {
      startItemRetract(item.id);
    }, setting.activeMs);

    activeItems.push(item);
    lastSpawnIndex = nextIndex;
    renderBoard();
  }

  function queueNextWave(delay = 200) {
    if (spawnWaveTimeoutId) {
      clearTimeout(spawnWaveTimeoutId);
      spawnWaveTimeoutId = null;
    }

    spawnWaveTimeoutId = window.setTimeout(function () {
      spawnWaveTimeoutId = null;
      if (!isRunning) {
        return;
      }

      const setting = getDifficultySetting();
      for (let index = 0; index < setting.concurrentCount; index += 1) {
        const stepTimeoutId = window.setTimeout(function () {
          spawnStepTimeoutIds = spawnStepTimeoutIds.filter(function (timeoutId) {
            return timeoutId !== stepTimeoutId;
          });

          if (!isRunning) {
            return;
          }

          spawnOneItem();
        }, index * setting.spawnStaggerMs);

        spawnStepTimeoutIds.push(stepTimeoutId);
      }

      queueNextWave(setting.spawnIntervalMs);
    }, delay);
  }

  function finishRound(reason = "finished") {
    clearTimers();
    isRunning = false;
    isPaused = false;
    roundFinished = true;
    messageState = reason;
    renderBoard();
    renderMessage();
  }

  function playEffect(index, type, afterEffect) {
    const effect = {
      id: nextEffectId,
      index: index,
      type: type
    };

    nextEffectId += 1;
    effectItems.push(effect);
    renderBoard();

    const timeoutId = window.setTimeout(function () {
      effectItems = effectItems.filter(function (candidate) {
        return candidate.id !== effect.id;
      });
      effectTimeoutIds = effectTimeoutIds.filter(function (id) {
        return id !== timeoutId;
      });

      renderBoard();

      if (afterEffect) {
        afterEffect();
      }
    }, EFFECT_MS);

    effectTimeoutIds.push(timeoutId);
  }

  function startRoundTimer() {
    clearRoundTimer();
    timerIntervalId = window.setInterval(function () {
      timeRemaining -= 1;
      updateStats();

      if (timeRemaining <= 0) {
        finishRound("finished");
      }
    }, 1000);
  }

  function startRound() {
    clearTimers();
    score = 0;
    timeRemaining = ROUND_SECONDS;
    isRunning = true;
    isPaused = false;
    roundFinished = false;
    messageState = "running";
    lastSpawnIndex = -1;
    nextItemId = 1;
    nextEffectId = 1;
    renderBoard();
    renderMessage();
    boardElement.focus({ preventScroll: true });

    startRoundTimer();
    queueNextWave(240);
  }

  function pauseRound() {
    if (!isRunning) {
      return;
    }

    clearTimers();
    isRunning = false;
    isPaused = true;
    messageState = "paused";
    renderBoard();
    renderMessage();
  }

  function resumeRound() {
    if (!isPaused || roundFinished) {
      return;
    }

    isRunning = true;
    isPaused = false;
    messageState = "running";
    renderBoard();
    renderMessage();
    boardElement.focus({ preventScroll: true });
    startRoundTimer();
    queueNextWave(180);
  }

  function resetToReady() {
    clearTimers();
    score = 0;
    timeRemaining = ROUND_SECONDS;
    isRunning = false;
    isPaused = false;
    roundFinished = false;
    messageState = "ready";
    lastSpawnIndex = -1;
    renderBoard();
    renderMessage();
  }

  function hitMole(index) {
    removeActiveItemByIndex(index);
    score += 1;
    messageState = "hit";
    renderBoard();
    renderMessage();

    playEffect(index, "mole-hit", function () {
      if (!isRunning) {
        renderMessage();
        return;
      }

      messageState = "running";
      renderMessage();
    });
  }

  function hitBomb(index) {
    removeActiveItemByIndex(index);
    score = Math.max(0, score - BOMB_PENALTY);
    messageState = "bomb";
    renderBoard();
    renderMessage();

    playEffect(index, "bomb-hit", function () {
      if (!isRunning) {
        renderMessage();
        return;
      }

      messageState = "running";
      renderMessage();
    });
  }

  function handleBoardClick(event) {
    const hole = event.target.closest(".whack-hole");
    if (!hole || !isRunning) {
      return;
    }

    const holeIndex = Number(hole.dataset.index);
    const activeItem = getActiveItemByIndex(holeIndex);
    if (!activeItem || activeItem.isRetracting) {
      return;
    }

    if (activeItem.type === "bomb") {
      hitBomb(activeItem.index);
      return;
    }

    hitMole(activeItem.index);
  }

  function handleKeyDown(event) {
    if (event.code !== "Space" || event.repeat) {
      return;
    }

    event.preventDefault();

    if (isRunning) {
      pauseRound();
      return;
    }

    if (isPaused) {
      resumeRound();
      return;
    }

    if (!roundFinished) {
      startRound();
      return;
    }

    resetToReady();
  }

  boardElement.addEventListener("click", handleBoardClick);

  if (difficultySelect) {
    setDifficulty(difficultySelect.value || "normal");
    difficultySelect.addEventListener("change", function (event) {
      setDifficulty(event.target.value);
      resetToReady();
    });
  }

  btnStart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    if (isRunning) {
      pauseRound();
      return;
    }

    if (isPaused) {
      resumeRound();
      return;
    }

    startRound();
  });

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    if (roundFinished || isPaused) {
      resetToReady();
      return;
    }

    startRound();
  });

  return {
    enter: resetToReady,
    leave: function () {
      clearTimers();
      isRunning = false;
      isPaused = false;
    },
    handleKeyDown: handleKeyDown,
    refreshLocale: function () {
      updateDifficultyUi();
      renderBoard();
      renderMessage();
    }
  };
}
