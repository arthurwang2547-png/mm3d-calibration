/*
 * STEP 00 行前確認（手機版）
 *
 * 內容跟網頁版的 STEP 00 同一套（依 MM3D-Plus V3.02《多層校正使用說明》整理），
 * 只把版面改成手機直向：4 張卡、一次看一張、每張可開圖解。
 *
 * 行為：
 *   - 課程第一頁（V2_CONFIG 沒有 prevPage 的那一頁）開頁就先攔，4 項都確認才進第 1 小段。
 *   - 從 STEP 05 按「上一頁」回來（#last）不再攔。
 *   - 其他頁從右上角 ⚙ →「行前確認」可以重看（那時候可以關掉，不用全部按完）。
 *
 * 圖解圖片由 build script 以 data: URI 放進 window.V2_PF_ASSETS，維持單一離線檔。
 */
(function () {
  var CFG = window.V2_CONFIG || {};
  var ASSETS = window.V2_PF_ASSETS || {};
  var KEY = 'mm3d-preflight-ack';

  var CARDS = [
    {
      key: 'pf1', num: '01', look: '怎麼確認',
      title: '確認版本：Z 軸輸出方向已和舊版相反',
      meta: 'MM3D-Plus V3.02 起',
      body: 'V3.02 起 Z 軸 S 值輸出反向，預設 <b>Smax 32767、Smin −32768</b>。拿舊版經驗直接套，層高和焦點會整組顛倒。'
    },
    {
      key: 'pf2', num: '02', look: '看畫面',
      title: 'HWConfig 要勾「Z Line Out Inverse」',
      meta: '控制卡設定',
      body: '方向反轉後，要在 <b>HWConfig.exe</b> 勾 <b>Z Line Out Inverse</b>，校正結果才會準。這一項沒做，後面全部白做。'
    },
    {
      key: 'pf3', num: '03', look: '看畫面',
      title: '跳出轉換視窗，不代表設定好了',
      meta: '轉換只處理檔案',
      body: '開軟體跳「鏡頭校正檔位元數轉換」，只代表這支鏡頭檔在轉格式。<b>控制卡上的勾選不會因此補上</b>。'
    },
    {
      key: 'pf4', num: '04', look: '看是哪裡',
      title: '公式法這一整塊不要去改',
      meta: '選了就不能改',
      body: '新增校正檔時「校正法」維持 <b>公式法</b>；進校正視窗後，左邊<b>原點偏位、放縮比例、旋轉、校正</b>都不要動。'
    }
  ];

  var DATA = {
    pf1: {
      title: '版本與 Z 軸方向',
      cap: '安裝檔名就看得到版本，例如 MM3D-Plus-4.00_x64.exe。',
      alt: '安裝檔名顯示 MM3D-Plus-4.00_x64.exe',
      steps: [
        '看安裝檔名，<b>MM3D-Plus-4.00_x64.exe</b> 的 4.00 就是版本。',
        '進軟體後再看一次版本，確認是 <b>V3.02 以上</b>。',
        '這一版開始 Z 軸方向反轉：<b>Smax = 32767、Smin = −32768</b>，舊版經驗不能直接套。'
      ]
    },
    pf2: {
      title: 'HWConfig 的 Z Line Out Inverse',
      cap: 'HWConfig.exe 左邊 Scanner alignment 區，紅框就是 Z Line Out Inverse。',
      alt: 'HWConfig UMC4 介面，紅框標出 Z Line Out Inverse',
      steps: [
        '到控制卡安裝目錄 <b>\\Drivers\\&lt;卡種&gt;\\</b>，執行 HWConfig.exe。',
        '左邊 Scanner alignment 區，勾選 <b>Z Line Out Inverse</b>。',
        '按 Write 寫進控制卡，再開 MM3D-Plus 開始校正。',
        '如果勾了之後聚焦軸反而反向，依實際情況取消這個選項。'
      ]
    },
    pf3: {
      title: '跳出轉換視窗，不代表設定好了',
      cap: '看到轉換視窗只代表鏡頭檔轉換過，不代表控制卡設定好了。',
      alt: '開啟軟體時跳出的鏡頭校正檔位元數轉換視窗',
      steps: [
        '開軟體跳出「鏡頭校正檔位元數轉換」，表示這支鏡頭檔是舊版做的，位元數和控制卡不同。',
        '按「轉換並繼續」，等軟體把舊檔轉成新格式（圖為簡體介面）。',
        '轉換只處理檔案。<b>HWConfig 的 Z Line Out Inverse 不會因此被勾起來</b>，還是要回去自己確認。',
        '轉完先試刻一次，確認焦點與尺寸沒有跑掉。'
      ]
    },
    pf4: {
      title: '公式法欄位不要動',
      cap: '原廠說明：多層校正請維持公式法；紅叉這一整塊不要去改。',
      alt: '鏡頭校正視窗，紅叉標出公式法的欄位',
      steps: [
        '新增鏡頭校正檔時，「校正法」維持 <b>公式法</b>，不要點比例法或格點法（選了不能改）。',
        '進到鏡頭校正視窗，左邊這一整塊是公式法的參數：原點偏位、放縮比例、旋轉、校正。',
        '多層校正靠這一塊當基準，數值被改過，後面每一層的焦點和尺寸都會跟著偏。'
      ]
    }
  };

  function load() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  var acked = load();
  var isAcked = function (k) { return acked.indexOf(k) >= 0; };
  var allAcked = function () { return CARDS.every(function (c) { return isAcked(c.key); }); };

  // ── 版面 ──────────────────────────────────────────────────────────
  var root = document.createElement('aside');
  root.className = 'pf';
  root.setAttribute('aria-label', '校正前確認');
  root.innerHTML =
    '<div class="pf-head"><span class="pf-kicker">STEP 00 · 行前確認</span>' +
    '<span class="pf-count">0 / 4</span>' +
    '<button class="pf-close" type="button" aria-label="關閉" hidden>✕</button></div>' +
    '<div class="pf-bar"><i></i></div>' +
    '<h2>開始之前，先確認這 4 件事</h2>' +
    '<p class="pf-lead">V3.02 把 Z 軸輸出方向反轉了。舊版經驗直接套，焦點會對不到、層高會反過來。4 項都按過「我知道了」，再進第 1 步。</p>' +
    '<div class="pf-list"></div>' +
    '<div class="pf-foot"><button class="pf-go" type="button" disabled>先確認上面 4 項</button>' +
    '<div class="pf-hint">還有 4 項要確認</div></div>';
  document.body.appendChild(root);

  var list = root.querySelector('.pf-list');
  CARDS.forEach(function (c) {
    var el = document.createElement('article');
    el.className = 'pf-item';
    el.setAttribute('data-key', c.key);
    el.innerHTML =
      '<div class="pf-num">' + c.num + '</div>' +
      '<div class="pf-main"><h3>' + c.title + '</h3>' +
      '<p class="pf-meta">' + c.meta + '</p>' +
      '<p class="pf-body">' + c.body + '</p>' +
      '<div class="pf-actions"><button class="pf-look" type="button">' + c.look + ' ▸</button>' +
      '<button class="pf-ack" type="button" aria-pressed="false">我知道了</button></div></div>';
    list.appendChild(el);
  });

  var modal = document.createElement('div');
  modal.className = 'pf-modal';
  modal.hidden = true;
  modal.innerHTML =
    '<div class="pf-sheet" role="dialog" aria-modal="true">' +
    '<header><h3></h3><button class="pf-x" type="button" aria-label="關閉">✕</button></header>' +
    '<figure class="pf-fig"><img alt=""><figcaption class="pf-cap"></figcaption></figure>' +
    '<ol class="pf-steps"></ol>' +
    '<footer><button class="pf-ack pf-ack-lg" type="button">我知道了</button></footer></div>';
  document.body.appendChild(modal);

  var bar = root.querySelector('.pf-bar i');
  var countEl = root.querySelector('.pf-count');
  var go = root.querySelector('.pf-go');
  var hint = root.querySelector('.pf-hint');
  var closeBtn = root.querySelector('.pf-close');

  var mTitle = modal.querySelector('h3');
  var mImg = modal.querySelector('img');
  var mCap = modal.querySelector('.pf-cap');
  var mSteps = modal.querySelector('.pf-steps');
  var mAck = modal.querySelector('.pf-ack-lg');
  var mClose = modal.querySelector('.pf-x');
  var modalKey = null;

  function sync() {
    var done = 0;
    CARDS.forEach(function (c) {
      var el = list.querySelector('[data-key="' + c.key + '"]');
      var on = isAcked(c.key);
      if (on) done++;
      el.classList.toggle('acked', on);
      var b = el.querySelector('.pf-ack');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '已確認 ✓' : '我知道了';
    });
    var total = CARDS.length;
    var ready = done === total;
    bar.style.width = (done / total * 100) + '%';
    countEl.textContent = done + ' / ' + total;
    go.disabled = !ready;
    go.textContent = ready ? '開始教學　▶' : '先確認上面 ' + total + ' 項';
    hint.textContent = ready ? total + ' 項都確認過了，可以開始' : '還有 ' + (total - done) + ' 項要確認';
    hint.classList.toggle('ready', ready);
    if (modalKey && !modal.hidden) mAck.textContent = isAcked(modalKey) ? '已確認 ✓' : '我知道了';
  }

  function setAcked(k, on) {
    var i = acked.indexOf(k);
    if (on && i < 0) acked.push(k);
    if (!on && i >= 0) acked.splice(i, 1);
    save(acked);
    sync();
  }

  function openModal(k) {
    var d = DATA[k];
    if (!d) return;
    modalKey = k;
    mTitle.textContent = d.title;
    var src = ASSETS[k];
    if (src) { mImg.src = src; mImg.hidden = false; } else { mImg.removeAttribute('src'); mImg.hidden = true; }
    mImg.alt = d.alt || d.title;
    mCap.textContent = d.cap || '';
    mSteps.innerHTML = d.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    mAck.textContent = isAcked(k) ? '已確認 ✓' : '我知道了';
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('open'); });
  }
  function closeModal() {
    modal.classList.remove('open');
    modalKey = null;
    setTimeout(function () { modal.hidden = true; }, 160);
  }

  var autoStart = false;

  function open(opts) {
    opts = opts || {};
    autoStart = !!opts.autoStart;
    closeBtn.hidden = autoStart;
    if (!autoStart) { try { if (window.narration && !window.narration.paused) window.narration.pause(); } catch (e) {} }
    root.classList.add('open');
    list.scrollTop = 0;
    sync();
  }
  function close() {
    root.classList.remove('open');
    closeModal();
  }

  list.addEventListener('click', function (e) {
    var look = e.target.closest('.pf-look');
    if (look) { openModal(look.closest('.pf-item').getAttribute('data-key')); return; }
    var ack = e.target.closest('.pf-ack');
    if (ack) {
      var k = ack.closest('.pf-item').getAttribute('data-key');
      setAcked(k, !isAcked(k));
    }
  });

  mAck.addEventListener('click', function () {
    if (modalKey) setAcked(modalKey, true);
    closeModal();
  });
  mClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  closeBtn.addEventListener('click', close);

  go.addEventListener('click', function () {
    if (go.disabled) return;
    close();
    if (!autoStart) return;
    // 第一頁：確認完直接進第 1 小段（原本那張封面就不用了）
    var start = document.querySelector('.v2-start button');
    if (start) start.click();
  });

  // ── 右上角 ⚙ 也能重看 ────────────────────────────────────────────
  var settings = document.querySelector('.v2-settings');
  if (settings) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-open';
    btn.textContent = '行前確認（STEP 00）';
    btn.addEventListener('click', function () { settings.hidden = true; open({ autoStart: false }); });
    settings.appendChild(btn);
  }

  sync();

  // ── 什麼時候自動攔 ────────────────────────────────────────────────
  // 只有課程第一頁（沒有 prevPage）才攔；從 STEP 05 按「上一頁」回來（#last）不攔。
  var isFirstPage = !CFG.prevPage;
  var cameBack = /last/.test(location.hash || '');
  if (isFirstPage && !cameBack && !allAcked()) open({ autoStart: true });
})();
