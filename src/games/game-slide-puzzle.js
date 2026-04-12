import { t } from "../core/i18n.js";

const SIZE_BY_DIFFICULTY = {
  easy: 3,
  normal: 4,
  hard: 5
};

function formatTime(elapsedSeconds) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createSolvedBoard(size) {
  const values = Array.from({ length: size * size }, function (_, index) {
    return index + 1;
  });
  values[values.length - 1] = 0;
  return values;
}

function getNeighbors(blankIndex, size) {
  const row = Math.floor(blankIndex / size);
  const col = blankIndex % size;
  const neighbors = [];

  if (row > 0) {
    neighbors.push(blankIndex - size);
  }
  if (row < size - 1) {
    neighbors.push(blankIndex + size);
  }
  if (col > 0) {
    neighbors.push(blankIndex - 1);
  }
  if (col < size - 1) {
    neighbors.push(blankIndex + 1);
  }

  return neighbors;
}

function createShuffledBoard(size) {
  const solvedBoard = createSolvedBoard(size);
  const board = solvedBoard.slice();
  let blankIndex = board.length - 1;
  let previousBlankIndex = -1;
  const shuffleMoves = Math.max(80, size * size * 24);

  for (let step = 0; step < shuffleMoves; step += 1) {
    const candidates = getNeighbors(blankIndex, size).filter(function (index) {
      return index !== previousBlankIndex;
    });
    const nextIndex = candidates[Math.floor(Math.random() * candidates.length)];

    [board[blankIndex], board[nextIndex]] = [board[nextIndex], board[blankIndex]];
    previousBlankIndex = blankIndex;
    blankIndex = nextIndex;
  }

  if (
    board.every(function (value, index) {
      return value === solvedBoard[index];
    })
  ) {
    return createShuffledBoard(size);
  }

  return board;
}

function getPosition(index, size) {
  return {
    row: Math.floor(index / size),
    col: index % size
  };
}

