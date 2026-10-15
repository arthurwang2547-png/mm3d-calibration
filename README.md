# MM3D PLUS 多層校正互動教學

14 步完整教學。使用 GitHub Pages，發布入口為 index.html。

旁白：Apple 美佳高音質。

## 手機離線預覽

`mobile-8-3.html`、`mobile-8-4.html` 是單一檔案的手機版預覽，所有圖片、旁白 mp3、影片都用 data: URI 內嵌，
可以離線直接開，不需要網路。第 8 步（畫面上顯示 STEP 08）的小段播放器，用「上一段／下一段」一次走一小段。

重新產生（改了 `assets/chapters/06-10/` 之後要重跑）：

```
node tools/build-mobile.mjs --chapter 06-10 --visible 8 --segment 4
```

`--segment` 就是畫面上的 8-1、8-2…編號。手機版外殼樣式放在 `tools/mobile-shell.css`。

## 手機版 V2（完整版 STEP 01–05）

`mobile-01-04.html`、`mobile-05.html` 沿用 V2（`mobile-8-3-v2.html`）的版面、字體、配色、局部放大與播放控制，
同樣是單一離線檔。兩頁互相銜接，各自沿用自己那一章的播放引擎：

| 檔案 | 內容 | 來源章節 |
|---|---|---|
| `mobile-01-04.html` | 完整版顯示的 STEP 01–04，共 18 小段 | `assets/chapters/01-05/` |
| `mobile-05.html` | 完整版顯示的 STEP 05「進入 3D 多層校正」，4 小段 | `assets/chapters/06-10/` 第 1 步 |

> 完整版的 STEP 05 屬於 06-10 章（影片播放＋多層 3D 模型），播放引擎與 01-05 章不同，
> 硬合併會破壞既有的動畫與語音同步，所以拆成兩頁互相銜接。

重新產生：

```
node tools/build-mobile-0105.mjs   # → mobile-01-04.html
node tools/build-mobile-05.mjs     # → mobile-05.html
```

V2 手機外殼樣式在 `tools/mobile-v2.css`，呈現層在 `tools/mobile-v2-0105.js` / `tools/mobile-v2-05.js`，
影片片段的放大框在 `tools/mobile-v2-videolens.js`。
`tools/mobile-assets/` 是給手機版用的 960×540 影片（同一段畫面重新編碼縮小，原始檔保留不動）。
