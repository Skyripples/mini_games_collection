import { consumeTranslationContext, t } from "../core/i18n.js";
import { promptLeaderboardPlayerName, submitLeaderboardScore } from "../core/leaderboard-submit.js";
import { createGame1A2B } from "./game-1a2b.js";
import { createGame2048 } from "./game-2048.js";
import { createBreakoutGame } from "./game-breakout.js";
import { createCashForgeGame } from "./game-cashforge.js";
import { createCheckersGame } from "./game-checkers.js";
import { createChessGame } from "./game-chess.js";
import { createConnectFourGame } from "./game-connectfour.js";
import { createDinoGame } from "./game-dino.js";
import { createGoGame } from "./game-go.js";
import { createGomokuGame } from "./game-gomoku.js";
import { createHuarongdaoGame } from "./game-huarongdao.js";
import { createMemoryGame } from "./game-memory.js";
import { createMinesweeperGame } from "./game-minesweeper.js";
import { createMazeGame } from "./game-maze.js";
import { createFlappyGame } from "./game-flappy.js";
import { createRhythmGame } from "./game-rhythm.js";
import { createPacmanGame } from "./game-pacman.js";
import { createPinballGame } from "./game-pinball.js";
import { createRoguelikeGame } from "./game-roguelike.js";
import { createRaidenGame } from "./game-raiden.js";
import { createReversiGame } from "./game-reversi.js";
import { createSlidePuzzleGame } from "./game-slide-puzzle.js";
import { createSnakeGame } from "./game-snake.js";
import { createSokobanGame } from "./game-sokoban.js";
import { createSudokuGame } from "./game-sudoku.js";
import { createTicTacToeGame } from "./game-tic-tac-toe.js";
import { createTetrisGame } from "./game-tetris.js";
import { createWhackAMoleGame } from "./game-whack-a-mole.js";
import { createShogiGame } from "./game-shogi.js";
import { createXiangqiGame } from "./game-xiangqi.js";
import { createWaterSortGame } from "./game-water-sort.js";

function buildElements(getElementById, elementIds) {
  return Object.fromEntries(
    Object.entries(elementIds).map(function ([key, elementId]) {
      return [key, getElementById(elementId)];
    })
  );
}

const LEADERBOARD_END_KEY_PATTERN = /(?:^|\.)((gameOver|win|clear|cleared|solved|finished|finish|draw|tie|blackWin|whiteWin|playerWin|computerWin|player1Win|player2Win|failed|hitMine|timeUp|timeout|lose|loss|complete|completed|checkmate))$/i;
const LEADERBOARD_END_TEXT_PATTERN = /(遊戲結束|game over|恭喜|完成|清空|撞上障礙|被鬼抓到|被鬼抓到了|過關|失敗|贏了|赢了|達成 2048|沒有可以移動|沒有可移動|冒險失敗)/i;
const LEADERBOARD_SCORE_KEY_PRIORITY = [
  "scoreText",
  "score",
  "guessCountText",
  "coinsGlobal",
  "coins",
  "movesText",
  "stepsText",
  "linesText",
  "ballsText",
  "hpText",
  "livesText",
  "hintsText",
  "mistakesText",
  "timeText",
  "floorText",
  "blackCapturesText",
  "whiteCapturesText",
  "blackCountText",
  "whiteCountText"
];

function parseNumericText(value) {
  const match = String(value === null || value === undefined ? "" : value)
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : 0;
}

function createObservedElementProxy(element, onTextContentChange) {
  return new Proxy(element, {
    get(target, property, receiver) {
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      const result = Reflect.set(target, property, value, receiver);

      if (property === "textContent") {
        onTextContentChange(String(value || ""));
      }

      return result;
    }
  });
}

function getDifficultyValueFromElements(elements) {
  const difficultySelect = elements.difficultySelect;
  if (!difficultySelect) {
    return null;
  }

  const value = String(difficultySelect.value || "").trim();
  return value ? value : null;
}

