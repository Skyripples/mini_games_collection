import { createGameHub } from "./core/app.js";
import {
  getLanguage,
  initializeI18n,
  onLanguageChange,
  setLanguage,
  t,
  translatePage
} from "./core/i18n.js";
import {
  getTheme,
  initializeTheme,
  onThemeChange,
  setTheme
} from "./core/theme.js";
import { gameRegistry } from "./games/index.js";

initializeTheme();
initializeI18n();

function getRequiredElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

function initializeRegisteredGames(registry, getElementById) {
  return Object.fromEntries(
    registry.map(function (definition) {
      return [
        definition.id,
        {
          button: getElementById(definition.buttonId),
          panel: getElementById(definition.panelId),
          game: definition.createGame({ getElementById: getElementById })
        }
      ];
    })
  );
}

function formatMenuRank(order) {
  return String(order).padStart(2, "0");
}

function createMenuCard(definition, rankNumber) {
  const button = document.createElement("button");
  const top = document.createElement("span");
  const rank = document.createElement("span");
  const difficulty = document.createElement("span");
  const thumb = document.createElement("span");
  const title = document.createElement("span");
  const meta = document.createElement("span");
  const levelKey = `menu.level.${definition.menu.level}`;

  button.type = "button";
  button.id = definition.buttonId;
  button.className = "menu-card";

  top.className = "menu-card__top";

  rank.className = "menu-card__rank";
  rank.textContent = formatMenuRank(rankNumber);

  difficulty.className = `menu-card__difficulty level-${definition.menu.level}`;
  difficulty.dataset.i18n = levelKey;
  difficulty.textContent = levelKey;

  thumb.className = `menu-card__thumb ${definition.menu.thumbClass}`;

  title.className = "menu-card__title";
  title.dataset.i18n = definition.menu.titleKey;
  title.textContent = definition.menu.titleKey;

  meta.className = "menu-card__meta";
  meta.dataset.i18n = definition.menu.metaKey;
  meta.textContent = definition.menu.metaKey;

  top.append(rank, difficulty);
  button.append(top, thumb, title, meta);

  return button;
}

function renderMenuCards(registry, container) {
  const fragment = document.createDocumentFragment();
  const sortedRegistry = registry
    .slice()
    .sort(function (left, right) {
      return left.menu.order - right.menu.order;
    });

  container.innerHTML = "";
  sortedRegistry.forEach(function (definition, index) {
    fragment.appendChild(createMenuCard(definition, index + 1));
  });
  container.appendChild(fragment);
  translatePage(container);
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

const visibleRegistry = gameRegistry.filter(function (definition) {
  return !definition.hidden;
});

const menuScreen = getRequiredElement("menu-screen");
const gameScreen = getRequiredElement("game-screen");
const menuButtons = getRequiredElement("menu-buttons");
const backButton = getRequiredElement("btn-back");
const languageSelect = getRequiredElement("language-select");
const themeToggle = getRequiredElement("theme-toggle");
const searchInput = getRequiredElement("menu-search-input");
const levelFilterChips = Array.from(document.querySelectorAll("[data-level-filter]"));

renderMenuCards(visibleRegistry, menuButtons);

const entries = initializeRegisteredGames(visibleRegistry, getRequiredElement);
const games = Object.values(entries).map(function ({ game }) {
  return game;
});
let activeLevelFilter = null;

function updateLevelFilterChipState() {
  levelFilterChips.forEach(function (chip) {
    const chipLevel = Number(chip.dataset.levelFilter);
    const isActive = activeLevelFilter === chipLevel;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });
}

function applyMenuFilters() {
  const query = normalizeSearchText(searchInput.value);

  visibleRegistry.forEach(function (definition) {
    const entry = entries[definition.id];
    if (!entry) {
      return;
    }

    const levelMatched = activeLevelFilter === null || definition.menu.level === activeLevelFilter;
    const title = normalizeSearchText(t(definition.menu.titleKey));
    const meta = normalizeSearchText(t(definition.menu.metaKey));
    const searchMatched = query === "" || title.includes(query) || meta.includes(query);

    entry.button.classList.toggle("hidden", !(levelMatched && searchMatched));
  });
}

levelFilterChips.forEach(function (chip) {
  chip.addEventListener("click", function () {
    const chipLevel = Number(chip.dataset.levelFilter);
    activeLevelFilter = activeLevelFilter === chipLevel ? null : chipLevel;
    updateLevelFilterChipState();
    applyMenuFilters();
  });
});

searchInput.addEventListener("input", applyMenuFilters);

const app = createGameHub({
  menuScreen: menuScreen,
  gameScreen: gameScreen,
  backButton: backButton,
  entries: entries
});

function refreshGameLocales() {
  games.forEach(function (game) {
    if (typeof game.refreshLocale === "function") {
      game.refreshLocale();
    }
  });
}

languageSelect.value = getLanguage();
themeToggle.checked = getTheme() === "dark";

languageSelect.addEventListener("change", function (event) {
  setLanguage(event.target.value);
});

themeToggle.addEventListener("change", function () {
  setTheme(themeToggle.checked ? "dark" : "light");
});

onLanguageChange(function (language) {
  languageSelect.value = language;
  refreshGameLocales();
  applyMenuFilters();
});

onThemeChange(function (theme) {
  themeToggle.checked = theme === "dark";
});

refreshGameLocales();
updateLevelFilterChipState();
applyMenuFilters();
app.showMenu();
