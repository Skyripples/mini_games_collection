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
  ].map(([row, col]) => `${row},${col}`)
);

function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function serializeBoard(board) {
  return board
    .map((row) =>
      row
        .map((cell) => {
          if (cell === "black") {
            return "b";
          }
          if (cell === "white") {
            return "w";
          }
          return ".";
        })
        .join("")
    )
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
  ].filter(([nextRow, nextCol]) => isInsideBoard(nextRow, nextCol));
}

function getPlayerLabel(player) {
  return player === "black" ? "黑棋" : "白棋";
}

function getOpponent(player) {
  return player === "black" ? "white" : "black";
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

    getNeighbors(row, col).forEach(([nextRow, nextCol]) => {
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
  stones.forEach(({ row, col }) => {
    board[row][col] = null;
  });
}

function countBoardStones(board) {
  const counts = { black: 0, white: 0 };

  board.forEach((row) => {
    row.forEach((cell) => {
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

        getNeighbors(currentRow, currentCol).forEach(([nextRow, nextCol]) => {
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
    stones,
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

  boardElement.tabIndex = 0;

  function updateStats() {
    turnText.textContent = gameOver ? "對局結束" : getPlayerLabel(currentPlayer);
    blackCapturesText.textContent = String(captures.black);
    whiteCapturesText.textContent = String(captures.white);
  }

  function render() {
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement("div");
        const value = board[row][col];
        const key = `${row},${col}`;

        cell.className = "go-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (STAR_POINTS.has(key)) {
          cell.classList.add("star-point");
        }

        if (lastMove && lastMove.row === row && lastMove.col === col) {
          cell.classList.add("last-move");
        }

        if (value) {
          const stone = document.createElement("div");
          stone.className = `go-stone ${value}`;
          cell.appendChild(stone);
        }

        fragment.appendChild(cell);
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
    render();
    message.textContent = "黑棋先手，點選交叉點落子。連續兩次虛手會結束對局。";
    boardElement.focus({ preventScroll: true });
  }

  function tryPlaceStone(row, col) {
    if (board[row][col] !== null) {
      message.textContent = "這裡已經有棋子了。";
      return;
    }

    const nextBoard = cloneBoard(board);
    const opponent = getOpponent(currentPlayer);
    const capturedKeys = new Set();
    const capturedStones = [];

    nextBoard[row][col] = currentPlayer;

    getNeighbors(row, col).forEach(([nextRow, nextCol]) => {
      if (nextBoard[nextRow][nextCol] !== opponent) {
        return;
      }

      const group = collectGroup(nextBoard, nextRow, nextCol);
      if (group.liberties.size > 0) {
        return;
      }

      group.stones.forEach((stone) => {
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
      message.textContent = "這一步是禁入點，會讓自己的棋群沒有氣。";
      return;
    }

    const nextSignature = serializeBoard(nextBoard);
    if (
      positionHistory.length >= 2 &&
      nextSignature === positionHistory[positionHistory.length - 2]
    ) {
      message.textContent = "這一步會形成打劫重複局面，請先在別處落子。";
      return;
    }

    board = nextBoard;
    captures[currentPlayer] += capturedStones.length;
    currentPlayer = opponent;
    consecutivePasses = 0;
    positionHistory.push(nextSignature);
    lastMove = { row, col };
    render();

    if (capturedStones.length > 0) {
      message.textContent = `${getPlayerLabel(opponent)}回合。剛剛提掉了 ${capturedStones.length} 子。`;
    } else {
      message.textContent = `${getPlayerLabel(opponent)}回合，請落子。`;
    }
  }

  function finishByPasses() {
    const score = computeAreaScore(board);
    const blackScore = formatScore(score.black);
    const whiteScore = formatScore(score.white);

    gameOver = true;
    render();

    if (score.black === score.white) {
      message.textContent =
        `雙方連續虛手，對局結束。採簡化地盤計分：黑 ${blackScore}，白 ${whiteScore}（含貼目 ${KOMI}），雙方平手。`;
    } else if (score.black > score.white) {
      message.textContent =
        `雙方連續虛手，對局結束。採簡化地盤計分：黑 ${blackScore}，白 ${whiteScore}（含貼目 ${KOMI}），黑棋獲勝。`;
    } else {
      message.textContent =
        `雙方連續虛手，對局結束。採簡化地盤計分：黑 ${blackScore}，白 ${whiteScore}（含貼目 ${KOMI}），白棋獲勝。`;
    }
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

    render();
    message.textContent = `${getPlayerLabel(passingPlayer)}選擇虛手，輪到${getPlayerLabel(currentPlayer)}。`;
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".go-cell");
    if (!cell) {
      return;
    }

    if (gameOver) {
      message.textContent = "這局已經結束了，請重新開始。";
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    tryPlaceStone(row, col);
    boardElement.focus({ preventScroll: true });
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnPass.addEventListener("click", (event) => {
    event.currentTarget.blur();
    handlePass();
    boardElement.focus({ preventScroll: true });
  });
  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    resetGame();
  });

  return {
    enter: resetGame
  };
}
