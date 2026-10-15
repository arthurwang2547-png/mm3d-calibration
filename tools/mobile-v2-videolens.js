/*
 * MM3D PLUS 手機版 V2 — 影片片段的局部放大框（共用元件）。
 *
 * 有些小段的「操作畫面」是原始影片（step05-grid-calibration.mp4 / enter-3d.mp4），
 * 不是靜態截圖，所以放大框不能用 SVG viewBox 裁圖，要用第二個 <video> 做位移＋縮放裁切。
 * 放大區域一律由章節自己提供的標示框換算，不自行發明位置。
 */
window.V2VideoLens = function (host, getBox) {
  const box = document.createElement('div');
  box.className = 'v2-lens v2-video-lens';
  box.innerHTML =
    '<div class="v2-lens-label"></div>' +
    '<div class="v2-video-crop"><video muted playsinline preload="auto"></video></div>';
  box.hidden = true;
  host.append(box);
  const label = box.querySelector('.v2-lens-label');
  const crop = box.querySelector('.v2-video-crop');
  const inner = box.querySelector('video');
  let lastKey = '';

  function contained(hostRect, sw, sh) {
    if (!sw || !sh || !hostRect.width || !hostRect.height) return null;
    const k = Math.min(hostRect.width / sw, hostRect.height / sh);
    const w = sw * k, h = sh * k;
    return { x: (hostRect.width - w) / 2, y: (hostRect.height - h) / 2, w, h, k };
  }

  function update() {
    const s = getBox && getBox();
    const video = s && s.video;
    if (!video || !video.videoWidth) { if (!box.hidden) { box.hidden = true; lastKey = ''; } return; }

    const hostEl = video.parentElement;
    const hr = hostEl.getBoundingClientRect();
    if (!hr.width || !hr.height) { box.hidden = true; return; }
    const rect = contained(hr, video.videoWidth, video.videoHeight);
    if (!rect) { box.hidden = true; return; }

    const sw = video.videoWidth, sh = video.videoHeight;
    const lensW = Math.max(132, Math.round(Math.min(hr.width * 0.56, 250)));
    const lensH = Math.max(58, Math.round(Math.min(hr.height * 0.34, 104)));

    // 裁切區（來源像素）：長寬比 = 放大框長寬比，避免變形
    const srcAspect = lensW / lensH;
    let cw = Math.max(s.box[2], s.box[3] * srcAspect);
    let ch = cw / srcAspect;
    let cx0 = Math.max(0, Math.min(sw - cw, s.box[0] + s.box[2] / 2 - cw / 2));
    let cy0 = Math.max(0, Math.min(sh - ch, s.box[1] + s.box[3] / 2 - ch / 2));
    if (cw > sw) { cw = sw; cx0 = 0; }
    if (ch > sh) { ch = sh; cy0 = 0; }

    const key = [Math.round(cw), Math.round(ch), Math.round(cx0), Math.round(cy0), Math.round(hr.width), Math.round(hr.height)].join('|');
    if (key !== lastKey) {
      lastKey = key;
      box.style.width = lensW + 'px';
      crop.style.height = lensH + 'px';
      inner.style.width = Math.round(lensW * sw / cw) + 'px';
      inner.style.height = Math.round(lensH * sh / ch) + 'px';
      inner.style.left = Math.round(-cx0 * lensW / cw) + 'px';
      inner.style.top = Math.round(-cy0 * lensH / ch) + 'px';
      label.textContent = (s.label || '目前操作區') + ' · 原畫面放大';
    }

    // 位置：放在焦點框的反方向，不要蓋住正在看的地方
    const bx0 = rect.x + cx0 * rect.k, by0 = rect.y + cy0 * rect.k;
    const bx1 = rect.x + (cx0 + cw) * rect.k, by1 = rect.y + (cy0 + ch) * rect.k;
    const margin = 5, headH = 22;
    let lx = (bx0 + bx1) / 2 < hr.width / 2 ? hr.width - lensW - margin : margin;
    let ly = (by0 + by1) / 2 < hr.height / 2 ? hr.height - lensH - margin : headH + margin;
    if (lx < bx1 + 6 && lx + lensW > bx0 - 6 && ly < by1 + 6 && ly + lensH > by0 - 6) {
      const above = by0 - lensH - 8, below = by1 + 8;
      if (above >= headH + margin) ly = above;
      else if (below + lensH <= hr.height - margin) ly = below;
    }
    lx = Math.max(margin, Math.min(hr.width - lensW - margin, lx));
    ly = Math.max(headH + margin, Math.min(hr.height - lensH - margin, ly));
    box.style.left = Math.round(lx) + 'px';
    box.style.top = Math.round(ly) + 'px';
    box.hidden = false;

    // 影片時鐘跟主畫面同步（只有明顯落後才校正，避免一直 seek）
    if (inner.src !== video.currentSrc && video.currentSrc) inner.src = video.currentSrc;
    if (video.readyState >= 2) {
      if (Math.abs(inner.currentTime - video.currentTime) > 0.2) inner.currentTime = video.currentTime;
      if (video.paused) { if (!inner.paused) inner.pause(); }
      else if (inner.paused) inner.play().catch(() => {});
    }
  }

  return { update, hide() { box.hidden = true; lastKey = ''; } };
};
