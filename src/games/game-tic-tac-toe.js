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

const PLAYER_LABELS = {
  circle: "圈圈",
  cross: "叉叉"
};

const PLAYER_SYMBOLS = {
  circle: "○",
  cross: "×"
};

function getOpponent(player) {
  return player === "circle" ? "cross" : "circle";
}

export function createTicTacToeGame({
  boardElement,
  btnRestart,
  turnText,
  message
}) {
  let board = [];
  let currentPlayer = "circle";
  let gameOver = false;
  let winningLine = [];

  boardElement.tabIndex = 0;

  function updateTurnText() {
    turnText.textContent = gameOver ? "對局結束" : PLAYER_LABELS[currentPlayer];
  }

  function getWinner() {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], line };
      }
    }

    return null;
  }

  function render() {
    const fragment = document.createDocumentFragment();
    const winningSet = new Set(winningLine);

    boardElement.innerHTML = "";
    board.forEach((cellValue, index) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "tictactoe-cell";
      cell.dataset.index = String(index);
      cell.disabled = gameOver || Boolean(cellValue);

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
    updateTurnText();
  }

  function startGame() {
    board = Array(9).fill("");
    currentPlayer = "circle";
    gameOver = false;
    winningLine = [];
    render();
    message.textContent = "圈圈先手，請落子。";
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".tictactoe-cell");
    if (!cell || gameOver) {
      return;
    }

    const index = Number(cell.dataset.index);
    if (board[index]) {
      return;
    }

    board[index] = currentPlayer;

    const winner = getWinner();
    if (winner) {
      gameOver = true;
      winningLine = winner.line;
      render();
      message.textContent = `${PLAYER_LABELS[winner.player]}獲勝！`;
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (board.every(Boolean)) {
      gameOver = true;
      render();
      message.textContent = "平手，棋盤已滿。";
      boardElement.focus({ preventScroll: true });
      return;
    }

    currentPlayer = getOpponent(currentPlayer);
    render();
    message.textContent = `${PLAYER_LABELS[currentPlayer]}回合，請落子。`;
    boardElement.focus({ preventScroll: true });
  }

  boardElement.addEventListener("click", handleBoardClick);
  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame
  };
}