function getDifficultyLabelFromElements(elements) {
  const difficultySelect = elements.difficultySelect;
  if (!difficultySelect) {
    return "";
  }

  const selectedOption = difficultySelect.selectedOptions && difficultySelect.selectedOptions[0];
  return selectedOption ? String(selectedOption.textContent || "").trim() : "";
}

function getGameScoreFromElements(elements) {
  for (let index = 0; index < LEADERBOARD_SCORE_KEY_PRIORITY.length; index += 1) {
    const key = LEADERBOARD_SCORE_KEY_PRIORITY[index];
    const element = elements[key];

    if (!element) {
      continue;
    }

    const score = parseNumericText(element.textContent);
    if (Number.isFinite(score)) {
      return score;
    }
  }

  return 0;
}

function isLeaderboardGameOver(context, textContent) {
  const key = String(context && context.key ? context.key : "");
  if (key === "common.gameOver" || LEADERBOARD_END_KEY_PATTERN.test(key)) {
    return true;
  }

  return LEADERBOARD_END_TEXT_PATTERN.test(String(textContent || ""));
}

function createLeaderboardSubmissionController(definition, elements) {
  let submittedForCurrentRun = false;
  const observedKeys = Object.keys(elements).filter(function (key) {
    return /(?:message|status|result|turnText|prompt|scoreText|timeText|movesText|stepsText|linesText|ballsText|hpText|livesText|hintsText|mistakesText|floorText|blackCapturesText|whiteCapturesText|blackCountText|whiteCountText|comboText|levelText|speedText|timerText|mineText|sizeText|guessCountText|coinsGlobal|coins|score)$/i.test(key);
  });

  async function submitLeaderboardScoreForRun(rawTextContent) {
    const context = consumeTranslationContext();
    const isGameOver = isLeaderboardGameOver(context, rawTextContent);

    if (!isGameOver) {
      if (submittedForCurrentRun) {
        submittedForCurrentRun = false;
      }
      return;
    }

    if (submittedForCurrentRun) {
      return;
    }

    submittedForCurrentRun = true;

    const gameTitle = t(definition.menu.titleKey);
    const difficultyLabel = getDifficultyLabelFromElements(elements);
    const playerName = promptLeaderboardPlayerName(gameTitle, difficultyLabel);
    const score = getGameScoreFromElements(elements);
    const difficultyValue = getDifficultyValueFromElements(elements);

    await submitLeaderboardScore({
      gameId: definition.id,
      playerName: playerName,
      score: score,
      difficulty: difficultyValue
    });
  }

  function wrapElements() {
    const wrapped = { ...elements };

    observedKeys.forEach(function (key) {
      const element = wrapped[key];
      if (!element) {
        return;
      }

      wrapped[key] = createObservedElementProxy(element, function (textContent) {
        void submitLeaderboardScoreForRun(textContent);
      });
    });

    return wrapped;
  }

  function reset() {
    submittedForCurrentRun = false;
  }

  return {
    reset: reset,
    wrapElements: wrapElements
  };
}

function withLocaleFallback(game, applyFallback) {
  return {
    ...game,
    refreshLocale: function () {
      if (typeof game.refreshLocale === "function") {
        game.refreshLocale();
      }

      applyFallback();
    }
  };
}

