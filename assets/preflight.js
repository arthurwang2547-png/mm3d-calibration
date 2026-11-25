/* STEP 00 校正前確認
   流程：按「開始教學」→ 7 項逐一確認（每項有「怎麼確認」圖解）→ 全部按過「我知道了」才放行。 */
(function () {
  var KEY = 'mm3d-preflight-ack';
  var root = document.getElementById('preflight');
  if (!root) return;

  var DATA = {
    pf1: {
      title: '版本與 Z 軸方向',
      img: 'assets/preflight/01-version.png',
      alt: '安裝檔名顯示 MM3D-Plus-4.00_x64.exe',
      cap: '安裝檔名就看得到版本，例如 MM3D-Plus-4.00_x64.exe。',
      steps: [
        '看安裝檔名，MM3D-Plus-4.00_x64.exe 的 4.00 就是版本。',
        '進軟體後再看一次版本，確認是 V3.02 以上。',
        '這一版開始 Z 軸方向反轉：<b>Smax = 32767、Smin = −32768</b>，舊版經驗不能直接套。'
      ]
    },
    pf2: {
      title: 'HWConfig 的 Z Line Out Inverse',
      img: 'assets/preflight/02-hwconfig.png',
      alt: 'HWConfig UMC4 介面，紅框標出 Z Line Out Inverse',
      cap: 'HWConfig.exe 左邊 Scanner alignment 區，紅框就是 Z Line Out Inverse。',
      steps: [
        '到控制卡安裝目錄 <b>\\Drivers\\&lt;卡種&gt;\\</b>，執行 HWConfig.exe。',
        '左邊 Scanner alignment 區，勾選 <b>Z Line Out Inverse</b>。',
        '按 Write 寫進控制卡，再開 MM3D-Plus 開始校正。',
        '如果勾了之後聚焦軸反而反向，依實際情況取消這個選項。'
      ]
    },
    pf3: {
      title: '舊校正檔自動轉換',
      img: 'assets/preflight/03-legacy.jpg',
      alt: '原廠說明第 3 點，紅框標出舊校正檔轉換',
      cap: '原廠說明第 3 點：舊校正檔會自動轉換，但這個選項要手動勾。',
      steps: [
        'V3.00～V3.01 做的校正檔，V3.02 開檔時會自動轉成新格式。',
        '但控制卡上的 <b>Z Line Out Inverse 不會自己勾</b>，要手動回 HWConfig 確認。',
        '升級後第一次校正前先做這一步，不要直接開始校正。'
      ]
    },
    pf4: {
      title: '公式法欄位不要動',
      img: 'assets/preflight/04-formula.jpg',
      alt: '鏡頭校正視窗，紅叉標出公式法的欄位',
      cap: '原廠說明：多層校正請維持公式法；紅叉這一整塊是公式法的欄位，不要去改。',
      steps: [
        '新增鏡頭校正檔時，「校正法」維持 <b>公式法</b>，不要點比例法或格點法（選了不能改）。',
        '進到鏡頭校正視窗，左邊這一整塊是公式法的參數：原點偏位、放縮比例、旋轉、校正。',
        '多層校正靠這一塊當基準，數值被改過，後面每一層的焦點和尺寸都會跟著偏。'
      ]
    },
    pf5: {
      title: 'Zmax / Zmin 怎麼量',
      img: 'assets/preflight/05-zrange.jpg',
      alt: '焦距量測工具，紅框標出 Z 座標',
      cap: '焦距量測工具，紅框是 Z 座標，用 ▲▼ 升降。',
      steps: [
        '3D 校正頁按「焦距量測」。',
        'Z 座標移到 32767（PMC6／EMC6 為 524287），連續雕刻、移動機械 Z 到落焦，量雕刻圓長度。大於目標幅面就記下這個高度，這是 <b>Zmax</b>。',
        'Z 座標移到 −32768（PMC6／EMC6 為 −524288），移到角落再量一次，這是 <b>Zmin</b>。',
        '兩個高度都要能涵蓋目標幅面；不夠就先增加焦距或縮小目標範圍。'
      ]
    },
    pf6: {
      title: 'Z0 放哪一層',
      img: 'assets/preflight/06-neutral.jpg',
      alt: '中立位置與 Zmax／Z0／Zmin 的對照',
      cap: '中立位置落在哪一段，決定 Z0 當最高、中間還是最低層。',
      steps: [
        '先看中立位置目前落在哪一段。',
        '上三分之一 → Z0 當<b>最高層</b>，其他層都在基準面下面。',
        '中間 → Z0 <b>居中</b>，上下都有變焦行程。',
        '下三分之一 → Z0 當<b>最低層</b>，其他層都在上面。',
        '16 位元分界 10923／−10923；20 位元（PMC6／EMC6）174763／−174763。'
      ]
    },
    pf7: {
      title: '幅面與層數',
      img: 'assets/preflight/07-span.jpg',
      alt: '全幅面輸出與 X／Y 中心線',
      cap: '全幅面輸出後量 X、Y 中心線（紅框是「全幅面輸出」）。',
      steps: [
        '完成聚焦軸校正後按「全幅面輸出」。',
        '量 X、Y 兩條中心線長度，兩條都要<b>大於目標範圍</b>。',
        '不夠就返回、重置校正檔，把 K 值拉大重做（格點法 K 最大 0.9375）。',
        '層數：基本三層 + 最多 6 層 = <b>9 層</b>，夠用就好，不用加滿。'
      ]
    }
  };

  var items = Array.prototype.slice.call(root.querySelectorAll('.pf-item'));
  var keys = items.map(function (el) { return el.getAttribute('data-key'); });
  var fill = root.querySelector('.pf-progress .bar i');
  var count = root.querySelector('.pf-progress .txt b');
  var btn = root.querySelector('#pf-start');
  var hint = root.querySelector('#pf-hint');
  var back = root.querySelector('#pf-back');

  var modal = document.getElementById('pf-modal');
  var mTitle = document.getElementById('pf-modal-title');
  var mImg = document.getElementById('pf-modal-img');
  var mCap = document.getElementById('pf-modal-cap');
  var mSteps = document.getElementById('pf-modal-steps');
  var mAck = document.getElementById('pf-modal-ack');
  var mClose = document.getElementById('pf-modal-close');

  var acked = load();
  var pending = null;
  var modalKey = null;

  function load() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(acked)); } catch (e) {}
  }
  function isAcked(k) { return acked.indexOf(k) >= 0; }
  function setAcked(k, on) {
    var i = acked.indexOf(k);
    if (on && i < 0) acked.push(k);
    if (!on && i >= 0) acked.splice(i, 1);
    save();
    sync();
  }
  function allAcked() { return keys.every(isAcked); }

  function sync() {
    var done = keys.filter(isAcked).length;
    var total = keys.length;
    items.forEach(function (el) {
      var k = el.getAttribute('data-key');
      var on = isAcked(k);
      el.classList.toggle('acked', on);
      var b = el.querySelector('.pf-ack');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '已確認 ✓' : '我知道了';
    });
    root.querySelectorAll('.pf-mini [data-of]').forEach(function (row) {
      row.classList.toggle('done', isAcked(row.getAttribute('data-of')));
    });
    if (fill) fill.style.width = (done / total * 100) + '%';
    if (count) count.textContent = done + ' / ' + total;
    var ready = done === total;
    if (btn) {
      btn.disabled = !ready;
      btn.textContent = ready ? '開始教學　▶' : '先確認上面 ' + total + ' 項';
    }
    if (hint) {
      hint.textContent = ready ? total + ' 項都確認過了，可以開始' : '還有 ' + (total - done) + ' 項要確認';
      hint.classList.toggle('ready', ready);
    }
  }

  function openModal(k) {
    var d = DATA[k];
    if (!d) return;
    modalKey = k;
    mTitle.textContent = d.title;
    mImg.src = d.img;
    mImg.alt = d.alt || d.title;
    mCap.textContent = d.cap;
    mSteps.innerHTML = d.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    mAck.textContent = isAcked(k) ? '已確認 ✓' : '我知道了';
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('open'); });
    mClose.focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    modalKey = null;
    setTimeout(function () { modal.hidden = true; }, 180);
  }

  function open(callback) {
    pending = callback || null;
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add('open'); });
    sync();
  }
  function close() {
    root.classList.remove('open');
    setTimeout(function () { root.hidden = true; }, 200);
  }

  root.querySelectorAll('.pf-look').forEach(function (b) {
    b.addEventListener('click', function () { openModal(b.getAttribute('data-key')); });
  });
  root.querySelectorAll('.pf-ack').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-key');
      setAcked(k, !isAcked(k));
    });
  });
  mAck.addEventListener('click', function () {
    if (modalKey) setAcked(modalKey, true);
    closeModal();
  });
  mClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  if (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      close();
      var cb = pending; pending = null;
      if (cb) setTimeout(cb, 0);
    });
  }

  if (back) {
    back.addEventListener('click', function () {
      close();
      pending = null;
      if (window.__mm3dHome) window.__mm3dHome();
    });
  }

  window.Preflight = {
    begin: function (callback) {
      if (allAcked()) { callback(); return; }
      open(callback);
    },
    open: function () { open(null); },
    reset: function () { acked = []; save(); sync(); }
  };

  sync();

  // 可直接分享「校正前確認」給客戶：index.html?preflight=1
  if (/[?&]preflight=1/.test(location.search) || location.hash === '#preflight') open(null);
})();
