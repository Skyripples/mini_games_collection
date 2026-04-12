import { t } from "../core/i18n.js";

const LEVELS = [
  [
    "#######",
    "#     #",
    "# .$  #",
    "#  $. #",
    "#  @  #",
    "#######"
  ],
  [
    "########",
    "#   .  #",
    "#   $  #",
    "# $$#  #",
    "# .@.  #",
    "#      #",
    "########"
  ],
  [
    "#########",
    "#   .   #",
    "#   $   #",
    "# $$@$$ #",
    "#   .   #",
    "#   .   #",
    "#########"
  ]
];

const MOVE_MAP = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  s: [1, 0],
  a: [0, -1],
  d: [0, 1],
  W: [-1, 0],
  S: [1, 0],
  A: [0, -1],
  D: [0, 1]
};

function keyForCell(row, col) {
  return `${row},${col}`;
}

function parseLevel(rows) {
  const walls = new Set();
  const targets = new Set();
  const boxes = new Set();
  let player = { row: 0, col: 0 };
  const height = rows.length;
  const width = Math.max(
    ...rows.map(function (row) {
      return row.length;
    })
  );

  rows.forEach(function (rowText, row) {
    for (let col = 0; col < width; col += 1) {
      const cell = rowText[col] || " ";
      const cellKey = keyForCell(row, col);

      if (cell === "#") {
        walls.add(cellKey);
      }

      if (cell === "." || cell === "*" || cell === "+") {
        targets.add(cellKey);
      }

      if (cell === "$" || cell === "*") {
        boxes.add(cellKey);
      }

      if (cell === "@" || cell === "+") {
        player = { row: row, col: col };
      }
    }
  });

  return {
    width,
    height,
    walls,
    targets,
    boxes,
    player
  };
}

export function createSokobanGame({
  boardElement,
  btnPrev,
  btnRestart,
  btnNext,
  levelText,
  movesText,
  message
}) {
  let currentLevelIndex = 0;
  let state = parseLevel(LEVELS[0]);
  let moves = 0;
  let solved = false;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function isWall(row, col) {
    return state.walls.has(keyForCell(row, col));
  }

  function hasBox(row, col) {
    return state.boxes.has(keyForCell(row, col));
  }

  function isTarget(row, col) {
    return state.targets.has(keyForCell(row, col));
  }

  function isSolved() {
    return Array.from(state.targets).every(function (targetKey) {
      return state.boxes.has(targetKey);
    });
  }

  function updateStats() {
    levelText.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
    movesText.textContent = String(moves);
    btnPrev.disabled = currentLevelIndex === 0;
    btnNext.disabled = currentLevelIndex >= LEVELS.length - 1;
  }

  function renderMessage() {
    switch (messageState.type) {
      case "win":
        message.textContent = t("sokoban.message.win", {
          level: currentLevelIndex + 1
        });
        return;
      case "level":
        message.textContent = t("sokoban.message.level", {
          level: currentLevelIndex + 1
        });
        return;
      case "blocked":
        message.textContent = t("sokoban.message.blocked");
        return;
      case "start":
      default:
        message.textContent = t("sokoban.message.start");
    }
  }

  function render() {
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    boardElement.style.setProperty("--sokoban-columns", String(state.width));
    boardElement.style.setProperty("--sokoban-rows", String(state.height));

    for (let row = 0; row < state.height; row += 1) {
      for (let col = 0; col < state.width; col += 1) {
        const cell = document.createElement("div");
        const cellKey = keyForCell(row, col);

        cell.className = "sokoban-cell";

        if (isWall(row, col)) {
          cell.classList.add("wall");
        } else {
          cell.classList.add("floor");
        }

        if (isTarget(row, col)) {
          cell.classList.add("target");
        }

        if (state.player.row === row && state.player.col === col) {
          const player = document.createElement("div");
          player.className = "sokoban-entity sokoban-player";
          cell.appendChild(player);
        } else if (state.boxes.has(cellKey)) {
          const box = document.createElement("div");
          box.className = "sokoban-entity sokoban-box";

          if (isTarget(row, col)) {
            box.classList.add("on-target");
          }

          cell.appendChild(box);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.appendChild(fragment);
    updateStats();
    renderMessage();
  }

  function loadLevel(levelIndex) {
    currentLevelIndex = levelIndex;
    state = parseLevel(LEVELS[currentLevelIndex]);
    moves = 0;
    solved = false;
    messageState = { type: "level" };
    render();
    boardElement.focus({ preventScroll: true });
  }

  function tryMove(rowStep, colStep) {
    if (solved) {
      return;
    }

    const nextRow = state.player.row + rowStep;
    const nextCol = state.player.col + colStep;
    const boxRow = nextRow + rowStep;
    const boxCol = nextCol + colStep;
    const nextKey = keyForCell(nextRow, nextCol);
    const boxKey = keyForCell(boxRow, boxCol);

    if (isWall(nextRow, nextCol)) {
      messageState = { type: "blocked" };
      renderMessage();
      return;
    }

    if (hasBox(nextRow, nextCol)) {
      if (isWall(boxRow, boxCol) || hasBox(boxRow, boxCol)) {
        messageState = { type: "blocked" };
        renderMessage();
        return;
      }

      state.boxes.delete(nextKey);
      state.boxes.add(boxKey);
    }

    state.player = {
      row: nextRow,
      col: nextCol
    };
    moves += 1;

    if (isSolved()) {
      solved = true;
      messageState = { type: "win" };
    } else {
      messageState = { type: "level" };
    }

    render();
  }

  function handleKeyDown(event) {
    const move = MOVE_MAP[event.key];

    if (!move) {
      return;
    }

    event.preventDefault();
    tryMove(move[0], move[1]);
  }

  btnPrev.addEventListener("click", function (event) {
    event.currentTarget.blur();
    if (currentLevelIndex > 0) {
      loadLevel(currentLevelIndex - 1);
    }
  });

  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    loadLevel(currentLevelIndex);
  });

  btnNext.addEventListener("click", function (event) {
    event.currentTarget.blur();
    if (currentLevelIndex < LEVELS.length - 1) {
      loadLevel(currentLevelIndex + 1);
    }
  });

  return {
    enter: function () {
      loadLevel(currentLevelIndex);
    },
    handleKeyDown: handleKeyDown,
    refreshLocale: render
  };
}
