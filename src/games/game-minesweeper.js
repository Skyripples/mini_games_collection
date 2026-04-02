export function createMinesweeperGame({
  boardElement,
  btnRestart,
  message,
  difficultySelect,
  difficultyLabel,
  sizeText,
  mineText
}) {
  const difficultySettings = {
    easy: {
      label: "簡單",
      rows: 9,
      cols: 9,
      mines: 10,
      cellSize: 34
    },
    normal: {
      label: "普通",
      rows: 16,
      cols: 16,
      mines: 40,
      cellSize: 28
    },
    hard: {
      label: "困難",
      rows: 16,
      cols: 30,
      mines: 99,
      cellSize: 20
    }
  };

  let board = [];
  let gameOver = false;
  let boardReady = false;
  let currentDifficulty = difficultySelect.value in difficultySettings ? difficultySelect.value : "normal";

  function getSettings() {
    return difficultySettings[currentDifficulty];
  }

  function applyDifficulty() {
    const settings = getSettings();
    difficultyLabel.textContent = settings.label;
    sizeText.textContent = `${settings.cols} x ${settings.rows}`;
    mineText.textContent = String(settings.mines);
    boardElement.style.setProperty("--ms-cols", String(settings.cols));
    boardElement.style.setProperty("--ms-cell-size", `${settings.cellSize}px`);
  }

  function createEmptyBoard() {
    const { rows, cols } = getSettings();
    board = [];

    for (let row = 0; row < rows; row += 1) {
      const currentRow = [];
      for (let col = 0; col < cols; col += 1) {
        currentRow.push({
          mine: false,
          revealed: false,
          flagged: false,
          count: 0
        });
      }
      board.push(currentRow);
    }
  }

  function placeMines(safeRow, safeCol) {
    const { rows, cols, mines } = getSettings();
    let placed = 0;

    while (placed < mines) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const nearFirstClick =
        Math.abs(row - safeRow) <= 1 &&
        Math.abs(col - safeCol) <= 1;

      if (!board[row][col].mine && !nearFirstClick) {
        board[row][col].mine = true;
        placed += 1;
      }
    }
  }

  function countAdjacentMines() {
    const { rows, cols } = getSettings();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (board[row][col].mine) {
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
              nextRow < rows &&
              nextCol >= 0 &&
              nextCol < cols;

            if (insideBoard && board[nextRow][nextCol].mine) {
              count += 1;
            }
          }
        }

        board[row][col].count = count;
      }
    }
  }

  function revealAllMines() {
    const { rows, cols } = getSettings();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (board[row][col].mine) {
          board[row][col].revealed = true;
        }
      }
    }
  }

  function checkWin() {
    const { rows, cols } = getSettings();
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = board[row][col];
        if (!cell.mine && !cell.revealed) {
          return false;
        }
      }
    }

    return true;
  }

  function ensureBoardReady(row, col) {
    if (boardReady) {
      return;
    }

    placeMines(row, col);
    countAdjacentMines();
    boardReady = true;
  }

  function revealRegion(startRow, startCol) {
    const { rows, cols } = getSettings();
    const queue = [[startRow, startCol]];

    while (queue.length > 0) {
      const [row, col] = queue.shift();
      const cell = board[row][col];

      if (cell.revealed || cell.flagged) {
        continue;
      }

      cell.revealed = true;

      if (cell.count !== 0) {
        continue;
      }

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          const insideBoard =
            nextRow >= 0 &&
            nextRow < rows &&
            nextCol >= 0 &&
            nextCol < cols;

          if (!insideBoard) {
            continue;
          }

          const nextCell = board[nextRow][nextCol];
          if (!nextCell.revealed && !nextCell.flagged && !nextCell.mine) {
            queue.push([nextRow, nextCol]);
          }
        }
      }
    }
  }

  function revealCell(row, col) {
    if (gameOver) {
      return;
    }

    const cell = board[row][col];
    if (cell.revealed || cell.flagged) {
      return;
    }

    ensureBoardReady(row, col);

    if (cell.mine) {
      cell.revealed = true;
      revealAllMines();
      gameOver = true;
      message.textContent = "你踩到地雷了！";
      render();
      return;
    }

    revealRegion(row, col);

    if (checkWin()) {
      gameOver = true;
      message.textContent = "恭喜，你把地雷都避開了！";
    }

    render();
  }

  function toggleFlag(row, col) {
    if (gameOver || !boardReady) {
      return;
    }

    const cell = board[row][col];
    if (cell.revealed) {
      return;
    }

    cell.flagged = !cell.flagged;
    render();
  }

  function render() {
    const { rows, cols } = getSettings();
    boardElement.innerHTML = "";

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = board[row][col];
        const cellElement = document.createElement("div");

        cellElement.className = "cell";

        if (cell.revealed) {
          cellElement.classList.add("revealed");

          if (cell.mine) {
            cellElement.classList.add("mine");
            cellElement.textContent = "X";
          } else if (cell.count > 0) {
            cellElement.textContent = String(cell.count);
          } else {
            cellElement.classList.add("empty");
            cellElement.textContent = "";
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

        boardElement.appendChild(cellElement);
      }
    }
  }

  function reset() {
    gameOver = false;
    boardReady = false;
    message.textContent = "左鍵翻開格子，右鍵插旗。";
    applyDifficulty();
    createEmptyBoard();
    render();
  }

  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    reset();
  });
  difficultySelect.addEventListener("change", () => {
    currentDifficulty = difficultySelect.value;
    difficultySelect.blur();
    reset();
  });

  return {
    enter: reset
  };
}
