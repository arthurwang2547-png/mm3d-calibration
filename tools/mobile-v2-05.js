/*
 * MM3D PLUS 手機版 V2 呈現層 — 完整版顯示的 STEP 05「進入 3D 多層校正」。
 *
 * 這一段屬於 06-10 章（影片播放＋多層 3D 模型），播放引擎跟 01-05 章不同，
 * 所以獨立成另一頁，避免把兩套引擎硬合併而破壞既有的動畫與語音同步。
 *
 * 這一層同樣只做版面、字幕分句、局部放大與播放控制：
 *   - 影片片段的放大框用章節自己在 #video-overlay 畫的標示框換算，不自行發明位置。
 *   - 3D 模型的視角與取景完全沿用原模型。
 */
(function () {
  const CFG = window.V2_CONFIG || {};
  document.body.id = 'mobile-v2';

  const $q = (s) => document.querySelector(s);
  const stage = $q('#stage');
  const shotwrap = $q('.shotwrap');
  const frame = $q('#screen-frame');
  const principle = $q('#principle');

  let frameW = 0, frameH = 0;

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
    frameW = Math.max(0, Math.min(b.width, b.height * 1000 / 730));
    frameH = frameW * 730 / 1000;
    frame.style.width = frameW + 'px';
    frame.style.height = frameH + 'px';
  }
  window.fitScreen = measure;
  window.fitScreen2 = measure;
  // 章節自己有 fitScreen，這裡覆蓋成 06-10 的 1000×730 基準
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
    header.querySelector('h1').textContent =
      `MM3D PLUS｜05-${cue + 1} ${(CUES[step][cue] || {}).label || ''}`;
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
    prevBtn.disabled = false;
    prevBtn.textContent = cue <= 0 ? (CFG.prevPage ? '← 回 04-3' : '← 已是第一段') : '← 上一段';
    nextBtn.textContent = cue >= CUES[step].length - 1 ? '已到 05 最後一段' : '下一段 →';
    nextBtn.disabled = cue >= CUES[step].length - 1;
  }
  function goTo(i) {
    if (i < 0) { if (CFG.prevPage) location.href = CFG.prevPage; return; }
    if (i >= CUES[step].length) return;
    closeZoom();
    startCue(i);
  }
  nextBtn.onclick = () => goTo(cue + 1);
  prevBtn.onclick = () => goTo(cue - 1);
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
    '<div><h2>MM3D PLUS<br>STEP 05 手機版</h2>' +
    '<p>完整版顯示的 STEP 05「進入 3D 多層校正」。<br>影片操作畫面會同步放大，每段播完停住，按「下一段」再繼續。</p>' +
    '<button>開始預覽 ▶</button></div>';
  document.body.append(startCover);
  startCover.querySelector('button').onclick = () => { startCover.remove(); goTo(0); };

  step = 0; cue = 0;
  page();
  renderCue();
  renderState(stateAt(0));
  if (subtitleEl) subtitleEl.textContent = '準備開始 STEP 05';
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
