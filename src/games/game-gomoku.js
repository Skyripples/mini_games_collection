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

  function updateTurn() {
    turnText.textContent = getPlayerLabel(currentPlayer);
  }

  function createEmptyBoard() {
    board = Array.from({ length: size }, () => Array(size).fill(""));
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
    return directions.some(([rowStep, colStep]) => {
      const lineLength =
        1 +
        countDirection(row, col, rowStep, colStep) +
        countDirection(row, col, -rowStep, -colStep);
      return lineLength >= 5;
    });
  }

  function isBoardFull() {
    return board.every((row) => row.every((cell) => cell !== ""));
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
  }

  function startGame() {
    createEmptyBoard();
    currentPlayer = "black";
    gameOver = false;
    updateModeButtons();
    updateTurn();

    if (mode === "cpu") {
      message.textContent = "與電腦對戰尚未開放，請先使用與玩家對戰。";
    } else {
      message.textContent = "黑棋先手，請落子。";
    }

    render();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".gomoku-cell");
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
    if (board[row][col]) {
      return;
    }

    board[row][col] = currentPlayer;

    if (isWinningMove(row, col)) {
      gameOver = true;
      updateTurn();
      message.textContent = `${getPlayerLabel(currentPlayer)}獲勝！`;
      render();
      return;
    }

    if (isBoardFull()) {
      gameOver = true;
      message.textContent = "平手，棋盤已滿。";
      render();
      return;
    }

    currentPlayer = getOpponent(currentPlayer);
    updateTurn();
    message.textContent = `${getPlayerLabel(currentPlayer)}回合，請落子。`;
    render();
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
