/*
 * MM3D PLUS 手機版 V2 呈現層 — 06-10 章（完整版顯示的 STEP 05～09）。
 *
 * 由 V2_CONFIG 決定這一頁涵蓋哪幾步：
 *   window.V2_CONFIG = { firstStep, lastStep, nextPage, prevPage, title, note }
 *   mobile-05.html     → firstStep 0, lastStep 0
 *   mobile-06-09.html  → firstStep 1, lastStep 4
 *
 * 這一層只做版面、字幕分句、局部放大與播放控制；
 * 播放引擎（影片對時、多層模型、旁白時鐘）完全沿用章節原本的 startCue / startStep。
 */
(function () {
  const CFG = window.V2_CONFIG || {};
  const FIRST = CFG.firstStep ?? 0;
  const LAST = CFG.lastStep ?? 0;
  document.body.id = 'mobile-v2';

  const $q = (s) => document.querySelector(s);
  const stage = $q('#stage');
  const shotwrap = $q('.shotwrap');
  const frame = $q('#screen-frame');
  const principle = $q('#principle');

  let frameW = 0, frameH = 0;
  window.__v2dbg = () => {
    const b = shotwrap.getBoundingClientRect();
    return { frameW, frameH, lastKey, lensHidden: lens.hidden, full: stage.classList.contains('full'),
      vm: frame.classList.contains('video-mode'), bw: Math.round(b.width), bh: Math.round(b.height) };
  };

  // ── 顯示編號：06-10 章的 step 0 對應完整版 STEP 05 ────────────────────
  const dispStep = (s) => s + 5;

  // ── 扁平小段清單：跨步驟，一次走一小段 ──────────────────────────────
  const FLAT = [];
  for (let s = FIRST; s <= LAST; s++) for (let j = 0; j < CUES[s].length; j++) FLAT.push([s, j]);
  const flatIndex = () => FLAT.findIndex(([s, j]) => s === step && j === cue);

  // ── 頂部單行標題 ────────────────────────────────────────────────────
  const header = document.createElement('header');
  header.className = 'v2-header';
  header.innerHTML = '<h1></h1><button aria-label="設定" title="設定">⚙</button>';
  document.body.prepend(header);

  const settings = document.createElement('aside');
  settings.className = 'v2-settings';
  settings.hidden = true;
  settings.innerHTML =
    '<label>旁白 <input aria-label="旁白音量" type="range" min="0" max="1" step=".05" value="1"></label>' +
    '<label>音樂 <input aria-label="音樂音量" type="range" min="0" max="1" step=".05" value="0"></label>' +
    '<p>' + (CFG.note || '') + '</p>';
  document.body.append(settings);
  header.querySelector('button').onclick = () => { settings.hidden = !settings.hidden; };
  const settingInputs = settings.querySelectorAll('input');
  settingInputs[0].oninput = (e) => { narration.volume = +e.target.value; };
  const volume = $q('#volume');
  if (volume) { volume.value = 0; volume.dispatchEvent(new Event('input')); }
  settingInputs[1].oninput = (e) => { if (volume) { volume.value = e.target.value; volume.dispatchEvent(new Event('input')); } try { syncMusic(); } catch (_) {} };

  // ── 3D 面板標題與底部讀值條 ─────────────────────────────────────────
  const principleHead = document.createElement('div');
  principleHead.className = 'panelhead';
  principleHead.innerHTML = '<span>3D 光路與材料</span><span>MM3D PLUS</span>';
  principle.append(principleHead);

  const readout = document.createElement('div');
  readout.className = 'v2-height';
  readout.innerHTML = '<b></b><small></small>';
  principle.append(readout);

  // ── 尺寸 ────────────────────────────────────────────────────────────
  function measure() {
    const b = shotwrap.getBoundingClientRect();
    if (!b.width || !b.height) return;
    frameW = Math.max(0, Math.min(b.width - 18, b.height * 1000 / 730));
    frameH = frameW * 730 / 1000;
    frame.style.width = frameW + 'px';
    frame.style.height = frameH + 'px';
  }
  window.fitScreen = measure;
  try { fitScreen = measure; } catch (_) {}

  function v2Resize() {
    const vv = window.visualViewport;
    document.documentElement.style.setProperty('--app-height', Math.round(vv?.height || innerHeight) + 'px');
    measure();
    model.resize();
    if (videoLens) videoLens.update();
  }

  // ── 影片局部放大：用章節自己在 #video-overlay 畫的框換算 ─────────────
  const videoLens = window.V2VideoLens ? window.V2VideoLens(frame, () => {
    if (stage.classList.contains('full')) return null;
    const vid = $q('#screen-video');
    if (!vid || !vid.videoWidth) return null;
    if (!frame.classList.contains('video-mode')) return null;
    const rect = $q('#video-overlay rect');
    if (!rect) return null;
    const hr = frame.getBoundingClientRect();
    if (!hr.width || !hr.height) return null;
    const sw = vid.videoWidth, sh = vid.videoHeight;
    const k = Math.min(hr.width / sw, hr.height / sh);
    const vx = (hr.width - sw * k) / 2, vy = (hr.height - sh * k) / 2;
    const bx = +rect.getAttribute('x') / 1000 * hr.width;
    const by = +rect.getAttribute('y') / 730 * hr.height;
    const bw = +rect.getAttribute('width') / 1000 * hr.width;
    const bh = +rect.getAttribute('height') / 730 * hr.height;
    if (![bx, by, bw, bh].every(Number.isFinite)) return null;
    return { video: vid, box: [(bx - vx) / k, (by - vy) / k, bw / k, bh / k], label: (CUES[step][cue] || {}).label };
  }) : null;

  // 靜態截圖的局部放大（同一張原圖 + viewBox 裁切）
  const lens = document.createElement('div');
  lens.className = 'v2-lens';
  lens.innerHTML = '<div class="v2-lens-label"></div><svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><image/><g class="v2-lens-overlay"></g></svg>';
  lens.hidden = true;
  frame.append(lens);
  const lensSvg = lens.querySelector('svg');
  const lensImage = lens.querySelector('image');
  const lensOverlay = lens.querySelector('.v2-lens-overlay');
  const lensLabel = lens.querySelector('.v2-lens-label');
  const connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  connector.classList.add('v2-connector');
  connector.innerHTML = '<path/>';
  frame.append(connector);
  const connectorPath = connector.querySelector('path');
  let lastKey = '', lastOverlay = '';

  const VBW = 1000, VBH = 730;
  function layoutLens() {
    if (stage.classList.contains('full') || !frameW) { if (!lens.hidden) { lens.hidden = true; connector.style.display = 'none'; lastKey = ''; } return; }
    const shotImage = $q('#shot-image');
    const href = shotImage && shotImage.getAttribute('href');
    const hot = $q('#hot');
    if (!href || !hot || frame.classList.contains('video-mode')) { if (!lens.hidden) { lens.hidden = true; connector.style.display = 'none'; lastKey = ''; } return; }
    if (hot.style.visibility === 'hidden') { if (!lens.hidden) { lens.hidden = true; connector.style.display = 'none'; lastKey = ''; } return; }
    const box = ['x', 'y', 'width', 'height'].map((k) => +hot.getAttribute(k));
    if (!box.every(Number.isFinite) || box[2] <= 0) { lens.hidden = true; return; }
    const pad = 8;
    const f = { href, box: [box[0] - pad, box[1] - pad, box[2] + pad * 2, box[3] + pad * 2], label: (CUES[step][cue] || {}).label || '目前操作的欄位' };

    const key = [f.box.join(','), Math.round(frameW), Math.round(frameH)].join('|');
    if (key === lastKey && !lens.hidden) return;
    lastKey = key;

    const lensW = Math.max(132, Math.round(Math.min(frameW * 0.56, 250)));
    const lensH = Math.max(58, Math.round(Math.min(frameH * 0.34, 104)));
    const srcAspect = lensW / lensH;
    let cw = Math.max(f.box[2], f.box[3] * srcAspect);
    let ch = cw / srcAspect;
    let x0 = Math.max(0, Math.min(VBW - cw, f.box[0] + f.box[2] / 2 - cw / 2));
    let y0 = Math.max(0, Math.min(VBH - ch, f.box[1] + f.box[3] / 2 - ch / 2));
    if (cw > VBW) { cw = VBW; x0 = 0; }
    if (ch > VBH) { ch = VBH; y0 = 0; }

    const k = frameW / VBW;
    const [bx0, by0] = [x0 === 0 ? f.box[0] * k : f.box[0] * k, f.box[1] * k];
    const bx1 = bx0 + f.box[2] * k, by1 = by0 + f.box[3] * k;

    lens.hidden = false;
    lens.style.width = lensW + 'px';
    lensSvg.style.height = lensH + 'px';
    lensSvg.setAttribute('viewBox', [x0, y0, cw, ch].join(' '));
    if (lensImage.getAttribute('href') !== f.href) lensImage.setAttribute('href', f.href);
    lensLabel.textContent = f.label + ' · 原畫面放大';

    const uiSync = $q('#ui-state');
    let overlayHtml = '';
    if (uiSync && uiSync.innerHTML.trim()) overlayHtml = uiSync.innerHTML.replace(/\sid="[^"]*"/g, '');
    else if (hot) {
      overlayHtml = `<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" rx="4" fill="#1674d610" stroke="#1674d6" stroke-width="3"/>`;
    }
    if (overlayHtml !== lastOverlay) { lensOverlay.innerHTML = overlayHtml; lastOverlay = overlayHtml; }

    const margin = 5, headH = 22;
    let lx = (bx0 + bx1) / 2 < frameW / 2 ? frameW - lensW - margin : margin;
    let ly = (by0 + by1) / 2 < frameH / 2 ? frameH - lensH - margin : headH + margin;
    if (lx < bx1 + 6 && lx + lensW > bx0 - 6 && ly < by1 + 6 && ly + lensH > by0 - 6) {
      const above = by0 - lensH - 8, below = by1 + 8;
      if (above >= headH + margin) ly = above;
      else if (below + lensH <= frameH - margin) ly = below;
    }
    lx = Math.max(margin, Math.min(frameW - lensW - margin, lx));
    ly = Math.max(headH + margin, Math.min(frameH - lensH - margin, ly));
    lens.style.left = Math.round(lx) + 'px';
    lens.style.top = Math.round(ly) + 'px';

    const fromX = Math.max(bx0, Math.min(bx1, lx + lensW / 2));
    const fromY = (ly + lensH / 2 < by0) ? by0 : by1;
    const toX = Math.max(lx, Math.min(lx + lensW, (bx0 + bx1) / 2));
    const toY = (ly + lensH / 2 < by0) ? ly + lensH : ly;
    connector.style.display = '';
    connectorPath.setAttribute('d', `M${Math.round(fromX)} ${Math.round(fromY)}L${Math.round(toX)} ${Math.round(toY)}`);
  }

  // ── 字幕：依旁白分句顯示，每段不超過兩行 ────────────────────────────
  const MAXCHARS = 40;
  const chunkCache = new Map();
  function cueChunks(text) {
    if (chunkCache.has(text)) return chunkCache.get(text);
    const out = [];
    for (const sentence of String(text || '').split(/(?<=。)/).filter(Boolean)) {
      if (sentence.length <= MAXCHARS) { out.push(sentence); continue; }
      let buf = '';
      for (const piece of sentence.split(/(?<=[，、；])/)) {
        if (!piece) continue;
        if (buf.length + piece.length <= MAXCHARS) buf += piece;
        else { if (buf) out.push(buf); buf = piece; }
      }
      if (buf) out.push(buf);
    }
    const res = out.length ? out : [String(text || '')];
    chunkCache.set(text, res);
    return res;
  }
  function activeChunk(text, elapsed, duration) {
    const chunks = cueChunks(text);
    if (chunks.length <= 1) return chunks[0] || '';
    const total = chunks.reduce((n, t) => n + t.length, 0);
    let used = 0;
    for (const t of chunks) {
      used += t.length;
      if (elapsed < (duration || 1) * used / total) return t;
    }
    return chunks[chunks.length - 1];
  }
  const subtitleEl = $q('#subtitle');

  // ── 每次換段 ───────────────────────────────────────────────────────
  const v2RenderCue = renderCue;
  renderCue = function () {
    v2RenderCue();
    lastKey = ''; lastOverlay = '';
    header.querySelector('h1').textContent =
      `MM3D PLUS｜${String(dispStep(step)).padStart(2, '0')}-${cue + 1} ${(CUES[step][cue] || {}).label || ''}`;
    if (subtitleEl) subtitleEl.textContent = (CUES[step][cue] || {}).text || '';
    const pauseBtn = $q('#pause');
    $q('#replay').textContent = '↻ 重播';
    pauseBtn.textContent = '暫停';
    pauseBtn.disabled = false;
    syncNavLabels();
    v2Resize();
  };

  const opAction = $q('#op-action');
  const statusEl = $q('#status');
  function syncReadout() {
    readout.querySelector('b').textContent = (opAction && opAction.textContent) || '';
    readout.querySelector('small').textContent = (statusEl && statusEl.textContent) || '';
  }

  // ── 上一段／下一段 ──────────────────────────────────────────────────
  const nextBtn = $q('#next');
  const prevBtn = $q('#prev');
  const replayBtn = $q('#replay');
  const pauseBtn = $q('#pause');

  function syncNavLabels() {
    const i = flatIndex();
    prevBtn.disabled = false;
    prevBtn.textContent = i <= 0 ? (CFG.prevPage ? '← 上一頁' : '← 已是第一段') : '← 上一段';
    const last = i >= FLAT.length - 1;
    nextBtn.textContent = last ? (CFG.nextPage ? '下一頁 →' : '已是最後一段') : '下一段 →';
    nextBtn.disabled = last && !CFG.nextPage;
  }
  function goFlat(i) {
    if (i < 0) { if (CFG.prevPage) location.href = CFG.prevPage; return; }
    if (i >= FLAT.length) { if (CFG.nextPage) location.href = CFG.nextPage; return; }
    closeZoom();
    const [s, j] = FLAT[i];
    if (s === step) startCue(j);
    else startStep(s);
  }
  nextBtn.onclick = () => goFlat(flatIndex() + 1);
  prevBtn.onclick = () => goFlat(flatIndex() - 1);
  replayBtn.onclick = () => { closeZoom(); startCue(cue); };
  pauseBtn.onclick = () => { if (ended) { startCue(cue); return; } togglePause(); };
  narration.addEventListener('ended', () => {
    pauseBtn.disabled = false;
    pauseBtn.textContent = '播放';
    syncNavLabels();
    syncReadout();
  });

  // ── 點畫面放大：暫停；關閉後從原時間接續 ───────────────────────────
  let expanded = null, resumeAfterZoom = false, pointer = null;
  function closeZoom() {
    if (!expanded) return;
    expanded.classList.remove('v2-expanded');
    const b = expanded.querySelector('.panel-zoom');
    if (b) { b.textContent = '⤢'; b.setAttribute('aria-label', '放大畫面'); }
    expanded = null;
    v2Resize();
    if (resumeAfterZoom && !ended && paused) togglePause();
    resumeAfterZoom = false;
  }
  function openZoom(panel) {
    if (expanded === panel) { closeZoom(); return; }
    if (expanded) closeZoom();
    resumeAfterZoom = playing && !paused;
    if (resumeAfterZoom) togglePause();
    expanded = panel;
    panel.classList.add('v2-expanded');
    const b = panel.querySelector('.panel-zoom');
    b.textContent = '×';
    b.setAttribute('aria-label', '關閉放大並返回');
    v2Resize();
  }
  for (const panel of [$q('#operation'), principle]) {
    const button = document.createElement('button');
    button.className = 'panel-zoom';
    button.textContent = '⤢';
    button.setAttribute('aria-label', '放大畫面');
    panel.append(button);
    button.onclick = (e) => { e.stopPropagation(); openZoom(panel); };
    panel.addEventListener('pointerdown', (e) => { pointer = { x: e.clientX, y: e.clientY }; });
    panel.addEventListener('click', (e) => {
      if (e.target.closest('button') || !pointer) return;
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 8) return;
      openZoom(panel);
    });
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeZoom(); });

  // ── 起始頁 ─────────────────────────────────────────────────────────
  const startCover = document.createElement('div');
  startCover.className = 'v2-start';
  startCover.innerHTML =
    `<div><h2>MM3D PLUS<br>${CFG.title || '手機版'}</h2>` +
    '<p>' + (CFG.intro || '影片操作畫面會同步放大。每一小段播完會停住，按「下一段」再繼續。') + '</p>' +
    '<button>開始預覽 ▶</button></div>';
  document.body.append(startCover);
  startCover.querySelector('button').onclick = () => { startCover.remove(); goFlat(0); };

  step = FIRST; cue = 0;
  page();
  renderCue();
  renderState(stateAt(0));
  if (subtitleEl) subtitleEl.textContent = '準備開始';
  syncNavLabels();
  syncReadout();
  v2Resize();

  // ── 每幀同步 ───────────────────────────────────────────────────────
  function tick() {
    const c = CUES[step] && CUES[step][cue];
    if (c && subtitleEl && started && !finished) {
      const t = ended ? c.duration : (narration.currentTime || 0);
      const text = activeChunk(c.text, t, c.duration || 1);
      if (subtitleEl.textContent !== text) subtitleEl.textContent = text;
    }
    syncReadout();
    layoutLens();
    if (videoLens) videoLens.update();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  addEventListener('resize', v2Resize);
  window.visualViewport?.addEventListener('resize', v2Resize);
  window.visualViewport?.addEventListener('scroll', v2Resize);
  new ResizeObserver(() => v2Resize()).observe(shotwrap);
  new ResizeObserver(() => model.resize()).observe($q('#modelViewport'));
  v2Resize();
})();
