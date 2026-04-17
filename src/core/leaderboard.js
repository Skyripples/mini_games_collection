import { getLeaderboardApiCandidates, onLeaderboardApiModeChange } from "./api.js";
import { t } from "./i18n.js";
const LEADERBOARD_LIMIT = 5;
const LEADERBOARD_PAGE_SIZE = 6;

const DIFFICULTY_LABEL_KEYS = {
  easy: "common.easy",
  normal: "common.normal",
  hard: "common.hard"
};

const difficultySelectCache = new Map();

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

  let rawName = null;

  if (item && item.player_name !== undefined && item.player_name !== null) {
    rawName = item.player_name;
  } else if (item && item.playerName !== undefined && item.playerName !== null) {
    rawName = item.playerName;
  } else if (item && item.name !== undefined && item.name !== null) {
    rawName = item.name;
  }

  const name = String(rawName === null || rawName === undefined ? "" : rawName).trim();
  return name ? name : t("leaderboard.placeholderName");
}

function getLeaderboardScore(item) {
  const score = Number(item && item.score);
  return Number.isFinite(score) ? String(score) : "0";
}

function getScoreValue(item) {
  const score = Number(item && item.score);
  return Number.isFinite(score) ? score : 0;
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

function normalizeDifficultyValue(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .toLowerCase();
}

function getItemDifficultyValue(item) {
  const values = [
    item && item.difficulty,
    item && item.difficulty_key,
    item && item.difficultyKey
  ];

  for (let index = 0; index < values.length; index += 1) {
    const value = normalizeDifficultyValue(values[index]);
    if (value) {
      return value;
    }
  }

  return "";
}

function getDifficultyAliases(definition, difficultyValue) {
  const aliases = new Set();
  const normalizedValue = normalizeDifficultyValue(difficultyValue);

  if (!normalizedValue) {
    return aliases;
  }

  aliases.add(normalizedValue);

  const option = getDifficultyOptions(definition).find(function (candidate) {
    return candidate.value === normalizedValue;
  });

  if (option) {
    aliases.add(normalizeDifficultyValue(option.label));
  } else if (DIFFICULTY_LABEL_KEYS[normalizedValue]) {
    aliases.add(normalizeDifficultyValue(t(DIFFICULTY_LABEL_KEYS[normalizedValue])));
  }

  return aliases;
}

function filterLeaderboardItemsByDifficulty(items, definition, difficultyValue) {
  const aliases = getDifficultyAliases(definition, difficultyValue);
  if (aliases.size === 0) {
    return items;
  }

  const hasDifficultyField = items.some(function (item) {
    return Boolean(getItemDifficultyValue(item));
  });

  if (!hasDifficultyField) {
    return items;
  }

  return items.filter(function (item) {
    const itemDifficulty = getItemDifficultyValue(item);
    return itemDifficulty ? aliases.has(itemDifficulty) : false;
  });
}

function renderStatus(element, key, params) {
  if (!element) {
    return;
  }

  element.textContent = key ? t(key, params || {}) : "";
}

function getDifficultySelect(definition) {
  if (!definition || !definition.panelId) {
    return null;
  }

  if (difficultySelectCache.has(definition.id)) {
    return difficultySelectCache.get(definition.id);
  }

  const panel = document.getElementById(definition.panelId);
  if (!panel) {
    difficultySelectCache.set(definition.id, null);
    return null;
  }

  const select = Array.from(panel.querySelectorAll("select")).find(function (candidate) {
    return Array.from(candidate.options).some(function (option) {
      const value = String(option.value || "").trim();
      return Boolean(DIFFICULTY_LABEL_KEYS[value]);
    });
  }) || null;

  difficultySelectCache.set(definition.id, select);
  return select;
}

function getDifficultyOptions(definition) {
  const select = getDifficultySelect(definition);
  if (!select) {
    return [];
  }

  return Array.from(select.options)
    .map(function (option) {
      const value = String(option.value || "").trim();

      if (!DIFFICULTY_LABEL_KEYS[value]) {
        return null;
      }

      const labelKey = option.dataset.i18n || DIFFICULTY_LABEL_KEYS[value];
      const label = t(labelKey);

      return {
        value: value,
        label: label
      };
    })
    .filter(Boolean);
}

function getDifficultyValue(definition) {
  const options = getDifficultyOptions(definition);

  if (options.length === 0) {
    return "";
  }

  const storedValue = selectedDifficultyByGameId.get(definition.id);
  if (storedValue && options.some(function (option) {
    return option.value === storedValue;
  })) {
    return storedValue;
  }

  const select = getDifficultySelect(definition);
  const currentValue = select ? String(select.value || "").trim() : "";
  if (currentValue && options.some(function (option) {
    return option.value === currentValue;
  })) {
    return currentValue;
  }

  return options[0].value;
}

function getDifficultyLabel(definition, difficultyValue) {
  const options = getDifficultyOptions(definition);
  const option = options.find(function (candidate) {
    return candidate.value === difficultyValue;
  });

  return option ? option.label : "";
}

let selectedDifficultyByGameId = new Map();

export function createLeaderboardBrowser({
  games,
  titleElement,
  contextElement,
  subtitleElement,
  pageInfoElement,
  prevButton,
  nextButton,
  tabsContainer,
  difficultyTabsContainer,
  statusElement,
  listElement
}) {
  const sortedGames = games
    .filter(function (definition) {
      return definition && !definition.hidden;
    })
    .slice()
    .sort(function (left, right) {
      return left.menu.order - right.menu.order;
    });

  let currentPageIndex = 0;
  let selectedGameId = sortedGames.length > 0 ? sortedGames[0].id : "";
  let requestId = 0;
  let currentStatusKey = "leaderboard.loading";
  let currentStatusParams = {};
  let currentItems = [];
  let isActive = false;

  function getTotalPages() {
    return Math.max(1, Math.ceil(sortedGames.length / LEADERBOARD_PAGE_SIZE));
  }

  function getPageGames(pageIndex) {
    return sortedGames.slice(
      pageIndex * LEADERBOARD_PAGE_SIZE,
      pageIndex * LEADERBOARD_PAGE_SIZE + LEADERBOARD_PAGE_SIZE
    );
  }

  function getGameIndex(gameId) {
    return sortedGames.findIndex(function (definition) {
      return definition.id === gameId;
    });
  }

  function getGameById(gameId) {
    return sortedGames.find(function (definition) {
      return definition.id === gameId;
    });
  }

  function renderStaticLabels() {
    if (titleElement) {
      titleElement.textContent = t("leaderboard.title");
    }

    if (subtitleElement) {
      subtitleElement.textContent = t("leaderboard.subtitle");
    }

    if (prevButton) {
      prevButton.textContent = t("leaderboard.prev");
    }

    if (nextButton) {
      nextButton.textContent = t("leaderboard.next");
    }
  }

  function renderGameContext() {
    if (!contextElement) {
      return;
    }

    const game = getGameById(selectedGameId);

    if (!game) {
      contextElement.textContent = "";
      return;
    }

    const gameTitle = t(game.menu.titleKey);
    const difficultyValue = getDifficultyValue(game);
    const difficultyLabel = difficultyValue ? getDifficultyLabel(game, difficultyValue) : "";

    contextElement.textContent = t("leaderboard.context", {
      game: gameTitle,
      difficulty: difficultyLabel ? ` / ${difficultyLabel}` : ""
    });
  }

  function renderPageInfo() {
    if (!pageInfoElement) {
      return;
    }

    pageInfoElement.textContent = t("leaderboard.pageInfo", {
      current: currentPageIndex + 1,
      total: getTotalPages()
    });
  }

  function renderTabs() {
    if (!tabsContainer) {
      return;
    }

    tabsContainer.innerHTML = "";

    getPageGames(currentPageIndex).forEach(function (definition) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "leaderboard-tab";
      button.textContent = t(definition.menu.titleKey);
      button.classList.toggle("is-active", definition.id === selectedGameId);
      button.addEventListener("click", function () {
        selectGame(definition.id);
      });
      tabsContainer.appendChild(button);
    });

    if (prevButton) {
      prevButton.disabled = currentPageIndex <= 0 || sortedGames.length === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentPageIndex >= getTotalPages() - 1 || sortedGames.length === 0;
    }

    renderPageInfo();
    renderGameContext();
  }

  function renderDifficultyTabs() {
    if (!difficultyTabsContainer) {
      return;
    }

    const game = getGameById(selectedGameId);
    const options = game ? getDifficultyOptions(game) : [];

    difficultyTabsContainer.innerHTML = "";
    difficultyTabsContainer.classList.toggle("hidden", options.length === 0);

    if (options.length === 0) {
      renderGameContext();
      return;
    }

    const selectedDifficulty = getDifficultyValue(game);
    selectedDifficultyByGameId.set(game.id, selectedDifficulty);

    options.forEach(function (option) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "leaderboard-tab";
      button.textContent = option.label;
      button.classList.toggle("is-active", option.value === selectedDifficulty);
      button.addEventListener("click", function () {
        selectDifficulty(option.value);
      });
      difficultyTabsContainer.appendChild(button);
    });

    renderGameContext();
  }

  function renderList(items) {
    currentItems = buildLeaderboardDisplayItems(items);

    if (!listElement) {
      return;
    }

    listElement.innerHTML = "";

    currentItems.forEach(function (item, index) {
      const li = document.createElement("li");
      li.className = "leaderboard-item";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `${index + 1}.`;

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = getLeaderboardName(item);

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = getLeaderboardScore(item);

      li.append(rank, name, score);
      listElement.appendChild(li);
    });
  }

  async function fetchLeaderboardItems(queryString) {
    let lastError = null;

    for (const apiUrl of getLeaderboardApiCandidates()) {
      try {
        const response = await fetch(`${apiUrl}?${queryString}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : [];
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Failed to load leaderboard");
  }

  function setStatus(key, params) {
    currentStatusKey = key || "";
    currentStatusParams = params || {};
    renderStatus(statusElement, currentStatusKey, currentStatusParams);
  }

  async function loadSelectedGame() {
    const game = getGameById(selectedGameId);

    if (!game) {
      renderList([]);
      setStatus("leaderboard.empty");
      renderGameContext();
      return;
    }

    const currentRequestId = ++requestId;
    const difficultyValue = getDifficultyValue(game);
    renderTabs();
    renderDifficultyTabs();
    renderGameContext();
    renderList([]);
    setStatus("leaderboard.loading");

    try {
      if (typeof fetch !== "function") {
        throw new Error("fetch is not available");
      }

      const query = new URLSearchParams({
        gameId: selectedGameId,
        limit: String(LEADERBOARD_LIMIT)
      });

      if (difficultyValue) {
        query.set("difficulty", difficultyValue);
      }

      const payload = await fetchLeaderboardItems(query.toString());

      if (currentRequestId !== requestId) {
        return;
      }

      const items = normalizeLeaderboardItems(payload);
      items.sort(function (left, right) {
        return getScoreValue(right) - getScoreValue(left);
      });

      const filteredItems = filterLeaderboardItemsByDifficulty(items, game, difficultyValue);

      renderList(filteredItems);
      setStatus("");
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      console.error("Failed to load leaderboard:", error);
      renderList([]);
      setStatus("leaderboard.failed");
    }
  }

  function selectGame(gameId) {
    const index = getGameIndex(gameId);

    if (index < 0) {
      return;
    }

    selectedGameId = gameId;
    currentPageIndex = Math.floor(index / LEADERBOARD_PAGE_SIZE);

    const game = getGameById(gameId);
    if (game) {
      selectedDifficultyByGameId.set(game.id, getDifficultyValue(game));
    }

    renderTabs();
    renderDifficultyTabs();
    renderGameContext();
    void loadSelectedGame();
  }

  function selectDifficulty(difficultyValue) {
    const game = getGameById(selectedGameId);

    if (!game) {
      return;
    }

    const options = getDifficultyOptions(game);
    if (options.length === 0) {
      return;
    }

    if (!options.some(function (option) {
      return option.value === difficultyValue;
    })) {
      return;
    }

    selectedDifficultyByGameId.set(game.id, difficultyValue);
    renderDifficultyTabs();
    renderGameContext();
    void loadSelectedGame();
  }

  function changePage(delta) {
    const nextPageIndex = currentPageIndex + delta;

    if (nextPageIndex < 0 || nextPageIndex >= getTotalPages()) {
      return;
    }

    currentPageIndex = nextPageIndex;

    const pageGames = getPageGames(currentPageIndex);
    if (pageGames.length > 0) {
      selectedGameId = pageGames[0].id;
      const game = getGameById(selectedGameId);
      if (game) {
        selectedDifficultyByGameId.set(game.id, getDifficultyValue(game));
      }
    }

    renderTabs();
    renderDifficultyTabs();
    renderGameContext();
    void loadSelectedGame();
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      changePage(-1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      changePage(1);
    });
  }

  function enter() {
    isActive = true;
    renderStaticLabels();

    if (sortedGames.length === 0) {
      renderTabs();
      renderDifficultyTabs();
      renderList([]);
      setStatus("leaderboard.empty");
      renderGameContext();
      return;
    }

    const selectedIndex = getGameIndex(selectedGameId);
    if (selectedIndex < 0) {
      selectedGameId = sortedGames[0].id;
    }

    const game = getGameById(selectedGameId);
    if (game) {
      selectedDifficultyByGameId.set(game.id, getDifficultyValue(game));
    }

    currentPageIndex = Math.floor(getGameIndex(selectedGameId) / LEADERBOARD_PAGE_SIZE);
    renderTabs();
    renderDifficultyTabs();
    renderGameContext();
    void loadSelectedGame();
  }

  function leave() {
    isActive = false;
    requestId += 1;
  }

  function refreshLocale() {
    renderStaticLabels();
    renderTabs();
    renderDifficultyTabs();
    renderGameContext();
    renderStatus(statusElement, currentStatusKey, currentStatusParams);
    renderList(currentItems);
  }

  onLeaderboardApiModeChange(function () {
    if (isActive) {
      void loadSelectedGame();
    }
  });

  renderStaticLabels();
  renderTabs();
  renderDifficultyTabs();
  renderGameContext();
  renderStatus(statusElement, currentStatusKey, currentStatusParams);

  return {
    enter: enter,
    leave: leave,
    refreshLocale: refreshLocale
  };
}
