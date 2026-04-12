import { t } from "../core/i18n.js";

const LEVELS = [
  [
    ["red", "blue", "blue", "red"],
    ["yellow", "red", "yellow", "blue"],
    ["blue", "yellow", "red", "yellow"],
    [],
    []
  ],
  [
    ["green", "red", "blue", "green"],
    ["yellow", "green", "yellow", "red"],
    ["blue", "yellow", "red", "blue"],
    ["green", "blue", "red", "yellow"],
    [],
    []
  ],
  [
    ["purple", "green", "blue", "purple"],
    ["red", "yellow", "red", "green"],
    ["blue", "purple", "yellow", "blue"],
    ["green", "red", "purple", "yellow"],
    [],
    []
  ]
];

const TUBE_CAPACITY = 4;

function cloneLevel(level) {
  return level.map(function (tube) {
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

function pourLiquid(fromTube, toTube) {
  if (!canPour(fromTube, toTube)) {
    return false;
  }

  const fromColor = fromTube[fromTube.length - 1];
  const movableCount = getTopColorBlockCount(fromTube);
  const availableSpace = TUBE_CAPACITY - toTube.length;
  const amount = Math.min(movableCount, availableSpace);

  for (let count = 0; count < amount; count += 1) {
    toTube.push(fromTube.pop());
  }

  return amount > 0;
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
  let board = cloneLevel(LEVELS[levelIndex]);
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
    levelText.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    btnPrev.disabled = levelIndex === 0;
    btnNext.disabled = levelIndex === LEVELS.length - 1;
  }

  function createLiquidSegment(color, depthFromBottom) {
    const segment = document.createElement("div");
    segment.className = `water-sort-segment color-${color}`;
    segment.style.bottom = `${depthFromBottom * 24 + 6}px`;
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
    board = cloneLevel(LEVELS[levelIndex]);
    selectedTubeIndex = null;
    gameWon = false;
    renderBoard();
    setMessage("waterSort.message.start");
  }

  function goToLevel(nextIndex) {
    levelIndex = nextIndex;
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
    const poured = pourLiquid(fromTube, toTube);

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
    if (levelIndex < LEVELS.length - 1) {
      goToLevel(levelIndex + 1);
    }
  });

  return {
    enter: resetLevel,
    refreshLocale: renderMessage
  };
}