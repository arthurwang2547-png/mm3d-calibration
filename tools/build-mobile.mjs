#!/usr/bin/env node
/*
 * 把 assets/chapters/<chapter> 的教學章節打成「單一離線 HTML」手機預覽版。
 *
 * 打包方式是由已上線的 mobile-8-3.html 反推出來的：
 *   1. 章節 style.css 內嵌成 <style>（放在 head）
 *   2. 12 個章節 script 全部內嵌（順序不變），course-footer.css 用 data: URI 帶進去
 *   3. cues.js 裡用到的 jpg/mp4 換成 data: URI
 *   4. 只把「這一步會播到的」旁白 mp3 換成 data: URI（接在 voice-meijia.js 結尾覆寫）
 *   5. 接上 tools/mobile-shell.css（手機版殼）與一層手機版覆寫 script
 *
 * 用法：
 *   node tools/build-mobile.mjs --chapter 06-10 --visible 8 --segment 4
 *   → 產出 mobile-8-4.html
 *
 * 為什麼要這支腳本：8-3 是手工打出來的，8-5 之後還要照做。把它固定下來，
 * 之後每個小段都只改 --segment 就能產生同一套視覺與行為的頁面。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 章節 → 顯示編號換算。06-10 章對應 lessons number 6..10，
// presentation-v9.js 的 visibleNumber() 把它們顯示成 5..9，所以 step = visible - 5。
const CHAPTERS = {
  '06-10': { visibleOffset: 5 },
};

// 每一頁的文案。key = <顯示編號>-<小段>。
const PRESETS = {
  '8-4': {
    headline: '滾輪微調，找到最亮焦點',
    subline: '數值、滑桿、聚焦鏡片同步・右側試刻亮度跟著變',
    cover: '語音、字幕與操作畫面同步播放。每一小段播完會停住，按「下一段」再繼續；按「上一段」可以回到 8-3。',
  },
};

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.css': 'text/css',
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`無法解析參數：${argv[i]}`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

function dataURI(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`不知道 ${ext} 的 MIME type`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

// 在 Node 裡真的跑一次章節的資料檔，才知道每個小段用到哪些素材。
// （不要用猜的：revision-v12.js 會 splice 掉一個小段，硬編索引一定會錯。）
function loadCues(chapterDir) {
  const cuesSrc = fs.readFileSync(path.join(chapterDir, 'cues.js'), 'utf8');
  const timelineSrc = fs.readFileSync(path.join(chapterDir, 'timeline.js'), 'utf8');
  const voiceSrc = fs.readFileSync(path.join(chapterDir, 'voice-meijia.js'), 'utf8');

  const CUES = new Function(`${cuesSrc}\nreturn CUES;`)();
  const TIMELINES = new Function(`${timelineSrc}\nreturn TIMELINES;`)();
  new Function('CUES', 'TIMELINES', voiceSrc)(CUES, TIMELINES);

  // 套用 revision-v12.js 對小段清單的增刪與 timeline 搬移
  const revPath = path.join(chapterDir, 'revision-v12.js');
  if (fs.existsSync(revPath)) {
    const rev = fs.readFileSync(revPath, 'utf8');
    for (const m of rev.matchAll(/CUES\[(\d+)\]\.splice\((\d+),\s*(\d+)\)/g)) {
      CUES[Number(m[1])].splice(Number(m[2]), Number(m[3]));
    }
    const move = rev.match(/TIMELINES\['([\d-]+)'\]\s*=\s*TIMELINES\['([\d-]+)'\]/);
    const drop = rev.match(/delete TIMELINES\['([\d-]+)'\]/);
    if (move && drop) {
      TIMELINES[move[1]] = TIMELINES[move[2]];
      delete TIMELINES[drop[1]];
    }
  }
  return { CUES, TIMELINES };
}

function buildOverride({ visible, segment, step, cue, headline, subline, coverText }) {
  const v = String(visible).padStart(2, '0');
  return [
    "document.body.id='mobile-preview';",
    `document.title='MM3D PLUS｜${visible}-${segment} 手機離線預覽';`,
    "const mh=document.createElement('div');mh.className='mobile-head';mh.innerHTML='<strong>MM3D PLUS</strong><span>手機配置試看</span><button id=\"mobile-settings-button\">設定</button>';document.body.prepend(mh);",
    `const mt=document.createElement('div');mt.className='mobile-title';mt.innerHTML='<small>${v}－${segment}｜校正各層焦點</small><h2>${headline}</h2><p>${subline}</p>';mh.after(mt);`,
    "const sf=document.createElement('div');sf.className='mobile-settings';sf.hidden=true;sf.innerHTML='<label>旁白音量 <input type=\"range\" min=\"0\" max=\"1\" step=\".05\" value=\"1\"></label>';document.body.append(sf);sf.querySelector('input').oninput=e=>narration.volume=+e.target.value;document.querySelector('#mobile-settings-button').onclick=()=>sf.hidden=!sf.hidden;",
    "// Keep the original UI image and overlays in their common coordinate system.",
    "fitScreen=function(){const b=$('.shotwrap').getBoundingClientRect();const w=Math.min(b.width,b.height*1000/730);frameW=w;frameH=w*730/1000;$('#screen-frame').style.width=w+'px';$('#screen-frame').style.height=frameH+'px'};",
    `// 這一頁只播第 ${visible} 步的小段：上一段／下一段一次走一小段，播完就停，等使用者按下一段。`,
    `const MOBILE_STEP=${step};`,
    "function syncMobileNav(){const last=CUES[MOBILE_STEP].length-1;$('#prev').disabled=cue<=0;$('#next').disabled=cue>=last;$('#prev').textContent='← 上一段';$('#next').textContent=cue<last?'下一段 →':'本步最後一段';}",
    "const oldRenderMobile=renderCue;renderCue=function(){oldRenderMobile();setLayout(false);fitScreen();syncMobileNav();};",
    "$('#prev').onclick=()=>{if(cue>0)startCue(cue-1)};",
    "$('#next').onclick=()=>{if(cue+1<CUES[MOBILE_STEP].length)startCue(cue+1)};",
    "$('#replay').onclick=()=>startCue(cue);",
    `step=MOBILE_STEP;cue=${cue};page();renderCue();$('#status').textContent='${visible}-${segment} 預覽・等待開始';$('#subtitle').textContent=CUES[MOBILE_STEP][${cue}].text;`,
    `const cover=document.createElement('div');cover.className='preview-cover';cover.innerHTML='<div><small>MM3D PLUS</small><h1>${visible}-${segment} 手機同步預覽</h1><p>${coverText}</p><button>開始預覽 ▶</button></div>';document.body.append(cover);cover.querySelector('button').onclick=()=>{cover.remove();startCue(${cue})};`,
    "for(const panel of [$('#operation'),$('#principle')])panel.addEventListener('click',e=>{if(e.target.closest('button'))return;const expanded=panel.classList.toggle('preview-full');if(expanded&&playing&&!paused)$('#pause').click();fitScreen();window.dispatchEvent(new Event('resize'))});",
    "window.addEventListener('resize',()=>{fitScreen();});",
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const chapter = args.chapter ?? '06-10';
  const visible = Number(args.visible);
  const segment = Number(args.segment);
  const conf = CHAPTERS[chapter];
  if (!conf || !Number.isFinite(visible) || !Number.isFinite(segment)) {
    throw new Error('用法：node tools/build-mobile.mjs --chapter 06-10 --visible 8 --segment 4');
  }
  const step = visible - conf.visibleOffset;
  const cue = segment - 1;

  const chapterDir = path.join(ROOT, 'assets', 'chapters', chapter);
  const { CUES } = loadCues(chapterDir);
  const cues = CUES[step];
  if (!cues || !cues[cue]) throw new Error(`找不到第 ${visible} 步第 ${segment} 小段`);

  // ── 1. 這一步所有小段用到的素材（上一段／下一段都會走到，所以整步都要）──
  const media = new Set();
  for (const c of cues) {
    if (c.image) media.add(c.image);
    if (c.video) media.add(c.video);
  }
  const uriOf = new Map();
  for (const name of media) {
    const f = path.join(chapterDir, name);
    if (!fs.existsSync(f)) throw new Error(`素材不存在：${f}`);
    uriOf.set(name, dataURI(f));
  }
  console.log(`[build] 顯示編號 ${visible}（step=${step}）共 ${cues.length} 小段，內嵌 ${media.size} 個圖／影片`);

  // ── 2. 旁白：這一步每一小段的 mp3 全部內嵌，前後走動都不會斷 ──────
  const audioLines = cues.map((c, i) => {
    const base = path.basename(c.audio);
    const f = path.join(ROOT, '美佳音檔', chapter, base);
    if (!fs.existsSync(f)) throw new Error(`旁白不存在：${f}`);
    return `CUES[${step}][${i}].audio='${dataURI(f)}';`;
  });

  // ── 3. 內嵌章節 script ─────────────────────────────────────────
  let html = fs.readFileSync(path.join(chapterDir, 'index.html'), 'utf8');
  const footerCssURI = dataURI(path.join(ROOT, 'assets', 'shared', 'course-footer.css'));
  let sawVoice = false;

  html = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) => {
    const file = path.resolve(chapterDir, src);
    if (!fs.existsSync(file)) throw new Error(`script 不存在：${file}`);
    let js = fs.readFileSync(file, 'utf8');
    const base = path.basename(file);
    if (base === 'course-footer.js') {
      const before = js;
      js = js.replace("'../../shared/course-footer.css'", `'${footerCssURI}'`);
      if (js === before) throw new Error('course-footer.js 的樣式路徑字串沒找到，打包規則要更新');
    }
    if (base === 'voice-meijia.js') {
      // 覆寫改成內嵌 mp3；一定要接在 voice-meijia.js 後面才會蓋掉它的相對路徑。
      js = `${js}\n${audioLines.join('\n')}\n`;
      sawVoice = true;
    }
    return `<script>${js}</script>`;
  });
  if (!sawVoice) throw new Error('index.html 找不到 voice-meijia.js，無法內嵌旁白');

  // ── 4. index.html 自己的圖、章節 style.css ──────────────────────
  for (const name of ['mm3d-logo.png', 'shot-10.jpg']) {
    const uri = dataURI(path.join(chapterDir, name));
    const before = html;
    html = html.split(`href="${name}"`).join(`href="${uri}"`);
    if (html === before) throw new Error(`index.html 找不到 ${name} 的參照`);
  }
  const chapterCss = fs.readFileSync(path.join(chapterDir, 'style.css'), 'utf8');
  const linkTag = '<link rel="stylesheet" href="style.css">';
  if (!html.includes(linkTag)) throw new Error('index.html 找不到 style.css 的 link');
  html = html.replace(linkTag, () => `<style>${chapterCss}</style>`);

  // cues.js 裡的 "image": "xxx.jpg" / "video": "xxx.mp4" → data: URI。
  // 單引號那組是 app.js 的備用字串（c().image||'frame-base.jpg'），沒換掉會多一次 404。
  for (const [name, uri] of uriOf) {
    html = html.split(`"${name}"`).join(`"${uri}"`);
    html = html.split(`'${name}'`).join(`'${uri}'`);
  }

  // ── 5. 手機版殼 + 覆寫 ─────────────────────────────────────────
  let shellCss = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-shell.css'), 'utf8');
  const hiddenPrev = '#prev{display:none!important}';
  if (!shellCss.includes(hiddenPrev)) throw new Error('mobile-shell.css 少了 #prev 的隱藏規則');
  // 8-3 那頁沒有上一段；這一頁要能用「上一段」走回 8-3，所以把那條隱藏規則改掉。
  shellCss = shellCss.replace(hiddenPrev, '#prev{display:flex!important}');

  // 8-3 的旁白只有兩行；8-5（「找到最佳焦點…」）是三行，原本 46px 的字幕框會把第三行切掉。
  // 這一頁把字幕框與頁尾各加 18px，讓三行完整顯示。
  const subtitleShort = 'body#mobile-preview .course-footer #subtitle{height:auto!important;min-height:40px!important;max-height:46px!important;';
  const footerShort = 'body#mobile-preview .course-footer{display:flex!important;flex-direction:column!important;flex:0 0 146px!important;height:146px!important;min-height:146px!important;';
  for (const [from, to] of [
    [subtitleShort, subtitleShort.replace('max-height:46px', 'max-height:64px')],
    [footerShort, footerShort.replace(/146px/g, '164px')],
  ]) {
    if (!shellCss.includes(from)) throw new Error(`mobile-shell.css 找不到要調整的規則：${from.slice(0, 60)}…`);
    shellCss = shellCss.replace(from, to);
  }

  const preset = PRESETS[`${visible}-${segment}`] ?? {};
  const override = buildOverride({
    visible,
    segment,
    step,
    cue,
    headline: args.headline ?? preset.headline ?? cues[cue].label,
    subline: args.subline ?? preset.subline ?? '上一段／下一段一次走一小段・播完停住等你按下一段',
    coverText: args.cover ?? preset.cover ?? '語音、字幕與操作畫面同步播放。每一小段播完會停住，按「下一段」再繼續，按「上一段」可以回到前一小段。',
  });

  const seen = new Set();
  html = html.replace(/<\/body>/g, (m) => {
    if (seen.has('body')) return m;
    seen.add('body');
    return `<style>${shellCss}</style>\n<script>${override}</script>\n</body>`;
  });

  const out = path.join(ROOT, `mobile-${visible}-${segment}.html`);
  fs.writeFileSync(out, html, 'utf8');
  const mb = (fs.statSync(out).size / 1048576).toFixed(2);
  console.log(`[build] 產出 ${path.relative(ROOT, out)}（${mb} MB）`);
}

main();
