/*
 * MM3D PLUS 手機版 V2 呈現層 — 11-15 章（完整版顯示的 STEP 10～14）。
 *
 * 這一章的播放引擎（loadCue / nextStep / previousSmallStep）跟前兩章都不同，
 * 而且它自己就內建了局部放大框（#detail-zoom + #detail-svg，用 frame-extra.jpg 裁切），
 * 所以這一層的工作是：
 *   1. 把電腦版版面收成手機的單欄雙面板
 *   2. 把 #detail-zoom 縮放到位、並且依焦點框自動換角，不遮住正在說明的欄位
 *   3. 字幕依旁白分句、最多兩行
 *   4. 播放控制與步驟範圍交給章節原本的 loadCue / previousSmallStep
 *
 * 播放引擎、3D 模型、旁白時鐘一律沿用，不重寫。
 */
(function () {
  const CFG = window.V2_CONFIG || {};
  const FIRST = CFG.firstStep ?? 11;      // 這一章用的是 lesson 編號（11..15）
  const LAST = CFG.lastStep ?? 15;
  const dispStep = (n) => n - 1;          // 完整版顯示 = lesson - 1
  document.body.id = 'mobile-v2';

  const $q = (s) => document.querySelector(s);
  const stage = $q('#stage');
  const principle = $q('#principle');
  const opArea = $q('.op-area');
  const screen = $q('#screen');
  const detail = $q('#detail-zoom');
  const detailSvg = $q('#detail-svg');

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
  settingInputs[0].oninput = (e) => { audio.volume = +e.target.value; };
  const volume = $q('#volume');
  if (volume) { volume.value = 0; volume.dispatchEvent(new Event('input')); }
  settingInputs[1].oninput = (e) => { if (volume) { volume.value = e.target.value; volume.dispatchEvent(new Event('input')); } };

  // ── 3D 面板標題與底部讀值條 ─────────────────────────────────────────
  const principleHead = document.createElement('div');
  principleHead.className = 'panelhead';
  principleHead.innerHTML = '<span>3D 光路與材料</span><span>MM3D PLUS</span>';
  principle.append(principleHead);

  const readout = document.createElement('div');
  readout.className = 'v2-height';
  readout.innerHTML = '<b></b><small></small>';
  principle.append(readout);

  // ── 局部放大框：沿用章節自己畫好的 #detail-svg，只負責換角與尺寸 ────
  function layoutDetail() {
    if (!detail || detail.hidden || !opArea || !screen) return;
    const ar = opArea.getBoundingClientRect();
    if (!ar.width || !ar.height) return;
    const hot = $q('#hot');
    const VBW = 1000, VBH = 730;
    const k = Math.min(ar.width / VBW, ar.height / VBH);
    const dx = (ar.width - VBW * k) / 2, dy = (ar.height - VBH * k) / 2;
    let hb = null;
    if (hot) {
      const b = ['x', 'y', 'width', 'height'].map((kk) => +hot.getAttribute(kk));
      if (b.every(Number.isFinite)) hb = { x: dx + b[0] * k, y: dy + b[1] * k, w: b[2] * k, h: b[3] * k };
    }
    const w = Math.max(140, Math.round(Math.min(ar.width * 0.56, 232)));
    const h = Math.round(w / 2) + 20;                       // 章節的 viewBox 是 2:1，再加標題列
    const m = 5;
    const corners = [
      { x: ar.width - w - m, y: m },                        // 右上
      { x: m, y: m },                                       // 左上
      { x: m, y: ar.height - h - m },                       // 左下
      { x: ar.width - w - m, y: ar.height - h - m },        // 右下
    ];
    // 右下角經常有滾輪卡、左下角常有試刻子畫面，先當成障礙物
    const obstacles = [];
    for (const sel of ['#wheel-card', '#marking-closeup']) {
      const el = $q(sel);
      if (el && !el.hidden) {
        const r = el.getBoundingClientRect();
        if (r.width) obstacles.push({ x: r.left - ar.left, y: r.top - ar.top, w: r.width, h: r.height });
      }
    }
    const overlap = (a, b) => {
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return (ox > 0 && oy > 0) ? ox * oy : 0;
    };
    let best = corners[0], bestScore = Infinity;
    corners.forEach((c, i) => {
      const box = { x: c.x, y: c.y, w, h };
      let score = (hb ? overlap(box, hb) : 0) * 8;
      obstacles.forEach((o) => { score += overlap(box, o); });
      score += i * 0.5;                                     // 同分時偏好右上、左上
      if (score < bestScore) { bestScore = score; best = c; }
    });
    detail.style.width = w + 'px';
    detail.style.left = Math.round(best.x) + 'px';
    detail.style.top = Math.round(best.y) + 'px';
    detail.style.right = 'auto';
    detail.style.bottom = 'auto';
    if (detailSvg) detailSvg.style.height = (h - 20) + 'px';
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

  // ── 狀態與標籤 ─────────────────────────────────────────────────────
  const opAction = $q('#op-action');
  const statusEl = $q('#status');
  const nextBtn = $q('#next');
  const prevBtn = $q('#prev');
  const replayBtn = $q('#replay');
  const pauseBtn = $q('#pause');
  const seek = $q('#seek');
  const timeDisplay = $q('#time-display');
  const origPrev = prevBtn.onclick, origNext = nextBtn.onclick, origReplay = replayBtn.onclick, origPause = pauseBtn.onclick;

  const cueList = () => cueIds();
  const isLast = () => lesson === LAST && cueIndex >= cueList().length - 1;

  function syncHeader() {
    header.querySelector('h1').textContent =
      `MM3D PLUS｜${String(dispStep(lesson)).padStart(2, '0')}-${cueIndex + 1} ${(opAction && opAction.textContent) || ''}`;
  }
  function syncNavLabels() {
    const first = lesson === FIRST && cueIndex === 0;
    prevBtn.disabled = false;
    prevBtn.textContent = first ? (CFG.prevPage ? '← 上一頁' : '← 已是第一段') : '← 上一段';
    nextBtn.textContent = isLast() ? '已到最後一段' : '下一段 →';
    nextBtn.disabled = isLast();
  }
  function syncReadout() {
    readout.querySelector('b').textContent = (opAction && opAction.textContent) || '';
    readout.querySelector('small').textContent = (statusEl && statusEl.textContent) || '';
  }

  prevBtn.onclick = () => {
    closeZoom();
    if (lesson === FIRST && cueIndex === 0) { if (CFG.prevPage) location.href = CFG.prevPage; return; }
    if (typeof previousSmallStep === 'function') previousSmallStep();
  };
  nextBtn.onclick = () => {
    if (isLast()) return;
    closeZoom();
    if (typeof origNext === 'function') origNext();
  };
  replayBtn.onclick = () => { closeZoom(); loadCue(lesson, cueIndex, true); };
  pauseBtn.onclick = (e) => { if (typeof origPause === 'function') origPause.call(pauseBtn, e); };

  // ── 點畫面放大：暫停；關閉後從原時間接續 ───────────────────────────
  let expanded = null, resumeAfterZoom = false, pointer = null;
  function closeZoom() {
    if (!expanded) return;
    expanded.classList.remove('v2-expanded');
    const b = expanded.querySelector('.panel-zoom');
    if (b) { b.textContent = '⤢'; b.setAttribute('aria-label', '放大畫面'); }
    expanded = null;
    layoutDetail();
    if (resumeAfterZoom && !playing) resume();
    resumeAfterZoom = false;
  }
  function openZoom(panel) {
    if (expanded === panel) { closeZoom(); return; }
    if (expanded) closeZoom();
    resumeAfterZoom = !!playing;
    if (resumeAfterZoom) stop();
    expanded = panel;
    panel.classList.add('v2-expanded');
    const b = panel.querySelector('.panel-zoom');
    b.textContent = '×';
    b.setAttribute('aria-label', '關閉放大並返回');
    layoutDetail();
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

  // 進度條：拖曳中不要被每幀覆蓋
  let scrubbing = false;
  if (seek) {
    seek.addEventListener('pointerdown', () => { scrubbing = true; });
    addEventListener('pointerup', () => { scrubbing = false; });
    seek.addEventListener('change', () => { scrubbing = false; });
  }

  function v2Resize() {
    const vv = window.visualViewport;
    document.documentElement.style.setProperty('--app-height', Math.round(vv?.height || innerHeight) + 'px');
    try { model.resize(); } catch (_) {}
    layoutDetail();
  }

  // ── 起始頁 ─────────────────────────────────────────────────────────
  const startCover = document.createElement('div');
  startCover.className = 'v2-start';
  startCover.innerHTML =
    `<div><h2>MM3D PLUS<br>${CFG.title || '手機版'}</h2>` +
    '<p>' + (CFG.intro || '') + '</p><button>開始預覽 ▶</button></div>';
  document.body.append(startCover);
  startCover.querySelector('button').onclick = () => {
    startCover.remove();
    loadCue(FIRST, 0, true).then(() => { syncAll(); });
  };

  // 章節載入時已經 loadCue(11,0,false)，這裡先不播
  syncAll();
  v2Resize();

  function syncAll() {
    syncHeader();
    syncNavLabels();
    syncReadout();
    layoutDetail();
  }

  // ── 每幀同步 ───────────────────────────────────────────────────────
  function tick() {
    let c = null;
    try { c = current(); } catch (_) {}
    if (c) {
      const dur = c.duration || 1;
      if (subtitleEl) {
        const t = playing ? audio.currentTime : Math.max(audio.currentTime, 0);
        const text = activeChunk(c.subtitle || c.text, t, dur);
        if (subtitleEl.textContent !== text) subtitleEl.textContent = text;
      }
      if (seek) {
        if (Math.abs((+seek.max || 0) - dur) > 0.05) seek.max = dur;
        if (!scrubbing) seek.value = audio.currentTime;
      }
      if (timeDisplay) timeDisplay.textContent = fmt(audio.currentTime) + ' / ' + fmt(dur);
    }
    syncHeader();
    syncNavLabels();
    syncReadout();
    layoutDetail();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  addEventListener('resize', v2Resize);
  window.visualViewport?.addEventListener('resize', v2Resize);
  window.visualViewport?.addEventListener('scroll', v2Resize);
  if (opArea) new ResizeObserver(() => layoutDetail()).observe(opArea);
})();
