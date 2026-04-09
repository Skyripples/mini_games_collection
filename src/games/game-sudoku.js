import { t } from "../core/i18n.js";

const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const MAX_MISTAKES = 3;
const MAX_HINTS = 3;

const DIFFICULTY_SETTINGS = {
  easy: {
    labelKey: "common.easy",
    minClues: 40,
    maxClues: 46
  },
  normal: {
    labelKey: "common.normal",
    minClues: 33,
    maxClues: 38
  },
  hard: {
    labelKey: "common.hard",
    minClues: 27,
    maxClues: 32
  }
};

function shuffle(values) {
  const result = values.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}

function countFilledCells(board) {
  return board.reduce(function (count, value) {
    return count + (value !== 0 ? 1 : 0);
  }, 0);
}

function getRow(index) {
  return Math.floor(index / BOARD_SIZE);
}

function getCol(index) {
  return index % BOARD_SIZE;
}

function getBoxStart(row, col) {
  return {
    row: Math.floor(row / 3) * 3,
    col: Math.floor(col / 3) * 3
  };
}

function isValidPlacement(board, index, value) {
  const row = getRow(index);
  const col = getCol(index);

  for (let currentCol = 0; currentCol < BOARD_SIZE; currentCol += 1) {
    const currentIndex = row * BOARD_SIZE + currentCol;
    if (currentCol !== col && board[currentIndex] === value) {
      return false;
    }
  }

  for (let currentRow = 0; currentRow < BOARD_SIZE; currentRow += 1) {
    const currentIndex = currentRow * BOARD_SIZE + col;
    if (currentRow !== row && board[currentIndex] === value) {
      return false;
    }
  }

  const boxStart = getBoxStart(row, col);
  for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
    for (let colOffset = 0; colOffset < 3; colOffset += 1) {
      const currentRow = boxStart.row + rowOffset;
      const currentCol = boxStart.col + colOffset;
      const currentIndex = currentRow * BOARD_SIZE + currentCol;

      if ((currentRow !== row || currentCol !== col) && board[currentIndex] === value) {
        return false;
      }
    }
  }

  return true;
}

function getCandidates(board, index) {
  if (board[index] !== 0) {
    return [];
  }

  const candidates = [];
  for (let value = 1; value <= 9; value += 1) {
    if (isValidPlacement(board, index, value)) {
      candidates.push(value);
    }
  }

  return candidates;
}

function findBestEmptyCell(board) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] !== 0) {
      continue;
    }

    const candidates = getCandidates(board, index);
    if (candidates.length === 0) {
      return {
        index: index,
        candidates: []
      };
    }

    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;

      if (candidates.length === 1) {
        break;
      }
    }
  }

  return {
    index: bestIndex,
    candidates: bestCandidates
  };
}

function solveBoard(board, randomized) {
  const nextCell = findBestEmptyCell(board);

  if (nextCell.index === -1) {
    return true;
  }

  if (!nextCell.candidates || nextCell.candidates.length === 0) {
    return false;
  }

  const values = randomized ? shuffle(nextCell.candidates) : nextCell.candidates;

  for (let index = 0; index < values.length; index += 1) {
    board[nextCell.index] = values[index];

    if (solveBoard(board, randomized)) {
      return true;
    }
  }

  board[nextCell.index] = 0;
  return false;
}

function countSolutions(board, limit) {
  let solutions = 0;

  function search() {
    if (solutions >= limit) {
      return;
    }

    const nextCell = findBestEmptyCell(board);
    if (nextCell.index === -1) {
      solutions += 1;
      return;
    }

    if (!nextCell.candidates || nextCell.candidates.length === 0) {
      return;
    }

    for (let index = 0; index < nextCell.candidates.length; index += 1) {
      board[nextCell.index] = nextCell.candidates[index];
      search();
      board[nextCell.index] = 0;

      if (solutions >= limit) {
        return;
      }
    }
  }

  search();
  return solutions;
}

function generateSolvedBoard() {
  const board = Array(CELL_COUNT).fill(0);
  solveBoard(board, true);
  return board;
}

