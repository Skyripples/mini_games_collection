import { t } from "../core/i18n.js";

const SIZE = 19;
const KOMI = 6.5;
const STAR_POINTS = new Set(
  [
    [3, 3],
    [3, 9],
    [3, 15],
    [9, 3],
    [9, 9],
    [9, 15],
    [15, 3],
    [15, 9],
    [15, 15]
  ].map(function ([row, col]) {
    return `${row},${col}`;
  })
);

function createEmptyBoard() {
  return Array.from({ length: SIZE }, function () {
    return Array(SIZE).fill(null);
  });
}

function cloneBoard(board) {
  return board.map(function (row) {
    return row.slice();
  });
}

function serializeBoard(board) {
  return board
    .map(function (row) {
      return row
        .map(function (cell) {
          if (cell === "black") {
            return "b";
          }
          if (cell === "white") {
            return "w";
          }
          return ".";
        })
        .join("");
    })
    .join("/");
}

function isInsideBoard(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function getNeighbors(row, col) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ].filter(function ([nextRow, nextCol]) {
    return isInsideBoard(nextRow, nextCol);
  });
}

function formatScore(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function collectGroup(board, startRow, startCol) {
  const color = board[startRow][startCol];
  const queue = [[startRow, startCol]];
  const visited = new Set([`${startRow},${startCol}`]);
  const stones = [];
  const liberties = new Set();

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    stones.push({ row, col });

    getNeighbors(row, col).forEach(function ([nextRow, nextCol]) {
      const value = board[nextRow][nextCol];
      const key = `${nextRow},${nextCol}`;

      if (value === null) {
        liberties.add(key);
        return;
      }

      if (value === color && !visited.has(key)) {
        visited.add(key);
        queue.push([nextRow, nextCol]);
      }
    });
  }

  return { stones, liberties };
}

function removeStones(board, stones) {
  stones.forEach(function ({ row, col }) {
    board[row][col] = null;
  });
}

function countBoardStones(board) {
  const counts = { black: 0, white: 0 };

  board.forEach(function (row) {
    row.forEach(function (cell) {
      if (cell === "black") {
        counts.black += 1;
      } else if (cell === "white") {
        counts.white += 1;
      }
    });
  });

  return counts;
}

function countTerritory(board) {
  const visited = new Set();
  const territory = { black: 0, white: 0 };

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const startKey = `${row},${col}`;
      if (board[row][col] !== null || visited.has(startKey)) {
        continue;
      }

      const queue = [[row, col]];
      const emptyRegion = [];
      const borderingColors = new Set();
      visited.add(startKey);

      while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift();
        emptyRegion.push([currentRow, currentCol]);

        getNeighbors(currentRow, currentCol).forEach(function ([nextRow, nextCol]) {
          const value = board[nextRow][nextCol];
          const key = `${nextRow},${nextCol}`;

          if (value === null) {
            if (!visited.has(key)) {
              visited.add(key);
              queue.push([nextRow, nextCol]);
            }
            return;
          }

          borderingColors.add(value);
        });
      }

      if (borderingColors.size === 1) {
        const owner = [...borderingColors][0];
        territory[owner] += emptyRegion.length;
      }
    }
  }

  return territory;
}

function computeAreaScore(board) {
  const stones = countBoardStones(board);
  const territory = countTerritory(board);

  return {
    black: stones.black + territory.black,
    white: stones.white + territory.white + KOMI,
    territory
  };
}

