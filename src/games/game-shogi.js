import { t } from "../core/i18n.js";

const BOARD_SIZE = 9;
const DROP_TYPES = ["rook", "bishop", "gold", "silver", "knight", "lance", "pawn"];
const PROMOTABLE_TYPES = new Set(["rook", "bishop", "silver", "knight", "lance", "pawn"]);

const KING_DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
];

const ORTHOGONAL_DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

const DIAGONAL_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1]
];

const HAND_PIECE_SYMBOLS = {
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩"
};

const PIECE_SYMBOLS = {
  black: {
    king: "王",
    rook: "飛",
    bishop: "角",
    gold: "金",
    silver: "銀",
    knight: "桂",
    lance: "香",
    pawn: "歩"
  },
  white: {
    king: "玉",
    rook: "飛",
    bishop: "角",
    gold: "金",
    silver: "銀",
    knight: "桂",
    lance: "香",
    pawn: "歩"
  }
};

const PROMOTED_SYMBOLS = {
  rook: "龍",
  bishop: "馬",
  silver: "全",
  knight: "圭",
  lance: "杏",
  pawn: "と"
};

function createPiece(side, type, promoted = false) {
  return {
    side: side,
    type: type,
    promoted: promoted
  };
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, function () {
    return Array(BOARD_SIZE).fill(null);
  });
}

function createEmptyHands() {
  const handTemplate = Object.fromEntries(
    DROP_TYPES.map(function (type) {
      return [type, 0];
    })
  );

  return {
    black: { ...handTemplate },
    white: { ...handTemplate }
  };
}

function cloneBoard(board) {
  return board.map(function (row) {
    return row.map(function (piece) {
      return piece ? { ...piece } : null;
    });
  });
}

function cloneHands(hands) {
  return {
    black: { ...hands.black },
    white: { ...hands.white }
  };
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getForwardStep(side) {
  return side === "black" ? -1 : 1;
}

function getOpponent(side) {
  return side === "black" ? "white" : "black";
}

function isPromotionZone(side, row) {
  return side === "black" ? row <= 2 : row >= 6;
}

function canPiecePromoteByMove(piece, fromRow, toRow) {
  if (piece.promoted || !PROMOTABLE_TYPES.has(piece.type)) {
    return false;
  }

  return isPromotionZone(piece.side, fromRow) || isPromotionZone(piece.side, toRow);
}

function isMandatoryPromotion(piece, toRow) {
  if (!PROMOTABLE_TYPES.has(piece.type) || piece.promoted) {
    return false;
  }

  const lastRow = piece.side === "black" ? 0 : BOARD_SIZE - 1;
  if (piece.type === "pawn" || piece.type === "lance") {
    return toRow === lastRow;
  }

  if (piece.type === "knight") {
    return piece.side === "black" ? toRow <= 1 : toRow >= BOARD_SIZE - 2;
  }

  return false;
}

function canDropTypeToRow(type, side, row) {
  const lastRow = side === "black" ? 0 : BOARD_SIZE - 1;
  if (type === "pawn" || type === "lance") {
    return row !== lastRow;
  }

  if (type === "knight") {
    return side === "black" ? row >= 2 : row <= BOARD_SIZE - 3;
  }

  return true;
}

function hasUnpromotedPawnInFile(board, side, col) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const piece = board[row][col];
    if (piece && piece.side === side && piece.type === "pawn" && !piece.promoted) {
      return true;
    }
  }

  return false;
}

function canDropPiece(board, side, type, row, col) {
  if (!isInsideBoard(row, col) || board[row][col]) {
    return false;
  }

  if (!canDropTypeToRow(type, side, row)) {
    return false;
  }

  if (type === "pawn" && hasUnpromotedPawnInFile(board, side, col)) {
    return false;
  }

  return true;
}

function addStepMoves(board, moves, piece, row, col, directions) {
  directions.forEach(function ([rowOffset, colOffset]) {
    const nextRow = row + rowOffset;
    const nextCol = col + colOffset;
    if (!isInsideBoard(nextRow, nextCol)) {
      return;
    }

    const target = board[nextRow][nextCol];
    if (!target || target.side !== piece.side) {
      moves.push({
        row: nextRow,
        col: nextCol,
        isCapture: Boolean(target)
      });
    }
  });
}

function addSlidingMoves(board, moves, piece, row, col, directions) {
  directions.forEach(function ([rowStep, colStep]) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol)) {
      const target = board[nextRow][nextCol];
      if (!target) {
        moves.push({
          row: nextRow,
          col: nextCol,
          isCapture: false
        });
      } else {
        if (target.side !== piece.side) {
          moves.push({
            row: nextRow,
            col: nextCol,
            isCapture: true
          });
        }
        break;
      }

      nextRow += rowStep;
      nextCol += colStep;
    }
  });
}

