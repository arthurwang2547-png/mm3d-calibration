#!/usr/bin/env node
/*
 * 把 assets/chapters/01-05 打包成「V2 手機版」單一離線 HTML。
 *
 * 沿用 tools/build-mobile.mjs 的做法（章節程式全部內嵌、素材換成 data: URI），
 * 但外殼改用 tools/mobile-v2.css + tools/mobile-v2-0105.js（Codex 的 mobile-8-3-v2.html 那一套）。
 *
 * 用法：
 *   node tools/build-mobile-0105.mjs
 *   → 產出 mobile-01-04.html（完整版顯示的 STEP 01～04，共 18 小段）
 *
 * 幾件刻意做的事：
 *   - 章節 app.js / flow-v7.js / model.js 一行都不改，只把素材路徑換成 data: URI。
 *   - 旁白用原始的 Apple 美佳 mp3，不重新編碼。
 *   - 影片 steps 用的兩支 mp4 先用 ffmpeg 縮成 960×540（tools/mobile-assets/），
 *     因為手機上操作畫面只有 ~370px 寬，原檔 1920×1080 是浪費。
 *   - 電腦版 topbar 在手機版是 display:none，所以 logo 換成 1×1 透明 PNG，省下 3 MB。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTER = '01-05';
const CHAPTER_DIR = path.join(ROOT, 'assets', 'chapters', CHAPTER);
const OUT_NAME = 'mobile-01-04.html';

// 手機版 topbar 是隱藏的，這張 logo 不會顯示
const TRANSPARENT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css' };
const dataURI = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`不知道 ${path.extname(file)} 的 MIME`);
  if (!fs.existsSync(file)) throw new Error(`找不到素材：${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

// 在 Node 裡真的跑一次章節資料，才知道每一小段實際用哪個旁白檔
function loadCues() {
  const cuesSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'cues.js'), 'utf8');
  const voiceSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'voice-meijia.js'), 'utf8');
  const CUES = new Function(`${cuesSrc}\nreturn CUES;`)();
  new Function('CUES', voiceSrc)(CUES);
  return CUES;
}

function main() {
  const CUES = loadCues();
  const total = CUES.reduce((n, c) => n + c.length, 0);
  console.log(`[build] 章節 ${CHAPTER}：${CUES.length} 個 step、共 ${total} 小段`);

  let html = fs.readFileSync(path.join(CHAPTER_DIR, 'index.html'), 'utf8');

  // 安全區域需要 viewport-fit=cover
  html = html.replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover"');

  // ── 章節 script 全部內嵌 ──────────────────────────────────────────
  const footerCssURI = dataURI(path.join(ROOT, 'assets', 'shared', 'course-footer.css'));
  const audioLines = [];
  let sawVoice = false;
  let videoCount = 0;

  html = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) => {
    const file = path.resolve(CHAPTER_DIR, src);
    if (!fs.existsSync(file)) throw new Error(`script 不存在：${file}`);
    let js = fs.readFileSync(file, 'utf8');
    const base = path.basename(file);

    if (base === 'course-footer.js') {
      const before = js;
      js = js.replace("'../../shared/course-footer.css'", `'${footerCssURI}'`);
      if (js === before) throw new Error('course-footer.js 的樣式路徑字串沒找到');
    }

    if (base === 'voice-meijia.js') {
      // 旁白全部內嵌，前後走動都不會斷
      CUES.forEach((list, i) => list.forEach((c, j) => {
        const baseName = path.basename(c.audio);
        const f = path.join(ROOT, '美佳音檔', CHAPTER, baseName);
        audioLines.push(`CUES[${i}][${j}].audio='${dataURI(f)}';`);
      }));
      js = `${js}\n${audioLines.join('\n')}\n`;
      sawVoice = true;
      console.log(`[build] 內嵌旁白 ${audioLines.length} 段`);
    }

    if (base === 'flow-v7.js') {
      for (const name of ['flow-focus-ui.png', 'flow-k-ui.png']) {
        const uri = dataURI(path.join(CHAPTER_DIR, name));
        const before = js;
        js = js.split(`'${name}'`).join(`'${uri}'`);
        if (js === before) throw new Error(`flow-v7.js 找不到 ${name}`);
      }
    }

    if (base === 'app.js') {
      // 兩支操作影片換成 960×540 的行動版（同一段畫面，只是重新編碼縮小）
      const map = {
        'field-k-adjust.mp4': 'field-k-adjust-960.mp4',
        'step05-grid-calibration.mp4': 'step05-grid-calibration-960.mp4',
      };
      for (const [orig, small] of Object.entries(map)) {
        const uri = dataURI(path.join(ROOT, 'tools', 'mobile-assets', small));
        const before = js;
        js = js.split(`'${orig}'`).join(`'${uri}'`);
        if (js === before) throw new Error(`app.js 找不到 ${orig}`);
        videoCount++;
      }
    }

    return `<script>${js}</script>`;
  });
  if (!sawVoice) throw new Error('index.html 找不到 voice-meijia.js');

  // ── 圖片：logo 換 1×1（topbar 隱藏）、截圖內嵌 ─────────────────────
  const shotURI = dataURI(path.join(CHAPTER_DIR, 'shot-05.jpg'));
  const shotBefore = html;
  html = html.split('href="shot-05.jpg"').join(`href="${shotURI}"`);
  if (html === shotBefore) throw new Error('index.html 找不到 shot-05.jpg');
  const logoBefore = html;
  html = html.split('href="mm3d-logo.png"').join(`href="${TRANSPARENT_PNG}"`);
  if (html === logoBefore) throw new Error('index.html 找不到 mm3d-logo.png');

  // ── 試聽用的音檔在手機版拿不到（topbar 隱藏），移除以免多一次 404 ──
  html = html.replace(/(<audio id="sample"[^>]*?)\ssrc="[^"]*"/, '$1 preload="none"');

  // ── 章節 style.css ───────────────────────────────────────────────
  const chapterCss = fs.readFileSync(path.join(CHAPTER_DIR, 'style.css'), 'utf8');
  const linkTag = '<link rel="stylesheet" href="style.css">';
  if (!html.includes(linkTag)) throw new Error('index.html 找不到 style.css');
  html = html.replace(linkTag, () => `<style>${chapterCss}</style>`);

  // ── V2 手機外殼 + 呈現層 ─────────────────────────────────────────
  const shellCss = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2.css'), 'utf8');
  const lensJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-videolens.js'), 'utf8');
  const layerJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-0105.js'), 'utf8');
  const config = {
    nextPage: 'mobile-05.html',
    prevPage: '',
    note: '完整版顯示的 STEP 01–04（01-05 章）。點畫面放大時會暫停，關閉後從原本時間接續；按「下一段」在最後一段會接到 STEP 05。',
  };

  html = html.replace(/<\/body>/, () =>
    `<style>${shellCss}</style>\n<script>window.V2_CONFIG=${JSON.stringify(config)};</script>\n<script>${lensJs}</script>\n<script>${layerJs}</script>\n</body>`);

  const out = path.join(ROOT, OUT_NAME);
  fs.writeFileSync(out, html, 'utf8');
  console.log(`[build] 影片內嵌 ${videoCount} 支、圖片內嵌 shot-05 + 2 張流程圖`);
  console.log(`[build] 產出 ${OUT_NAME}（${(fs.statSync(out).size / 1048576).toFixed(2)} MB）`);
}

main();
