# Mini Games Collection

一個放在 GitHub Pages 上的小型前端遊戲集合，目前包含：

- 1A2B
- 貪食蛇
- 踩地雷

## 線上版本

https://skyripples.github.io/mini_games_collection/

## 專案結構

- `index.html`: 頁面結構
- `style.css`: 視覺樣式
- `main.js`: 遊戲邏輯
- `scripts/validate_site.py`: 基本靜態檢查

## 本機開啟方式

這是純靜態網站，直接用瀏覽器打開 `index.html` 就能測試。

## GitHub 設定

這個 repo 目前包含：

- `.gitignore`: 避免把系統檔和編輯器雜訊提交上去
- `.github/workflows/validate.yml`: 每次 push 或 PR 時檢查 HTML 結構與 JavaScript 語法
- `.vscode/settings.json`: 讓 VS Code 的原始檔控制更穩定地顯示這個 repo

## 版本

- `V1.0.0`: 第一個正式上傳版本
