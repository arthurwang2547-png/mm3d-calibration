/* STEP 00 校正前確認
   目的：客戶按「開始教學」後，先逐項確認校正前的設定，再進第 1 步。
   全部打勾才會放行；已確認過的同一個分頁不再重複攔。 */
(function () {
  var KEY = 'mm3d-preflight-v1';
  var root = document.getElementById('preflight');
  if (!root) return;

  var boxes = Array.prototype.slice.call(root.querySelectorAll('.pf-check'));
  var fill = root.querySelector('.pf-progress .bar i');
  var count = root.querySelector('.pf-progress .txt b');
  var btn = root.querySelector('#pf-start');
  var hint = root.querySelector('#pf-hint');
  var back = root.querySelector('#pf-back');
  var pending = null;

  function confirmed() {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function sync() {
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var total = boxes.length;
    boxes.forEach(function (b) {
      b.closest('.pf-item').classList.toggle('checked', b.checked);
    });
    root.querySelectorAll('.pf-mini [data-of]').forEach(function (row) {
      var box = document.getElementById(row.getAttribute('data-of'));
      row.classList.toggle('done', !!(box && box.checked));
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

  function open(callback) {
    pending = callback || null;
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add('open'); });
    sync();
  }

  function close() {
    root.classList.remove('open');
    setTimeout(function () { root.hidden = true; }, 220);
  }

  boxes.forEach(function (b) { b.addEventListener('change', sync); });

  // 點標題也能勾
  root.querySelectorAll('.pf-title').forEach(function (t) {
    t.addEventListener('click', function () {
      var box = t.closest('.pf-item').querySelector('.pf-check');
      box.checked = !box.checked;
      sync();
    });
  });

  if (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      remember();
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
      if (confirmed()) { callback(); return; }
      open(callback);
    },
    open: function () { open(null); },
    reset: function () { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  sync();

  // 可直接分享「校正前確認」給客戶：index.html?preflight=1
  if (/[?&]preflight=1/.test(location.search) || location.hash === '#preflight') open(null);
})();