function createGameFactory(factory, elementIds, localeFallback) {
  return function ({ getElementById, definition }) {
    const elements = buildElements(getElementById, elementIds);
    const leaderboardObserver = definition
      ? createLeaderboardSubmissionController(definition, elements)
      : null;
    const wrappedElements = leaderboardObserver ? leaderboardObserver.wrapElements() : elements;
    const game = factory(wrappedElements);

    const wrappedGame = leaderboardObserver
      ? {
        ...game,
        enter: function () {
          leaderboardObserver.reset();
          if (typeof game.enter === "function") {
            game.enter();
          }
        },
        leave: function () {
          if (typeof game.leave === "function") {
            game.leave();
          }
        }
      }
      : game;

    if (leaderboardObserver) {
      Object.entries(elements).forEach(function ([key, element]) {
        if (!element || typeof element.addEventListener !== "function") {
          return;
        }

        if (!/(?:restart|reset|newPuzzle|newGame|playAgain|start)/i.test(key)) {
          return;
        }

        element.addEventListener("click", function () {
          leaderboardObserver.reset();
        });
      });
    }

    if (!localeFallback) {
      return wrappedGame;
    }

    return withLocaleFallback(wrappedGame, function () {
      const fallbackEntry = Object.entries(elementIds).find(function ([, elementId]) {
        return elementId === localeFallback.messageId;
      });
      const fallbackElement = fallbackEntry
        ? wrappedElements[fallbackEntry[0]] || getElementById(localeFallback.messageId)
        : getElementById(localeFallback.messageId);
      fallbackElement.textContent = t(localeFallback.messageKey);
    });
  };
}

function createRegistryEntry({
  id,
  buttonId,
  panelId,
  createGame,
  hidden = false,
  order,
  level,
  titleKey,
  metaKey,
  thumbClass
}) {
  return {
    id: id,
    buttonId: buttonId,
    panelId: panelId,
    hidden: hidden,
    createGame: createGame,
    menu: {
      order: order,
      level: level,
      titleKey: titleKey,
      metaKey: metaKey,
      thumbClass: thumbClass
    }
  };
}

