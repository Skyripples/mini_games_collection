const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");

const game1A2B = document.getElementById("game-1a2b");
const gameSnake = document.getElementById("game-snake");
const gameMinesweeper = document.getElementById("game-minesweeper");

const btn1A2B = document.getElementById("btn-1a2b");
const btnSnake = document.getElementById("btn-snake");
const btnMinesweeper = document.getElementById("btn-minesweeper");
const btnBack = document.getElementById("btn-back");

function hideAllGames() {
  game1A2B.classList.add("hidden");
  gameSnake.classList.add("hidden");
  gameMinesweeper.classList.add("hidden");
}

function showMenu() {
  menuScreen.classList.add("active");
  gameScreen.classList.remove("active");
  hideAllGames();
  stopSnake();
}

function showGamePanel(panel) {
  menuScreen.classList.remove("active");
  gameScreen.classList.add("active");
  hideAllGames();
  panel.classList.remove("hidden");
}

const btnGuess = document.getElementById("btn-guess");
const btnRestart1A2B = document.getElementById("btn-restart-1a2b");
const guessInput = document.getElementById("guess-input");
const message = document.getElementById("message");
const guessCountText = document.getElementById("guess-count");
const historyList = document.getElementById("history-list");

let answer = "";
let guessCount = 0;

function generateAnswer() {
  const digits = [];

  while (digits.length < 4) {
    const nextDigit = Math.floor(Math.random() * 10).toString();
    if (!digits.includes(nextDigit)) {
      digits.push(nextDigit);
    }
  }

  return digits.join("");
}

function reset1A2B() {
  answer = generateAnswer();
  guessCount = 0;
  guessCountText.textContent = "0";
  historyList.innerHTML = "";
  message.textContent = "遊戲開始！";
  guessInput.value = "";
  guessInput.disabled = false;
  btnGuess.disabled = false;
  guessInput.focus();
}

function isValidGuess(guess) {
  if (!/^\d{4}$/.test(guess)) {
    return false;
  }

  return new Set(guess).size === 4;
}

function checkGuess(guess, currentAnswer) {
  let aCount = 0;
  let bCount = 0;

  for (let index = 0; index < 4; index += 1) {
    if (guess[index] === currentAnswer[index]) {
      aCount += 1;
    } else if (currentAnswer.includes(guess[index])) {
      bCount += 1;
    }
  }

  return { aCount, bCount };
}

function addHistory(guess, result) {
  const item = document.createElement("li");
  item.textContent = `${guess} -> ${result.aCount}A${result.bCount}B`;
  historyList.prepend(item);
}

function handleGuess() {
  const guess = guessInput.value.trim();

  if (!isValidGuess(guess)) {
    message.textContent = "請輸入 4 個不重複的數字。";
    return;
  }

  guessCount += 1;
  guessCountText.textContent = String(guessCount);

  const result = checkGuess(guess, answer);
  addHistory(guess, result);

  if (result.aCount === 4) {
    message.textContent = `恭喜答對！你用了 ${guessCount} 次猜中答案 ${answer}。`;
    btnGuess.disabled = true;
    guessInput.disabled = true;
  } else {
    message.textContent = `${result.aCount}A${result.bCount}B`;
  }

  guessInput.value = "";
  if (!guessInput.disabled) {
    guessInput.focus();
  }
}

const snakeCanvas = document.getElementById("snake-canvas");
const snakeContext = snakeCanvas.getContext("2d");
const btnStartSnake = document.getElementById("btn-start-snake");
const snakeScoreText = document.getElementById("snake-score");
const snakeMessage = document.getElementById("snake-message");

const snakeGridSize = 20;
const snakeTileCount = snakeCanvas.width / snakeGridSize;

let snake = [];
let food = { x: 0, y: 0 };
let dx = 1;
let dy = 0;
let snakeScore = 0;
let snakeTimer = null;
let snakeRunning = false;

function initSnake() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  dx = 1;
  dy = 0;
  snakeScore = 0;
  snakeScoreText.textContent = "0";
  snakeMessage.textContent = "按方向鍵控制移動，吃到食物就會變長。";
  placeFood();
  drawSnakeGame();
}