function getGoldDirections(side) {
  const forward = getForwardStep(side);
  return [
    [forward, -1],
    [forward, 0],
    [forward, 1],
    [0, -1],
    [0, 1],
    [-forward, 0]
  ];
}

function getSilverDirections(side) {
  const forward = getForwardStep(side);
  return [
    [forward, -1],
    [forward, 0],
    [forward, 1],
    [-forward, -1],
    [-forward, 1]
  ];
}

function getKnightDirections(side) {
  const forward = getForwardStep(side);
  return [
    [forward * 2, -1],
    [forward * 2, 1]
  ];
}

function getPseudoMoves(board, row, col, piece) {
  const moves = [];
  const forward = getForwardStep(piece.side);

  if (piece.type === "king") {
    addStepMoves(board, moves, piece, row, col, KING_DIRECTIONS);
    return moves;
  }

  if (piece.type === "gold" || (piece.promoted && ["silver", "knight", "lance", "pawn"].includes(piece.type))) {
    addStepMoves(board, moves, piece, row, col, getGoldDirections(piece.side));
    return moves;
  }

  if (piece.type === "silver") {
    addStepMoves(board, moves, piece, row, col, getSilverDirections(piece.side));
    return moves;
  }

  if (piece.type === "knight") {
    addStepMoves(board, moves, piece, row, col, getKnightDirections(piece.side));
    return moves;
  }

  if (piece.type === "lance") {
    addSlidingMoves(board, moves, piece, row, col, [[forward, 0]]);
    return moves;
  }

  if (piece.type === "pawn") {
    addStepMoves(board, moves, piece, row, col, [[forward, 0]]);
    return moves;
  }

  if (piece.type === "rook") {
    addSlidingMoves(board, moves, piece, row, col, ORTHOGONAL_DIRECTIONS);
    if (piece.promoted) {
      addStepMoves(board, moves, piece, row, col, DIAGONAL_DIRECTIONS);
    }
    return moves;
  }

  if (piece.type === "bishop") {
    addSlidingMoves(board, moves, piece, row, col, DIAGONAL_DIRECTIONS);
    if (piece.promoted) {
      addStepMoves(board, moves, piece, row, col, ORTHOGONAL_DIRECTIONS);
    }
    return moves;
  }

  return moves;
}

function findKing(board, side) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.side === side && piece.type === "king") {
        return { row, col };
      }
    }
  }

  return null;
}

function isInCheck(board, side) {
  const kingPosition = findKing(board, side);
  if (!kingPosition) {
    return true;
  }

  const opponent = getOpponent(side);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== opponent) {
        continue;
      }

      const attacks = getPseudoMoves(board, row, col, piece);
      const attackHit = attacks.some(function (attack) {
        return attack.row === kingPosition.row && attack.col === kingPosition.col;
      });
      if (attackHit) {
        return true;
      }
    }
  }

  return false;
}

function simulateMove(board, fromRow, fromCol, toRow, toCol, promote) {
  const nextBoard = cloneBoard(board);
  const movedPiece = { ...nextBoard[fromRow][fromCol] };

  nextBoard[fromRow][fromCol] = null;
  if (promote) {
    movedPiece.promoted = true;
  }
  nextBoard[toRow][toCol] = movedPiece;

  return nextBoard;
}

function simulateDrop(board, side, type, row, col) {
  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = createPiece(side, type, false);
  return nextBoard;
}

function getLegalMovesForPiece(board, row, col, piece) {
  const pseudoMoves = getPseudoMoves(board, row, col, piece);
  const legalMoves = [];

  pseudoMoves.forEach(function (move) {
    const canPromote = canPiecePromoteByMove(piece, row, move.row);
    const mandatoryPromote = canPromote && isMandatoryPromotion(piece, move.row);
    const boardAfterMove = simulateMove(board, row, col, move.row, move.col, mandatoryPromote);

    if (isInCheck(boardAfterMove, piece.side)) {
      return;
    }

    legalMoves.push({
      row: move.row,
      col: move.col,
      isCapture: move.isCapture,
      canPromote: canPromote,
      mandatoryPromote: mandatoryPromote
    });
  });

  return legalMoves;
}

