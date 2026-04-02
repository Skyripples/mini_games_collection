export function createSudokuGame({
  boardElement,
  numberPadElement,
  btnNewPuzzle,
  btnRestart,
  message
}) {
  const puzzles = [
    {
      puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
    },
    {
      puzzle: "003020600900305001001806400008102900700000008006708200002609500800203009005010300",
      solution: "483921657967345821251876493548132976729564138136798245372689514814253769695417382"
    },
    {
      puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      solution: "245981376169273584837564219976125438513498627482736951391657842728349165654812793"
    }
  ];

  let puzzleIndex = 0;
  let originalBoard = [];
  let currentBoard = [];
  let solutionBoard = [];
  let selectedIndex = null;
  let initialized = false;

  boardElement.tabIndex = 0;

  function parseBoard(boardString) {
    return boardString.split("").map((value) => Number(value));
  }

  function buildNumberPad() {
    if (numberPadElement.children.length > 0) {
      return;
    }

    for (let value = 1; value <= 9; value += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sudoku-number-button";
      button.dataset.value = String(value);
      button.textContent = String(value);
      numberPadElement.appendChild(button);
    }

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "sudoku-number-button clear";
    clearButton.dataset.value = "0";
    clearButton.textContent = "清除";
    numberPadElement.appendChild(clearButton);
  }

  function isFixed(index) {
    return originalBoard[index] !== 0;
  }

  function hasErrors() {
    return currentBoard.some((value, index) => {
      return value !== 0 && value !== solutionBoard[index];
    });
  }

  function isSolved() {
    return currentBoard.every((value, index) => value === solutionBoard[index]);
  }

  function updateMessage() {
    if (isSolved()) {
      message.textContent = "恭喜，你完成數獨了！";
    } else if (hasErrors()) {
      message.textContent = "目前有填錯的數字，請再檢查。";
    } else {
      message.textContent = "點選空格後輸入數字。";
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    for (let index = 0; index < currentBoard.length; index += 1) {
      const row = Math.floor(index / 9);
      const col = index % 9;
      const value = currentBoard[index];
      const cell = document.createElement("div");

      cell.className = "sudoku-cell";
      cell.dataset.index = String(index);
      cell.textContent = value === 0 ? "" : String(value);

      if (isFixed(index)) {
        cell.classList.add("fixed");
      }
      if (selectedIndex === index) {
        cell.classList.add("selected");
      }
      if (value !== 0 && value !== solutionBoard[index]) {
        cell.classList.add("wrong");
      }
      if (col === 2 || col === 5) {
        cell.classList.add("subgrid-right");
      }
      if (row === 2 || row === 5) {
        cell.classList.add("subgrid-bottom");
      }

      fragment.appendChild(cell);
    }

    boardElement.appendChild(fragment);
  }

  function setValue(value) {
    if (selectedIndex === null || isFixed(selectedIndex)) {
      return;
    }

    currentBoard[selectedIndex] = value;
    render();
    updateMessage();
  }

  function loadPuzzle(index) {
    const selectedPuzzle = puzzles[index];

    puzzleIndex = index;
    originalBoard = parseBoard(selectedPuzzle.puzzle);
    currentBoard = [...originalBoard];
    solutionBoard = parseBoard(selectedPuzzle.solution);
    selectedIndex = currentBoard.findIndex((value) => value === 0);
    initialized = true;
    render();
    updateMessage();
    boardElement.focus({ preventScroll: true });
  }

  function loadNextPuzzle() {
    const nextIndex = (puzzleIndex + 1) % puzzles.length;
    loadPuzzle(nextIndex);
  }

  function restartPuzzle() {
    if (!initialized) {
      loadPuzzle(0);
      return;
    }

    currentBoard = [...originalBoard];
    selectedIndex = currentBoard.findIndex((value) => value === 0);
    render();
    updateMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".sudoku-cell");
    if (!cell) {
      return;
    }

    const index = Number(cell.dataset.index);
    if (isFixed(index)) {
      return;
    }

    selectedIndex = index;
    render();
    boardElement.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (!initialized) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      setValue(Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      setValue(0);
    }
  }

  buildNumberPad();
  boardElement.addEventListener("click", handleBoardClick);
  numberPadElement.addEventListener("click", (event) => {
    const button = event.target.closest(".sudoku-number-button");
    if (!button) {
      return;
    }

    button.blur();
    setValue(Number(button.dataset.value));
    boardElement.focus({ preventScroll: true });
  });
  btnNewPuzzle.addEventListener("click", (event) => {
    event.currentTarget.blur();
    loadNextPuzzle();
  });
  btnRestart.addEventListener("click", (event) => {
    event.currentTarget.blur();
    restartPuzzle();
  });

  return {
    enter() {
      if (!initialized) {
        loadPuzzle(0);
      } else {
        render();
        boardElement.focus({ preventScroll: true });
      }
    },
    handleKeyDown
  };
}