function placeFood() {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * snakeTileCount),
      y: Math.floor(Math.random() * snakeTileCount)
    };

    const isOnSnake = snake.some((part) => part.x === candidate.x && part.y === candidate.y);
    if (!isOnSnake) {
      food = candidate;
      return;
    }
  }
}

function drawSnakeGame() {
  snakeContext.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeContext.fillStyle = "#fafafa";
  snakeContext.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeContext.fillStyle = "#e74c3c";
  snakeContext.fillRect(
    food.x * snakeGridSize,
    food.y * snakeGridSize,
    snakeGridSize,
    snakeGridSize
  );

  snakeContext.fillStyle = "#2d3436";
  snake.forEach((part) => {
    snakeContext.fillRect(
      part.x * snakeGridSize,
      part.y * snakeGridSize,
      snakeGridSize - 2,
      snakeGridSize - 2
    );
  });
}

function gameOverSnake() {
  stopSnake();
  snakeMessage.textContent = `遊戲結束，最終分數：${snakeScore}`;
}

function updateSnake() {
  const head = {
    x: snake[0].x + dx,
    y: snake[0].y + dy
  };
  const willEatFood = head.x === food.x && head.y === food.y;
  const snakeBody = willEatFood ? snake : snake.slice(0, -1);

  const hitsWall =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= snakeTileCount ||
    head.y >= snakeTileCount;

  if (hitsWall) {
    gameOverSnake();
    return;
  }

  const hitsSelf = snakeBody.some((part) => part.x === head.x && part.y === head.y);
  if (hitsSelf) {
    gameOverSnake();
    return;
  }

  snake.unshift(head);

  if (willEatFood) {
    snakeScore += 1;
    snakeScoreText.textContent = String(snakeScore);

    if (snake.length === snakeTileCount * snakeTileCount) {
      stopSnake();
      snakeMessage.textContent = `恭喜獲勝，你填滿了整個棋盤！分數：${snakeScore}`;
      drawSnakeGame();
      return;
    }

    placeFood();
  } else {
    snake.pop();
  }

  drawSnakeGame();
}

function stopSnake() {
  if (snakeTimer) {
    clearInterval(snakeTimer);
    snakeTimer = null;
  }

  snakeRunning = false;
}

function startSnake() {
  stopSnake();
  initSnake();
  snakeRunning = true;
  snakeTimer = window.setInterval(updateSnake, 150);
}

const minesweeperBoard = document.getElementById("minesweeper-board");
const btnRestartMinesweeper = document.getElementById("btn-restart-minesweeper");
const minesweeperMessage = document.getElementById("minesweeper-message");

const msRows = 8;
const msCols = 8;
const msMineCount = 10;

let msBoard = [];
let msGameOver = false;

function createEmptyBoard() {
  msBoard = [];

  for (let row = 0; row < msRows; row += 1) {
    const currentRow = [];
    for (let col = 0; col < msCols; col += 1) {
      currentRow.push({
        mine: false,
        revealed: false,
        flagged: false,
        count: 0
      });
    }
    msBoard.push(currentRow);
  }
}

function placeMines() {
  let placed = 0;

  while (placed < msMineCount) {
    const row = Math.floor(Math.random() * msRows);
    const col = Math.floor(Math.random() * msCols);

    if (!msBoard[row][col].mine) {
      msBoard[row][col].mine = true;
      placed += 1;
    }
  }
}

function countAdjacentMines() {
  for (let row = 0; row < msRows; row += 1) {
    for (let col = 0; col < msCols; col += 1) {
      if (msBoard[row][col].mine) {
        continue;
      }

      let count = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          const insideBoard =
            nextRow >= 0 &&
            nextRow < msRows &&
            nextCol >= 0 &&
            nextCol < msCols;

          if (insideBoard && msBoard[nextRow][nextCol].mine) {
            count += 1;
          }
        }
      }

      msBoard[row][col].count = count;
    }
  }
}

