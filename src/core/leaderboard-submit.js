import { getLeaderboardApiCandidates } from "./api.js";
import { t } from "./i18n.js";

function normalizePlayerName(value) {
  const name = String(value || "").trim();
  return name ? name.slice(0, 50) : "N/A";
}

function normalizeDifficulty(value) {
  const difficulty = String(value || "").trim();
  return difficulty ? difficulty.slice(0, 20) : null;
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.floor(score) : 0;
}

export function promptLeaderboardPlayerName(gameTitle, difficultyLabel) {
  const suffix = difficultyLabel ? ` / ${difficultyLabel}` : "";
  const promptLabel = t("leaderboard.promptName", {
    game: gameTitle,
    difficulty: suffix
  });
  const playerName = window.prompt(promptLabel, "");

  return normalizePlayerName(playerName);
}

export async function submitLeaderboardScore({
  gameId,
  playerName,
  score,
  difficulty = null
}) {
  try {
    if (typeof fetch !== "function") {
      throw new Error("fetch is not available");
    }

    const requestBody = JSON.stringify({
      gameId: String(gameId || "").trim(),
      playerName: normalizePlayerName(playerName),
      score: normalizeScore(score),
      difficulty: normalizeDifficulty(difficulty)
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
    console.error("Failed to submit leaderboard score:", error);
  }
}
