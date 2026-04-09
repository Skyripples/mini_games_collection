import { t } from "../core/i18n.js";

const FLIP_ANIMATION_DURATION = 280;

export function createReversiGame({
  boardElement,
  btnPvp,
  btnCpu,
  btnAssist,
  btnRestart,
  message,
  turnText,
  blackCountText,
  whiteCountText
}) {
  const size = 8;
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ];

  let board = [];
  let currentPlayer = "black";
  let gameOver = false;
  let mode = "pvp";
  let messageState = { type: "start" };
  let animatedFlipKeys = new Set();
  let flipAnimationTimeoutId = null;
  let inputLocked = false;
  let showHints = true;

  boardElement.tabIndex = 0;

  function getPlayerLabel(player) {
    return player === "black" ? t("players.blackStone") : t("players.whiteStone");
  }

  function getOpponent(player) {
    return player === "black" ? "white" : "black";
  }

  function keyForCell(row, col) {
    return `${row},${col}`;
  }

  function clearFlipAnimation() {
    if (flipAnimationTimeoutId) {
      clearTimeout(flipAnimationTimeoutId);
      flipAnimationTimeoutId = null;
    }

    animatedFlipKeys = new Set();
    inputLocked = false;
  }

  function startFlipAnimation(flips) {
    clearFlipAnimation();

    if (flips.length === 0) {
      render();
      renderMessage();
      return;
    }

    inputLocked = true;
    animatedFlipKeys = new Set(
      flips.map(function ([row, col]) {
        return keyForCell(row, col);
      })
    );
    render();
    renderMessage();

    flipAnimationTimeoutId = window.setTimeout(function () {
      clearFlipAnimation();
      render();
      renderMessage();
    }, FLIP_ANIMATION_DURATION);
  }

  function updateModeButtons() {
    btnPvp.classList.toggle("active", mode === "pvp");
    btnCpu.classList.toggle("active", mode === "cpu");
    btnAssist.classList.toggle("active", showHints);
  }

  function countPieces(player) {
    return board.flat().filter(function (cell) {
      return cell === player;
    }).length;
  }

  function updateStats() {
    turnText.textContent = gameOver ? t("common.gameOver") : getPlayerLabel(currentPlayer);
    blackCountText.textContent = String(countPieces("black"));
    whiteCountText.textContent = String(countPieces("white"));
  }

  function renderMessage() {
    const blackCount = countPieces("black");
    const whiteCount = countPieces("white");

    switch (messageState.type) {
      case "cpuUnavailable":
        message.textContent = t("reversi.message.cpuUnavailable");
        return;
      case "tie":
        message.textContent = t("reversi.message.tie", { count: blackCount });
        return;
      case "blackWin":
        message.textContent = t("reversi.message.blackWin", {
          black: blackCount,
          white: whiteCount
        });
        return;
      case "whiteWin":
        message.textContent = t("reversi.message.whiteWin", {
          white: whiteCount,
          black: blackCount
        });
        return;
      case "invalid":
        message.textContent = t("reversi.message.invalid");
        return;
      case "skip":
        message.textContent = t("reversi.message.skip", {
          player: getPlayerLabel(messageState.player),
          nextPlayer: getPlayerLabel(currentPlayer)
        });
        return;
      case "turn":
        message.textContent = t("reversi.message.turn", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "start":
      default:
        message.textContent =
          mode === "cpu" ? t("reversi.message.cpuUnavailable") : t("reversi.message.start");
    }
  }

  function createInitialBoard() {
    board = Array.from({ length: size }, function () {
      return Array(size).fill("");
    });
    board[3][3] = "white";
    board[3][4] = "black";
    board[4][3] = "black";
    board[4][4] = "white";
  }

  function collectFlips(row, col, player) {
    const flips = [];

    if (board[row][col]) {
      return flips;
    }

    directions.forEach(function ([rowStep, colStep]) {
      const line = [];
      let nextRow = row + rowStep;
      let nextCol = col + colStep;

      while (
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        board[nextRow][nextCol] === getOpponent(player)
      ) {
        line.push([nextRow, nextCol]);
        nextRow += rowStep;
        nextCol += colStep;
      }

      if (
        line.length > 0 &&
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        board[nextRow][nextCol] === player
      ) {
        flips.push(...line);
      }
    });

    return flips;
  }

  function getValidMoves(player) {
    const moves = [];

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const flips = collectFlips(row, col, player);
        if (flips.length > 0) {
          moves.push({ row, col, flips });
        }
      }
    }

    return moves;
  }

  function finishGame() {
    const blackCount = countPieces("black");
    const whiteCount = countPieces("white");
    gameOver = true;

    if (blackCount === whiteCount) {
      messageState = { type: "tie" };
    } else if (blackCount > whiteCount) {
      messageState = { type: "blackWin" };
    } else {
      messageState = { type: "whiteWin" };
    }

    render();
    renderMessage();
  }

  function createDisc(value, animate) {
    if (!animate) {
      const disc = document.createElement("div");
      disc.className = `reversi-disc ${value}`;
      return disc;
    }

    const disc = document.createElement("div");
    const front = document.createElement("div");
    const back = document.createElement("div");

    disc.className = "reversi-disc flipping";
    front.className = `reversi-disc-face ${getOpponent(value)} front`;
    back.className = `reversi-disc-face ${value} back`;
    disc.appendChild(front);
    disc.appendChild(back);

    return disc;
  }

  function render() {
    const validMoves =
      !gameOver && mode === "pvp" && !inputLocked ? getValidMoves(currentPlayer) : [];
    const validSet = new Set(
      validMoves.map(function ({ row, col }) {
        return keyForCell(row, col);
      })
    );
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = document.createElement("div");
        const value = board[row][col];
        const cellKey = keyForCell(row, col);

        cell.className = "reversi-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (showHints && validSet.has(cellKey)) {
          cell.classList.add("valid");
        }

        if (value) {
          cell.appendChild(createDisc(value, animatedFlipKeys.has(cellKey)));
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateModeButtons();
    updateStats();
  }

  function startGame() {
    clearFlipAnimation();
    createInitialBoard();
    currentPlayer = "black";
    gameOver = false;
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".reversi-cell");
    if (!cell) {
      return;
    }

    if (mode === "cpu") {
      messageState = { type: "cpuUnavailable" };
      renderMessage();
      return;
    }

    if (gameOver || inputLocked) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const flips = collectFlips(row, col, currentPlayer);

    if (flips.length === 0) {
      messageState = { type: "invalid" };
      renderMessage();
      return;
    }

    board[row][col] = currentPlayer;
    flips.forEach(function ([flipRow, flipCol]) {
      board[flipRow][flipCol] = currentPlayer;
    });

    const opponent = getOpponent(currentPlayer);
    const opponentMoves = getValidMoves(opponent);

    if (opponentMoves.length > 0) {
      currentPlayer = opponent;
      messageState = { type: "turn" };
      startFlipAnimation(flips);
      return;
    }

    const currentMoves = getValidMoves(currentPlayer);
    if (currentMoves.length > 0) {
      messageState = { type: "skip", player: opponent };
      startFlipAnimation(flips);
      return;
    }

    startFlipAnimation(flips);
    finishGame();
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
  btnAssist.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showHints = !showHints;
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame,
    leave: clearFlipAnimation,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
