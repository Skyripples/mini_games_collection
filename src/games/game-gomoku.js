import { t } from "../core/i18n.js";

const BOARD_SIZE = 15;
const STAR_POINTS = new Set([
  "3,3",
  "3,7",
  "3,11",
  "7,3",
  "7,7",
  "7,11",
  "11,3",
  "11,7",
  "11,11"
]);

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

export function createGomokuGame({
  boardElement,
  btnPvp,
  btnCpu,
  btnRestart,
  message,
  turnText
}) {
  let board = [];
  let currentPlayer = "black";
  let gameOver = false;
  let mode = "pvp";
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function getBoardMetrics() {
    const styles = window.getComputedStyle(boardElement);
    const gap = Number.parseFloat(styles.getPropertyValue("--gomoku-gap")) || 32;
    const padding = Number.parseFloat(styles.getPropertyValue("--gomoku-padding")) || 16;
    return { gap, padding };
  }

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
    board = Array.from({ length: BOARD_SIZE }, function () {
      return Array(BOARD_SIZE).fill("");
    });
  }

  function countDirection(row, col, rowStep, colStep) {
    let count = 0;
    const player = board[row][col];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
      nextRow >= 0 &&
      nextRow < BOARD_SIZE &&
      nextCol >= 0 &&
      nextCol < BOARD_SIZE &&
      board[nextRow][nextCol] === player
    ) {
      count += 1;
      nextRow += rowStep;
      nextCol += colStep;
    }

    return count;
  }

  function isWinningMove(row, col) {
    return DIRECTIONS.some(function ([rowStep, colStep]) {
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
    const { gap, padding } = getBoardMetrics();
    const boardSize = padding * 2 + gap * (BOARD_SIZE - 1);
    const lineLength = gap * (BOARD_SIZE - 1);

    boardElement.innerHTML = "";
    boardElement.style.width = `${boardSize}px`;
    boardElement.style.height = `${boardSize}px`;

    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const horizontalLine = document.createElement("div");
      horizontalLine.className = "gomoku-grid-line gomoku-grid-line--horizontal";
      horizontalLine.style.left = `${padding}px`;
      horizontalLine.style.top = `${padding + index * gap}px`;
      horizontalLine.style.width = `${lineLength}px`;
      fragment.appendChild(horizontalLine);

      const verticalLine = document.createElement("div");
      verticalLine.className = "gomoku-grid-line gomoku-grid-line--vertical";
      verticalLine.style.left = `${padding + index * gap}px`;
      verticalLine.style.top = `${padding}px`;
      verticalLine.style.height = `${lineLength}px`;
      fragment.appendChild(verticalLine);
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const point = document.createElement("button");
        const value = board[row][col];

        point.type = "button";
        point.className = "gomoku-point";
        point.dataset.row = String(row);
        point.dataset.col = String(col);
        point.style.left = `${padding + col * gap}px`;
        point.style.top = `${padding + row * gap}px`;

        if (STAR_POINTS.has(`${row},${col}`)) {
          point.classList.add("star-point");
        }

        if (value) {
          const stone = document.createElement("div");
          stone.className = `gomoku-stone ${value}`;
          point.appendChild(stone);
        } else if (!gameOver && mode === "pvp") {
          point.classList.add("clickable");
        }

        fragment.appendChild(point);
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
    const point = event.target.closest(".gomoku-point");
    if (!point) {
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

    const row = Number(point.dataset.row);
    const col = Number(point.dataset.col);
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
