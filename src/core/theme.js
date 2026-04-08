const STORAGE_KEY = "mini-games-theme";
const DEFAULT_THEME = "light";
const SUPPORTED_THEMES = new Set(["light", "dark"]);

const listeners = new Set();

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme && SUPPORTED_THEMES.has(storedTheme)) {
      return storedTheme;
    }
  } catch (error) {
    return DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

let currentTheme = getStoredTheme();

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function getTheme() {
  return currentTheme;
}

export function setTheme(theme) {
  if (!SUPPORTED_THEMES.has(theme) || theme === currentTheme) {
    return;
  }

  currentTheme = theme;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // Ignore storage failures and keep the in-memory theme.
  }

  applyTheme(currentTheme);
  listeners.forEach(function (listener) {
    listener(currentTheme);
  });
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

export function initializeTheme() {
  applyTheme(currentTheme);
}
