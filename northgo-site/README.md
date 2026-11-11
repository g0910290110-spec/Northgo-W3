# Northgo 官網（Astro 重建版）

分析與規劃文件請見 [`../docs/northgo-analysis.md`](../docs/northgo-analysis.md)。

## 開發

需要 Node.js 18.20 以上（建議 22 LTS）。

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # 輸出到 dist/
npm run preview   # 預覽 dist/
npm run check     # TypeScript / Astro 型別檢查
```

若公司網路或防毒軟體會攔截 HTTPS，導致 `npm install` 出現 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`，請改用 Node 22.15 以上並設定 `NODE_OPTIONS=--use-system-ca`，讓 Node 使用 Windows 憑證庫。

## 網址與語系

| 語系 | 前綴 | 範例 |
| --- | --- | --- |
| English（預設） | 無 | `/services/freight-logistics/` |
| 繁體中文 | `/zh-tw` | `/zh-tw/services/freight-logistics/` |
| 日本語 | `/ja` | `/ja/contact/` |
| Tiếng Việt | `/vi` | `/vi/about/` |

網址結構與現有 northgo.com 一致，舊連結不會失效。所有網址統一帶結尾斜線，與 canonical、hreflang 和 sitemap 保持一致。

## 目錄結構

```
src/
  i18n/            四語系介面字串（en.json 為基準結構）與路由工具
  data/            offices.json：7 個據點，聯絡頁、地圖與 JSON-LD 共用
  content/         Markdown 內容，依語系分資料夾
    services/      4 個服務頁
    news/          新聞文章
    legal/         4 份法律條款
  components/      Header、Footer、Hero、StatBar、ServiceCard、QuoteForm、OfficeMap 等
  layouts/Base.astro   SEO：title、description、canonical、hreflang、OG、Organization JSON-LD
  pages/[...lang]/     所有頁面；預設語系沒有網址前綴
public/
  world-land.js    地圖陸地資料（Natural Earth），進入可視範圍時才載入
```

### 新增一篇新聞

在 `src/content/news/<語系>/` 各放一個同檔名的 `.md`：

```md
---
title: 標題
description: 摘要（也用於 meta description）
date: 2026-12-01
---

內文……
```

## 詢價表單

表單預設使用 [Netlify Forms](https://docs.netlify.com/forms/setup/)（`data-netlify="true"`，並內建防垃圾欄位），部署到 Netlify 後即可在後台收到表單。

若部署在其他平台（Vercel、Cloudflare Pages 等），請設定環境變數 `PUBLIC_FORM_ENDPOINT` 為 Formspree 或自有 API 的網址。本機預覽沒有表單後端，送出時會顯示錯誤訊息，屬正常現象。

## 部署

輸出為純靜態檔案，可部署到任何靜態主機。`public/_redirects`（Netlify 格式）會把舊的 `/sitemap.xml` 導向 `/sitemap-index.xml`。

## 上線前需要 Northgo 確認的內容

以下內容為依現有官網推導或撰寫的範本，需要公司確認或替換：

- **服務頁細節**：原官網只有貨運物流有完整內容。專案物流、倉儲物流、船務代理三頁的服務項目（例如半導體設備運輸、氣墊車、監視系統）是依產業慣例撰寫，請業務單位確認實際能力。
- **認證與合作夥伴**：首頁「建立在長期合作之上」區塊只放了原官網提過的事實；FIATA、IATA、AEO 等認證標誌請在取得正式檔案後加入（`src/pages/[...lang]/index.astro` 中已留註解位置）。
- **法律條款**：四份條款為通用範本，需要法務審閱，特別是準據法與管轄法院。
- **地圖座標**：據點座標為概略位置。
- **翻譯**：日文與越南文建議由當地據點同仁校稿。
- **社群分享圖**：目前沒有 `og:image`，建議提供 1200×630 的品牌圖片。
