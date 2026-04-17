import { t } from "../core/i18n.js";

const TUBE_CAPACITY = 4;
const SEGMENT_HEIGHT = 30;
const SEGMENT_BOTTOM_OFFSET = 8;
const DEFAULT_SHUFFLE_STEPS = 100;
const COLOR_POOL = ["red", "blue", "yellow", "green", "purple"];

const LEVEL_CONFIGS = [
  { colorCount: 3, shuffleSteps: 100 },
  { colorCount: 4, shuffleSteps: 100 },
  { colorCount: 5, shuffleSteps: 100 }
];

function cloneBoard(board) {
  return board.map(function (tube) {
    return tube.slice();
  });
}

function isTubeUniform(tube) {
  if (tube.length === 0) {
    return true;
  }

  return tube.every(function (color) {
    return color === tube[0];
  });
}

function isSolved(board) {
  return board.every(function (tube) {
    return tube.length === 0 || (tube.length === TUBE_CAPACITY && isTubeUniform(tube));
  });
}

function getTopColorBlockCount(tube) {
  if (tube.length === 0) {
    return 0;
  }

  const topColor = tube[tube.length - 1];
  let count = 0;

  for (let index = tube.length - 1; index >= 0; index -= 1) {
    if (tube[index] !== topColor) {
      break;
    }
    count += 1;
  }

  return count;
}

function canPour(fromTube, toTube) {
  if (!fromTube || !toTube || fromTube === toTube) {
    return false;
  }

  if (fromTube.length === 0 || toTube.length >= TUBE_CAPACITY) {
    return false;
  }

  const fromColor = fromTube[fromTube.length - 1];
  const toColor = toTube[toTube.length - 1];

  if (toTube.length === 0) {
    return true;
  }

  return fromColor === toColor;
}

function pourLiquid(fromTube, toTube, options = {}) {
  if (!canPour(fromTube, toTube)) {
    return 0;
  }

  const movableCount = getTopColorBlockCount(fromTube);
  const availableSpace = TUBE_CAPACITY - toTube.length;
  const maxAmount = Math.min(movableCount, availableSpace);
  const amount = options.randomizeAmount
    ? Math.max(1, Math.floor(Math.random() * maxAmount) + 1)
    : maxAmount;

  for (let count = 0; count < amount; count += 1) {
    toTube.push(fromTube.pop());
  }

  return amount;
}

function collectLegalMoves(board) {
  const moves = [];

  board.forEach(function (fromTube, fromIndex) {
    board.forEach(function (toTube, toIndex) {
      if (fromIndex === toIndex) {
        return;
      }

      if (canPour(fromTube, toTube)) {
        moves.push({ fromIndex: fromIndex, toIndex: toIndex });
      }
    });
  });

  return moves;
}

function createSolvedBoard(colorCount) {
  const colors = COLOR_POOL.slice(0, colorCount);
  const board = colors.map(function (color) {
    return Array(TUBE_CAPACITY).fill(color);
  });

  board.push([]);
  board.push([]);
  return board;
}

function createFallbackBoard(colorCount) {
  const colors = COLOR_POOL.slice(0, colorCount);
  const units = [];

  colors.forEach(function (color) {
    for (let count = 0; count < TUBE_CAPACITY; count += 1) {
      units.push(color);
    }
  });

  for (let index = units.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [units[index], units[swapIndex]] = [units[swapIndex], units[index]];
  }

  const board = Array.from({ length: colorCount }, function () {
    return [];
  });

  units.forEach(function (color, index) {
    const tubeIndex = Math.floor(index / TUBE_CAPACITY);
    board[tubeIndex].push(color);
  });

  board.push([]);
  board.push([]);
  return board;
}

function generateShuffledBoard(colorCount, shuffleSteps = DEFAULT_SHUFFLE_STEPS) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const board = createSolvedBoard(colorCount);
    let previousMove = null;
    let effectiveSteps = 0;

    for (let step = 0; step < shuffleSteps; step += 1) {
      const legalMoves = collectLegalMoves(board);
      if (legalMoves.length === 0) {
        break;
      }

      let candidates = legalMoves;
      if (previousMove) {
        const filtered = legalMoves.filter(function (move) {
          return !(
            move.fromIndex === previousMove.toIndex &&
            move.toIndex === previousMove.fromIndex
          );
        });

        if (filtered.length > 0) {
          candidates = filtered;
        }
      }

      const selectedMove = candidates[Math.floor(Math.random() * candidates.length)];
      const pouredAmount = pourLiquid(
        board[selectedMove.fromIndex],
        board[selectedMove.toIndex],
        { randomizeAmount: true }
      );

      if (pouredAmount > 0) {
        effectiveSteps += 1;
        previousMove = selectedMove;
      }
    }

    if (effectiveSteps > 0 && !isSolved(board)) {
      return board;
    }
  }

  return createFallbackBoard(colorCount);
}

