# MM3D PLUS 多層校正互動教學

14 步完整教學。使用 GitHub Pages，發布入口為 index.html。

旁白：Apple 美佳高音質。

## STEP 00 校正前確認（2026-11-25）

按「開始教學」後先跳一頁確認清單，4 項都按過「我知道了」才放行。內容依原廠
《MM3D-Plus V3.02 多層校正使用說明》整理，重點是 **Z 軸輸出方向在 V3.02 反轉**
（Smax 32767 / Smin −32768）與 **HWConfig.exe 要勾 Z Line Out Inverse**。

4 項：版本與 Z 方向、Z Line Out Inverse、鏡頭檔轉換視窗、公式法欄位不要動。

每一項都有「怎麼確認」會開圖解視窗（紅框標出位置）：

| 檔案 | 內容 |
|---|---|
| `assets/preflight/01-version.png` | 安裝檔名 `MM3D-Plus-4.00_x64.exe`，紅框標版本 |
| `assets/preflight/02-hwconfig.png` | HWConfig UMC4，紅框標 Z Line Out Inverse |
| `assets/preflight/03-convert.png` | 開軟體的鏡頭校正檔位元數轉換視窗（轉換≠設定好了） |
| `assets/preflight/04-formula.jpg` | 新增校正檔畫面，紅叉標公式法欄位 |

- `assets/preflight.css`、`assets/preflight.js`，掛在 `index.html`，不動 14 步時間軸
- 圖解文字（標題、圖說、步驟）都在 `preflight.js` 最上面的 `DATA`，改文案不用碰版面
- 同一個分頁確認過就不再攔（sessionStorage）；右上角「設定 → 校正前確認」可重開
- 要單獨把這頁給客戶：`index.html?preflight=1`

## 手機離線預覽（V1）

`mobile-8-3.html`、`mobile-8-4.html` 是單一檔案的手機版預覽，所有圖片、旁白 mp3、影片都用 data: URI 內嵌，
可以離線直接開，不需要網路。第 8 步（畫面上顯示 STEP 08）的小段播放器，用「上一段／下一段」一次走一小段。

重新產生（改了 `assets/chapters/06-10/` 之後要重跑）：

```
node tools/build-mobile.mjs --chapter 06-10 --visible 8 --segment 4
```

`--segment` 就是畫面上的 8-1、8-2…編號。手機版外殼樣式放在 `tools/mobile-shell.css`。

## 手機版 V2（完整 14 步）

`mobile-01-04.html`、`mobile-05.html`、`mobile-06-09.html`、`mobile-10-14.html` 沿用 V2
（`mobile-8-3-v2.html`）的版面、字體、配色、局部放大與播放控制，每一頁都是單一離線檔，
四頁用「下一頁／上一頁」串成完整 14 步。

| 檔案 | 完整版顯示 | 小段數 | 來源章節 |
|---|---|---|---|
| `mobile-01-04.html` | STEP 01–04 | 18 | `assets/chapters/01-05/` |
| `mobile-05.html` | STEP 05 | 4 | `assets/chapters/06-10/` 第 1 步 |
| `mobile-06-09.html` | STEP 06–09 | 18 | `assets/chapters/06-10/` 第 2–5 步 |
| `mobile-10-14.html` | STEP 10–14 | 18 | `assets/chapters/11-15/` |

> 三個章節的播放引擎互不相同（01-05 是截圖＋3D 模型、06-10 是影片對時＋多層模型、
> 11-15 是 loadCue＋內建局部放大框）。硬合併會破壞既有的動畫與語音同步，所以一頁一章節群組，
> 各自沿用自己那一章的播放引擎，只用「下一頁／上一頁」互相銜接。

### 重新產生

```
node tools/build-mobile-0105.mjs    # → mobile-01-04.html
node tools/build-mobile-0610.mjs    # → mobile-05.html、mobile-06-09.html
node tools/build-mobile-1115.mjs    # → mobile-10-14.html
```

### 共用檔案

- `tools/mobile-v2.css` — V2 手機外殼樣式（含三個章節不同的 DOM 調整）
- `tools/mobile-v2-0105.js` — STEP 01–04 呈現層
- `tools/mobile-v2-0610.js` — STEP 05–09 呈現層（由 `V2_CONFIG.firstStep/lastStep` 決定頁面範圍）
- `tools/mobile-v2-1115.js` — STEP 10–14 呈現層
- `tools/mobile-v2-videolens.js` — 影片片段的局部放大框（第二個 `<video>` 做位移縮放裁切）
- `tools/mobile-assets/` — 給手機版用的 960×540 影片（同一段畫面重新編碼縮小，原始檔保留不動）

### 注意

- 旁白一律使用原始的 Apple 美佳 mp3，不重新編碼。
- 3D 模型的視角與取景完全沿用原模型自己算的結果，不重設相機。
- 局部放大框取自原畫面同一張圖（或同一段影片）裁切，不是重畫的介面。
- 影片類小段若原始教材沒有提供「正在說哪個欄位」的標示框，就不加放大框（不憑空發明位置）。
