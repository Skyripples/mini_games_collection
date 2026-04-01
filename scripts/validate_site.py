from html.parser import HTMLParser
from pathlib import Path

import esprima


ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
MAIN_JS = ROOT / "main.js"

REQUIRED_IDS = {
    "menu-screen",
    "game-screen",
    "btn-1a2b",
    "btn-snake",
    "btn-minesweeper",
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
    "btn-restart-minesweeper",
    "minesweeper-message",
    "minesweeper-board",
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
            self.scripts.append(attr_map.get("src"))


def main() -> None:
    html = INDEX_HTML.read_text(encoding="utf-8")
    js = MAIN_JS.read_text(encoding="utf-8")

    esprima.parseScript(js, tolerant=False)

    parser = SiteParser()
    parser.feed(html)

    missing_ids = sorted(REQUIRED_IDS - parser.ids)
    if missing_ids:
        raise SystemExit(f"Missing HTML ids: {missing_ids}")

    if "style.css" not in parser.links:
        raise SystemExit("style.css link tag not found")

    if "main.js" not in parser.scripts:
        raise SystemExit("main.js script tag not found")

    if "console.log" in js:
        raise SystemExit("Remove debug console.log output before publishing")

    print("Validation passed.")


if __name__ == "__main__":
    main()
