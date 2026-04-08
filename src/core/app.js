export function createGameHub({ menuScreen, gameScreen, backButton, entries }) {
  let activeEntry = null;

  function blurActiveElement() {
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
  }

  function hideAllGames() {
    Object.values(entries).forEach(({ panel }) => {
      panel.classList.add("hidden");
    });
  }

  function leaveCurrentGame() {
    if (activeEntry && typeof activeEntry.game.leave === "function") {
      activeEntry.game.leave();
    }
  }

  function showMenu() {
    leaveCurrentGame();
    activeEntry = null;
    blurActiveElement();
    menuScreen.classList.add("active");
    gameScreen.classList.remove("active");
    hideAllGames();
  }

  function showGame(name) {
    const nextEntry = entries[name];
    if (!nextEntry) {
      return;
    }

    if (
      activeEntry &&
      activeEntry !== nextEntry &&
      typeof activeEntry.game.leave === "function"
    ) {
      activeEntry.game.leave();
    }

    activeEntry = nextEntry;
    blurActiveElement();
    menuScreen.classList.remove("active");
    gameScreen.classList.add("active");
    hideAllGames();
    nextEntry.panel.classList.remove("hidden");
    if (typeof nextEntry.game.enter === "function") {
      nextEntry.game.enter();
    }
    if (typeof nextEntry.game.refreshLocale === "function") {
      nextEntry.game.refreshLocale();
    }
  }

  Object.entries(entries).forEach(([name, entry]) => {
    entry.button.addEventListener("click", () => {
      showGame(name);
    });
  });

  backButton.addEventListener("click", showMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "F7") {
      event.preventDefault();
      return;
    }

    if (activeEntry && typeof activeEntry.game.handleKeyDown === "function") {
      activeEntry.game.handleKeyDown(event);
    }
  });
  document.addEventListener("keyup", (event) => {
    if (activeEntry && typeof activeEntry.game.handleKeyUp === "function") {
      activeEntry.game.handleKeyUp(event);
    }
  });

  return {
    showMenu,
    showGame
  };
}
