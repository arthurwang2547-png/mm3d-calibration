#!/usr/bin/env node
/*
 * 把 assets/chapters/06-10 的第 1 步（完整版顯示的 STEP 05「進入 3D 多層校正」）
 * 打包成 V2 手機版單一離線 HTML。
 *
 * 用法： node tools/build-mobile-05.mjs
 *   → 產出 mobile-05.html
 *
 * 為什麼要獨立一頁：這一段的播放引擎（影片對時、多層 3D 模型）屬於 06-10 章，
 * 跟 01-05 章不同，硬合併會破壞既有的動畫與語音同步，所以兩頁互相銜接。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTER = '06-10';
const CHAPTER_DIR = path.join(ROOT, 'assets', 'chapters', CHAPTER);
const STEP_INDEX = 0;                 // 06-10 的第 1 步 = 完整版顯示的 STEP 05
const OUT_NAME = 'mobile-05.html';
const TRANSPARENT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css' };
const dataURI = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`不知道 ${path.extname(file)} 的 MIME`);
  if (!fs.existsSync(file)) throw new Error(`找不到素材：${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

function loadCues() {
  const cuesSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'cues.js'), 'utf8');
  const voiceSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'voice-meijia.js'), 'utf8');
  const CUES = new Function(`${cuesSrc}\nreturn CUES;`)();
  new Function('CUES', voiceSrc)(CUES);
  return CUES;
}

function main() {
  const CUES = loadCues();
  const cues = CUES[STEP_INDEX];
  console.log(`[build] 06-10 章第 1 步（顯示 STEP 05）：${cues.length} 小段`);

  let html = fs.readFileSync(path.join(CHAPTER_DIR, 'index.html'), 'utf8');
  html = html.replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover"');

  const footerCssURI = dataURI(path.join(ROOT, 'assets', 'shared', 'course-footer.css'));
  const audioLines = [];
  let sawVoice = false, videoCount = 0;

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
      // 只有第 1 步的 4 段旁白需要內嵌（前後走動不會離開這一步）
      cues.forEach((c, j) => {
        const f = path.join(ROOT, '美佳音檔', CHAPTER, path.basename(c.audio));
        audioLines.push(`CUES[${STEP_INDEX}][${j}].audio='${dataURI(f)}';`);
      });
      js = `${js}\n${audioLines.join('\n')}\n`;
      sawVoice = true;
      console.log(`[build] 內嵌旁白 ${audioLines.length} 段`);
    }

    if (base === 'cues.js') {
      // 這一步用的影片，以及 app.js 在沒有截圖時的備援圖
      const names = new Set(['enter-3d.mp4', 'frame-base.jpg']);
      for (const name of names) {
        const uri = dataURI(path.join(CHAPTER_DIR, name));
        const before = js;
        js = js.split(`"${name}"`).join(`"${uri}"`).split(`'${name}'`).join(`'${uri}'`);
        if (js === before) throw new Error(`cues.js 找不到 ${name}`);
      }
      videoCount = 1;
    }

    return `<script>${js}</script>`;
  });
  if (!sawVoice) throw new Error('index.html 找不到 voice-meijia.js');

  // app.js 的備援圖字串也要換掉，否則載入時會多一次 404
  {
    const uri = dataURI(path.join(CHAPTER_DIR, 'frame-base.jpg'));
    html = html.split(`'frame-base.jpg'`).join(`'${uri}'`);
  }

  const shotURI = dataURI(path.join(CHAPTER_DIR, 'shot-10.jpg'));
  const beforeShot = html;
  html = html.split('href="shot-10.jpg"').join(`href="${shotURI}"`);
  if (html === beforeShot) throw new Error('index.html 找不到 shot-10.jpg');
  const beforeLogo = html;
  html = html.split('href="mm3d-logo.png"').join(`href="${TRANSPARENT_PNG}"`);
  if (html === beforeLogo) throw new Error('index.html 找不到 mm3d-logo.png');

  const chapterCss = fs.readFileSync(path.join(CHAPTER_DIR, 'style.css'), 'utf8');
  const linkTag = '<link rel="stylesheet" href="style.css">';
  if (!html.includes(linkTag)) throw new Error('index.html 找不到 style.css');
  html = html.replace(linkTag, () => `<style>${chapterCss}</style>`);

  const shellCss = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2.css'), 'utf8');
  const lensJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-videolens.js'), 'utf8');
  const layerJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-05.js'), 'utf8');
  const config = {
    nextPage: '',
    prevPage: 'mobile-01-04.html#last',
    note: '完整版顯示的 STEP 05（06-10 章第 1 步）。按「上一段」在第一段會回到 STEP 01–04 的最後一段。',
  };

  html = html.replace(/<\/body>/, () =>
    `<style>${shellCss}</style>\n<script>window.V2_CONFIG=${JSON.stringify(config)};</script>\n<script>${lensJs}</script>\n<script>${layerJs}</script>\n</body>`);

  const out = path.join(ROOT, OUT_NAME);
  fs.writeFileSync(out, html, 'utf8');
  console.log(`[build] 影片 ${videoCount} 支、截圖 shot-10 + frame-base 內嵌`);
  console.log(`[build] 產出 ${OUT_NAME}（${(fs.statSync(out).size / 1048576).toFixed(2)} MB）`);
}

main();