export function createGoGame({
  boardElement,
  btnPass,
  btnRestart,
  turnText,
  blackCapturesText,
  whiteCapturesText,
  message
}) {
  let board = [];
  let currentPlayer = "black";
  let captures = { black: 0, white: 0 };
  let consecutivePasses = 0;
  let gameOver = false;
  let positionHistory = [];
  let lastMove = null;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function getBoardMetrics() {
    const styles = window.getComputedStyle(boardElement);
    const gap = Number.parseFloat(styles.getPropertyValue("--go-gap")) || 30;
    const padding = Number.parseFloat(styles.getPropertyValue("--go-padding")) || 15;
    return { gap, padding };
  }

  function getPlayerLabel(player) {
    return player === "black" ? t("players.blackStone") : t("players.whiteStone");
  }

  function getOpponent(player) {
    return player === "black" ? "white" : "black";
  }

  function updateStats() {
    turnText.textContent = gameOver ? t("common.gameOver") : getPlayerLabel(currentPlayer);
    blackCapturesText.textContent = String(captures.black);
    whiteCapturesText.textContent = String(captures.white);
  }

  function renderMessage() {
    switch (messageState.type) {
      case "occupied":
        message.textContent = t("go.message.occupied");
        return;
      case "suicide":
        message.textContent = t("go.message.suicide");
        return;
      case "ko":
        message.textContent = t("go.message.ko");
        return;
      case "capture":
        message.textContent = t("go.message.capture", {
          player: getPlayerLabel(currentPlayer),
          count: messageState.count
        });
        return;
      case "pass":
        message.textContent = t("go.message.pass", {
          player: getPlayerLabel(messageState.player),
          nextPlayer: getPlayerLabel(currentPlayer)
        });
        return;
      case "draw":
        message.textContent = t("go.message.draw", {
          black: messageState.black,
          white: messageState.white
        });
        return;
      case "blackWin":
        message.textContent = t("go.message.blackWin", {
          black: messageState.black,
          white: messageState.white
        });
        return;
      case "whiteWin":
        message.textContent = t("go.message.whiteWin", {
          black: messageState.black,
          white: messageState.white
        });
        return;
      case "finished":
        message.textContent = t("go.message.finished");
        return;
      case "turn":
        message.textContent = t("go.message.turn", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "start":
      default:
        message.textContent = t("go.message.start");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const { gap, padding } = getBoardMetrics();
    const boardSize = padding * 2 + gap * (SIZE - 1);
    const lineLength = gap * (SIZE - 1);

    boardElement.innerHTML = "";
    boardElement.style.width = `${boardSize}px`;
    boardElement.style.height = `${boardSize}px`;

    for (let index = 0; index < SIZE; index += 1) {
      const horizontalLine = document.createElement("div");
      horizontalLine.className = "go-grid-line go-grid-line--horizontal";
      horizontalLine.style.left = `${padding}px`;
      horizontalLine.style.top = `${padding + index * gap}px`;
      horizontalLine.style.width = `${lineLength}px`;
      fragment.appendChild(horizontalLine);

      const verticalLine = document.createElement("div");
      verticalLine.className = "go-grid-line go-grid-line--vertical";
      verticalLine.style.left = `${padding + index * gap}px`;
      verticalLine.style.top = `${padding}px`;
      verticalLine.style.height = `${lineLength}px`;
      fragment.appendChild(verticalLine);
    }

    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const point = document.createElement("button");
        const value = board[row][col];
        const key = `${row},${col}`;

        point.type = "button";
        point.className = "go-point";
        point.dataset.row = String(row);
        point.dataset.col = String(col);
        point.style.left = `${padding + col * gap}px`;
        point.style.top = `${padding + row * gap}px`;

        if (STAR_POINTS.has(key)) {
          point.classList.add("star-point");
        }

        if (lastMove && lastMove.row === row && lastMove.col === col) {
          point.classList.add("last-move");
        }

        if (value) {
          const stone = document.createElement("div");
          stone.className = `go-stone ${value}`;
          point.appendChild(stone);
        }

        fragment.appendChild(point);
      }
    }

    boardElement.appendChild(fragment);
    updateStats();
  }

  function resetGame() {
    board = createEmptyBoard();
    currentPlayer = "black";
    captures = { black: 0, white: 0 };
    consecutivePasses = 0;
    gameOver = false;
    positionHistory = [serializeBoard(board)];
    lastMove = null;
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function tryPlaceStone(row, col) {
    if (board[row][col] !== null) {
      messageState = { type: "occupied" };
      renderMessage();
      return;
    }

    const nextBoard = cloneBoard(board);
    const opponent = getOpponent(currentPlayer);
    const capturedKeys = new Set();
    const capturedStones = [];

    nextBoard[row][col] = currentPlayer;

    getNeighbors(row, col).forEach(function ([nextRow, nextCol]) {
      if (nextBoard[nextRow][nextCol] !== opponent) {
        return;
      }

      const group = collectGroup(nextBoard, nextRow, nextCol);
      if (group.liberties.size > 0) {
        return;
      }

      group.stones.forEach(function (stone) {
        const key = `${stone.row},${stone.col}`;
        if (!capturedKeys.has(key)) {
          capturedKeys.add(key);
          capturedStones.push(stone);
        }
      });
    });

    if (capturedStones.length > 0) {
      removeStones(nextBoard, capturedStones);
    }

    const ownGroup = collectGroup(nextBoard, row, col);
    if (ownGroup.liberties.size === 0) {
      messageState = { type: "suicide" };
      renderMessage();
      return;
    }

    const nextSignature = serializeBoard(nextBoard);
    if (
      positionHistory.length >= 2 &&
      nextSignature === positionHistory[positionHistory.length - 2]
    ) {
      messageState = { type: "ko" };
      renderMessage();
      return;
    }

    board = nextBoard;
    captures[currentPlayer] += capturedStones.length;
    currentPlayer = opponent;
    consecutivePasses = 0;
    positionHistory.push(nextSignature);
    lastMove = { row, col };

    if (capturedStones.length > 0) {
      messageState = { type: "capture", count: capturedStones.length };
    } else {
      messageState = { type: "turn" };
    }

    render();
    renderMessage();
  }

  function finishByPasses() {
    const score = computeAreaScore(board);
    const blackScore = formatScore(score.black);
    const whiteScore = formatScore(score.white);

    gameOver = true;
    if (score.black === score.white) {
      messageState = { type: "draw", black: blackScore, white: whiteScore };
    } else if (score.black > score.white) {
      messageState = { type: "blackWin", black: blackScore, white: whiteScore };
    } else {
      messageState = { type: "whiteWin", black: blackScore, white: whiteScore };
    }

    render();
    renderMessage();
  }

  function handlePass() {
    if (gameOver) {
      return;
    }

    const passingPlayer = currentPlayer;
    consecutivePasses += 1;
    currentPlayer = getOpponent(currentPlayer);
    positionHistory.push(serializeBoard(board));
    lastMove = null;

    if (consecutivePasses >= 2) {
      finishByPasses();
      return;
    }

    messageState = { type: "pass", player: passingPlayer };
    render();
    renderMessage();
  }

  function handleBoardClick(event) {
    const point = event.target.closest(".go-point");
    if (!point) {
      return;
    }

    if (gameOver) {
      messageState = { type: "finished" };
      renderMessage();
      return;
    }

    const row = Number(point.dataset.row);
    const col = Number(point.dataset.col);
    tryPlaceStone(row, col);
    boardElement.focus({ preventScroll: true });
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnPass.addEventListener("click", function (event) {
    event.currentTarget.blur();
    handlePass();
    boardElement.focus({ preventScroll: true });
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetGame();
  });

  return {
    enter: resetGame,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
