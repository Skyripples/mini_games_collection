export function createReversiGame({
  boardElement,
  btnPvp,
  btnCpu,
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

  boardElement.tabIndex = 0;

  function getPlayerLabel(player) {
    return player === "black" ? "黑棋" : "白棋";
  }

  function getOpponent(player) {
    return player === "black" ? "white" : "black";
  }

  function updateModeButtons() {
    btnPvp.classList.toggle("active", mode === "pvp");
    btnCpu.classList.toggle("active", mode === "cpu");
  }

  function countPieces(player) {
    return board.flat().filter((cell) => cell === player).length;
  }

  function updateStats() {
    turnText.textContent = getPlayerLabel(currentPlayer);
    blackCountText.textContent = String(countPieces("black"));
    whiteCountText.textContent = String(countPieces("white"));
  }

  function createInitialBoard() {
    board = Array.from({ length: size }, () => Array(size).fill(""));
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

    directions.forEach(([rowStep, colStep]) => {
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
    updateStats();

    if (blackCount === whiteCount) {
      message.textContent = `平手！雙方都是 ${blackCount} 子。`;
    } else if (blackCount > whiteCount) {
      message.textContent = `黑棋獲勝！ ${blackCount} 比 ${whiteCount}`;
    } else {
      message.textContent = `白棋獲勝！ ${whiteCount} 比 ${blackCount}`;
    }
  }

  function render() {
    const validMoves =
      !gameOver && mode === "pvp" ? getValidMoves(currentPlayer) : [];
    const validSet = new Set(validMoves.map(({ row, col }) => `${row},${col}`));
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const cell = document.createElement("div");
        const value = board[row][col];

        cell.className = "reversi-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        if (validSet.has(`${row},${col}`)) {
          cell.classList.add("valid");
        }

        if (value) {
          const disc = document.createElement("div");
          disc.className = `reversi-disc ${value}`;
          cell.appendChild(disc);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateStats();
  }

  function startGame() {
    createInitialBoard();
    currentPlayer = "black";
    gameOver = false;
    updateModeButtons();
    updateStats();

    if (mode === "cpu") {
      message.textContent = "與電腦對戰尚未開放，請先使用與玩家對戰。";
    } else {
      message.textContent = "黑棋先手，請在提示點位落子。";
    }

    render();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".reversi-cell");
    if (!cell) {
      return;
    }

    if (mode === "cpu") {
      message.textContent = "與電腦對戰尚未開放，請先使用與玩家對戰。";
      return;
    }

    if (gameOver) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const flips = collectFlips(row, col, currentPlayer);

    if (flips.length === 0) {
      message.textContent = "這裡不能下，請選擇有提示的格子。";
      return;
    }

    board[row][col] = currentPlayer;
    flips.forEach(([flipRow, flipCol]) => {
      board[flipRow][flipCol] = currentPlayer;
    });

    const opponent = getOpponent(currentPlayer);
    const opponentMoves = getValidMoves(opponent);

    if (opponentMoves.length > 0) {
      currentPlayer = opponent;
      render();
      message.textContent = `${getPlayerLabel(currentPlayer)}回合。`;
      return;
    }

    const currentMoves = getValidMoves(currentPlayer);
    if (currentMoves.length > 0) {
      render();
      message.textContent = `${getPlayerLabel(opponent)}無子可下，輪到${getPlayerLabel(currentPlayer)}繼續。`;
      return;
    }

    render();
    finishGame();
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnPvp.addEventListener("click", (event) => {
    event.currentTarget.blur();
    mode = "pvp";
    startGame();
  });
  btnCpu.addEventListener("click", (event) => {
    event.currentTarget.blur();
    mode = "cpu";
    startGame();
  });
  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame
  };
}