function revealAllMines() {
  for (let row = 0; row < msRows; row += 1) {
    for (let col = 0; col < msCols; col += 1) {
      if (msBoard[row][col].mine) {
        msBoard[row][col].revealed = true;
      }
    }
  }
}

function checkMinesweeperWin() {
  for (let row = 0; row < msRows; row += 1) {
    for (let col = 0; col < msCols; col += 1) {
      const cell = msBoard[row][col];
      if (!cell.mine && !cell.revealed) {
        return false;
      }
    }
  }

  return true;
}

function revealCell(row, col) {
  if (msGameOver) {
    return;
  }

  const cell = msBoard[row][col];
  if (cell.revealed || cell.flagged) {
    return;
  }

  cell.revealed = true;

  if (cell.mine) {
    revealAllMines();
    msGameOver = true;
    minesweeperMessage.textContent = "你踩到地雷了！";
    renderMinesweeper();
    return;
  }

  if (cell.count === 0) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        const insideBoard =
          nextRow >= 0 &&
          nextRow < msRows &&
          nextCol >= 0 &&
          nextCol < msCols;

        if (insideBoard && !msBoard[nextRow][nextCol].revealed) {
          revealCell(nextRow, nextCol);
        }
      }
    }
  }

  if (checkMinesweeperWin()) {
    msGameOver = true;
    minesweeperMessage.textContent = "恭喜，你把地雷都避開了！";
  }

  renderMinesweeper();
}

function toggleFlag(row, col) {
  if (msGameOver) {
    return;
  }

  const cell = msBoard[row][col];
  if (cell.revealed) {
    return;
  }

  cell.flagged = !cell.flagged;
  renderMinesweeper();
}

function renderMinesweeper() {
  minesweeperBoard.innerHTML = "";

  for (let row = 0; row < msRows; row += 1) {
    for (let col = 0; col < msCols; col += 1) {
      const cell = msBoard[row][col];
      const cellElement = document.createElement("div");

      cellElement.className = "cell";

      if (cell.revealed) {
        cellElement.classList.add("revealed");

        if (cell.mine) {
          cellElement.classList.add("mine");
          cellElement.textContent = "X";
        } else if (cell.count > 0) {
          cellElement.textContent = String(cell.count);
        }
      } else if (cell.flagged) {
        cellElement.classList.add("flagged");
        cellElement.textContent = "F";
      }

      cellElement.addEventListener("click", () => revealCell(row, col));
      cellElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(row, col);
      });

      minesweeperBoard.appendChild(cellElement);
    }
  }
}

function resetMinesweeper() {
  msGameOver = false;
  minesweeperMessage.textContent = "左鍵翻開格子，右鍵插旗。";
  createEmptyBoard();
  placeMines();
  countAdjacentMines();
  renderMinesweeper();
}

btn1A2B.addEventListener("click", () => {
  stopSnake();
  showGamePanel(game1A2B);
  reset1A2B();
});

btnSnake.addEventListener("click", () => {
  showGamePanel(gameSnake);
  startSnake();
});

btnMinesweeper.addEventListener("click", () => {
  stopSnake();
  showGamePanel(gameMinesweeper);
  resetMinesweeper();
});

btnBack.addEventListener("click", showMenu);
btnGuess.addEventListener("click", handleGuess);
btnRestart1A2B.addEventListener("click", reset1A2B);
btnStartSnake.addEventListener("click", startSnake);
btnRestartMinesweeper.addEventListener("click", resetMinesweeper);

guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

document.addEventListener("keydown", (event) => {
  if (!snakeRunning || gameSnake.classList.contains("hidden")) {
    return;
  }

  if (event.key === "ArrowUp" && dy !== 1) {
    dx = 0;
    dy = -1;
  } else if (event.key === "ArrowDown" && dy !== -1) {
    dx = 0;
    dy = 1;
  } else if (event.key === "ArrowLeft" && dx !== 1) {
    dx = -1;
    dy = 0;
  } else if (event.key === "ArrowRight" && dx !== -1) {
    dx = 1;
    dy = 0;
  }
});

showMenu();
