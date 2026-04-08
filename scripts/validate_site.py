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
    "game-screen",
    "btn-back",
    "game-1a2b",
    "guess-input",
    "btn-guess",
    "btn-restart-1a2b",
    "message",
    "guess-count",
    "history-list",
    "game-snake",
    "btn-start-snake",
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
    "game-chess",
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
    "game-reversi",
    "btn-reversi-pvp",
    "btn-reversi-cpu",
    "btn-restart-reversi",
    "reversi-turn",
    "reversi-black-count",
    "reversi-white-count",
    "reversi-message",
    "reversi-board",
    "game-sudoku",
    "select-sudoku-difficulty",
    "btn-new-sudoku",
    "btn-sudoku-note",
    "btn-restart-sudoku",
    "sudoku-difficulty-label",
    "sudoku-mistakes",
    "sudoku-message",
    "sudoku-board",
    "sudoku-number-pad",
    "game-xiangqi",
    "btn-restart-xiangqi",
    "xiangqi-turn",
    "xiangqi-message",
    "xiangqi-board",
    "game-go",
    "btn-pass-go",
    "btn-restart-go",
    "go-turn",
    "go-black-captures",
    "go-white-captures",
    "go-message",
    "go-board",
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
