import { t } from "../core/i18n.js";

export function createSnakeGame({ canvas, btnStart, scoreText, message }) {
  const context = canvas.getContext("2d");
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;
  const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  canvas.tabIndex = 0;

  let snake = [];
  let food = { x: 0, y: 0 };
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

  function placeFood() {
    while (true) {
      const candidate = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };

      const isOnSnake = snake.some(function (part) {
        return part.x === candidate.x && part.y === candidate.y;
      });

      if (!isOnSnake) {
        food = candidate;
        return;
      }
    }
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#fafafa";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#e74c3c";
    context.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);

    context.fillStyle = "#2d3436";
    snake.forEach(function (part) {
      context.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
    });
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
    const willEatFood = head.x === food.x && head.y === food.y;
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

      if (snake.length === tileCount * tileCount) {
        stop();
        setMessage("snake.message.win", { score });
        draw();
        return;
      }

      placeFood();
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
    scoreText.textContent = "0";
    setMessage("snake.message.start");
    placeFood();
    draw();
  }

  function start() {
    stop();
    init();
    running = true;
    canvas.focus({ preventScroll: true });
    timer = window.setInterval(update, 150);
  }

  function handleKeyDown(event) {
    if (!arrowKeys.has(event.key)) {
      return;
    }

    event.preventDefault();

    if (!running) {
      return;
    }

    if (event.key === "ArrowUp" && dy !== 1) {
      dx = 0;
      dy = -1;
    } else if (event.key === "ArrowDown" && dy !== -1) {
      dx = 0;
      dy = 1;
    } else if (event.key === "ArrowLeft" && dx !== 1) {
      dx = -1;
      dy = 0;
    } else if (event.key === "ArrowRight" && dx !== -1) {
      dx = 1;
      dy = 0;
    }
  }

  btnStart.addEventListener("click", function (event) {
    event.currentTarget.blur();
    start();
  });

  return {
    enter: start,
    leave: stop,
    handleKeyDown,
    refreshLocale: refreshMessage
  };
}
