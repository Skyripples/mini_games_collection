import { t } from "../core/i18n.js";

const ROW_COUNT = 6;
const COLUMN_COUNT = 7;
const DROP_ANIMATION_MS = 360;
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1]
];

export function createConnectFourGame({
  boardElement,
  btnPvp,
  btnCpu,
  btnRestart,
  message,
  turnText
}) {
  let board = [];
  let currentPlayer = "red";
  let gameOver = false;
  let mode = "pvp";
  let messageState = { type: "start" };
  let dropAnimation = null;
  let dropAnimationTimeoutId = null;

  boardElement.tabIndex = 0;

  function clearDropAnimation() {
    if (dropAnimationTimeoutId) {
      clearTimeout(dropAnimationTimeoutId);
      dropAnimationTimeoutId = null;
    }

    dropAnimation = null;
  }

  function getPlayerLabel(player) {
    return player === "red" ? t("players.redSide") : t("players.yellowSide");
  }

  function getOpponent(player) {
    return player === "red" ? "yellow" : "red";
  }

  function getBoardMetrics() {
    const styles = window.getComputedStyle(boardElement);
    const cellSize =
      Number.parseFloat(styles.getPropertyValue("--connectfour-cell-size")) || 70;
    const gap = Number.parseFloat(styles.getPropertyValue("--connectfour-gap")) || 8;

    return { cellSize, gap };
  }

  function getDropDistance(row) {
    const { cellSize, gap } = getBoardMetrics();
    return (row + 1) * (cellSize + gap);
  }

  function createEmptyBoard() {
    board = Array.from({ length: ROW_COUNT }, function () {
      return Array(COLUMN_COUNT).fill("");
    });
  }

  function getDropRow(col) {
    for (let row = ROW_COUNT - 1; row >= 0; row -= 1) {
      if (!board[row][col]) {
        return row;
      }
    }

    return -1;
  }

  function isBoardFull() {
    return board[0].every(Boolean);
  }

  function countDirection(row, col, rowStep, colStep) {
    const player = board[row][col];
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
      nextRow >= 0 &&
      nextRow < ROW_COUNT &&
      nextCol >= 0 &&
      nextCol < COLUMN_COUNT &&
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

      return lineLength >= 4;
    });
  }

  function updateModeButtons() {
    btnPvp.classList.toggle("active", mode === "pvp");
    btnCpu.classList.toggle("active", mode === "cpu");
  }

  function updateTurn() {
    turnText.textContent = gameOver ? t("common.gameOver") : getPlayerLabel(currentPlayer);
  }

  function renderMessage() {
    switch (messageState.type) {
      case "cpuUnavailable":
        message.textContent = t("connectfour.message.cpuUnavailable");
        return;
      case "columnFull":
        message.textContent = t("connectfour.message.columnFull");
        return;
      case "win":
        message.textContent = t("connectfour.message.win", {
          player: getPlayerLabel(messageState.player)
        });
        return;
      case "draw":
        message.textContent = t("connectfour.message.draw");
        return;
      case "turn":
        message.textContent = t("connectfour.message.turn", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "start":
      default:
        message.textContent =
          mode === "cpu"
            ? t("connectfour.message.cpuUnavailable")
            : t("connectfour.message.start");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const availableRows = Array.from({ length: COLUMN_COUNT }, function (_, col) {
      return getDropRow(col);
    });

    boardElement.innerHTML = "";
    boardElement.dataset.player = currentPlayer;

    for (let row = 0; row < ROW_COUNT; row += 1) {
      for (let col = 0; col < COLUMN_COUNT; col += 1) {
        const cell = document.createElement("button");
        const value = board[row][col];
        const isAnimatedDisc =
          dropAnimation &&
          dropAnimation.row === row &&
          dropAnimation.col === col &&
          dropAnimation.player === value;

        cell.type = "button";
        cell.className = "connectfour-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.disabled =
          gameOver ||
          mode === "cpu" ||
          availableRows[col] === -1 ||
          Boolean(dropAnimation);

        if (!value && availableRows[col] === row && !gameOver && mode === "pvp") {
          cell.classList.add("drop-target");
        }

        if (value) {
          const disc = document.createElement("div");
          disc.className = `connectfour-disc ${value}`;

          if (isAnimatedDisc) {
            disc.classList.add("is-dropping");
            disc.style.setProperty("--drop-distance", `${getDropDistance(row)}px`);
          }

          cell.appendChild(disc);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateModeButtons();
    updateTurn();
  }

  function startGame() {
    clearDropAnimation();
    createEmptyBoard();
    currentPlayer = "red";
    gameOver = false;
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleMove(col) {
    const row = getDropRow(col);

    if (row === -1) {
      messageState = { type: "columnFull" };
      renderMessage();
      return;
    }

    board[row][col] = currentPlayer;
    dropAnimation = {
      row: row,
      col: col,
      player: currentPlayer
    };

    if (isWinningMove(row, col)) {
      gameOver = true;
      messageState = { type: "win", player: currentPlayer };
      render();
      renderMessage();
      dropAnimationTimeoutId = window.setTimeout(function () {
        clearDropAnimation();
        render();
      }, DROP_ANIMATION_MS);
      return;
    }

    if (isBoardFull()) {
      gameOver = true;
      messageState = { type: "draw" };
      render();
      renderMessage();
      dropAnimationTimeoutId = window.setTimeout(function () {
        clearDropAnimation();
        render();
      }, DROP_ANIMATION_MS);
      return;
    }

    currentPlayer = getOpponent(currentPlayer);
    messageState = { type: "turn" };
    render();
    renderMessage();
    dropAnimationTimeoutId = window.setTimeout(function () {
      clearDropAnimation();
      render();
    }, DROP_ANIMATION_MS);
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".connectfour-cell");
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

    handleMove(Number(cell.dataset.col));
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
    leave: clearDropAnimation,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