function getLegalDropTargets(board, hands, side, type) {
  if (!hands[side][type]) {
    return [];
  }

  const legalTargets = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!canDropPiece(board, side, type, row, col)) {
        continue;
      }

      const boardAfterDrop = simulateDrop(board, side, type, row, col);
      if (!isInCheck(boardAfterDrop, side)) {
        legalTargets.push({ row, col, type });
      }
    }
  }

  return legalTargets;
}

function getAllLegalActions(board, hands, side) {
  const actions = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.side !== side) {
        continue;
      }

      const moves = getLegalMovesForPiece(board, row, col, piece);
      moves.forEach(function (move) {
        actions.push({
          kind: "move",
          fromRow: row,
          fromCol: col,
          toRow: move.row,
          toCol: move.col
        });
      });
    }
  }

  DROP_TYPES.forEach(function (type) {
    const drops = getLegalDropTargets(board, hands, side, type);
    drops.forEach(function (drop) {
      actions.push({
        kind: "drop",
        type: type,
        toRow: drop.row,
        toCol: drop.col
      });
    });
  });

  return actions;
}

function getPieceSymbol(piece) {
  if (piece.promoted && PROMOTED_SYMBOLS[piece.type]) {
    return PROMOTED_SYMBOLS[piece.type];
  }

  return PIECE_SYMBOLS[piece.side][piece.type];
}

function buildInitialBoard() {
  const board = createEmptyBoard();
  const backRank = ["lance", "knight", "silver", "gold", "king", "gold", "silver", "knight", "lance"];

  backRank.forEach(function (type, col) {
    board[0][col] = createPiece("white", type);
    board[BOARD_SIZE - 1][col] = createPiece("black", type);
  });

  board[1][1] = createPiece("white", "rook");
  board[1][7] = createPiece("white", "bishop");
  board[BOARD_SIZE - 2][1] = createPiece("black", "bishop");
  board[BOARD_SIZE - 2][7] = createPiece("black", "rook");

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    board[2][col] = createPiece("white", "pawn");
    board[BOARD_SIZE - 3][col] = createPiece("black", "pawn");
  }

  return board;
}

