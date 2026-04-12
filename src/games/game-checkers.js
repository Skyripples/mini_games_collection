import { t } from "../core/i18n.js";

const ROW_LENGTHS = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1];

const DIRECTIONS = [
  { row: 0, q: -2 },
  { row: 0, q: 2 },
  { row: -1, q: -1 },
  { row: -1, q: 1 },
  { row: 1, q: -1 },
  { row: 1, q: 1 }
];

const STAR_LINE_DIRECTIONS = [
  { row: 0, q: 2 },
  { row: 1, q: -1 },
  { row: 1, q: 1 }
];

const SLOT_META = {
  north: { color: "red", opposite: "south" },
  northEast: { color: "purple", opposite: "southWest" },
  southEast: { color: "yellow", opposite: "northWest" },
  south: { color: "blue", opposite: "north" },
  southWest: { color: "orange", opposite: "northEast" },
  northWest: { color: "green", opposite: "southEast" }
};

const PLAYER_SLOTS_BY_COUNT = {
  2: ["north", "south"],
  3: ["north", "southEast", "southWest"],
  4: ["northEast", "southEast", "southWest", "northWest"],
  5: ["north", "northEast", "southEast", "south", "southWest"],
  6: ["north", "northEast", "southEast", "south", "southWest", "northWest"]
};

function coordKey(row, q) {
  return `${row},${q}`;
}

function buildTrianglesByRows(rowCells) {
  function takeLeft(row, count) {
    return rowCells[row].slice(0, count);
  }

  function takeRight(row, count) {
    return rowCells[row].slice(rowCells[row].length - count);
  }

  return {
    north: [0, 1, 2, 3].flatMap(function (row) {
      return rowCells[row];
    }),
    south: [13, 14, 15, 16].flatMap(function (row) {
      return rowCells[row];
    }),
    northWest: [
      ...takeLeft(4, 4),
      ...takeLeft(5, 3),
      ...takeLeft(6, 2),
      ...takeLeft(7, 1)
    ],
    northEast: [
      ...takeRight(4, 4),
      ...takeRight(5, 3),
      ...takeRight(6, 2),
      ...takeRight(7, 1)
    ],
    southWest: [
      ...takeLeft(9, 1),
      ...takeLeft(10, 2),
      ...takeLeft(11, 3),
      ...takeLeft(12, 4)
    ],
    southEast: [
      ...takeRight(9, 1),
      ...takeRight(10, 2),
      ...takeRight(11, 3),
      ...takeRight(12, 4)
    ]
  };
}

function buildBoardGeometry() {
  const cells = [];
  const rowCells = {};
  const cellById = {};
  const idByCoord = {};

  for (let row = 0; row < ROW_LENGTHS.length; row += 1) {
    const length = ROW_LENGTHS[row];
    const startQ = -(length - 1);
    const ids = [];

    for (let index = 0; index < length; index += 1) {
      const q = startQ + index * 2;
      const id = coordKey(row, q);
      const cell = {
        id: id,
        row: row,
        q: q,
        x: q / 2,
        y: row
      };

      cells.push(cell);
      ids.push(id);
      cellById[id] = cell;
      idByCoord[coordKey(row, q)] = id;
    }

    rowCells[row] = ids;
  }

  const xValues = cells.map(function (cell) {
    return cell.x;
  });
  const yValues = cells.map(function (cell) {
    return cell.y;
  });

  const links = [];
  cells.forEach(function (cell) {
    STAR_LINE_DIRECTIONS.forEach(function (direction) {
      const targetId = idByCoord[coordKey(cell.row + direction.row, cell.q + direction.q)];
      if (targetId) {
        links.push({ from: cell.id, to: targetId });
      }
    });
  });

  return {
    cells: cells,
    cellById: cellById,
    idByCoord: idByCoord,
    rowCells: rowCells,
    triangles: buildTrianglesByRows(rowCells),
    links: links,
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues)
  };
}

const BOARD = buildBoardGeometry();

function createEmptyBoardState() {
  return Object.fromEntries(
    BOARD.cells.map(function (cell) {
      return [cell.id, null];
    })
  );
}

function createEmptyMoves() {
  return {
    step: new Set(),
    jump: new Set(),
    all: new Set()
  };
}

function createPlayers(playerCount) {
  const slots = PLAYER_SLOTS_BY_COUNT[playerCount] || PLAYER_SLOTS_BY_COUNT[2];

  return slots.map(function (slot, index) {
    const slotMeta = SLOT_META[slot];
    return {
      id: `checkers-player-${index + 1}`,
      slot: slot,
      color: slotMeta.color,
      target: slotMeta.opposite
    };
  });
}

