import { createGameHub } from "./core/app.js";
import { createGame1A2B } from "./games/game-1a2b.js";
import { createGame2048 } from "./games/game-2048.js";
import { createBreakoutGame } from "./games/game-breakout.js";
import { createChessGame } from "./games/game-chess.js";
import { createGomokuGame } from "./games/game-gomoku.js";
import { createMinesweeperGame } from "./games/game-minesweeper.js";
import { createReversiGame } from "./games/game-reversi.js";
import { createSnakeGame } from "./games/game-snake.js";
import { createSudokuGame } from "./games/game-sudoku.js";
import { createTicTacToeGame } from "./games/game-tic-tac-toe.js";
import { createTetrisGame } from "./games/game-tetris.js";
import { createGoGame } from "./games/game-go.js";
import { createXiangqiGame } from "./games/game-xiangqi.js";

const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const btnBack = document.getElementById("btn-back");

const game1A2B = createGame1A2B({
  btnGuess: document.getElementById("btn-guess"),
  btnRestart: document.getElementById("btn-restart-1a2b"),
  guessInput: document.getElementById("guess-input"),
  message: document.getElementById("message"),
  guessCountText: document.getElementById("guess-count"),
  historyList: document.getElementById("history-list")
});

const snakeGame = createSnakeGame({
  canvas: document.getElementById("snake-canvas"),
  btnStart: document.getElementById("btn-start-snake"),
  scoreText: document.getElementById("snake-score"),
  message: document.getElementById("snake-message")
});

const minesweeperGame = createMinesweeperGame({
  boardElement: document.getElementById("minesweeper-board"),
  btnRestart: document.getElementById("btn-restart-minesweeper"),
  message: document.getElementById("minesweeper-message"),
  difficultySelect: document.getElementById("select-minesweeper-difficulty"),
  difficultyLabel: document.getElementById("minesweeper-difficulty-label"),
  sizeText: document.getElementById("minesweeper-size"),
  mineText: document.getElementById("minesweeper-mines")
});

const game2048 = createGame2048({
  boardElement: document.getElementById("board-2048"),
  btnRestart: document.getElementById("btn-restart-2048"),
  scoreText: document.getElementById("score-2048"),
  message: document.getElementById("message-2048")
});

const breakoutGame = createBreakoutGame({
  canvas: document.getElementById("breakout-canvas"),
  btnStart: document.getElementById("btn-start-breakout"),
  scoreText: document.getElementById("breakout-score"),
  livesText: document.getElementById("breakout-lives"),
  message: document.getElementById("breakout-message")
});

const chessGame = createChessGame({
  boardElement: document.getElementById("chess-board"),
  btnRestart: document.getElementById("btn-restart-chess"),
  turnText: document.getElementById("chess-turn"),
  message: document.getElementById("chess-message")
});

const ticTacToeGame = createTicTacToeGame({
  boardElement: document.getElementById("tictactoe-board"),
  btnRestart: document.getElementById("btn-restart-tictactoe"),
  turnText: document.getElementById("tictactoe-turn"),
  message: document.getElementById("tictactoe-message")
});

const tetrisGame = createTetrisGame({
  canvas: document.getElementById("tetris-canvas"),
  nextCanvas: document.getElementById("tetris-next-canvas"),
  btnRestart: document.getElementById("btn-restart-tetris"),
  scoreText: document.getElementById("tetris-score"),
  linesText: document.getElementById("tetris-lines"),
  levelText: document.getElementById("tetris-level"),
  message: document.getElementById("tetris-message")
});

const gomokuGame = createGomokuGame({
  boardElement: document.getElementById("gomoku-board"),
  btnPvp: document.getElementById("btn-gomoku-pvp"),
  btnCpu: document.getElementById("btn-gomoku-cpu"),
  btnRestart: document.getElementById("btn-restart-gomoku"),
  message: document.getElementById("gomoku-message"),
  turnText: document.getElementById("gomoku-turn")
});

const reversiGame = createReversiGame({
  boardElement: document.getElementById("reversi-board"),
  btnPvp: document.getElementById("btn-reversi-pvp"),
  btnCpu: document.getElementById("btn-reversi-cpu"),
  btnRestart: document.getElementById("btn-restart-reversi"),
  message: document.getElementById("reversi-message"),
  turnText: document.getElementById("reversi-turn"),
  blackCountText: document.getElementById("reversi-black-count"),
  whiteCountText: document.getElementById("reversi-white-count")
});

const sudokuGame = createSudokuGame({
  boardElement: document.getElementById("sudoku-board"),
  numberPadElement: document.getElementById("sudoku-number-pad"),
  btnNewPuzzle: document.getElementById("btn-new-sudoku"),
  btnRestart: document.getElementById("btn-restart-sudoku"),
  message: document.getElementById("sudoku-message")
});

const xiangqiGame = createXiangqiGame({
  boardElement: document.getElementById("xiangqi-board"),
  btnRestart: document.getElementById("btn-restart-xiangqi"),
  turnText: document.getElementById("xiangqi-turn"),
  message: document.getElementById("xiangqi-message")
});

const goGame = createGoGame({
  boardElement: document.getElementById("go-board"),
  btnPass: document.getElementById("btn-pass-go"),
  btnRestart: document.getElementById("btn-restart-go"),
  turnText: document.getElementById("go-turn"),
  blackCapturesText: document.getElementById("go-black-captures"),
  whiteCapturesText: document.getElementById("go-white-captures"),
  message: document.getElementById("go-message")
});

const app = createGameHub({
  menuScreen,
  gameScreen,
  backButton: btnBack,
  entries: {
    "1a2b": {
      button: document.getElementById("btn-1a2b"),
      panel: document.getElementById("game-1a2b"),
      game: game1A2B
    },
    snake: {
      button: document.getElementById("btn-snake"),
      panel: document.getElementById("game-snake"),
      game: snakeGame
    },
    minesweeper: {
      button: document.getElementById("btn-minesweeper"),
      panel: document.getElementById("game-minesweeper"),
      game: minesweeperGame
    },
    "2048": {
      button: document.getElementById("btn-2048"),
      panel: document.getElementById("game-2048"),
      game: game2048
    },
    breakout: {
      button: document.getElementById("btn-breakout"),
      panel: document.getElementById("game-breakout"),
      game: breakoutGame
    },
    chess: {
      button: document.getElementById("btn-chess"),
      panel: document.getElementById("game-chess"),
      game: chessGame
    },
    tictactoe: {
      button: document.getElementById("btn-tictactoe"),
      panel: document.getElementById("game-tictactoe"),
      game: ticTacToeGame
    },
    tetris: {
      button: document.getElementById("btn-tetris"),
      panel: document.getElementById("game-tetris"),
      game: tetrisGame
    },
    gomoku: {
      button: document.getElementById("btn-gomoku"),
      panel: document.getElementById("game-gomoku"),
      game: gomokuGame
    },
    reversi: {
      button: document.getElementById("btn-reversi"),
      panel: document.getElementById("game-reversi"),
      game: reversiGame
    },
    sudoku: {
      button: document.getElementById("btn-sudoku"),
      panel: document.getElementById("game-sudoku"),
      game: sudokuGame
    },
    xiangqi: {
      button: document.getElementById("btn-xiangqi"),
      panel: document.getElementById("game-xiangqi"),
      game: xiangqiGame
    },
    go: {
      button: document.getElementById("btn-go"),
      panel: document.getElementById("game-go"),
      game: goGame
    }
  }
});

app.showMenu();
