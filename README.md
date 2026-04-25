# 收據記錄 PWA

## 快速開始

```bash
npm install
npm run dev
```

## 部署到 Vercel（一次設定，之後自動）

### 方法 A：CLI（推薦）
```bash
npm install -g vercel
npm run build
vercel --prod
```

### 方法 B：GitHub 自動部署
1. 把此資料夾 push 到 GitHub
2. 到 https://vercel.com → New Project → Import 你的 repo
3. 之後每次 `git push` 自動部署

## 手機安裝步驟

### iOS（Safari）
1. 用 Safari 開啟 Vercel 給你的網址
2. 點下方分享按鈕 → 「加入主畫面」
3. 點「新增」

### Android（Chrome）
1. 用 Chrome 開啟網址
2. 右上角選單 → 「新增至主螢幕」

## 換 App Icon

替換 `public/icon-192.png` 和 `public/icon-512.png` 為你的自訂圖示即可。
建議用正方形 PNG，背景不透明。