export function createCheckersGame({
  boardElement,
  playerCountSelect,
  btnRestart,
  turnText,
  playersText,
  message
}) {
  let board = createEmptyBoardState();
  let players = [];
  let currentPlayerIndex = 0;
  let selectedCellId = null;
  let legalMoves = createEmptyMoves();
  let gameOver = false;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function getBoardMetrics() {
    const styles = window.getComputedStyle(boardElement);
    return {
      gapX: Number.parseFloat(styles.getPropertyValue("--checkers-gap-x")) || 40,
      gapY: Number.parseFloat(styles.getPropertyValue("--checkers-gap-y")) || 34,
      padding: Number.parseFloat(styles.getPropertyValue("--checkers-padding")) || 30,
      cellSize: Number.parseFloat(styles.getPropertyValue("--checkers-cell")) || 32
    };
  }

  function getCurrentPlayer() {
    return players[currentPlayerIndex];
  }

  function getPlayerById(playerId) {
    return players.find(function (player) {
      return player.id === playerId;
    });
  }

  function getPlayerLabel(player) {
    if (!player) {
      return "";
    }

    return t(`checkers.player.${player.color}`);
  }

  function getPlayerLabelById(playerId) {
    return getPlayerLabel(getPlayerById(playerId));
  }

  function getCellId(row, q) {
    return BOARD.idByCoord[coordKey(row, q)] || null;
  }

  function toPixelPosition(cell, metrics) {
    return {
      x: (cell.x - BOARD.minX) * metrics.gapX + metrics.padding,
      y: (cell.y - BOARD.minY) * metrics.gapY + metrics.padding
    };
  }

  function calculateMovesFromCell(fromCellId) {
    const fromCell = BOARD.cellById[fromCellId];
    if (!fromCell) {
      return createEmptyMoves();
    }

    const stepMoves = new Set();
    DIRECTIONS.forEach(function (direction) {
      const nextId = getCellId(fromCell.row + direction.row, fromCell.q + direction.q);
      if (nextId && !board[nextId]) {
        stepMoves.add(nextId);
      }
    });

    const jumpMoves = new Set();
    const visited = new Set([fromCellId]);
    const queue = [fromCellId];

    while (queue.length > 0) {
      const currentCellId = queue.shift();
      const currentCell = BOARD.cellById[currentCellId];

      DIRECTIONS.forEach(function (direction) {
        const middleId = getCellId(
          currentCell.row + direction.row,
          currentCell.q + direction.q
        );
        const landingId = getCellId(
          currentCell.row + direction.row * 2,
          currentCell.q + direction.q * 2
        );

        if (!middleId || !landingId) {
          return;
        }

        if (!board[middleId] || board[landingId]) {
          return;
        }

        if (visited.has(landingId)) {
          return;
        }

        visited.add(landingId);
        jumpMoves.add(landingId);
        queue.push(landingId);
      });
    }

    return {
      step: stepMoves,
      jump: jumpMoves,
      all: new Set([...stepMoves, ...jumpMoves])
    };
  }

  function clearSelection() {
    selectedCellId = null;
    legalMoves = createEmptyMoves();
  }

  function updateTurnText() {
    const currentPlayer = getCurrentPlayer();
    turnText.textContent = gameOver ? t("common.gameOver") : getPlayerLabel(currentPlayer);
  }

  function updatePlayersText() {
    playersText.innerHTML = "";

    const fragment = document.createDocumentFragment();
    players.forEach(function (player, index) {
      const tag = document.createElement("span");
      tag.className = `checkers-player-tag ${player.color}`;
      if (!gameOver && index === currentPlayerIndex) {
        tag.classList.add("active");
      }
      tag.textContent = getPlayerLabel(player);
      fragment.appendChild(tag);
    });

    playersText.appendChild(fragment);
  }

  function renderMessage() {
    const currentPlayer = getCurrentPlayer();

    switch (messageState.type) {
      case "selected":
        message.textContent = t("checkers.message.selected", {
          player: getPlayerLabelById(messageState.playerId)
        });
        return;
      case "noMoves":
        message.textContent = t("checkers.message.noMoves", {
          player: getPlayerLabelById(messageState.playerId)
        });
        return;
      case "invalid":
        message.textContent = t("checkers.message.invalid");
        return;
      case "turn":
        message.textContent = t("checkers.message.turn", {
          player: getPlayerLabel(currentPlayer)
        });
        return;
      case "win":
        message.textContent = t("checkers.message.win", {
          player: getPlayerLabelById(messageState.playerId)
        });
        return;
      case "start":
      default:
        message.textContent = t("checkers.message.start", {
          player: getPlayerLabel(currentPlayer)
        });
    }
  }

  function hasPlayerWon(player) {
    return BOARD.triangles[player.target].every(function (cellId) {
      return board[cellId] === player.id;
    });
  }

  function movePiece(fromCellId, toCellId) {
    const piecePlayerId = board[fromCellId];
    board[fromCellId] = null;
    board[toCellId] = piecePlayerId;
    clearSelection();

    const currentPlayer = getCurrentPlayer();
    if (hasPlayerWon(currentPlayer)) {
      gameOver = true;
      messageState = { type: "win", playerId: currentPlayer.id };
      render();
      renderMessage();
      return;
    }

    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    messageState = { type: "turn" };
    render();
    renderMessage();
  }

  function selectOwnPiece(cellId) {
    selectedCellId = cellId;
    legalMoves = calculateMovesFromCell(cellId);

    if (legalMoves.all.size === 0) {
      messageState = { type: "noMoves", playerId: board[cellId] };
    } else {
      messageState = { type: "selected", playerId: board[cellId] };
    }

    render();
    renderMessage();
  }

  function render() {
    const metrics = getBoardMetrics();
    const boardWidth =
      (BOARD.maxX - BOARD.minX) * metrics.gapX + metrics.padding * 2 + metrics.cellSize;
    const boardHeight =
      (BOARD.maxY - BOARD.minY) * metrics.gapY + metrics.padding * 2 + metrics.cellSize;
    const fragment = document.createDocumentFragment();

    boardElement.innerHTML = "";
    boardElement.style.width = `${boardWidth}px`;
    boardElement.style.height = `${boardHeight}px`;

    BOARD.links.forEach(function (link) {
      const fromCell = BOARD.cellById[link.from];
      const toCell = BOARD.cellById[link.to];
      const fromPosition = toPixelPosition(fromCell, metrics);
      const toPosition = toPixelPosition(toCell, metrics);
      const deltaX = toPosition.x - fromPosition.x;
      const deltaY = toPosition.y - fromPosition.y;
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      const line = document.createElement("span");

      line.className = "checkers-link";
      line.style.left = `${fromPosition.x}px`;
      line.style.top = `${fromPosition.y}px`;
      line.style.width = `${length}px`;
      line.style.transform = `translateY(-50%) rotate(${angle}deg)`;

      fragment.appendChild(line);
    });

    BOARD.cells.forEach(function (cell) {
      const cellButton = document.createElement("button");
      const position = toPixelPosition(cell, metrics);
      const ownerId = board[cell.id];
      const owner = ownerId ? getPlayerById(ownerId) : null;

      cellButton.type = "button";
      cellButton.className = "checkers-cell";
      cellButton.dataset.cellId = cell.id;
      cellButton.style.left = `${position.x}px`;
      cellButton.style.top = `${position.y}px`;
      cellButton.disabled = gameOver;

      if (selectedCellId === cell.id) {
        cellButton.classList.add("selected");
      }
      if (legalMoves.step.has(cell.id)) {
        cellButton.classList.add("valid-step");
      }
      if (legalMoves.jump.has(cell.id)) {
        cellButton.classList.add("valid-jump");
      }

      if (owner) {
        const piece = document.createElement("span");
        piece.className = `checkers-piece ${owner.color}`;
        cellButton.appendChild(piece);
      } else if (legalMoves.all.has(cell.id)) {
        const marker = document.createElement("span");
        marker.className = "checkers-move-dot";
        cellButton.appendChild(marker);
      }

      fragment.appendChild(cellButton);
    });

    boardElement.appendChild(fragment);
    updateTurnText();
    updatePlayersText();
  }

  function setupBoardByPlayerCount(playerCount) {
    players = createPlayers(playerCount);
    board = createEmptyBoardState();
    currentPlayerIndex = 0;
    gameOver = false;
    clearSelection();

    players.forEach(function (player) {
      BOARD.triangles[player.slot].forEach(function (cellId) {
        board[cellId] = player.id;
      });
    });
  }

  function startGame() {
    const playerCount = Number(playerCountSelect.value) || 2;
    setupBoardByPlayerCount(playerCount);
    messageState = { type: "start" };
    render();
    renderMessage();
    boardElement.focus({ preventScroll: true });
  }

  function handleBoardClick(event) {
    const cellButton = event.target.closest(".checkers-cell");
    if (!cellButton || gameOver) {
      return;
    }

    const clickedCellId = cellButton.dataset.cellId;
    const clickedOwnerId = board[clickedCellId];
    const currentPlayer = getCurrentPlayer();

    if (selectedCellId && legalMoves.all.has(clickedCellId)) {
      movePiece(selectedCellId, clickedCellId);
      boardElement.focus({ preventScroll: true });
      return;
    }

    if (selectedCellId === clickedCellId) {
      clearSelection();
      messageState = { type: "turn" };
      render();
      renderMessage();
      return;
    }

    if (clickedOwnerId === currentPlayer.id) {
      selectOwnPiece(clickedCellId);
      boardElement.focus({ preventScroll: true });
      return;
    }

    messageState = { type: "invalid" };
    renderMessage();
  }

  boardElement.addEventListener("click", handleBoardClick);
  playerCountSelect.addEventListener("change", function () {
    startGame();
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startGame();
  });

  return {
    enter: startGame,
    leave: clearSelection,
    refreshLocale: function () {
      render();
      renderMessage();
    }
  };
}
