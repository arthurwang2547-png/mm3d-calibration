/*
 * MM3D PLUS 手機版 V2 呈現層 — 給 assets/chapters/01-05 這一章用。
 *
 * 設計原則（跟 Codex 的 mobile-8-3-v2.html 一致）：
 *   - 這一層只做「版面、字幕分句、局部放大、播放控制」，
 *     完全不碰 app.js / flow-v7.js 已經做好的旁白時鐘、動畫、3D 模型與語音同步。
 *   - 3D 模型的視角與比例一律沿用原模型自己算的取景，不重設相機。
 *   - 局部放大框是「同一張原圖 + viewBox 裁切」，不是重新畫的介面。
 *
 * 注意：01-05 章的操作面板沒有 #screen-frame 外框（那是 06-10 章的 DOM），
 *       所以這裡以 .shotwrap 為座標基準，並自己算 SVG 的 letterbox 對位。
 */
(function () {
  const CFG = window.V2_CONFIG || {};
  document.body.id = 'mobile-v2';

  const $q = (s) => document.querySelector(s);
  const shotwrap = $q('.shotwrap');
  const shot = $q('#shot');
  const stage = $q('#stage');

  // ── 顯示編號：完整版把 shell step 1、2 併成 STEP 01 ───────────────────
  const dispStep = (s) => (s <= 1 ? 1 : s);
  const dispSeg = (s, j) => (s === 1 ? CUES[0].length + j + 1 : j + 1);
  const cueLabel = (s, j) => {
    const c = CUES[s] && CUES[s][j];
    if (!c) return '';
    if (c.label) return c.label;
    // 第 2 步（顯示 01-2、01-3）只有口白沒有動作標籤，取第一句當標題
    return String(c.text || '').split('。')[0].slice(0, 18);
  };
  document.title = `MM3D PLUS｜手機版 STEP 01–04`;

  // ── 扁平小段清單：上一步／下一步都以一小段為單位 ────────────────────
  const FLAT = [];
  for (let s = 0; s < CUES.length; s++) for (let j = 0; j < CUES[s].length; j++) FLAT.push([s, j]);
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
  const principle = $q('#principle');
  const principleHead = document.createElement('div');
  principleHead.className = 'panelhead';
  principleHead.innerHTML = '<span>3D 光路與材料</span><span>MM3D PLUS</span>';
  principle.append(principleHead);

  const readout = document.createElement('div');
  readout.className = 'v2-height';
  readout.innerHTML = '<b></b><small></small>';
  principle.append(readout);

  // ── 局部放大框（同一張原圖，用 viewBox 裁切）─────────────────────────
  const lens = document.createElement('div');
  lens.className = 'v2-lens';
  lens.innerHTML = '<div class="v2-lens-label"></div><svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><image/><g class="v2-lens-overlay"></g></svg>';
  lens.hidden = true;
  shotwrap.append(lens);
  const lensSvg = lens.querySelector('svg');
  const lensImage = lens.querySelector('image');
  const lensOverlay = lens.querySelector('.v2-lens-overlay');
  const lensLabel = lens.querySelector('.v2-lens-label');
  let lastOverlay = '';

  const connector = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  connector.classList.add('v2-connector');
  connector.innerHTML = '<path/>';
  shotwrap.append(connector);
  const connectorPath = connector.querySelector('path');

  const SRC = [1002, 676];
  const vbAttr = (shot.getAttribute('viewBox') || '0 0 1002 676').split(/[\s,]+/).map(Number);
  const VBW = vbAttr[2] || SRC[0], VBH = vbAttr[3] || SRC[1];

  // 影片在容器內的實際顯示範圍（object-fit:contain）
  function contained(video, hr) {
    if (!video.videoWidth || !video.videoHeight) return null;
    const k = Math.min(hr.width / video.videoWidth, hr.height / video.videoHeight);
    const w = video.videoWidth * k, h = video.videoHeight * k;
    return { x: (hr.width - w) / 2, y: (hr.height - h) / 2, w, h, k };
  }

  // 影片片段：只有這一章自己有給標示框時才放大（不自行發明位置）
  const videoLens = window.V2VideoLens ? window.V2VideoLens(shotwrap, () => {
    if (stage.classList.contains('full')) return null;
    const fv = document.querySelector('#field-video-v4');
    if (!fv || !fv.classList.contains('show')) return null;
    const hl = document.querySelector('.video-highlight-v5');
    if (!hl || !hl.classList.contains('show')) return null;
    const hr = shotwrap.getBoundingClientRect();
    const rect = contained(fv, hr);
    if (!rect || !rect.k) return null;
    const l = parseFloat(hl.style.left) / 100 * hr.width;
    const t = parseFloat(hl.style.top) / 100 * hr.height;
    const w = parseFloat(hl.style.width) / 100 * hr.width;
    const h = parseFloat(hl.style.height) / 100 * hr.height;
    if (![l, t, w, h].every(Number.isFinite)) return null;
    return { video: fv, box: [(l - rect.x) / rect.k, (t - rect.y) / rect.k, w / rect.k, h / rect.k], label: (CUES[step][cue] || {}).label };
  }) : null;

  // .shotwrap 內的原圖實際顯示範圍（SVG preserveAspectRatio 的 letterbox）
  let SW = 0, SH = 0, SCALE = 1, DX = 0, DY = 0, frameW = 0, frameH = 0;
  function measure() {
    const b = shotwrap.getBoundingClientRect();
    SW = b.width; SH = b.height;
    if (!SW || !SH) return false;
    SCALE = Math.min(SW / VBW, SH / VBH);
    frameW = VBW * SCALE; frameH = VBH * SCALE;
    DX = (SW - frameW) / 2; DY = (SH - frameH) / 2;
    return true;
  }
  const toStage = (x, y) => [DX + x * SCALE, DY + y * SCALE];

  // 這一步實際可以放大的來源：原始介面截圖（同一張圖）
  function focusSource() {
    const c = CUES[step] && CUES[step][cue];
    if (!c) return null;
    if (stage.classList.contains('full')) return null;                                   // 這一段只看 3D
    if (document.querySelector('#field-video-v4')?.classList.contains('show')) return null;
    if (document.querySelector('#step5-video-v5')?.classList.contains('show')) return null;
    if (document.querySelector('#flow-operation')?.classList.contains('show')) return null; // 流程圖本身已是局部介面
    const shotImage = shot.querySelector('image');
    const href = shotImage && shotImage.getAttribute('href');
    if (!href) return null;
    const uiSync = document.querySelector('#ui-sync-v4');
    if (uiSync && uiSync.classList.contains('show')) {
      const h = document.querySelector('#v4-highlight');
      if (!h) return null;
      return { href, box: [+h.getAttribute('x'), +h.getAttribute('y'), +h.getAttribute('width'), +h.getAttribute('height')], label: c.label || '目前微調的欄位' };
    }
    if (!c.box) return null;                                                             // 這一段沒有對應的介面欄位
    const hot = document.querySelector('#hot');
    if (hot && hot.style.visibility === 'hidden') return null;
    const pad = 7;
    return { href, box: [c.box[0] - pad, c.box[1] - pad, c.box[2] + pad * 2, c.box[3] + pad * 2], label: c.label || '目前操作的欄位' };
  }

  let lastKey = '';
  function layoutLens() {
    if (!measure()) { lens.hidden = true; connector.style.display = 'none'; return; }
    const f = focusSource();
    if (!f) { if (!lens.hidden) { lens.hidden = true; connector.style.display = 'none'; lastKey = ''; } return; }

    const key = [f.box.join(','), Math.round(SW), Math.round(SH)].join('|');
    if (key === lastKey) return;
    lastKey = key;

    const lensW = Math.max(130, Math.round(frameW * 0.54));
    const lensH = Math.max(40, Math.round(Math.min(64, frameH * 0.27)));

    // 裁切區的長寬比 = 放大框的長寬比（都換算成原始像素座標），避免變形
    const srcAspect = (lensW / lensH) * (VBH / VBW) / (frameH / frameW);
    let cw = Math.max(f.box[2], f.box[3] * srcAspect);
    let ch = cw / srcAspect;
    const cx = f.box[0] + f.box[2] / 2, cy = f.box[1] + f.box[3] / 2;
    let x0 = Math.max(0, Math.min(VBW - cw, cx - cw / 2));
    let y0 = Math.max(0, Math.min(VBH - ch, cy - ch / 2));
    if (cw > VBW) { cw = VBW; x0 = 0; }
    if (ch > VBH) { ch = VBH; y0 = 0; }

    // 焦點框的畫面座標
    const [bx0, by0] = toStage(f.box[0], f.box[1]);
    const [bx1, by1] = toStage(f.box[0] + f.box[2], f.box[1] + f.box[3]);

    // 放大框放在焦點的反方向，避免遮住正在說明的欄位
    const margin = 5, headH = 22;
    let lx = (bx0 + bx1) / 2 < SW / 2 ? SW - lensW - margin : margin;
    let ly = (by0 + by1) / 2 < SH / 2 ? SH - lensH - margin : headH + margin;
    const overlaps = lx < bx1 + 6 && lx + lensW > bx0 - 6 && ly < by1 + 6 && ly + lensH > by0 - 6;
    if (overlaps) {
      const above = by0 - lensH - 8, below = by1 + 8;
      if (above >= headH + margin) ly = above;
      else if (below + lensH <= SH - margin) ly = below;
      else ly = (by0 + by1) / 2 < SH / 2 ? SH - lensH - margin : headH + margin;
    }
    lx = Math.max(margin, Math.min(SW - lensW - margin, lx));
    ly = Math.max(headH + margin, Math.min(SH - lensH - margin, ly));

    lens.hidden = false;
    lens.style.left = Math.round(lx) + 'px';
    lens.style.top = Math.round(ly) + 'px';
    lens.style.width = lensW + 'px';
    lensSvg.style.height = lensH + 'px';
    lensSvg.setAttribute('viewBox', [x0, y0, cw, ch].join(' '));
    if (lensImage.getAttribute('href') !== f.href) lensImage.setAttribute('href', f.href);
    lensLabel.textContent = f.label + ' · 原畫面放大';

    // 放大框裡也要帶上原本的高亮框，才看得出在指哪個欄位
    const uiSync2 = document.querySelector('#ui-sync-v4');
    let overlayHtml = '';
    if (uiSync2 && uiSync2.classList.contains('show')) {
      overlayHtml = uiSync2.outerHTML.replace(/\sid="[^"]*"/g, '');
    } else {
      const hot = document.querySelector('#hot');
      if (hot) overlayHtml = `<rect x="${hot.getAttribute('x')}" y="${hot.getAttribute('y')}" width="${hot.getAttribute('width')}" height="${hot.getAttribute('height')}" rx="4" fill="#1674d610" stroke="#1674d6" stroke-width="3"/>`;
    }
    if (overlayHtml !== lastOverlay) { lensOverlay.innerHTML = overlayHtml; lastOverlay = overlayHtml; }

    // 細線把放大框和原位置連起來
    const fromX = Math.max(bx0, Math.min(bx1, lx + lensW / 2));
    const fromY = (ly + lensH / 2 < by0) ? by0 : by1;
    const toX = Math.max(lx, Math.min(lx + lensW, (bx0 + bx1) / 2));
    const toY = (ly + lensH / 2 < by0) ? ly + lensH : ly;
    connector.style.display = '';
    connectorPath.setAttribute('d', `M${Math.round(fromX)} ${Math.round(fromY)}L${Math.round(toX)} ${Math.round(toY)}`);
  }

  // ── 尺寸：用 visualViewport 避開 Safari 工具列 ──────────────────────
  function v2Resize() {
    const vv = window.visualViewport;
    document.documentElement.style.setProperty('--app-height', Math.round(vv?.height || innerHeight) + 'px');
    measure();
    model.resize();
    lastKey = '';
    layoutLens();
  }
  // 章節本身沒有 fitScreen，這裡只需要讓 #shot 填滿 .shotwrap 並量測
  window.fitScreen = function () { measure(); };

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
  const startSubtitle = subtitleEl ? subtitleEl.textContent : '';

  // ── 每次換段 ───────────────────────────────────────────────────────
  const v2RenderCue = renderCue;
  renderCue = function () {
    v2RenderCue();
    lastKey = '';
    lastOverlay = '';
    header.querySelector('h1').textContent =
      `MM3D PLUS｜${String(dispStep(step)).padStart(2, '0')}-${dispSeg(step, cue)} ${cueLabel(step, cue)}`;
    if (subtitleEl) subtitleEl.textContent = CUES[step][cue].text;
    const pauseBtn = $q('#pause');
    $q('#replay').textContent = '↻ 重播';
    pauseBtn.textContent = '暫停';
    pauseBtn.disabled = false;
    syncNavLabels();
    v2Resize();
  };

  const v2UpdateCards = updateCards;
  updateCards = function () { v2UpdateCards(); lastKey = ''; };

  // ── 底部狀態列（電腦版這裡是浮動卡片，手機改成一行）────────────────
  const opAction = $q('#op-action');
  const statusEl = $q('#status');
  function syncReadout() {
    readout.querySelector('b').textContent = (opAction && opAction.textContent) || cueLabel(step, cue);
    readout.querySelector('small').textContent = (statusEl && statusEl.textContent) || '';
  }

  // ── 上一步／下一步：一小段為單位 ────────────────────────────────────
  const nextBtn = $q('#next');
  const prevBtn = $q('#prev');
  const replayBtn = $q('#replay');
  const pauseBtn = $q('#pause');

  function syncNavLabels() {
    const i = flatIndex();
    prevBtn.disabled = i <= 0;
    prevBtn.textContent = i <= 0 ? '← 已是第一段' : '← 上一段';
    nextBtn.textContent = '下一段 →';
  }
  function goFlat(i) {
    if (i < 0) return;
    if (i >= FLAT.length) { if (CFG.nextPage) location.href = CFG.nextPage; return; }
    const [s, j] = FLAT[i];
    generation++;
    narration.pause();
    closeZoom();
    step = s; cue = j;
    started = true; playing = true; paused = false; ended = false; completed = false;
    renderPage();
    playCue(generation);
  }
  nextBtn.onclick = () => goFlat(flatIndex() + 1);
  prevBtn.onclick = () => goFlat(flatIndex() - 1);
  replayBtn.onclick = () => { closeZoom(); goFlat(flatIndex()); };
  pauseBtn.onclick = () => { if (ended) { goFlat(flatIndex()); return; } togglePause(); };

  narration.addEventListener('ended', () => {
    pauseBtn.disabled = false;
    pauseBtn.textContent = '播放';
    syncNavLabels();
    syncReadout();
  });

  // 拖曳進度條：畫面狀態要跟著同步（沿用原本的 player 時鐘）
  const seek = $q('#seek');
  if (seek) {
    seek.oninput = () => {
      if (!narration.src) return;
      const c = CUES[step][cue];
      const t = Math.min(+seek.value, Math.max(0, (c.duration || 1) - .025));
      ended = false;
      if (narration.paused) { playing = false; paused = true; pauseBtn.textContent = '播放'; }
      narration.currentTime = t;
      pauseBtn.disabled = false;
      lastKey = '';
      syncNavLabels();
    };
  }

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
    '<div><h2>MM3D PLUS<br>STEP 01–04 手機版</h2>' +
    '<p>沿用 V2 版面：原始介面局部放大，與 3D 光路、材料試刻同步收看。<br>每一小段播完會停住，按「下一段」再繼續。</p>' +
    '<button>開始預覽 ▶</button></div>';
  document.body.append(startCover);

  // 從 STEP 05 按「上一段」回來時，直接停在最後一段
  const startAt = location.hash === '#last' ? FLAT.length - 1 : 0;
  startCover.querySelector('button').onclick = () => { startCover.remove(); goFlat(startAt); };

  // 開場先停在第 1 小段的靜態畫面，不自動播音
  {
    const [s0, j0] = FLAT[startAt];
    step = s0; cue = j0;
  }
  renderPage();
  renderCue();
  if (subtitleEl) subtitleEl.textContent = startSubtitle;
  syncNavLabels();
  syncReadout();
  v2Resize();

  // ── 每幀同步：字幕分句、讀值、局部放大位置 ─────────────────────────
  // 註：影片與流程圖在直向會上下留白，那是原圖比例（16:9／1000×674）造成的，
  //     來源寬度已經吃滿面板，把多餘高度讓給 3D 只會讓模型取景被裁掉，所以不動。
  function tick() {
    const c = CUES[step] && CUES[step][cue];
    if (c && subtitleEl && started && !completed) {
      const t = ended ? (c.duration || 1) : (narration.currentTime || 0);
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
  new ResizeObserver(() => { lastKey = ''; v2Resize(); }).observe(shotwrap);
  new ResizeObserver(() => { model.resize(); }).observe(document.querySelector('#modelViewport'));
  v2Resize();
})();