export function createShogiGame({
  boardElement,
  blackHandElement,
  whiteHandElement,
  btnAssist,
  btnRestart,
  turnText,
  message,
  promotePrompt,
  promoteText,
  btnPromoteYes,
  btnPromoteNo
}) {
  let board = [];
  let hands = createEmptyHands();
  let currentSide = "black";
  let selected = null;
  let legalMoves = [];
  let selectedDropType = null;
  let showHints = false;
  let gameOver = false;
  let pendingPromotion = null;
  let messageState = { type: "start" };

  boardElement.tabIndex = 0;

  function getSideLabel(side) {
    return t(side === "black" ? "players.sente" : "players.gote");
  }

  function getPieceLabelByType(type) {
    return t(`shogi.piece.${type}`);
  }

  function getPieceLabel(piece) {
    return getPieceLabelByType(piece.type);
  }

  function updateTurnText() {
    turnText.textContent = gameOver ? t("common.gameOver") : getSideLabel(currentSide);
  }

  function updateAssistButton() {
    btnAssist.classList.toggle("active", showHints);
  }

  function renderMessage() {
    switch (messageState.type) {
      case "turn":
        message.textContent = t("shogi.message.turn", { player: getSideLabel(currentSide) });
        return;
      case "selected":
        message.textContent = t("shogi.message.selected", {
          player: getSideLabel(currentSide),
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "selectOwnPiece":
        message.textContent = t("shogi.message.selectOwnPiece", {
          player: getSideLabel(currentSide)
        });
        return;
      case "invalidMove":
        message.textContent = t("shogi.message.invalidMove");
        return;
      case "dropSelected":
        message.textContent = t("shogi.message.dropSelected", {
          piece: getPieceLabelByType(messageState.typeName)
        });
        return;
      case "invalidDrop":
        message.textContent = t("shogi.message.invalidDrop");
        return;
      case "check":
        message.textContent = t("shogi.message.check", {
          player: getSideLabel(currentSide)
        });
        return;
      case "checkmate":
        message.textContent = t("shogi.message.checkmate", {
          winner: getSideLabel(messageState.winner)
        });
        return;
      case "captureKing":
        message.textContent = t("shogi.message.captureKing", {
          winner: getSideLabel(messageState.winner)
        });
        return;
      case "promotePending":
        message.textContent = t("shogi.message.promotePending", {
          piece: getPieceLabel(messageState.piece)
        });
        return;
      case "finished":
        message.textContent = t("shogi.message.finished");
        return;
      case "start":
      default:
        message.textContent = t("shogi.message.start");
    }
  }

  function setMessage(nextState) {
    messageState = nextState;
    renderMessage();
  }

  function clearSelection() {
    selected = null;
    legalMoves = [];
    selectedDropType = null;
  }

  function hidePromotionPrompt() {
    pendingPromotion = null;
    promotePrompt.classList.add("hidden");
  }

  function showPromotionPrompt(piece, fromRow, fromCol, toRow, toCol) {
    pendingPromotion = {
      piece: { ...piece },
      fromRow: fromRow,
      fromCol: fromCol,
      toRow: toRow,
      toCol: toCol
    };
    promotePrompt.classList.remove("hidden");
    promoteText.textContent = t("shogi.promotePrompt");
    setMessage({ type: "promotePending", piece: piece });
  }

  function getMoveAt(row, col) {
    return legalMoves.find(function (move) {
      return move.row === row && move.col === col;
    });
  }

  function renderHandsForSide(side, handElement) {
    handElement.innerHTML = "";
    let hasPiece = false;

    DROP_TYPES.forEach(function (type) {
      const count = hands[side][type];
      if (!count) {
        return;
      }

      hasPiece = true;
      const handButton = document.createElement("button");
      handButton.type = "button";
      handButton.className = "shogi-hand-piece";
      handButton.dataset.side = side;
      handButton.dataset.type = type;
      handButton.disabled = side !== currentSide || gameOver || Boolean(pendingPromotion);
      handButton.textContent = `${HAND_PIECE_SYMBOLS[type]} × ${count}`;

      if (side === currentSide && selectedDropType === type) {
        handButton.classList.add("selected");
      }

      if (side !== currentSide) {
        handButton.classList.add("readonly");
      }

      handElement.appendChild(handButton);
    });

    if (!hasPiece) {
      const emptyTag = document.createElement("span");
      emptyTag.className = "shogi-hand-empty";
      emptyTag.textContent = t("shogi.handEmpty");
      handElement.appendChild(emptyTag);
    }
  }

  function renderBoard() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("button");
        const piece = board[row][col];
        const move = getMoveAt(row, col);
        const isSelected = selected && selected.row === row && selected.col === col;
        const showMoveHint = showHints && Boolean(move);

        cell.type = "button";
        cell.className = "shogi-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.disabled = gameOver || Boolean(pendingPromotion);

        if (isSelected) {
          cell.classList.add("selected");
        }
        if (showMoveHint) {
          cell.classList.add("valid");
          if (move.isCapture) {
            cell.classList.add("capture");
          }
        }

        if (piece) {
          const pieceElement = document.createElement("span");
          pieceElement.className = `shogi-piece ${piece.side}`;
          if (piece.promoted) {
            pieceElement.classList.add("promoted");
          }
          pieceElement.textContent = getPieceSymbol(piece);
          cell.appendChild(pieceElement);
        } else if (showMoveHint) {
          const moveDot = document.createElement("span");
          moveDot.className = "shogi-move-dot";
          cell.appendChild(moveDot);
        }

        fragment.appendChild(cell);
      }
    }

    boardElement.innerHTML = "";
    boardElement.appendChild(fragment);
  }

  function render() {
    renderBoard();
    renderHandsForSide("white", whiteHandElement);
    renderHandsForSide("black", blackHandElement);
    updateTurnText();
    updateAssistButton();
    renderMessage();
  }

  function finishTurn() {
    currentSide = getOpponent(currentSide);
    selected = null;
    legalMoves = [];
    selectedDropType = null;

    const legalActions = getAllLegalActions(board, hands, currentSide);
    const checked = isInCheck(board, currentSide);
    if (legalActions.length === 0) {
      gameOver = true;
      if (checked) {
        setMessage({ type: "checkmate", winner: getOpponent(currentSide) });
      } else {
        setMessage({ type: "finished" });
      }
      render();
      return;
    }

    if (checked) {
      setMessage({ type: "check" });
    } else {
      setMessage({ type: "turn" });
    }
    render();
  }

  function executeMove(fromRow, fromCol, toRow, toCol, promote) {
    const movingPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    const movedPiece = {
      ...movingPiece,
      promoted: Boolean(movingPiece.promoted || promote)
    };

    board[fromRow][fromCol] = null;
    board[toRow][toCol] = movedPiece;

    if (capturedPiece) {
      if (capturedPiece.type === "king") {
        gameOver = true;
        clearSelection();
        hidePromotionPrompt();
        setMessage({ type: "captureKing", winner: currentSide });
        render();
        return;
      }

      hands[currentSide][capturedPiece.type] += 1;
    }

    hidePromotionPrompt();
    finishTurn();
  }

  function tryDropPiece(type, row, col) {
    if (!hands[currentSide][type]) {
      setMessage({ type: "invalidDrop" });
      renderMessage();
      return;
    }

    if (!canDropPiece(board, currentSide, type, row, col)) {
      setMessage({ type: "invalidDrop" });
      renderMessage();
      return;
    }

    const boardAfterDrop = simulateDrop(board, currentSide, type, row, col);
    if (isInCheck(boardAfterDrop, currentSide)) {
      setMessage({ type: "invalidDrop" });
      renderMessage();
      return;
    }

    board[row][col] = createPiece(currentSide, type, false);
    hands[currentSide][type] -= 1;
    hidePromotionPrompt();
    finishTurn();
  }

  function selectPiece(row, col) {
    const piece = board[row][col];
    if (!piece || piece.side !== currentSide) {
      return;
    }

    selectedDropType = null;
    selected = { row, col };
    legalMoves = getLegalMovesForPiece(board, row, col, piece);
    setMessage({ type: "selected", piece: piece });
    render();
  }

  function handleBoardClick(event) {
    const cell = event.target.closest(".shogi-cell");
    if (!cell) {
      return;
    }

    if (pendingPromotion) {
      return;
    }

    if (gameOver) {
      setMessage({ type: "finished" });
      renderMessage();
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const piece = board[row][col];

    if (selectedDropType) {
      if (!piece) {
        tryDropPiece(selectedDropType, row, col);
        return;
      }

      if (piece.side === currentSide) {
        selectPiece(row, col);
        return;
      }

      setMessage({ type: "invalidDrop" });
      renderMessage();
      return;
    }

    if (selected && selected.row === row && selected.col === col) {
      selected = null;
      legalMoves = [];
      setMessage({ type: "turn" });
      render();
      return;
    }

    const move = getMoveAt(row, col);
    if (selected && move) {
      const fromRow = selected.row;
      const fromCol = selected.col;
      const movingPiece = board[fromRow][fromCol];

      if (move.canPromote && !move.mandatoryPromote) {
        showPromotionPrompt(movingPiece, fromRow, fromCol, row, col);
        render();
        return;
      }

      executeMove(fromRow, fromCol, row, col, move.mandatoryPromote);
      return;
    }

    if (piece && piece.side === currentSide) {
      selectPiece(row, col);
      return;
    }

    setMessage({ type: selected ? "invalidMove" : "selectOwnPiece" });
    renderMessage();
  }

  function handleHandClick(event) {
    const handButton = event.target.closest(".shogi-hand-piece");
    if (!handButton || pendingPromotion || gameOver) {
      return;
    }

    const side = handButton.dataset.side;
    const type = handButton.dataset.type;
    if (side !== currentSide || !hands[side][type]) {
      return;
    }

    selected = null;
    legalMoves = [];
    if (selectedDropType === type) {
      selectedDropType = null;
      setMessage({ type: "turn" });
    } else {
      selectedDropType = type;
      setMessage({ type: "dropSelected", typeName: type });
    }
    render();
  }

  function confirmPromotion(promote) {
    if (!pendingPromotion) {
      return;
    }

    const { fromRow, fromCol, toRow, toCol } = pendingPromotion;
    executeMove(fromRow, fromCol, toRow, toCol, promote);
  }

  function startGame() {
    board = buildInitialBoard();
    hands = createEmptyHands();
    currentSide = "black";
    selected = null;
    legalMoves = [];
    selectedDropType = null;
    gameOver = false;
    showHints = false;
    hidePromotionPrompt();
    setMessage({ type: "start" });
    render();
    boardElement.focus({ preventScroll: true });
  }

  boardElement.addEventListener("click", handleBoardClick);
  blackHandElement.addEventListener("click", handleHandClick);
  whiteHandElement.addEventListener("click", handleHandClick);
  btnAssist.addEventListener("click", function (event) {
    event.currentTarget.blur();
    showHints = !showHints;
    render();
    boardElement.focus({ preventScroll: true });
  });
  btnRestart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    startGame();
  });
  btnPromoteYes.addEventListener("click", function (event) {
    event.currentTarget.blur();
    confirmPromotion(true);
  });
  btnPromoteNo.addEventListener("click", function (event) {
    event.currentTarget.blur();
    confirmPromotion(false);
  });

  return {
    enter: startGame,
    leave: function () {
      hidePromotionPrompt();
    },
    refreshLocale: function () {
      promoteText.textContent = t("shogi.promotePrompt");
      render();
    }
  };
}