export const gameRegistry = [
  createRegistryEntry({
    id: "1a2b",
    buttonId: "btn-1a2b",
    panelId: "game-1a2b",
    order: 1,
    level: 1,
    titleKey: "menu.1a2b.title",
    metaKey: "menu.1a2b.meta",
    thumbClass: "thumb--1a2b",
    createGame: createGameFactory(createGame1A2B, {
      btnGuess: "btn-guess",
      btnRestart: "btn-restart-1a2b",
      guessInput: "guess-input",
      message: "message",
      guessCountText: "guess-count",
      historyList: "history-list"
    })
  }),
  createRegistryEntry({
    id: "maze",
    buttonId: "btn-maze",
    panelId: "game-maze",
    order: 1.5,
    level: 1,
    titleKey: "menu.maze.title",
    metaKey: "menu.maze.meta",
    thumbClass: "thumb--maze",
    createGame: createGameFactory(createMazeGame, {
      canvas: "maze-canvas",
      btnRestart: "btn-restart-maze",
      stepsText: "maze-steps",
      timeText: "maze-time",
      message: "maze-message"
    })
  }),
  createRegistryEntry({
    id: "cashforge",
    buttonId: "btn-cashforge",
    panelId: "game-cashforge",
    hidden: true,
    order: 18,
    level: 3,
    titleKey: "menu.cashForge.title",
    metaKey: "menu.cashForge.meta",
    thumbClass: "thumb--cashforge",
    createGame: createGameFactory(createCashForgeGame, {
      btnRecharge: "btn-cashforge-recharge",
      btnReset: "btn-cashforge-reset",
      btnTabInventory: "btn-cashforge-tab-inventory",
      btnTabShop: "btn-cashforge-tab-shop",
      btnTabEnhance: "btn-cashforge-tab-enhance",
      viewInventory: "cashforge-view-inventory",
      viewShop: "cashforge-view-shop",
      viewEnhance: "cashforge-view-enhance",
      coinsGlobal: "cashforge-coins-global",
      bagEquipment: "cashforge-bag-equipment",
      bagRestoreScrolls: "cashforge-bag-restore-scrolls",
      bagGuardianStones: "cashforge-bag-guardian-stones",
      bagGuardianCrystals: "cashforge-bag-guardian-crystals",
      bagDoubleHammers: "cashforge-bag-double-hammers",
      shopCoins: "cashforge-shop-coins",
      btnBuyRestorePack: "btn-buy-restore-pack",
      btnBuyStonePack: "btn-buy-stone-pack",
      btnBuyCrystalPack: "btn-buy-crystal-pack",
      equipmentSelect: "cashforge-equipment-select",
      btnEnhance: "btn-cashforge-enhance",
      btnRestore: "btn-cashforge-restore",
      useStoneCheckbox: "cashforge-use-stone",
      useCrystalCheckbox: "cashforge-use-crystal",
      useHammerCheckbox: "cashforge-use-hammer",
      enhanceCoins: "cashforge-enhance-coins",
      enhanceLevel: "cashforge-enhance-level",
      enhanceRestoreScrolls: "cashforge-enhance-restore-scrolls",
      enhanceGuardianStones: "cashforge-enhance-guardian-stones",
      enhanceGuardianCrystals: "cashforge-enhance-guardian-crystals",
      enhanceDoubleHammers: "cashforge-enhance-double-hammers",
      message: "cashforge-message",
      equipmentStatusList: "cashforge-equipment-status-list"
    })
  }),
  createRegistryEntry({
    id: "snake",
    buttonId: "btn-snake",
    panelId: "game-snake",
    order: 3,
    level: 2,
    titleKey: "menu.snake.title",
    metaKey: "menu.snake.meta",
    thumbClass: "thumb--snake",
    createGame: createGameFactory(createSnakeGame, {
      canvas: "snake-canvas",
      btnStart: "btn-start-snake",
      btnUp: "btn-snake-up",
      btnLeft: "btn-snake-left",
      btnDown: "btn-snake-down",
      btnRight: "btn-snake-right",
      scoreText: "snake-score",
      message: "snake-message",
      leaderboardTitle: "snake-leaderboard-title",
      leaderboardStatus: "snake-leaderboard-status",
      leaderboardList: "snake-leaderboard-list"
    })
  }),
  createRegistryEntry({
    id: "minesweeper",
    buttonId: "btn-minesweeper",
    panelId: "game-minesweeper",
    order: 11,
    level: 3,
    titleKey: "menu.minesweeper.title",
    metaKey: "menu.minesweeper.meta",
    thumbClass: "thumb--minesweeper",
    createGame: createGameFactory(createMinesweeperGame, {
      boardElement: "minesweeper-board",
      btnRestart: "btn-restart-minesweeper",
      message: "minesweeper-message",
      difficultySelect: "select-minesweeper-difficulty",
      difficultyLabel: "minesweeper-difficulty-label",
      sizeText: "minesweeper-size",
      mineText: "minesweeper-mines",
      timerText: "minesweeper-time"
    })
  }),
  createRegistryEntry({
    id: "memory",
    buttonId: "btn-memory",
    panelId: "game-memory",
    order: 8,
    level: 2,
    titleKey: "menu.memory.title",
    metaKey: "menu.memory.meta",
    thumbClass: "thumb--memory",
    createGame: createGameFactory(createMemoryGame, {
      boardElement: "memory-board",
      difficultySelect: "select-memory-difficulty",
      themeSelect: "select-memory-theme",
      btnRestart: "btn-restart-memory",
      timeText: "memory-time",
      scoreText: "memory-score",
      streakText: "memory-streak",
      message: "memory-message"
    })
  }),
  createRegistryEntry({
    id: "2048",
    buttonId: "btn-2048",
    panelId: "game-2048",
    order: 6,
    level: 2,
    titleKey: "menu.2048.title",
    metaKey: "menu.2048.meta",
    thumbClass: "thumb--2048",
    createGame: createGameFactory(
      createGame2048,
      {
        boardElement: "board-2048",
        btnRestart: "btn-restart-2048",
        scoreText: "score-2048",
        message: "message-2048"
      },
      {
        messageId: "message-2048",
        messageKey: "2048.message.start"
      }
    )
  }),
  createRegistryEntry({
    id: "breakout",
    buttonId: "btn-breakout",
    panelId: "game-breakout",
    order: 7,
    level: 2,
    titleKey: "menu.breakout.title",
    metaKey: "menu.breakout.meta",
    thumbClass: "thumb--breakout",
    createGame: createGameFactory(createBreakoutGame, {
      canvas: "breakout-canvas",
      btnStart: "btn-start-breakout",
      btnMode: "btn-breakout-mode",
      scoreText: "breakout-score",
      livesText: "breakout-lives",
      message: "breakout-message"
    })
  }),
  createRegistryEntry({
    id: "raiden",
    buttonId: "btn-raiden",
    panelId: "game-raiden",
    order: 17,
    level: 3,
    titleKey: "menu.raiden.title",
    metaKey: "menu.raiden.meta",
    thumbClass: "thumb--raiden",
    createGame: createGameFactory(createRaidenGame, {
      canvas: "raiden-canvas",
      btnRestart: "btn-restart-raiden",
      scoreText: "raiden-score",
      hpText: "raiden-hp",
      skillText: "raiden-skill",
      message: "raiden-message"
    })
  }),
  createRegistryEntry({
    id: "whack",
    buttonId: "btn-whack",
    panelId: "game-whack",
    order: 5,
    level: 2,
    titleKey: "menu.whack.title",
    metaKey: "menu.whack.meta",
    thumbClass: "thumb--whack",
    createGame: createGameFactory(createWhackAMoleGame, {
      boardElement: "whack-board",
      difficultySelect: "select-whack-difficulty",
      difficultyLabel: "whack-difficulty-label",
      btnStart: "btn-start-whack",
      btnRestart: "btn-restart-whack",
      scoreText: "whack-score",
      timeText: "whack-time",
      message: "whack-message"
    })
  }),
  createRegistryEntry({
    id: "flappy",
    buttonId: "btn-flappy",
    panelId: "game-flappy",
    order: 5.5,
    level: 2,
    titleKey: "menu.flappy.title",
    metaKey: "menu.flappy.meta",
    thumbClass: "thumb--flappy",
    createGame: createGameFactory(createFlappyGame, {
      canvas: "flappy-canvas",
      btnRestart: "btn-restart-flappy",
      scoreText: "flappy-score",
      message: "flappy-message"
    })
  }),
  createRegistryEntry({
    id: "rhythm",
    buttonId: "btn-rhythm",
    panelId: "game-rhythm",
    order: 5.6,
    level: 2,
    titleKey: "menu.rhythm.title",
    metaKey: "menu.rhythm.meta",
    thumbClass: "thumb--rhythm",
    createGame: createGameFactory(createRhythmGame, {
      canvas: "rhythm-canvas",
      btnRestart: "btn-restart-rhythm",
      scoreText: "rhythm-score",
      comboText: "rhythm-combo",
      livesText: "rhythm-lives",
      message: "rhythm-message"
    })
  }),
  createRegistryEntry({
    id: "pinball",
    buttonId: "btn-pinball",
    panelId: "game-pinball",
    hidden: true,
    order: 21,
    level: 4,
    titleKey: "menu.pinball.title",
    metaKey: "menu.pinball.meta",
    thumbClass: "thumb--pinball",
    createGame: createGameFactory(
      createPinballGame,
      {
        canvas: "pinball-canvas",
        btnRestart: "btn-restart-pinball",
        btnLeft: "btn-pinball-left",
        btnLaunch: "btn-launch-pinball",
        btnRight: "btn-pinball-right",
        scoreText: "pinball-score",
        ballsText: "pinball-balls",
        message: "pinball-message"
      },
      {
        messageId: "pinball-message",
        messageKey: "pinball.message.ready"
      }
    )
  }),
  createRegistryEntry({
    id: "dino",
    buttonId: "btn-dino",
    panelId: "game-dino",
    hidden: true,
    order: 4,
    level: 2,
    titleKey: "menu.dino.title",
    metaKey: "menu.dino.meta",
    thumbClass: "thumb--dino",
    createGame: createGameFactory(
      createDinoGame,
      {
        canvas: "dino-canvas",
        btnRestart: "btn-restart-dino",
        btnJump: "btn-dino-jump",
        btnDuck: "btn-dino-duck",
        scoreText: "dino-score",
        speedText: "dino-speed",
        message: "dino-message"
      },
      {
        messageId: "dino-message",
        messageKey: "dino.message.ready"
      }
    )
  }),
  createRegistryEntry({
    id: "pacman",
    buttonId: "btn-pacman",
    panelId: "game-pacman",
    hidden: true,
    order: 22,
    level: 4,
    titleKey: "menu.pacman.title",
    metaKey: "menu.pacman.meta",
    thumbClass: "thumb--pacman",
    createGame: createGameFactory(
      createPacmanGame,
      {
        canvas: "pacman-canvas",
        btnRestart: "btn-restart-pacman",
        btnUp: "btn-pacman-up",
        btnLeft: "btn-pacman-left",
        btnDown: "btn-pacman-down",
        btnRight: "btn-pacman-right",
        scoreText: "pacman-score",
        livesText: "pacman-lives",
        message: "pacman-message"
      },
      {
        messageId: "pacman-message",
        messageKey: "pacman.message.ready"
      }
    )
  }),
  createRegistryEntry({
    id: "checkers",
    buttonId: "btn-checkers",
    panelId: "game-checkers",
    order: 22.6,
    level: 4,
    titleKey: "menu.checkers.title",
    metaKey: "menu.checkers.meta",
    thumbClass: "thumb--checkers",
    createGame: createGameFactory(createCheckersGame, {
      boardElement: "checkers-board",
      playerCountSelect: "select-checkers-player-count",
      btnRestart: "btn-restart-checkers",
      turnText: "checkers-turn",
      playersText: "checkers-players",
      message: "checkers-message"
    })
  }),
  createRegistryEntry({
    id: "chess",
    buttonId: "btn-chess",
    panelId: "game-chess",
    order: 23,
    level: 5,
    titleKey: "menu.chess.title",
    metaKey: "menu.chess.meta",
    thumbClass: "thumb--chess",
    createGame: createGameFactory(
      createChessGame,
      {
        boardElement: "chess-board",
        btnAssist: "btn-assist-chess",
        btnRestart: "btn-restart-chess",
        turnText: "chess-turn",
        message: "chess-message"
      }
    )
  }),
  createRegistryEntry({
    id: "connectfour",
    buttonId: "btn-connectfour",
    panelId: "game-connectfour",
    order: 10,
    level: 3,
    titleKey: "menu.connectfour.title",
    metaKey: "menu.connectfour.meta",
    thumbClass: "thumb--connectfour",
    createGame: createGameFactory(createConnectFourGame, {
      boardElement: "connectfour-board",
      btnPvp: "btn-connectfour-pvp",
      btnCpu: "btn-connectfour-cpu",
      btnRestart: "btn-restart-connectfour",
      turnText: "connectfour-turn",
      message: "connectfour-message"
    })
  }),
  createRegistryEntry({
    id: "tictactoe",
    buttonId: "btn-tictactoe",
    panelId: "game-tictactoe",
    order: 2,
    level: 1,
    titleKey: "menu.tictactoe.title",
    metaKey: "menu.tictactoe.meta",
    thumbClass: "thumb--tictactoe",
    createGame: createGameFactory(createTicTacToeGame, {
      boardElement: "tictactoe-board",
      btnPvp: "btn-tictactoe-pvp",
      btnCpu: "btn-tictactoe-cpu",
      btnRestart: "btn-restart-tictactoe",
      turnText: "tictactoe-turn",
      circleOwnerText: "tictactoe-circle-owner",
      crossOwnerText: "tictactoe-cross-owner",
      message: "tictactoe-message"
    })
  }),
  createRegistryEntry({
    id: "tetris",
    buttonId: "btn-tetris",
    panelId: "game-tetris",
    order: 20,
    level: 4,
    titleKey: "menu.tetris.title",
    metaKey: "menu.tetris.meta",
    thumbClass: "thumb--tetris",
    createGame: createGameFactory(createTetrisGame, {
      canvas: "tetris-canvas",
      holdCanvas: "tetris-hold-canvas",
      nextCanvas: "tetris-next-canvas",
      btnRestart: "btn-restart-tetris",
      scoreText: "tetris-score",
      linesText: "tetris-lines",
      levelText: "tetris-level",
      message: "tetris-message"
    })
  }),
  createRegistryEntry({
    id: "roguelike",
    buttonId: "btn-roguelike",
    panelId: "game-roguelike",
    order: 20.5,
    level: 4,
    titleKey: "menu.roguelike.title",
    metaKey: "menu.roguelike.meta",
    thumbClass: "thumb--roguelike",
    createGame: createGameFactory(createRoguelikeGame, {
      canvas: "roguelike-canvas",
      btnRestart: "btn-restart-roguelike",
      scoreText: "roguelike-score",
      hpText: "roguelike-hp",
      floorText: "roguelike-floor",
      message: "roguelike-message"
    })
  }),
  createRegistryEntry({
    id: "gomoku",
    buttonId: "btn-gomoku",
    panelId: "game-gomoku",
    order: 13,
    level: 3,
    titleKey: "menu.gomoku.title",
    metaKey: "menu.gomoku.meta",
    thumbClass: "thumb--gomoku",
    createGame: createGameFactory(createGomokuGame, {
      boardElement: "gomoku-board",
      btnPvp: "btn-gomoku-pvp",
      btnCpu: "btn-gomoku-cpu",
      btnRestart: "btn-restart-gomoku",
      message: "gomoku-message",
      turnText: "gomoku-turn"
    })
  }),
  createRegistryEntry({
    id: "sokoban",
    buttonId: "btn-sokoban",
    panelId: "game-sokoban",
    order: 15,
    level: 3,
    titleKey: "menu.sokoban.title",
    metaKey: "menu.sokoban.meta",
    thumbClass: "thumb--sokoban",
    createGame: createGameFactory(createSokobanGame, {
      boardElement: "sokoban-board",
      btnPrev: "btn-prev-sokoban",
      btnRestart: "btn-restart-sokoban",
      btnNext: "btn-next-sokoban",
      levelText: "sokoban-level",
      movesText: "sokoban-moves",
      message: "sokoban-message"
    })
  }),
  createRegistryEntry({
    id: "huarongdao",
    buttonId: "btn-huarongdao",
    panelId: "game-huarongdao",
    order: 16,
    level: 3,
    titleKey: "menu.huarongdao.title",
    metaKey: "menu.huarongdao.meta",
    thumbClass: "thumb--huarongdao",
    createGame: createGameFactory(createHuarongdaoGame, {
      boardElement: "huarongdao-board",
      difficultySelect: "select-huarongdao-difficulty",
      difficultyLabel: "huarongdao-difficulty-label",
      btnRestart: "btn-restart-huarongdao",
      movesText: "huarongdao-moves",
      message: "huarongdao-message"
    })
  }),
  createRegistryEntry({
    id: "reversi",
    buttonId: "btn-reversi",
    panelId: "game-reversi",
    order: 19,
    level: 4,
    titleKey: "menu.reversi.title",
    metaKey: "menu.reversi.meta",
    thumbClass: "thumb--reversi",
    createGame: createGameFactory(createReversiGame, {
      boardElement: "reversi-board",
      btnPvp: "btn-reversi-pvp",
      btnCpu: "btn-reversi-cpu",
      btnAssist: "btn-assist-reversi",
      btnRestart: "btn-restart-reversi",
      message: "reversi-message",
      turnText: "reversi-turn",
      blackCountText: "reversi-black-count",
      whiteCountText: "reversi-white-count"
    })
  }),
  createRegistryEntry({
    id: "sudoku",
    buttonId: "btn-sudoku",
    panelId: "game-sudoku",
    order: 14,
    level: 3,
    titleKey: "menu.sudoku.title",
    metaKey: "menu.sudoku.meta",
    thumbClass: "thumb--sudoku",
    createGame: createGameFactory(createSudokuGame, {
      boardElement: "sudoku-board",
      numberPadElement: "sudoku-number-pad",
      difficultySelect: "select-sudoku-difficulty",
      difficultyLabel: "sudoku-difficulty-label",
      btnHint: "btn-hint-sudoku",
      btnNoteMode: "btn-sudoku-note",
      btnNewPuzzle: "btn-new-sudoku",
      btnRestart: "btn-restart-sudoku",
      hintsText: "sudoku-hints",
      mistakesText: "sudoku-mistakes",
      message: "sudoku-message"
    })
  }),
  createRegistryEntry({
    id: "slide",
    buttonId: "btn-slide",
    panelId: "game-slide",
    order: 12,
    level: 3,
    titleKey: "menu.slide.title",
    metaKey: "menu.slide.meta",
    thumbClass: "thumb--slide",
    createGame: createGameFactory(createSlidePuzzleGame, {
      boardElement: "slide-board",
      difficultySelect: "select-slide-difficulty",
      btnRestart: "btn-restart-slide",
      movesText: "slide-moves",
      timeText: "slide-time",
      message: "slide-message"
    })
  }),
  createRegistryEntry({
    id: "xiangqi",
    buttonId: "btn-xiangqi",
    panelId: "game-xiangqi",
    order: 24,
    level: 5,
    titleKey: "menu.xiangqi.title",
    metaKey: "menu.xiangqi.meta",
    thumbClass: "thumb--xiangqi",
    createGame: createGameFactory(
      createXiangqiGame,
      {
        boardElement: "xiangqi-board",
        btnAssist: "btn-assist-xiangqi",
        btnRestart: "btn-restart-xiangqi",
        turnText: "xiangqi-turn",
        message: "xiangqi-message"
      }
    )
  }),
  createRegistryEntry({
    id: "shogi",
    buttonId: "btn-shogi",
    panelId: "game-shogi",
    order: 24.5,
    level: 5,
    titleKey: "menu.shogi.title",
    metaKey: "menu.shogi.meta",
    thumbClass: "thumb--shogi",
    createGame: createGameFactory(createShogiGame, {
      boardElement: "shogi-board",
      blackHandElement: "shogi-black-hand",
      whiteHandElement: "shogi-white-hand",
      btnAssist: "btn-assist-shogi",
      btnRestart: "btn-restart-shogi",
      turnText: "shogi-turn",
      message: "shogi-message",
      promotePrompt: "shogi-promote-prompt",
      promoteText: "shogi-promote-text",
      btnPromoteYes: "btn-shogi-promote-yes",
      btnPromoteNo: "btn-shogi-promote-no"
    })
  }),
  createRegistryEntry({
    id: "go",
    buttonId: "btn-go",
    panelId: "game-go",
    order: 25,
    level: 5,
    titleKey: "menu.go.title",
    metaKey: "menu.go.meta",
    thumbClass: "thumb--go",
    createGame: createGameFactory(
      createGoGame,
      {
        boardElement: "go-board",
        btnPass: "btn-pass-go",
        btnRestart: "btn-restart-go",
        turnText: "go-turn",
        blackCapturesText: "go-black-captures",
        whiteCapturesText: "go-white-captures",
        message: "go-message"
      },
      {
        messageId: "go-message",
        messageKey: "go.message.start"
      }
    )
  }),
  createRegistryEntry({
    id: "water-sort",
    buttonId: "btn-water-sort",
    panelId: "game-water-sort",
    order: 9,
    level: 2,
    titleKey: "menu.waterSort.title",
    metaKey: "menu.waterSort.meta",
    thumbClass: "thumb--water-sort",
    createGame: createGameFactory(createWaterSortGame, {
      boardElement: "water-sort-board",
      btnRestart: "btn-restart-water-sort",
      btnPrev: "btn-prev-water-sort",
      btnNext: "btn-next-water-sort",
      levelText: "water-sort-level",
      message: "water-sort-message"
    })
  }),
];
