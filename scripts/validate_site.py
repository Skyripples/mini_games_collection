from html.parser import HTMLParser
from pathlib import Path

import esprima


ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
SRC_DIR = ROOT / "src"

REQUIRED_IDS = {
    "language-select",
    "theme-toggle",
    "menu-screen",
    "menu-buttons",
    "menu-search-input",
    "game-screen",
    "btn-back",
    "game-1a2b",
    "guess-input",
    "btn-guess",
    "btn-restart-1a2b",
    "message",
    "guess-count",
    "history-list",
    "game-cashforge",
    "btn-cashforge-recharge",
    "btn-cashforge-reset",
    "cashforge-coins-global",
    "btn-cashforge-tab-inventory",
    "btn-cashforge-tab-shop",
    "btn-cashforge-tab-enhance",
    "cashforge-view-inventory",
    "cashforge-view-shop",
    "cashforge-view-enhance",
    "cashforge-bag-equipment",
    "cashforge-bag-restore-scrolls",
    "cashforge-bag-guardian-stones",
    "cashforge-bag-guardian-crystals",
    "cashforge-bag-double-hammers",
    "cashforge-shop-coins",
    "btn-buy-restore-pack",
    "btn-buy-stone-pack",
    "btn-buy-crystal-pack",
    "cashforge-equipment-select",
    "btn-cashforge-enhance",
    "btn-cashforge-restore",
    "cashforge-use-stone",
    "cashforge-use-crystal",
    "cashforge-use-hammer",
    "cashforge-enhance-coins",
    "cashforge-enhance-level",
    "cashforge-enhance-restore-scrolls",
    "cashforge-enhance-guardian-stones",
    "cashforge-enhance-guardian-crystals",
    "cashforge-enhance-double-hammers",
    "cashforge-message",
    "cashforge-equipment-status-list",
    "game-snake",
    "btn-start-snake",
    "btn-snake-up",
    "btn-snake-left",
    "btn-snake-down",
    "btn-snake-right",
    "snake-score",
    "snake-message",
    "snake-canvas",
    "game-minesweeper",
    "select-minesweeper-difficulty",
    "btn-restart-minesweeper",
    "minesweeper-message",
    "minesweeper-difficulty-label",
    "minesweeper-size",
    "minesweeper-mines",
    "minesweeper-board",
    "game-2048",
    "btn-restart-2048",
    "score-2048",
    "message-2048",
    "board-2048",
    "game-breakout",
    "btn-start-breakout",
    "breakout-score",
    "breakout-lives",
    "breakout-message",
    "breakout-canvas",
    "game-raiden",
    "btn-restart-raiden",
    "raiden-score",
    "raiden-hp",
    "raiden-message",
    "raiden-canvas",
    "game-whack",
    "btn-start-whack",
    "btn-restart-whack",
    "whack-score",
    "whack-time",
    "whack-message",
    "whack-board",
    "game-pinball",
    "btn-restart-pinball",
    "pinball-score",
    "pinball-balls",
    "pinball-message",
    "pinball-canvas",
    "btn-pinball-left",
    "btn-launch-pinball",
    "btn-pinball-right",
    "game-dino",
    "btn-restart-dino",
    "dino-score",
    "dino-speed",
    "dino-message",
    "dino-canvas",
    "btn-dino-jump",
    "btn-dino-duck",
    "game-pacman",
    "btn-restart-pacman",
    "pacman-score",
    "pacman-lives",
    "pacman-message",
    "pacman-canvas",
    "btn-pacman-up",
    "btn-pacman-left",
    "btn-pacman-down",
    "btn-pacman-right",
    "game-checkers",
    "select-checkers-player-count",
    "btn-restart-checkers",
    "checkers-turn",
    "checkers-players",
    "checkers-message",
    "checkers-board",
    "game-chess",
    "btn-assist-chess",
    "btn-restart-chess",
    "chess-turn",
    "chess-message",
    "chess-board",
    "game-tictactoe",
    "btn-tictactoe-pvp",
    "btn-tictactoe-cpu",
    "btn-restart-tictactoe",
    "tictactoe-turn",
    "tictactoe-circle-owner",
    "tictactoe-cross-owner",
    "tictactoe-message",
    "tictactoe-board",
    "game-connectfour",
    "btn-connectfour-pvp",
    "btn-connectfour-cpu",
    "btn-restart-connectfour",
    "connectfour-turn",
    "connectfour-message",
    "connectfour-board",
    "game-tetris",
    "btn-restart-tetris",
    "tetris-score",
    "tetris-lines",
    "tetris-level",
    "tetris-message",
    "tetris-canvas",
    "tetris-hold-canvas",
    "tetris-next-canvas",
    "game-gomoku",
    "btn-gomoku-pvp",
    "btn-gomoku-cpu",
    "btn-restart-gomoku",
    "gomoku-turn",
    "gomoku-message",
    "gomoku-board",
    "game-sokoban",
    "btn-prev-sokoban",
    "btn-restart-sokoban",
    "btn-next-sokoban",
    "sokoban-level",
    "sokoban-moves",
    "sokoban-message",
    "sokoban-board",
    "game-huarongdao",
    "select-huarongdao-difficulty",
    "btn-restart-huarongdao",
    "huarongdao-difficulty-label",
    "huarongdao-moves",
    "huarongdao-message",
    "huarongdao-board",
    "game-reversi",
    "btn-reversi-pvp",
    "btn-reversi-cpu",
    "btn-assist-reversi",
    "btn-restart-reversi",
    "reversi-turn",
    "reversi-black-count",
    "reversi-white-count",
    "reversi-message",
    "reversi-board",
    "game-sudoku",
    "select-sudoku-difficulty",
    "btn-new-sudoku",
    "btn-hint-sudoku",
    "btn-sudoku-note",
    "btn-restart-sudoku",
    "sudoku-difficulty-label",
    "sudoku-hints",
    "sudoku-mistakes",
    "sudoku-message",
    "sudoku-board",
    "sudoku-number-pad",
    "game-slide",
    "select-slide-difficulty",
    "btn-restart-slide",
    "slide-moves",
    "slide-time",
    "slide-message",
    "slide-board",
    "game-memory",
    "select-memory-difficulty",
    "select-memory-theme",
    "btn-restart-memory",
    "memory-time",
    "memory-score",
    "memory-streak",
    "memory-message",
    "memory-board",
    "game-xiangqi",
    "btn-assist-xiangqi",
    "btn-restart-xiangqi",
    "xiangqi-turn",
    "xiangqi-message",
    "xiangqi-board",
    "game-shogi",
    "btn-assist-shogi",
    "btn-restart-shogi",
    "shogi-turn",
    "shogi-white-hand",
    "shogi-black-hand",
    "shogi-message",
    "shogi-promote-prompt",
    "shogi-promote-text",
    "btn-shogi-promote-yes",
    "btn-shogi-promote-no",
    "shogi-board",
    "game-go",
    "btn-pass-go",
    "btn-restart-go",
    "go-turn",
    "go-black-captures",
    "go-white-captures",
    "go-message",
    "go-board",
    "game-water-sort",
    "btn-prev-water-sort",
    "btn-restart-water-sort",
    "btn-next-water-sort",
    "water-sort-level",
    "water-sort-message",
    "water-sort-board",
}


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids = set()
        self.links = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)

        if "id" in attr_map:
            self.ids.add(attr_map["id"])

        if tag == "link":
            self.links.append(attr_map.get("href"))

        if tag == "script":
            self.scripts.append(attr_map)


def main() -> None:
    html = INDEX_HTML.read_text(encoding="utf-8")
    js_files = sorted(SRC_DIR.rglob("*.js"))
    if not js_files:
        raise SystemExit("No JavaScript modules found under src/")

    for js_file in js_files:
        js = js_file.read_text(encoding="utf-8")
        esprima.parseModule(js, tolerant=False)

        if "console.log" in js:
            raise SystemExit(f"Remove debug console.log output before publishing: {js_file}")

    parser = SiteParser()
    parser.feed(html)

    missing_ids = sorted(REQUIRED_IDS - parser.ids)
    if missing_ids:
        raise SystemExit(f"Missing HTML ids: {missing_ids}")

    if "style.css" not in parser.links:
        raise SystemExit("style.css link tag not found")

    if not any(
        script.get("src") == "src/main.js" and script.get("type") == "module"
        for script in parser.scripts
    ):
        raise SystemExit("src/main.js module script tag not found")

    print("Validation passed.")


if __name__ == "__main__":
    main()
