#!/usr/bin/env node
/*
 * 把 assets/chapters/11-15 打包成 V2 手機版單一離線 HTML。
 *
 *   node tools/build-mobile-1115.mjs
 *     → mobile-10-14.html （lesson 11~15 = 完整版顯示的 STEP 10~14）
 *
 * 這一章自己就有局部放大框（#detail-zoom + #detail-svg），所以不用另外做裁圖放大，
 * 只要把它的位置與尺寸收進手機版面即可。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTER = '11-15';
const CHAPTER_DIR = path.join(ROOT, 'assets', 'chapters', CHAPTER);
const OUT_NAME = 'mobile-10-14.html';
const FIRST = 11, LAST = 15;
const TRANSPARENT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css' };
const dataURI = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`不知道 ${path.extname(file)} 的 MIME`);
  if (!fs.existsSync(file)) throw new Error(`找不到素材：${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

function loadCues() {
  const g = globalThis;
  g.window = g;
  new Function(fs.readFileSync(path.join(CHAPTER_DIR, 'cues.js'), 'utf8'))();
  return g.CUES;
}

function main() {
  const CUES = loadCues();
  const ids = Object.keys(CUES);
  console.log(`[build] 11-15 章：${ids.length} 段旁白`);

  const audios = new Set(), videos = new Set(), images = new Set(['frame-extra.jpg']);
  ids.forEach((id) => {
    const c = CUES[id];
    if (c.audio) audios.add(path.basename(c.audio));
  });
  // 影片檔名寫在 app.js 的 stateAt 裡，直接掃出來
  const appSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'app.js'), 'utf8');
  for (const m of appSrc.matchAll(/'([\w.-]+\.mp4)'/g)) videos.add(m[1]);
  console.log(`[build] 素材：旁白 ${audios.size} 段、影片 ${videos.size} 支 [${[...videos].join(', ')}]、圖片 ${images.size} 張`);

  let html = fs.readFileSync(path.join(CHAPTER_DIR, 'index.html'), 'utf8');
  html = html.replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover"');

  const footerCssURI = dataURI(path.join(ROOT, 'assets', 'shared', 'course-footer.css'));
  const audioLines = [];

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
      // 旁白是寫在 app.js 的 loadCue 裡（audio.src=c.audio），這裡改成把音檔塞進 CUES
      for (const id of ids) {
        const f = path.join(ROOT, '美佳音檔', CHAPTER, path.basename(CUES[id].audio));
        audioLines.push(`CUES['${id}'].audio='${dataURI(f)}';`);
      }
      js = `${js}\n${audioLines.join('\n')}\n`;
      console.log(`  [build] 內嵌旁白 ${audioLines.length} 段`);
    }

    if (base === 'app.js' || base === 'model.js' || base === 'model-base.js') {
      for (const name of [...videos, ...images]) {
        const uri = dataURI(path.join(CHAPTER_DIR, name));
        js = js.split(`'${name}'`).join(`'${uri}'`).split(`"${name}"`).join(`"${uri}"`);
      }
    }

    return `<script>${js}</script>`;
  });

  const beforeImg = html;
  html = html.split('href="frame-extra.jpg"').join(`href="${dataURI(path.join(CHAPTER_DIR, 'frame-extra.jpg'))}"`);
  if (html === beforeImg) throw new Error('index.html 找不到 frame-extra.jpg');
  const beforeLogo = html;
  html = html.split('href="mm3d-logo.png"').join(`href="${TRANSPARENT_PNG}"`);
  if (html === beforeLogo) throw new Error('index.html 找不到 mm3d-logo.png');

  const chapterCss = fs.readFileSync(path.join(CHAPTER_DIR, 'lesson.css'), 'utf8');
  const linkTag = '<link rel="stylesheet" href="lesson.css">';
  if (!html.includes(linkTag)) throw new Error('index.html 找不到 lesson.css');
  html = html.replace(linkTag, () => `<style>${chapterCss}</style>`);

  const shellCss = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2.css'), 'utf8');
  const layerJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-1115.js'), 'utf8');
  const config = {
    firstStep: FIRST, lastStep: LAST,
    nextPage: '', prevPage: 'mobile-06-09.html',
    title: 'STEP 10–14 手機版',
    note: '完整版顯示的 STEP 10–14（11-15 章）。按「上一頁」在第一段會回到 STEP 06–09。',
    intro: '完整版顯示的 STEP 10–14：新增層的中心焦點、四點同步、回到尺寸校正、格點校正、再新增層。<br>每一小段播完會停住，按「下一段」再繼續。',
  };

  html = html.replace(/<\/body>/, () =>
    `<style>${shellCss}</style>\n<script>window.V2_CONFIG=${JSON.stringify(config)};</script>\n<script>${layerJs}</script>\n</body>`);

  const out = path.join(ROOT, OUT_NAME);
  fs.writeFileSync(out, html, 'utf8');
  console.log(`[build] 產出 ${OUT_NAME}（${(fs.statSync(out).size / 1048576).toFixed(2)} MB）`);
}

main();
