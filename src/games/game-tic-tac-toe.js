import { t } from "../core/i18n.js";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const PLAYER_SYMBOLS = {
  circle: "○",
  cross: "×"
};

function getOpponent(player) {
  return player === "circle" ? "cross" : "circle";
}

function findWinner(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }

  return null;
}

function getAvailableMoves(board) {
  return board
    .map(function (cell, index) {
      return cell ? null : index;
    })
    .filter(function (index) {
      return index !== null;
    });
}

function evaluateBoard(board) {
  const winner = findWinner(board);
  if (winner && winner.player === "cross") {
    return 1;
  }

  if (winner && winner.player === "circle") {
    return -1;
  }

  return 0;
}

function minimax(board, currentPlayer) {
  const winner = findWinner(board);
  if (winner || board.every(Boolean)) {
    return evaluateBoard(board);
  }

  const moves = getAvailableMoves(board);

  if (currentPlayer === "cross") {
    let bestScore = -Infinity;
    for (const move of moves) {
      const nextBoard = board.slice();
      nextBoard[move] = currentPlayer;
      bestScore = Math.max(bestScore, minimax(nextBoard, "circle"));
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const move of moves) {
    const nextBoard = board.slice();
    nextBoard[move] = currentPlayer;
    bestScore = Math.min(bestScore, minimax(nextBoard, "cross"));
  }

  return bestScore;
}

function getBestAiMove(board) {
  const moves = getAvailableMoves(board);
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    const nextBoard = board.slice();
    nextBoard[move] = "cross";
    const score = minimax(nextBoard, "circle");

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

export function createTicTacToeGame({
  boardElement,
  btnPvp,
  btnCpu,
  btnRestart,
  turnText,
  circleOwnerText,
  crossOwnerText,
  message
}) {
  let board = [];
  let currentPlayer = "circle";
  let gameOver = false;
  let winningLine = [];
  let mode = "pvp";
  let aiTimeoutId = null;
  let aiThinking = false;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function clearAiTimeout() {
    if (aiTimeoutId) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
    aiThinking = false;
  }

  function updateModeButtons() {
    btnPvp.classList.toggle("active", mode === "pvp");
    btnCpu.classList.toggle("active", mode === "cpu");
  }

  function getOwnerLabel(player) {
    if (mode === "cpu") {
      return player === "circle"
        ? t("tictactoe.owner.playerCircle")
        : t("tictactoe.owner.computerCross");
    }

    return player === "circle"
      ? t("tictactoe.owner.player1Circle")
      : t("tictactoe.owner.player2Cross");
  }

  function getTurnLabel(player) {
    if (mode === "cpu" && player === "cross") {
      return t("tictactoe.turn.computer");
    }

    return getOwnerLabel(player);
  }

  function updateOwners() {
    circleOwnerText.textContent = getOwnerLabel("circle");
    crossOwnerText.textContent = getOwnerLabel("cross");
  }

  function updateTurnText() {
    turnText.textContent = gameOver ? t("common.gameOver") : getTurnLabel(currentPlayer);
  }

  function renderMessage() {
    switch (messageState.type) {
      case "thinking":
        message.textContent = t("tictactoe.message.aiThinking");
        return;
      case "win":
        if (mode === "cpu") {
          message.textContent =
            messageState.winner === "circle"
              ? t("tictactoe.message.playerWin")
              : t("tictactoe.message.computerWin");
          return;
        }

        message.textContent =
          messageState.winner === "circle"
            ? t("tictactoe.message.player1Win")
            : t("tictactoe.message.player2Win");
        return;
      case "draw":
        message.textContent = t("tictactoe.message.draw");
        return;
      case "turn":
        message.textContent = t("tictactoe.message.turn", {
          player: getTurnLabel(currentPlayer)
        });
        return;
      case "start":
      default:
        message.textContent =
          mode === "cpu" ? t("tictactoe.message.cpuStart") : t("tictactoe.message.playerStart");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const winningSet = new Set(winningLine);

    boardElement.innerHTML = "";
    board.forEach(function (cellValue, index) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "tictactoe-cell";
      cell.dataset.index = String(index);
      cell.disabled = gameOver || aiThinking || Boolean(cellValue);

      if (winningSet.has(index)) {
        cell.classList.add("winner");
      }

      if (cellValue) {
        cell.classList.add(cellValue);
        cell.textContent = PLAYER_SYMBOLS[cellValue];
      }

      fragment.appendChild(cell);
    });

    boardElement.appendChild(fragment);
    updateModeButtons();
    updateOwners();
    updateTurnText();
  }

  function finishTurn() {
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function applyMove(index) {
    board[index] = currentPlayer;

    const winner = findWinner(board);
    if (winner) {
      gameOver = true;
      winningLine = winner.line;
      messageState = { type: "win", winner: winner.player };
      finishTurn();
      return;
    }

    if (board.every(Boolean)) {
      gameOver = true;
      winningLine = [];
      messageState = { type: "draw" };
      finishTurn();
      return;
    }

    currentPlayer = getOpponent(currentPlayer);
    messageState = { type: "turn" };
    finishTurn();

    if (mode === "cpu" && currentPlayer === "cross" && !gameOver) {
      scheduleAiMove();
    }
  }

  function scheduleAiMove() {
    clearAiTimeout();
    aiThinking = true;
    messageState = { type: "thinking" };
    render();
    renderMessage();

    aiTimeoutId = window.setTimeout(function () {
      aiThinking = false;
      aiTimeoutId = null;

      if (gameOver || mode !== "cpu" || currentPlayer !== "cross") {
        render();
        renderMessage();
        return;
      }

      const move = getBestAiMove(board);
      if (move !== undefined) {
        applyMove(move);
      }
    }, 260);
  }

  function startGame() {
    clearAiTimeout();
    board = Array(9).fill("");
    currentPlayer = "circle";
    gameOver = false;
    winningLine = [];
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".tictactoe-cell");
    if (!cell || gameOver || aiThinking) {
      return;
    }

    if (mode === "cpu" && currentPlayer === "cross") {
      return;
    }

    const index = Number(cell.dataset.index);
    if (board[index]) {
      return;
    }

    applyMove(index);
  }

  function leave() {
    clearAiTimeout();
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnPvp.addEventListener("click", function (event) {
    event.currentTarget.blur();
    mode = "pvp";
    startGame();
  });
  btnCpu.addEventListener("click", function (event) {
    event.currentTarget.blur();
    mode = "cpu";
    startGame();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame,
    leave,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
