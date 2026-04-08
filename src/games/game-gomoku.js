import { t } from "../core/i18n.js";

export function createGomokuGame({
  boardElement,
  btnPvp,
  btnCpu,
  btnRestart,
  message,
  turnText
}) {
  const size = 15;
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ];

  let board = [];
  let currentPlayer = "black";
  let gameOver = false;
  let mode = "pvp";
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function getPlayerLabel(player) {
    return player === "black" ? t("players.blackStone") : t("players.whiteStone");
  }

  function getOpponent(player) {
    return player === "black" ? "white" : "black";
  }

  function updateModeButtons() {
    btnPvp.classList.toggle("active", mode === "pvp");
    btnCpu.classList.toggle("active", mode === "cpu");
  }

  function updateTurn() {
    turnText.textContent = getPlayerLabel(currentPlayer);
  }

  function renderMessage() {
    switch (messageState.type) {
      case "cpuUnavailable":
        message.textContent = t("gomoku.message.cpuUnavailable");
        return;
      case "win":
        message.textContent = t("gomoku.message.win", {
          player: getPlayerLabel(messageState.player)
        });
        return;
      case "draw":
        message.textContent = t("gomoku.message.draw");
        return;
      case "turn":
        message.textContent = t("gomoku.message.turn", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "start":
      default:
        message.textContent =
          mode === "cpu" ? t("gomoku.message.cpuUnavailable") : t("gomoku.message.start");
    }
  }

  function createEmptyBoard() {
    board = Array.from({ length: size }, function () {
      return Array(size).fill("");
    });
  }

  function countDirection(row, col, rowStep, colStep) {
    let count = 0;
    const player = board[row][col];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
      nextRow >= 0 &&
      nextRow < size &&
      nextCol >= 0 &&
      nextCol < size &&
      board[nextRow][nextCol] === player
    ) {
      count += 1;
      nextRow += rowStep;
      nextCol += colStep;
    }

    return count;
  }

  function isWinningMove(row, col) {
    return directions.some(function ([rowStep, colStep]) {
      const lineLength =
        1 +
        countDirection(row, col, rowStep, colStep) +
        countDirection(row, col, -rowStep, -colStep);
      return lineLength >= 5;
    });
  }

  function isBoardFull() {
    return board.every(function (row) {
      return row.every(function (cell) {
        return cell !== "";
      });
    });
  }

  function render() {
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = document.createElement("div");
        const value = board[row][col];

        cell.className = "gomoku-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (value) {
          const stone = document.createElement("div");
          stone.className = `gomoku-stone ${value}`;
          cell.appendChild(stone);
        } else if (!gameOver && mode === "pvp") {
          cell.classList.add("clickable");
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateModeButtons();
    updateTurn();
  }

  function startGame() {
    createEmptyBoard();
    currentPlayer = "black";
    gameOver = false;
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".gomoku-cell");
    if (!cell) {
      return;
    }

    if (mode === "cpu") {
      messageState = { type: "cpuUnavailable" };
      renderMessage();
      return;
    }

    if (gameOver) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (board[row][col]) {
      return;
    }

    board[row][col] = currentPlayer;

    if (isWinningMove(row, col)) {
      gameOver = true;
      messageState = { type: "win", player: currentPlayer };
      render();
      renderMessage();
      return;
    }

    if (isBoardFull()) {
      gameOver = true;
      messageState = { type: "draw" };
      render();
      renderMessage();
      return;
    }

    currentPlayer = getOpponent(currentPlayer);
    messageState = { type: "turn" };
    render();
    renderMessage();
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
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
