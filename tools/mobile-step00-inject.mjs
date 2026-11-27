/*
 * 把 STEP 00「行前確認」掛進手機版單一檔 HTML。
 *
 * 三支 build-mobile-*.mjs 共用的最後一步：在 </body> 前插入
 *   <style>…mobile-step00.css…</style>
 *   <script>window.V2_PF_ASSETS={…圖解 data: URI…}</script>
 *   <script>…mobile-step00.js…</script>
 *
 * 一定要放在外殼（mobile-v2-*.js）之後，才攔得到已經建好的封面與 ⚙ 面板。
 */
import fs from 'node:fs';
import path from 'node:path';

const IMAGES = {
  pf1: '01-version.png',
  pf2: '02-hwconfig.png',
  pf3: '03-convert.png',
  pf4: '04-formula.jpg',
};

export function step00Block(ROOT, dataURI) {
  const css = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-step00.css'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'tools', 'mobile-step00.js'), 'utf8');
  const assets = {};
  for (const [key, name] of Object.entries(IMAGES)) {
    assets[key] = dataURI(path.join(ROOT, 'assets', 'preflight', name));
  }
  return `<style>${css}</style>\n<script>window.V2_PF_ASSETS=${JSON.stringify(assets)};</script>\n<script>${js}</script>\n`;
}

export function injectStep00(html, ROOT, dataURI) {
  if (!/<\/body>/.test(html)) throw new Error('找不到 </body>，無法掛 STEP 00');
  return html.replace(/<\/body>/, () => step00Block(ROOT, dataURI) + '</body>');
}
