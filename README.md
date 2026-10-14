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
