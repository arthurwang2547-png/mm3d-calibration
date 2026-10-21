#!/usr/bin/env node
/*
 * 把 tools/step00-01.src.html 打包成單一離線檔 step00-01-v2.html。
 *
 * 只做一件事：把三張實機截圖換成 data: URI。
 * 截圖來源是 _mm3d_multi/shots/（多層校正簡報用的那 15 張）。
 *
 * 用法：
 *   node tools/build-step00.mjs
 *   → 產出 step00-01-v2.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'tools', 'step00-01.src.html');
const OUT = path.join(ROOT, 'step00-01-v2.html');
const SHOTS = path.resolve(ROOT, '..', '_mm3d_multi', 'shots');

const IMAGES = {
  '{{IMG_ENTRY}}': '02_newfile.jpg',    // 選項 → 鏡頭管理員 → 新增鏡頭
  '{{IMG_METHOD}}': '03_method.jpg',    // 校正檔選項：校正法
  '{{IMG_K}}': '04_kvalue.jpg',         // 格點校正：步驟 1～4
  '{{IMG_FOCAL}}': '05_focalheight.jpg', // 校正聚焦點：中立位置校正（Z 數值拉桿在這裡）
};

function dataURI(file) {
  if (!fs.existsSync(file)) throw new Error(`找不到截圖：${file}`);
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
}

let html = fs.readFileSync(SRC, 'utf8');
for (const [token, file] of Object.entries(IMAGES)) {
  const n = html.split(token).length - 1;
  if (!n) throw new Error(`原始檔找不到 ${token}`);
  html = html.split(token).join(dataURI(path.join(SHOTS, file)));
  console.log(`[build] ${token} → ${file}（${n} 處）`);
}

fs.writeFileSync(OUT, html, 'utf8');
console.log(`[build] 產出 ${path.basename(OUT)}（${(fs.statSync(OUT).size / 1024).toFixed(0)} KB）`);
