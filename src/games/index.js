import { t } from "../core/i18n.js";
import { createGame1A2B } from "./game-1a2b.js";
import { createGame2048 } from "./game-2048.js";
import { createBreakoutGame } from "./game-breakout.js";
import { createChessGame } from "./game-chess.js";
import { createDinoGame } from "./game-dino.js";
import { createGoGame } from "./game-go.js";
import { createGomokuGame } from "./game-gomoku.js";
import { createMinesweeperGame } from "./game-minesweeper.js";
import { createPacmanGame } from "./game-pacman.js";
import { createPinballGame } from "./game-pinball.js";
import { createReversiGame } from "./game-reversi.js";
import { createSnakeGame } from "./game-snake.js";
import { createSudokuGame } from "./game-sudoku.js";
import { createTicTacToeGame } from "./game-tic-tac-toe.js";
import { createTetrisGame } from "./game-tetris.js";
import { createXiangqiGame } from "./game-xiangqi.js";

function buildElements(getElementById, elementIds) {
  return Object.fromEntries(
    Object.entries(elementIds).map(function ([key, elementId]) {
      return [key, getElementById(elementId)];
    })
  );
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
  return function ({ getElementById }) {
    const game = factory(buildElements(getElementById, elementIds));

    if (!localeFallback) {
      return game;
    }

    return withLocaleFallback(game, function () {
      getElementById(localeFallback.messageId).textContent = t(localeFallback.messageKey);
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
      message: "snake-message"
    })
  }),
  createRegistryEntry({
    id: "minesweeper",
    buttonId: "btn-minesweeper",
    panelId: "game-minesweeper",
    order: 7,
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
      mineText: "minesweeper-mines"
    })
  }),
  createRegistryEntry({
    id: "2048",
    buttonId: "btn-2048",
    panelId: "game-2048",
    order: 4,
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
    order: 5,
    level: 2,
    titleKey: "menu.breakout.title",
    metaKey: "menu.breakout.meta",
    thumbClass: "thumb--breakout",
    createGame: createGameFactory(createBreakoutGame, {
      canvas: "breakout-canvas",
      btnStart: "btn-start-breakout",
      scoreText: "breakout-score",
      livesText: "breakout-lives",
      message: "breakout-message"
    })
  }),
  createRegistryEntry({
    id: "pinball",
    buttonId: "btn-pinball",
    panelId: "game-pinball",
    hidden: true,
    order: 12,
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
    order: 6,
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
    order: 13,
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
    id: "chess",
    buttonId: "btn-chess",
    panelId: "game-chess",
    order: 14,
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
    order: 11,
    level: 4,
    titleKey: "menu.tetris.title",
    metaKey: "menu.tetris.meta",
    thumbClass: "thumb--tetris",
    createGame: createGameFactory(
      createTetrisGame,
      {
        canvas: "tetris-canvas",
        holdCanvas: "tetris-hold-canvas",
        nextCanvas: "tetris-next-canvas",
        btnRestart: "btn-restart-tetris",
        scoreText: "tetris-score",
        linesText: "tetris-lines",
        levelText: "tetris-level",
        message: "tetris-message"
      },
      {
        messageId: "tetris-message",
        messageKey: "tetris.message.start"
      }
    )
  }),
  createRegistryEntry({
    id: "gomoku",
    buttonId: "btn-gomoku",
    panelId: "game-gomoku",
    order: 9,
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
    id: "reversi",
    buttonId: "btn-reversi",
    panelId: "game-reversi",
    order: 10,
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
    order: 8,
    level: 3,
    titleKey: "menu.sudoku.title",
    metaKey: "menu.sudoku.meta",
    thumbClass: "thumb--sudoku",
    createGame: createGameFactory(createSudokuGame, {
      boardElement: "sudoku-board",
      numberPadElement: "sudoku-number-pad",
      difficultySelect: "select-sudoku-difficulty",
      difficultyLabel: "sudoku-difficulty-label",
      btnNoteMode: "btn-sudoku-note",
      btnNewPuzzle: "btn-new-sudoku",
      btnRestart: "btn-restart-sudoku",
      mistakesText: "sudoku-mistakes",
      message: "sudoku-message"
    })
  }),
  createRegistryEntry({
    id: "xiangqi",
    buttonId: "btn-xiangqi",
    panelId: "game-xiangqi",
    order: 15,
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
    id: "go",
    buttonId: "btn-go",
    panelId: "game-go",
    order: 16,
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
  })
];