function createBoardForLevel(levelIndex) {
  const levelConfig = LEVEL_CONFIGS[levelIndex];
  const shuffleSteps =
    typeof levelConfig.shuffleSteps === "number"
      ? levelConfig.shuffleSteps
      : DEFAULT_SHUFFLE_STEPS;
  return generateShuffledBoard(levelConfig.colorCount, shuffleSteps);
}

export function createWaterSortGame({
  boardElement,
  btnRestart,
  btnPrev,
  btnNext,
  levelText,
  message
}) {
  let levelIndex = 0;
  let initialBoard = createBoardForLevel(levelIndex);
  let board = cloneBoard(initialBoard);
  let selectedTubeIndex = null;
  let gameWon = false;
  let messageState = "waterSort.message.start";

  function setMessage(key) {
    messageState = key;
    message.textContent = t(key);
  }

  function renderMessage() {
    message.textContent = t(messageState);
  }

  function updateHeader() {
    levelText.textContent = `${levelIndex + 1} / ${LEVEL_CONFIGS.length}`;
    btnPrev.disabled = levelIndex === 0;
    btnNext.disabled = levelIndex === LEVEL_CONFIGS.length - 1;
  }

  function createLiquidSegment(color, depthFromBottom) {
    const segment = document.createElement("div");
    segment.className = `water-sort-segment color-${color}`;
    segment.style.bottom = `${depthFromBottom * SEGMENT_HEIGHT + SEGMENT_BOTTOM_OFFSET}px`;
    return segment;
  }

  function renderTube(tube, tubeIndex) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "water-sort-tube";
    button.dataset.index = String(tubeIndex);

    if (selectedTubeIndex === tubeIndex) {
      button.classList.add("selected");
    }

    if (tube.length === TUBE_CAPACITY && isTubeUniform(tube)) {
      button.classList.add("completed");
    }

    const inner = document.createElement("span");
    inner.className = "water-sort-tube__inner";

    tube.forEach(function (color, index) {
      inner.appendChild(createLiquidSegment(color, index));
    });

    button.appendChild(inner);
    return button;
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();
    boardElement.innerHTML = "";

    board.forEach(function (tube, tubeIndex) {
      fragment.appendChild(renderTube(tube, tubeIndex));
    });

    boardElement.appendChild(fragment);
    updateHeader();
  }

  function resetLevel() {
    board = cloneBoard(initialBoard);
    selectedTubeIndex = null;
    gameWon = false;
    renderBoard();
    setMessage("waterSort.message.start");
  }

  function goToLevel(nextIndex) {
    levelIndex = nextIndex;
    initialBoard = createBoardForLevel(levelIndex);
    resetLevel();
  }

  function handleTubeClick(tubeIndex) {
    if (gameWon) {
      return;
    }

    if (selectedTubeIndex === null) {
      if (board[tubeIndex].length === 0) {
        return;
      }

      selectedTubeIndex = tubeIndex;
      renderBoard();
      setMessage("waterSort.message.selected");
      return;
    }

    if (selectedTubeIndex === tubeIndex) {
      selectedTubeIndex = null;
      renderBoard();
      setMessage("waterSort.message.start");
      return;
    }

    const fromTube = board[selectedTubeIndex];
    const toTube = board[tubeIndex];
    const pouredAmount = pourLiquid(fromTube, toTube);
    const poured = pouredAmount > 0;

    selectedTubeIndex = null;

    if (!poured) {
      renderBoard();
      setMessage("waterSort.message.invalid");
      return;
    }

    gameWon = isSolved(board);
    renderBoard();

    if (gameWon) {
      setMessage("waterSort.message.win");
      return;
    }

    setMessage("waterSort.message.start");
  }

  boardElement.addEventListener("click", function (event) {
    const tubeButton = event.target.closest(".water-sort-tube");

    if (!tubeButton) {
      return;
    }

    handleTubeClick(Number(tubeButton.dataset.index));
  });

  btnRestart.addEventListener("click", resetLevel);

  btnPrev.addEventListener("click", function () {
    if (levelIndex > 0) {
      goToLevel(levelIndex - 1);
    }
  });

  btnNext.addEventListener("click", function () {
    if (levelIndex < LEVEL_CONFIGS.length - 1) {
      goToLevel(levelIndex + 1);
    }
  });

  return {
    enter: resetLevel,
    refreshLocale: renderMessage
  };
}