export function createSlidePuzzleGame({
  boardElement,
  difficultySelect,
  btnRestart,
  movesText,
  timeText,
  message
}) {
  let size = SIZE_BY_DIFFICULTY.normal;
  let board = createSolvedBoard(size);
  let moveCount = 0;
  let elapsedSeconds = 0;
  let timerIntervalId = null;
  let started = false;
  let solved = false;
  let pendingAnimation = null;

  boardElement.tabIndex = 0;

  function blankIndex() {
    return board.indexOf(0);
  }

  function clearTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }

  function startTimer() {
    if (timerIntervalId) {
      return;
    }

    timerIntervalId = window.setInterval(function () {
      elapsedSeconds += 1;
      timeText.textContent = formatTime(elapsedSeconds);
    }, 1000);
  }

  function isSolvedBoard() {
    return board.every(function (value, index) {
      if (index === board.length - 1) {
        return value === 0;
      }

      return value === index + 1;
    });
  }

  function updateStats() {
    movesText.textContent = String(moveCount);
    timeText.textContent = formatTime(elapsedSeconds);
  }

  function renderMessage(type = "ready") {
    switch (type) {
      case "solved":
        message.textContent = t("slide.message.solved", {
          moves: moveCount,
          time: formatTime(elapsedSeconds)
        });
        return;
      case "playing":
        message.textContent = t("slide.message.playing");
        return;
      case "ready":
      default:
        message.textContent = t("slide.message.ready");
    }
  }

  function animateLastMove() {
    if (!pendingAnimation) {
      return;
    }

    const tile = boardElement.querySelector(`.slide-tile[data-index="${pendingAnimation.toIndex}"]`);
    if (!tile || !tile.animate) {
      pendingAnimation = null;
      return;
    }

    const boardStyles = window.getComputedStyle(boardElement);
    const columnGap = parseFloat(boardStyles.columnGap || boardStyles.gap || "0");
    const rowGap = parseFloat(boardStyles.rowGap || boardStyles.gap || "0");
    const fromPosition = getPosition(pendingAnimation.fromIndex, size);
    const toPosition = getPosition(pendingAnimation.toIndex, size);
    const deltaX = (fromPosition.col - toPosition.col) * (tile.offsetWidth + columnGap);
    const deltaY = (fromPosition.row - toPosition.row) * (tile.offsetHeight + rowGap);

    tile.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.96)`
        },
        {
          transform: "translate(0, 0) scale(1)"
        }
      ],
      {
        duration: 170,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    );

    pendingAnimation = null;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    const emptyIndex = blankIndex();
    const movableSet = new Set(getNeighbors(emptyIndex, size));
    const finalValue = size * size;

    boardElement.innerHTML = "";
    boardElement.style.setProperty("--slide-size", String(size));

    board.forEach(function (value, index) {
      const tile = document.createElement("button");

      tile.type = "button";
      tile.className = "slide-tile";
      tile.dataset.index = String(index);

      if (value === 0) {
        tile.disabled = true;

        if (solved) {
          tile.classList.add("is-final");
          tile.textContent = String(finalValue);
        } else {
          tile.classList.add("is-empty");
        }
      } else {
        tile.textContent = String(value);
        if (movableSet.has(index) && !solved) {
          tile.classList.add("is-movable");
        }
      }

      fragment.appendChild(tile);
    });

    boardElement.appendChild(fragment);
    updateStats();
    animateLastMove();

    if (solved) {
      renderMessage("solved");
    } else if (started) {
      renderMessage("playing");
    } else {
      renderMessage("ready");
    }
  }

  function resetGame() {
    clearTimer();
    size = SIZE_BY_DIFFICULTY[difficultySelect.value] || SIZE_BY_DIFFICULTY.normal;
    board = createShuffledBoard(size);
    moveCount = 0;
    elapsedSeconds = 0;
    started = false;
    solved = false;
    pendingAnimation = null;
    renderBoard();
    boardElement.focus({ preventScroll: true });
  }

  function moveIndex(index) {
    if (solved || board[index] === 0) {
      return;
    }

    const empty = blankIndex();
    if (!getNeighbors(empty, size).includes(index)) {
      return;
    }

    if (!started) {
      started = true;
      startTimer();
    }

    pendingAnimation = {
      fromIndex: index,
      toIndex: empty
    };

    [board[index], board[empty]] = [board[empty], board[index]];
    moveCount += 1;
    solved = isSolvedBoard();

    if (solved) {
      clearTimer();
    }

    renderBoard();
  }

  function handleBoardClick(event) {
    const tile = event.target.closest(".slide-tile");

    if (!tile || tile.classList.contains("is-empty") || tile.classList.contains("is-final")) {
      return;
    }

    moveIndex(Number(tile.dataset.index));
  }

  function handleKeyDown(event) {
    const keyMap = {
      ArrowUp: "down",
      ArrowDown: "up",
      ArrowLeft: "right",
      ArrowRight: "left"
    };
    const action = keyMap[event.key];

    if (!action) {
      return;
    }

    event.preventDefault();

    const empty = blankIndex();
    const row = Math.floor(empty / size);
    const col = empty % size;
    let targetIndex = -1;

    if (action === "up" && row > 0) {
      targetIndex = empty - size;
    } else if (action === "down" && row < size - 1) {
      targetIndex = empty + size;
    } else if (action === "left" && col > 0) {
      targetIndex = empty - 1;
    } else if (action === "right" && col < size - 1) {
      targetIndex = empty + 1;
    }

    if (targetIndex >= 0) {
      moveIndex(targetIndex);
    }
  }

  boardElement.addEventListener("click", handleBoardClick);
  difficultySelect.addEventListener("change", function () {
    resetGame();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    resetGame();
  });

  return {
    enter: resetGame,
    leave: clearTimer,
    handleKeyDown: handleKeyDown,
    refreshLocale: renderBoard
  };
}