function buildRemovalGroups() {
  const groups = [];

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const mirrorIndex = CELL_COUNT - 1 - index;
    if (index > mirrorIndex) {
      continue;
    }

    if (index === mirrorIndex) {
      groups.push([index]);
    } else {
      groups.push([index, mirrorIndex]);
    }
  }

  return shuffle(groups);
}

function carvePuzzle(solutionBoard, targetClues) {
  const puzzleBoard = solutionBoard.slice();
  const removalGroups = buildRemovalGroups();
  let cluesRemaining = CELL_COUNT;

  for (let groupIndex = 0; groupIndex < removalGroups.length; groupIndex += 1) {
    const group = removalGroups[groupIndex];
    if (cluesRemaining - group.length < targetClues) {
      continue;
    }

    const snapshot = group.map(function (index) {
      return puzzleBoard[index];
    });

    group.forEach(function (index) {
      puzzleBoard[index] = 0;
    });

    if (countSolutions(puzzleBoard.slice(), 2) === 1) {
      cluesRemaining -= group.length;
      if (cluesRemaining <= targetClues) {
        break;
      }
      continue;
    }

    group.forEach(function (index, position) {
      puzzleBoard[index] = snapshot[position];
    });
  }

  return puzzleBoard;
}

function generatePuzzleByDifficulty(difficultyKey) {
  const settings = DIFFICULTY_SETTINGS[difficultyKey] || DIFFICULTY_SETTINGS.normal;
  let bestPuzzle = null;
  let bestSolution = null;
  let bestClueCount = CELL_COUNT;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const solutionBoard = generateSolvedBoard();
    const clueTarget =
      settings.minClues +
      Math.floor(Math.random() * (settings.maxClues - settings.minClues + 1));
    const puzzleBoard = carvePuzzle(solutionBoard, clueTarget);
    const clueCount = countFilledCells(puzzleBoard);

    if (clueCount >= settings.minClues && clueCount <= settings.maxClues) {
      return {
        puzzle: puzzleBoard,
        solution: solutionBoard
      };
    }

    if (clueCount < bestClueCount) {
      bestClueCount = clueCount;
      bestPuzzle = puzzleBoard;
      bestSolution = solutionBoard;
    }
  }

  return {
    puzzle: bestPuzzle,
    solution: bestSolution
  };
}

function createEmptyNotes() {
  return Array.from({ length: CELL_COUNT }, function () {
    return new Set();
  });
}

