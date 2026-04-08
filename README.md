# 小遊戲合集

一個使用原生 `HTML`、`CSS`、`JavaScript` 製作的迷你遊戲網站，已部署到 GitHub Pages。

## 線上遊玩

https://skyripples.github.io/mini_games_collection/

## 目前收錄

- 1A2B
- 井字棋
- 貪食蛇
- 2048
- 打磚塊
- 離線小恐龍
- 踩地雷
- 數獨
- 五子棋
- 黑白棋
- 俄羅斯方塊
- 彈珠台
- 小精靈
- 西洋棋
- 象棋
- 圍棋

## 專案結構

- `index.html`：頁面骨架與各遊戲面板
- `style.css`：全站樣式、主選單卡片與遊戲介面樣式
- `src/main.js`：統一入口，負責初始化註冊表、主選單、語言與主題
- `src/games/index.js`：遊戲註冊表，集中管理遊戲 id、按鈕 id、panel id、建立函式與主選單卡片資料
- `src/games/`：各遊戲模組
- `src/core/`：共用 app、i18n、theme 模組
- `scripts/validate_site.py`：靜態驗證腳本

## 本機啟動

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000/`。

## 版本

- `V3.0`：完成統一入口管理、遊戲註冊表集中化、主選單卡片改為依註冊表動態生成，並整理首頁與遊戲介面
- `V2.0`：擴充多款遊戲、加入語言切換、深色模式、首頁遊戲縮圖與行動裝置相容調整
- `V1.0`：專案初始版本
