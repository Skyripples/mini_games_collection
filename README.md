# 小遊戲合集

使用 `HTML`、`CSS` 和 `JavaScript` 製作的瀏覽器小遊戲集合，並部署於 GitHub Pages。

## 線上遊玩

https://skyripples.github.io/mini_games_collection/

## 目前收錄遊戲

- 猜數字
- 井字棋
- 貪食蛇
- 2048
- 打磚塊
- 踩地雷
- 數獨
- 五子棋
- 黑白棋
- 俄羅斯方塊
- 西洋棋
- 象棋
- 圍棋

## 專案結構

- `index.html`：主頁面與各遊戲面板
- `style.css`：共用樣式、首頁卡片與各遊戲版面
- `src/main.js`：統一入口，初始化註冊表並管理畫面切換
- `src/games/index.js`：遊戲註冊表，集中管理 `id`、按鈕、面板與建立函式
- `src/games/`：各遊戲模組
- `src/core/`：共用入口、語系與主題切換
- `scripts/validate_site.py`：基本結構與 JavaScript 驗證腳本

## 本機預覽

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000/`。

## 版本

- `V3.1`：集中修正棋盤座標系、踩地雷深色模式可讀性、旗子標示與多項介面除錯，並暫時隱藏部分高複雜度遊戲進行細部調整。
- `V3.0`：完成統一入口、首頁註冊表驅動、主選單卡片動態生成、多語系與深色模式整合。
- `V2.0`：新增大量遊戲模組，擴充整體遊戲庫與行動版適配。
- `V1.0`：專案初版上線。
