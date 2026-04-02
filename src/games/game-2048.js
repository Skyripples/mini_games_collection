export function createGame2048({ boardElement, btnRestart, scoreText, message }) {
  const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  let board = [];
  let score = 0;
  let gameOver = false;
  let hasWon = false;

  boardElement.tabIndex = 0;

  function createEmptyBoard() {
    board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
  }

  function getEmptyCells() {
    const emptyCells = [];

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (board[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    return emptyCells;
  }

  function addRandomTile() {
    const emptyCells = getEmptyCells();

    if (emptyCells.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    board[row][col] = Math.random() < 0.9 ? 2 : 4;
  }

  function getTileClass(value) {
    if (value > 2048) {
      return "tile-super";
    }

    return `tile-${value}`;
  }

  function render() {
    boardElement.innerHTML = "";

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const value = board[row][col];
        const tile = document.createElement("div");

        tile.className = `tile-2048-cell ${getTileClass(value)}`;
        tile.textContent = value === 0 ? "" : String(value);

        boardElement.appendChild(tile);
      }
    }

    scoreText.textContent = String(score);
  }

  function slideAndMergeLine(line) {
    const filtered = line.filter((value) => value !== 0);
    const merged = [];

    for (let index = 0; index < filtered.length; index += 1) {
      if (filtered[index] === filtered[index + 1]) {
        const newValue = filtered[index] * 2;
        merged.push(newValue);
        score += newValue;
        index += 1;
      } else {
        merged.push(filtered[index]);
      }
    }

    while (merged.length < 4) {
      merged.push(0);
    }

    return merged;
  }

  function reverseCopy(line) {
    return [...line].reverse();
  }

  function boardsEqual(boardA, boardB) {
    return JSON.stringify(boardA) === JSON.stringify(boardB);
  }

  function copyBoard() {
    return board.map((row) => [...row]);
  }

  function moveLeft() {
    const newBoard = board.map((row) => slideAndMergeLine(row));
    const moved = !boardsEqual(board, newBoard);
    board = newBoard;
    return moved;
  }

  function moveRight() {
    const newBoard = board.map((row) => {
      const reversed = reverseCopy(row);
      const merged = slideAndMergeLine(reversed);
      return reverseCopy(merged);
    });

    const moved = !boardsEqual(board, newBoard);
    board = newBoard;
    return moved;
  }

  function getColumn(col) {
    return [board[0][col], board[1][col], board[2][col], board[3][col]];
  }

  function setColumn(col, values) {
    for (let row = 0; row < 4; row += 1) {
      board[row][col] = values[row];
    }
  }

  function moveUp() {
    const originalBoard = copyBoard();

    for (let col = 0; col < 4; col += 1) {
      const column = getColumn(col);
      const merged = slideAndMergeLine(column);
      setColumn(col, merged);
    }

    return !boardsEqual(originalBoard, board);
  }

  function moveDown() {
    const originalBoard = copyBoard();

    for (let col = 0; col < 4; col += 1) {
      const column = getColumn(col);
      const reversed = reverseCopy(column);
      const merged = slideAndMergeLine(reversed);
      setColumn(col, reverseCopy(merged));
    }

    return !boardsEqual(originalBoard, board);
  }

  function checkWin() {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (board[row][col] === 2048) {
          return true;
        }
      }
    }

    return false;
  }

  function canMove() {
    if (getEmptyCells().length > 0) {
      return true;
    }

    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const value = board[row][col];

        if (row < 3 && board[row + 1][col] === value) {
          return true;
        }

        if (col < 3 && board[row][col + 1] === value) {
          return true;
        }
      }
    }

    return false;
  }

  function reset() {
    createEmptyBoard();
    score = 0;
    gameOver = false;
    hasWon = false;
    message.textContent = "用方向鍵操作，上下左右滑動方塊。";
    addRandomTile();
    addRandomTile();
    render();
    boardElement.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (gameOver) {
      return;
    }

    let moved = false;

    if (event.key === "ArrowLeft") {
      moved = moveLeft();
    } else if (event.key === "ArrowRight") {
      moved = moveRight();
    } else if (event.key === "ArrowUp") {
      moved = moveUp();
    } else if (event.key === "ArrowDown") {
      moved = moveDown();
    }

    if (!moved) {
      return;
    }

    addRandomTile();
    render();

    if (!hasWon && checkWin()) {
      hasWon = true;
      message.textContent = "恭喜，你成功合成 2048。";
    } else if (!canMove()) {
      gameOver = true;
      message.textContent = "遊戲結束，已沒有可移動的步。";
    }
  }

  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    reset();
  });

  return {
    enter: reset,
    handleKeyDown
  };
}
