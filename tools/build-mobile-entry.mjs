#!/usr/bin/env node
/*
 * 組手機版單一入口 m.html：
 *   tools/mobile-entry.template.html（大畫面＋章節接力）
 *   + tools/mobile-step00.css / .js（行前四項，含四張圖解 data: URI）
 *
 * 課程本體是三支播放器：player-0105.html、player-0610.html、player-1115.html，
 * 由 m.html 依序載入同一個 iframe（各自沿用自己章節的播放引擎）。
 *
 * 用法：node tools/build-mobile-entry.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const dataURI = (file) => {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`不知道 ${path.extname(file)} 的 MIME`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

const IMAGES = {
  pf1: '01-version.png',
  pf2: '02-hwconfig.png',
  pf3: '03-convert.png',
  pf4: '04-formula.jpg',
};

const assets = {};
for (const [k, name] of Object.entries(IMAGES)) assets[k] = dataURI(path.join(ROOT, 'assets', 'preflight', name));

const css = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-step00.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-step00.js'), 'utf8');
const tpl = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-entry.template.html'), 'utf8');

// 封面主視覺：用 ffmpeg 先縮成 1080 寬的 jpg（約 100 KB）再內嵌
const coverJpg = path.join(ROOT, 'assets', 'mobile-cover-1080.jpg');
if (!fs.existsSync(coverJpg)) {
  throw new Error(`找不到封面圖 ${coverJpg}，請先執行：ffmpeg -i assets/mm3d-plus-cover.png -vf scale=1080:-1 -q:v 4 assets/mobile-cover-1080.jpg`);
}
const coverURI = dataURI(coverJpg);

const out = tpl
  .replace('/*__COVER_URL__*/', () => coverURI)
  .replace('/*__PF_CSS__*/', () => css)
  .replace('/*__PF_ASSETS__*/', () => JSON.stringify(assets))
  .replace('/*__PF_JS__*/', () => js);

const file = path.join(ROOT, 'm.html');
fs.writeFileSync(file, out, 'utf8');
console.log(`[build] 產出 m.html（${(fs.statSync(file).size / 1024).toFixed(0)} KB）`);
