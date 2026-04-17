const STORAGE_KEY = "mini-games-leaderboard-api-mode";
const DEFAULT_MODE = "auto";
const SUPPORTED_MODES = new Set(["auto", "local", "production"]);
const LOCAL_LEADERBOARD_API_URL = "http://localhost:3000/api/leaderboard";
const PRODUCTION_LEADERBOARD_API_URL = "https://api.jiangshemg.space/api/leaderboard";

const listeners = new Set();

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return SUPPORTED_MODES.has(mode) ? mode : DEFAULT_MODE;
}

function getStoredMode() {
  try {
    return normalizeMode(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return DEFAULT_MODE;
  }
}

let currentMode = getStoredMode();

function isLocalDevelopmentHost() {
  if (typeof window === "undefined" || !window.location) {
    return false;
  }

  if (String(window.location.protocol || "").toLowerCase() === "file:") {
    return true;
  }

  const hostname = String(window.location.hostname || "").toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveEffectiveMode() {
  if (currentMode === "auto") {
    return isLocalDevelopmentHost() ? "local" : "production";
  }

  return currentMode;
}

export function getLeaderboardApiUrl() {
  return resolveEffectiveMode() === "local"
    ? LOCAL_LEADERBOARD_API_URL
    : PRODUCTION_LEADERBOARD_API_URL;
}

export function getLeaderboardApiMode() {
  return currentMode;
}

export function setLeaderboardApiMode(mode) {
  const nextMode = normalizeMode(mode);

  if (nextMode === currentMode) {
    return currentMode;
  }

  currentMode = nextMode;

  try {
    window.localStorage.setItem(STORAGE_KEY, currentMode);
  } catch (error) {
    // Ignore storage failures and keep the in-memory mode.
  }

  listeners.forEach(function (listener) {
    listener(currentMode);
  });

  return currentMode;
}

export function onLeaderboardApiModeChange(listener) {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}
