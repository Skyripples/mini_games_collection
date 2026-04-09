import { t } from "../core/i18n.js";

export function createSnakeGame({
  canvas,
  btnStart,
  btnUp,
  btnLeft,
  btnDown,
  btnRight,
  scoreText,
  message
}) {
  const context = canvas.getContext("2d");
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;
  const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const foodCount = 2;

  canvas.tabIndex = 0;

  let snake = [];
  let foods = [];
  let dx = 1;
  let dy = 0;
  let score = 0;
  let timer = null;
  let running = false;
  let messageKey = "snake.message.start";

  function setMessage(key, params) {
    messageKey = key;
    message.textContent = t(key, params);
  }

  function refreshMessage() {
    if (messageKey === "snake.message.gameOver" || messageKey === "snake.message.win") {
      message.textContent = t(messageKey, { score });
      return;
    }

    message.textContent = t(messageKey);
  }

  function placeFood(existingFoods) {
    while (true) {
      const candidate = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };

      const isOnSnake = snake.some(function (part) {
        return part.x === candidate.x && part.y === candidate.y;
      });

      const isOnFood = existingFoods.some(function (food) {
        return food.x === candidate.x && food.y === candidate.y;
      });

      if (!isOnSnake && !isOnFood) {
        return candidate;
      }

      if (snake.length + existingFoods.length >= tileCount * tileCount) {
        return null;
      }
    }
  }

  function fillFoods() {
    while (foods.length < foodCount && snake.length + foods.length < tileCount * tileCount) {
      const nextFood = placeFood(foods);
      if (!nextFood) {
        return;
      }

      foods.push(nextFood);
    }
  }

  function drawRoundedRect(x, y, width, height, radius, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fill();
  }

  function drawCircle(centerX, centerY, radius, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  }

  function getSegmentDirection(part, nextPart, fallback) {
    if (!part || !nextPart) {
      return fallback;
    }

    const directionX = Math.sign(part.x - nextPart.x);
    const directionY = Math.sign(part.y - nextPart.y);

    if (directionX === 0 && directionY === 0) {
      return fallback;
    }

    return {
      x: directionX,
      y: directionY
    };
  }

  function drawBodySegment(part) {
    const inset = 2;
    drawRoundedRect(
      part.x * gridSize + inset,
      part.y * gridSize + inset,
      gridSize - inset * 2,
      gridSize - inset * 2,
      6,
      "#22c55e"
    );
  }

  function drawTail(part, direction) {
    const inset = 4;
    const x = part.x * gridSize + inset;
    const y = part.y * gridSize + inset;
    const size = gridSize - inset * 2;
    const centerX = part.x * gridSize + gridSize / 2;
    const centerY = part.y * gridSize + gridSize / 2;

    drawRoundedRect(x, y, size, size, 6, "#15803d");

    context.fillStyle = "#166534";
    context.beginPath();
    if (direction.x === 1) {
      context.moveTo(centerX + size / 2, centerY);
      context.lineTo(centerX + 2, centerY - 5);
      context.lineTo(centerX + 2, centerY + 5);
    } else if (direction.x === -1) {
      context.moveTo(centerX - size / 2, centerY);
      context.lineTo(centerX - 2, centerY - 5);
      context.lineTo(centerX - 2, centerY + 5);
    } else if (direction.y === 1) {
      context.moveTo(centerX, centerY + size / 2);
      context.lineTo(centerX - 5, centerY + 2);
      context.lineTo(centerX + 5, centerY + 2);
    } else {
      context.moveTo(centerX, centerY - size / 2);
      context.lineTo(centerX - 5, centerY - 2);
      context.lineTo(centerX + 5, centerY - 2);
    }
    context.closePath();
    context.fill();
  }

  function drawHead(part, direction) {
    const inset = 1;
    const x = part.x * gridSize + inset;
    const y = part.y * gridSize + inset;
    const size = gridSize - inset * 2;
    const centerX = part.x * gridSize + gridSize / 2;
    const centerY = part.y * gridSize + gridSize / 2;

    drawRoundedRect(x, y, size, size, 7, "#16a34a");
    drawCircle(centerX, centerY, 3, "#14532d");

    let eyeOffsetX = 4;
    let eyeOffsetY = 4;

    if (direction.x === 1) {
      eyeOffsetX = 6;
      eyeOffsetY = 4;
    } else if (direction.x === -1) {
      eyeOffsetX = -6;
      eyeOffsetY = 4;
    } else if (direction.y === 1) {
      eyeOffsetX = 4;
      eyeOffsetY = 6;
    } else {
      eyeOffsetX = 4;
      eyeOffsetY = -6;
    }

    if (direction.x !== 0) {
      drawCircle(centerX + eyeOffsetX, centerY - 3, 2.2, "#ffffff");
      drawCircle(centerX + eyeOffsetX, centerY + 3, 2.2, "#ffffff");
      drawCircle(centerX + eyeOffsetX + Math.sign(direction.x), centerY - 3, 1, "#111827");
      drawCircle(centerX + eyeOffsetX + Math.sign(direction.x), centerY + 3, 1, "#111827");
      return;
    }

    drawCircle(centerX - 3, centerY + eyeOffsetY, 2.2, "#ffffff");
    drawCircle(centerX + 3, centerY + eyeOffsetY, 2.2, "#ffffff");
    drawCircle(centerX - 3, centerY + eyeOffsetY + Math.sign(direction.y), 1, "#111827");
    drawCircle(centerX + 3, centerY + eyeOffsetY + Math.sign(direction.y), 1, "#111827");
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#fafafa";
    context.fillRect(0, 0, canvas.width, canvas.height);

    foods.forEach(function (food, index) {
      const fillColor = index % 2 === 0 ? "#ef4444" : "#f97316";

      drawCircle(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        fillColor
      );
      drawCircle(
        food.x * gridSize + gridSize / 2 + 3,
        food.y * gridSize + gridSize / 2 - 5,
        2,
        "#15803d"
      );
    });

    snake.slice(1, -1).forEach(drawBodySegment);

    if (snake.length > 1) {
      const tailDirection = getSegmentDirection(
        snake[snake.length - 1],
        snake[snake.length - 2],
        { x: -dx, y: -dy }
      );
      drawTail(snake[snake.length - 1], tailDirection);
    }

    const headDirection = getSegmentDirection(snake[0], snake[1], { x: dx, y: dy });
    drawHead(snake[0], headDirection);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    running = false;
  }

  function gameOver() {
    stop();
    setMessage("snake.message.gameOver", { score });
  }

  function update() {
    const head = {
      x: (snake[0].x + dx + tileCount) % tileCount,
      y: (snake[0].y + dy + tileCount) % tileCount
    };
    const eatenFoodIndex = foods.findIndex(function (food) {
      return head.x === food.x && head.y === food.y;
    });
    const willEatFood = eatenFoodIndex !== -1;
    const snakeBody = willEatFood ? snake : snake.slice(0, -1);

    const hitsSelf = snakeBody.some(function (part) {
      return part.x === head.x && part.y === head.y;
    });

    if (hitsSelf) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (willEatFood) {
      score += 1;
      scoreText.textContent = String(score);
      foods.splice(eatenFoodIndex, 1);

      if (snake.length === tileCount * tileCount) {
        stop();
        setMessage("snake.message.win", { score });
        draw();
        return;
      }

      fillFoods();
    } else {
      snake.pop();
    }

    draw();
  }

  function init() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    dx = 1;
    dy = 0;
    score = 0;
    foods = [];
    scoreText.textContent = "0";
    setMessage("snake.message.start");
    fillFoods();
    draw();
  }

  function start() {
    stop();
    init();
    running = true;
    canvas.focus({ preventScroll: true });
    timer = window.setInterval(update, 150);
  }

  function applyDirection(key) {
    if (!running) {
      return;
    }

    if (key === "ArrowUp" && dy !== 1) {
      dx = 0;
      dy = -1;
    } else if (key === "ArrowDown" && dy !== -1) {
      dx = 0;
      dy = 1;
    } else if (key === "ArrowLeft" && dx !== 1) {
      dx = -1;
      dy = 0;
    } else if (key === "ArrowRight" && dx !== -1) {
      dx = 1;
      dy = 0;
    }
  }

  function handleKeyDown(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();
    applyDirection(event.key);
  }

  function bindDirectionButton(button, key) {
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.currentTarget.blur();
      applyDirection(key);
    });
  }

  btnStart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    start();
  });
  bindDirectionButton(btnUp, "ArrowUp");
  bindDirectionButton(btnLeft, "ArrowLeft");
  bindDirectionButton(btnDown, "ArrowDown");
  bindDirectionButton(btnRight, "ArrowRight");

  return {
    enter: start,
    leave: stop,
    handleKeyDown,
    refreshLocale: refreshMessage
  };
}
