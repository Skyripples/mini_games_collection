export function createGame1A2B({
  btnGuess,
  btnRestart,
  guessInput,
  message,
  guessCountText,
  historyList
}) {
  let answer = "";
  let guessCount = 0;

  function generateAnswer() {
    const digits = [];

    while (digits.length < 4) {
      const nextDigit = Math.floor(Math.random() * 10).toString();
      if (!digits.includes(nextDigit)) {
        digits.push(nextDigit);
      }
    }

    return digits.join("");
  }

  function isValidGuess(guess) {
    if (!/^\d{4}$/.test(guess)) {
      return false;
    }

    return new Set(guess).size === 4;
  }

  function checkGuess(guess) {
    let aCount = 0;
    let bCount = 0;

    for (let index = 0; index < 4; index += 1) {
      if (guess[index] === answer[index]) {
        aCount += 1;
      } else if (answer.includes(guess[index])) {
        bCount += 1;
      }
    }

    return { aCount, bCount };
  }

  function addHistory(guess, result) {
    const item = document.createElement("li");
    item.textContent = `${guess} -> ${result.aCount}A${result.bCount}B`;
    historyList.prepend(item);
  }

  function reset() {
    answer = generateAnswer();
    guessCount = 0;
    guessCountText.textContent = "0";
    historyList.innerHTML = "";
    message.textContent = "遊戲開始！";
    guessInput.value = "";
    guessInput.disabled = false;
    btnGuess.disabled = false;
    guessInput.focus();
  }

  function handleGuess() {
    const guess = guessInput.value.trim();

    if (!isValidGuess(guess)) {
      message.textContent = "請輸入 4 個不重複的數字。";
      return;
    }

    guessCount += 1;
    guessCountText.textContent = String(guessCount);

    const result = checkGuess(guess);
    addHistory(guess, result);

    if (result.aCount === 4) {
      message.textContent = `恭喜答對！你用了 ${guessCount} 次猜中答案 ${answer}。`;
      btnGuess.disabled = true;
      guessInput.disabled = true;
    } else {
      message.textContent = `${result.aCount}A${result.bCount}B`;
    }

    guessInput.value = "";
    if (!guessInput.disabled) {
      guessInput.focus();
    }
  }

  btnGuess.addEventListener("click", handleGuess);
  btnRestart.addEventListener("click", reset);
  guessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleGuess();
    }
  });

  return {
    enter: reset
  };
}