export function createSudokuGame({
  boardElement,
  numberPadElement,
  difficultySelect,
  difficultyLabel,
  btnHint,
  btnNoteMode,
  btnNewPuzzle,
  btnRestart,
  hintsText,
  mistakesText,
  message
}) {
  let originalBoard = [];
  let currentBoard = [];
  let solutionBoard = [];
  let notes = createEmptyNotes();
  let selectedIndex = null;
  let initialized = false;
  let currentDifficulty = "normal";
  let noteMode = false;
  let mistakes = 0;
  let hintsRemaining = MAX_HINTS;
  let gameOver = false;
  let messageState = { type: "generated" };
  let confirmedEntries = new Set();
  let wrongEntries = new Set();

  boardElement.tabIndex = 0;

  function getDifficultyLabel() {
    return t(DIFFICULTY_SETTINGS[currentDifficulty].labelKey);
  }

  function isFixed(index) {
    return originalBoard[index] !== 0;
  }

  function isSolved() {
    return currentBoard.every(function (value, index) {
      return value === solutionBoard[index];
    });
  }

  function canEditSelectedCell() {
    return selectedIndex !== null && !isFixed(selectedIndex) && !gameOver;
  }

  function updateMistakesText() {
    mistakesText.textContent = `${mistakes} / ${MAX_MISTAKES}`;
  }

  function getHintCandidates() {
    return currentBoard
      .map(function (value, index) {
        return value === 0 && !isFixed(index) ? index : -1;
      })
      .filter(function (index) {
        return index !== -1;
      });
  }

  function updateHintsText() {
    hintsText.textContent = `${hintsRemaining} / ${MAX_HINTS}`;
  }

  function updateHintButton() {
    btnHint.textContent = t("sudoku.hintButton", { count: hintsRemaining });
    btnHint.disabled = hintsRemaining === 0 || gameOver || getHintCandidates().length === 0;
  }

  function updateNoteModeButton() {
    btnNoteMode.classList.toggle("active", noteMode);
    btnNoteMode.textContent = t(noteMode ? "sudoku.noteModeOn" : "sudoku.noteModeOff");
  }

  function renderMessage() {
    if (messageState.type === "failed") {
      message.textContent = t("sudoku.message.failed", { max: MAX_MISTAKES });
      return;
    }

    if (messageState.type === "solved") {
      message.textContent = t("sudoku.message.solved", {
        difficulty: getDifficultyLabel()
      });
      return;
    }

    if (messageState.type === "errors") {
      message.textContent = t("sudoku.message.errors", {
        difficulty: getDifficultyLabel(),
        count: mistakes,
        max: MAX_MISTAKES
      });
      return;
    }

    message.textContent = t("sudoku.message.generated", {
      difficulty: getDifficultyLabel()
    });
  }

  function updateMessage() {
    if (gameOver && !isSolved()) {
      messageState = { type: "failed" };
    } else if (isSolved()) {
      messageState = { type: "solved" };
    } else if (wrongEntries.size > 0) {
      messageState = { type: "errors" };
    } else {
      messageState = { type: "generated" };
    }

    renderMessage();
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

    btnNoteMode.classList.add("sudoku-action-button", "sudoku-note-button");
    numberPadElement.appendChild(btnNoteMode);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "sudoku-number-button clear";
    clearButton.dataset.value = "0";
    clearButton.dataset.role = "clear";
    clearButton.textContent = t("sudoku.clear");
    numberPadElement.appendChild(clearButton);
  }

  function refreshNumberPadLabel() {
    const clearButton = numberPadElement.querySelector('[data-role="clear"]');
    if (clearButton) {
      clearButton.textContent = t("sudoku.clear");
    }
  }

  function clearCell(index) {
    currentBoard[index] = 0;
    notes[index].clear();
    confirmedEntries.delete(index);
    wrongEntries.delete(index);
  }

  function renderNotes(cell, noteSet) {
    const notesGrid = document.createElement("div");
    notesGrid.className = "sudoku-notes";

    for (let value = 1; value <= 9; value += 1) {
      const note = document.createElement("span");
      note.className = "sudoku-note";

      if (noteSet.has(value)) {
        note.classList.add("active");
        note.textContent = String(value);
      } else {
        note.textContent = "";
      }

      notesGrid.appendChild(note);
    }

    cell.appendChild(notesGrid);
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

      if (value === 0 && notes[index].size > 0) {
        cell.classList.add("has-notes");
        renderNotes(cell, notes[index]);
      } else {
        cell.textContent = value === 0 ? "" : String(value);
      }

      if (isFixed(index)) {
        cell.classList.add("fixed");
      } else if (confirmedEntries.has(index)) {
        cell.classList.add("confirmed");
      } else if (wrongEntries.has(index)) {
        cell.classList.add("wrong");
      } else if (value !== 0) {
        cell.classList.add("user-entry");
      }

      if (selectedIndex === index) {
        cell.classList.add("selected");
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
    difficultyLabel.textContent = getDifficultyLabel();
    updateMistakesText();
    updateHintsText();
    updateHintButton();
    updateNoteModeButton();
  }

  function selectFirstEmptyCell() {
    selectedIndex = currentBoard.findIndex(function (value, index) {
      return value === 0 && !isFixed(index);
    });

    if (selectedIndex === -1) {
      selectedIndex = null;
    }
  }

  function loadGeneratedPuzzle() {
    const generated = generatePuzzleByDifficulty(currentDifficulty);

    originalBoard = generated.puzzle.slice();
    currentBoard = generated.puzzle.slice();
    solutionBoard = generated.solution.slice();
    notes = createEmptyNotes();
    confirmedEntries = new Set();
    wrongEntries = new Set();
    mistakes = 0;
    hintsRemaining = MAX_HINTS;
    noteMode = false;
    gameOver = false;
    selectFirstEmptyCell();
    initialized = true;
    render();
    updateMessage();
    boardElement.focus({ preventScroll: true });
  }

  function restartPuzzle() {
    if (!initialized) {
      loadGeneratedPuzzle();
      return;
    }

    currentBoard = originalBoard.slice();
    notes = createEmptyNotes();
    confirmedEntries = new Set();
    wrongEntries = new Set();
    mistakes = 0;
    hintsRemaining = MAX_HINTS;
    noteMode = false;
    gameOver = false;
    selectFirstEmptyCell();
    render();
    updateMessage();
    boardElement.focus({ preventScroll: true });
  }

  function toggleNoteMode() {
    noteMode = !noteMode;
    render();
    boardElement.focus({ preventScroll: true });
  }

  function useHint() {
    if (gameOver || hintsRemaining === 0) {
      return;
    }

    const candidates = getHintCandidates();
    if (candidates.length === 0) {
      return;
    }

    const hintedIndex = candidates[Math.floor(Math.random() * candidates.length)];
    currentBoard[hintedIndex] = solutionBoard[hintedIndex];
    notes[hintedIndex].clear();
    wrongEntries.delete(hintedIndex);
    confirmedEntries.add(hintedIndex);
    hintsRemaining -= 1;

    if (selectedIndex === hintedIndex && isSolved()) {
      selectedIndex = null;
    }

    render();
    updateMessage();
  }

  function handleNoteInput(value) {
    if (!canEditSelectedCell() || currentBoard[selectedIndex] !== 0) {
      return;
    }

    if (value === 0) {
      notes[selectedIndex].clear();
      render();
      updateMessage();
      return;
    }

    if (notes[selectedIndex].has(value)) {
      notes[selectedIndex].delete(value);
    } else {
      notes[selectedIndex].add(value);
    }

    render();
    updateMessage();
  }

  function handleValueInput(value) {
    if (!canEditSelectedCell()) {
      return;
    }

    if (value === 0) {
      clearCell(selectedIndex);
      render();
      updateMessage();
      return;
    }

    currentBoard[selectedIndex] = value;
    wrongEntries.delete(selectedIndex);
    confirmedEntries.delete(selectedIndex);

    if (value === solutionBoard[selectedIndex]) {
      notes[selectedIndex].clear();
      confirmedEntries.add(selectedIndex);
    } else {
      wrongEntries.add(selectedIndex);
      mistakes = Math.min(MAX_MISTAKES, mistakes + 1);
      if (mistakes >= MAX_MISTAKES) {
        gameOver = true;
      }
    }

    render();
    updateMessage();
  }

  function applyInput(value) {
    if (noteMode) {
      handleNoteInput(value);
      return;
    }

    handleValueInput(value);
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
    if (!initialized || gameOver) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      applyInput(Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      applyInput(0);
    }
  }

  buildNumberPad();
  boardElement.addEventListener("click", handleBoardClick);
  numberPadElement.addEventListener("click", function (event) {
    const button = event.target.closest(".sudoku-number-button");
    if (!button) {
      return;
    }

    button.blur();
    applyInput(Number(button.dataset.value));
    boardElement.focus({ preventScroll: true });
  });
  difficultySelect.addEventListener("change", function (event) {
    currentDifficulty = event.target.value;
    loadGeneratedPuzzle();
  });
  btnNoteMode.addEventListener("click", function (event) {
    event.currentTarget.blur();
    toggleNoteMode();
  });
  btnHint.addEventListener("click", function (event) {
    event.currentTarget.blur();
    useHint();
    boardElement.focus({ preventScroll: true });
  });
  btnNewPuzzle.addEventListener("click", function (event) {
    event.currentTarget.blur();
    loadGeneratedPuzzle();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    restartPuzzle();
  });

  return {
    enter: function () {
      if (!initialized) {
        currentDifficulty = difficultySelect.value || "normal";
        loadGeneratedPuzzle();
      } else {
        render();
        updateMessage();
        boardElement.focus({ preventScroll: true });
      }
    },
    handleKeyDown: handleKeyDown,
    refreshLocale: function () {
      render();
      refreshNumberPadLabel();
      renderMessage();
    }
  };
}
