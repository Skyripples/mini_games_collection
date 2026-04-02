# 小遊戲合集

一個放在 GitHub Pages 上的小型前端遊戲集合，目前包含：

- 1A2B
- 貪食蛇
- 踩地雷
- 2048
- 打磚塊
- 西洋棋
- 圈圈叉叉
- 俄羅斯方塊
- 五子棋
- 黑白棋
- 數獨
- 象棋
- 圍棋

## 線上版本

https://skyripples.github.io/mini_games_collection/

## 專案結構

- `index.html`: 頁面結構
- `style.css`: 視覺樣式
- `src/main.js`: 模組化入口
- `src/core/app.js`: 共用畫面切換與遊戲啟動邏輯
- `src/games/`: 各個小遊戲的獨立模組
- `scripts/validate_site.py`: 基本靜態檢查

## 本機開啟方式

這個專案現在使用原生 ES Modules，建議用簡單的本機伺服器來測試：

```bash
python -m http.server 8000
```

然後打開 `http://localhost:8000/`。

## GitHub 設定

這個 repo 目前包含：

- `.gitignore`: 避免把系統檔和編輯器雜訊提交上去
- `.github/workflows/validate.yml`: 每次 push 或 PR 時檢查 HTML 結構與 JavaScript 語法
- `.vscode/settings.json`: 讓 VS Code 的原始檔控制更穩定地顯示這個 repo

## 版本

- `V2.0`: 模組化整理完成，新增多款棋類與益智 / 動作小遊戲
- `V1.0`: 第一個正式上傳版本
