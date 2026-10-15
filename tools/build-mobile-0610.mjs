#!/usr/bin/env node
/*
 * 把 assets/chapters/06-10 的指定步驟打包成 V2 手機版單一離線 HTML。
 *
 *   node tools/build-mobile-0610.mjs
 *     → mobile-05.html     （第 1 步 = 完整版顯示的 STEP 05）
 *     → mobile-06-09.html  （第 2~5 步 = 完整版顯示的 STEP 06~09）
 *
 * 06-10 章的播放引擎（影片對時、多層 3D 模型）跟 01-05、11-15 都不一樣，
 * 所以各自獨立成頁，用「下一頁」互相銜接。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTER = '06-10';
const CHAPTER_DIR = path.join(ROOT, 'assets', 'chapters', CHAPTER);
const TRANSPARENT_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css' };
const dataURI = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`不知道 ${path.extname(file)} 的 MIME`);
  if (!fs.existsSync(file)) throw new Error(`找不到素材：${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

const PAGES = [
  {
    out: 'mobile-05.html', first: 0, last: 0,
    nextPage: 'mobile-06-09.html', prevPage: 'mobile-01-04.html#last',
    title: 'STEP 05 手機版',
    note: '完整版顯示的 STEP 05（06-10 章第 1 步）。',
    intro: '完整版顯示的 STEP 05「進入 3D 多層校正」。<br>影片操作畫面會同步放大，每段播完停住，按「下一段」再繼續。',
  },
  {
    out: 'mobile-06-09.html', first: 1, last: 4,
    nextPage: 'mobile-10-14.html', prevPage: 'mobile-05.html',
    title: 'STEP 06–09 手機版',
    note: '完整版顯示的 STEP 06–09（06-10 章第 2~5 步）。按「上一頁」回到 STEP 05。',
    intro: '完整版顯示的 STEP 06–09：Z0 的意義、切換工作層、中間層落焦、補上實體高度層。<br>每一小段播完會停住，按「下一段」再繼續。',
  },
];

function loadCues() {
  const cuesSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'cues.js'), 'utf8');
  const voiceSrc = fs.readFileSync(path.join(CHAPTER_DIR, 'voice-meijia.js'), 'utf8');
  const CUES = new Function(`${cuesSrc}\nreturn CUES;`)();
  new Function('CUES', voiceSrc)(CUES);
  return CUES;
}

const shellCss = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2.css'), 'utf8');
const lensJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-videolens.js'), 'utf8');
const layerJs = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-v2-0610.js'), 'utf8');
const footerCssURI = dataURI(path.join(ROOT, 'assets', 'shared', 'course-footer.css'));

function build(CUES, page) {
  const steps = [];
  for (let i = page.first; i <= page.last; i++) steps.push(CUES[i]);
  const cues = steps.flat();
  console.log(`\n[build] ${page.out}：STEP ${String(page.first + 5).padStart(2, '0')}–${String(page.last + 5).padStart(2, '0')}，${cues.length} 小段`);

  // enter-3d.mp4 是第 1 步的影片；章節載入時會先準備一次，不內嵌會多一次 404
  const videos = new Set(['enter-3d.mp4']);
  const images = new Set(['frame-base.jpg']);   // frame-base 是 app.js 的備援圖
  cues.forEach((c) => { if (c.video) videos.add(c.video); if (c.image) images.add(c.image); });

  let html = fs.readFileSync(path.join(CHAPTER_DIR, 'index.html'), 'utf8');
  html = html.replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover"');

  const audioLines = [];
  let sawVoice = false;

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
      // 只內嵌這一頁涵蓋的步驟（不跨頁，所以不會漏音檔）
      for (let i = page.first; i <= page.last; i++) {
        CUES[i].forEach((c, j) => {
          const f = path.join(ROOT, '美佳音檔', CHAPTER, path.basename(c.audio));
          audioLines.push(`CUES[${i}][${j}].audio='${dataURI(f)}';`);
        });
      }
      js = `${js}\n${audioLines.join('\n')}\n`;
      sawVoice = true;
    }

    if (base === 'cues.js') {
      for (const name of [...videos, ...images]) {
        const uri = dataURI(path.join(CHAPTER_DIR, name));
        const before = js;
        js = js.split(`"${name}"`).join(`"${uri}"`).split(`'${name}'`).join(`'${uri}'`);
        if (js === before) console.log(`  (cues.js 沒有用到 ${name}，略過)`);
      }
    }

    if (base === 'app.js') {
      for (const name of images) {
        const uri = dataURI(path.join(CHAPTER_DIR, name));
        js = js.split(`'${name}'`).join(`'${uri}'`).split(`"${name}"`).join(`"${uri}"`);
      }
    }

    return `<script>${js}</script>`;
  });
  if (!sawVoice) throw new Error('index.html 找不到 voice-meijia.js');

  console.log(`  [build] 內嵌旁白 ${audioLines.length} 段、影片 ${videos.size} 支、圖片 ${images.size} 張`);

  for (const [attr, name] of [['href', 'shot-10.jpg']]) {
    const uri = dataURI(path.join(CHAPTER_DIR, name));
    const before = html;
    html = html.split(`${attr}="${name}"`).join(`${attr}="${uri}"`);
    if (html === before) throw new Error(`index.html 找不到 ${name}`);
  }
  const beforeLogo = html;
  html = html.split('href="mm3d-logo.png"').join(`href="${TRANSPARENT_PNG}"`);
  if (html === beforeLogo) throw new Error('index.html 找不到 mm3d-logo.png');

  const chapterCss = fs.readFileSync(path.join(CHAPTER_DIR, 'style.css'), 'utf8');
  const linkTag = '<link rel="stylesheet" href="style.css">';
  if (!html.includes(linkTag)) throw new Error('index.html 找不到 style.css');
  html = html.replace(linkTag, () => `<style>${chapterCss}</style>`);

  const config = {
    firstStep: page.first, lastStep: page.last,
    nextPage: page.nextPage, prevPage: page.prevPage,
    title: page.title, note: page.note, intro: page.intro,
  };

  html = html.replace(/<\/body>/, () =>
    `<style>${shellCss}</style>\n<script>window.V2_CONFIG=${JSON.stringify(config)};</script>\n<script>${lensJs}</script>\n<script>${layerJs}</script>\n</body>`);

  const out = path.join(ROOT, page.out);
  fs.writeFileSync(out, html, 'utf8');
  console.log(`  [build] 產出 ${page.out}（${(fs.statSync(out).size / 1048576).toFixed(2)} MB）`);
}

const CUES = loadCues();
console.log(`[build] 06-10 章：${CUES.length} 個步驟`);
for (const page of PAGES) build(CUES, page);
