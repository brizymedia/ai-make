/**
 * 큰길브리지 — 사장님 직접 편집 조각
 *
 * 우리가 만들어 드린 홈페이지에서 사장님이 글자와 사진을 직접 고친다.
 * 페이지 맨 아래에 한 줄만 넣으면 된다:
 *
 *   <script src="/edit.js"></script>
 *
 * 그리고 <head> 에 열쇠 두 줄:
 *
 *   <meta name="kb-edit" content="열쇠의 SHA-256 (64자리)">
 *   <meta name="kb-edit-path" content="demo/sample/index.html">   ← 저장소 안 경로
 *
 * 고칠 수 있는 자리는 이렇게 표시한다 (둘 다 있어야 한다):
 *
 *   <h1 data-e="hero-title"><!--e:hero-title-->별빛이벤트<!--/e:hero-title--></h1>
 *   <img data-e-img="photo1" src="...">
 *
 *   data-e / data-e-img  → 이 조각이 「여기는 눌러서 고칠 수 있다」고 아는 표시
 *   <!--e:id--> 주석      → 서버가 저장소 파일에서 「여기를 갈아끼운다」고 아는 표시
 *
 * 사장님이 하는 일
 *   1. 우리가 문자로 보낸 주소로 들어간다:  사이트주소/?edit=열쇠
 *   2. 글자를 누르고 고친다. 사진을 누르고 갤러리에서 고른다.
 *   3. 「저장」을 누른다. 1~2분 뒤 실제 사이트에 반영된다.
 *
 * 레이아웃·색·순서는 못 건드린다. 일부러다. 사장님이 사이트를 망가뜨릴 길이 없다.
 *
 * 열쇠가 틀리면 이 조각은 아무것도 안 한다. 화면에 아무 표시도 안 난다.
 * 서버 주소가 비어 있거나 파일로 열었으면 「시안 모드」 — 이 기기에만 저장된다.
 * 그래도 사장님 눈에는 똑같이 고쳐진 것으로 보인다. 시연할 때 쓴다.
 */
(function () {
  'use strict';

  /* ── 편집 서버 주소 ──────────────────────────────────
     갤러리 발행 서버(앱스 스크립트)의 /exec 주소. 같은 서버가 편집도 받는다.
     비어 있으면 시안 모드로 돈다.                          */
  var 서버 = '';
  /* ─────────────────────────────────────────────────── */

  var 경로메타 = document.querySelector('meta[name="kb-edit-path"]');
  var 열쇠메타 = document.querySelector('meta[name="kb-edit"]');
  if (!경로메타 || !열쇠메타) return;

  var 경로 = (경로메타.getAttribute('content') || '').trim();
  var 열쇠해시 = (열쇠메타.getAttribute('content') || '').trim().toLowerCase();
  if (!경로 || !/^[0-9a-f]{64}$/.test(열쇠해시)) return;

  var 시안모드 = !서버 || location.protocol === 'file:';
  var 보관키 = 'kb-edit:' + 경로;

  /* ── 시안 모드에서 전에 저장해 둔 것이 있으면 먼저 입힌다 ──
     편집 모드가 아니어도 한다. 사장님이 고친 게 그 기기에서는 계속 보이게. */
  if (시안모드) {
    try {
      var 저장본 = JSON.parse(localStorage.getItem(보관키) || 'null');
      if (저장본) 입히기(저장본);
    } catch (e) { /* 저장된 게 없거나 깨졌다. 그냥 간다 */ }
  }

  /* ── 열쇠 얻기 ──
     ?edit=열쇠 로 들어오면 이 탭에 기억한다. ?edit=off 면 지운다. */
  var 열쇠 = '';
  try {
    var m = /[?&]edit=([^&#]+)/.exec(location.search || '');
    if (m) {
      var 값 = decodeURIComponent(m[1]);
      if (값 === 'off') sessionStorage.removeItem('kb-edit-key');
      else sessionStorage.setItem('kb-edit-key', 값);
    }
    열쇠 = sessionStorage.getItem('kb-edit-key') || '';
  } catch (e) { 열쇠 = m ? decodeURIComponent(m[1]) : ''; }

  if (!열쇠 || 열쇠 === 'off') return;
  if (sha256(열쇠) !== 열쇠해시) return;   // 틀린 열쇠. 조용히 끝.

  /* ══ 여기부터 편집 모드 ══════════════════════════════ */
  var 글자바뀜 = {};   // id → 새 글
  var 사진바뀜 = {};   // id → dataURL
  var 원래글 = {};     // id → 처음 글 (그만두기용)
  var 원래사진 = {};

  var 글자들 = [].slice.call(document.querySelectorAll('[data-e]'));
  var 사진들 = [].slice.call(document.querySelectorAll('img[data-e-img]'));
  if (!글자들.length && !사진들.length) return;

  스타일();
  막대();

  글자들.forEach(function (el) {
    var id = el.getAttribute('data-e');
    원래글[id] = el.innerText;
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('spellcheck', 'false');
    el.classList.add('kb-e');
    el.addEventListener('input', function () { 글자바뀜[id] = el.innerText; 표시갱신(); });
    // 엔터로 줄바꿈은 되지만, 붙여넣기는 글자만 받는다 (서식이 딸려오면 깨진다)
    el.addEventListener('paste', function (ev) {
      ev.preventDefault();
      var t = (ev.clipboardData || window.clipboardData).getData('text');
      document.execCommand('insertText', false, t);
    });
  });

  var 파일입력 = document.createElement('input');
  파일입력.type = 'file'; 파일입력.accept = 'image/*'; 파일입력.style.display = 'none';
  document.body.appendChild(파일입력);
  var 고르는중 = null;

  사진들.forEach(function (img) {
    var id = img.getAttribute('data-e-img');
    원래사진[id] = img.getAttribute('src');
    img.classList.add('kb-e-img');
    img.title = '누르면 사진을 바꿀 수 있어요';
    img.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      고르는중 = { img: img, id: id };
      파일입력.value = '';
      파일입력.click();
    });
  });

  파일입력.addEventListener('change', function () {
    var f = 파일입력.files && 파일입력.files[0];
    if (!f || !고르는중) return;
    if (!/^image\//.test(f.type)) { 알림('사진 파일만 올릴 수 있어요'); return; }
    var 대상 = 고르는중;
    줄여읽기(f, 1600, 0.85, function (dataURL) {
      if (!dataURL) { 알림('이 사진은 읽지 못했어요. 다른 사진으로 해보세요'); return; }
      대상.img.src = dataURL;
      사진바뀜[대상.id] = dataURL;
      표시갱신();
    });
  });

  /* ── 사진을 폰 원본 그대로 보내면 너무 크다. 긴 변 1600px 로 줄여서 JPEG 로. ── */
  function 줄여읽기(file, 최대, 품질, cb) {
    var r = new FileReader();
    r.onerror = function () { cb(null); };
    r.onload = function () {
      var im = new Image();
      im.onerror = function () { cb(null); };
      im.onload = function () {
        var w = im.width, h = im.height;
        var s = Math.min(1, 최대 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        try {
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          cb(c.toDataURL('image/jpeg', 품질));
        } catch (e) { cb(null); }
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ── 저장 ── */
  function 저장() {
    var 바뀐 = Object.keys(글자바뀜).length + Object.keys(사진바뀜).length;
    if (!바뀐) { 알림('바뀐 것이 없어요'); return; }

    if (시안모드) {
      try {
        localStorage.setItem(보관키, JSON.stringify({ 글: 글자바뀜, 사진: 사진바뀜, 때: Date.now() }));
        알림('이 기기에 저장했어요 (시안 모드)', true);
        글자바뀜 = {}; 사진바뀜 = {}; 표시갱신();
      } catch (e) {
        알림('사진이 너무 커서 이 기기에 저장하지 못했어요. 사진을 줄여서 다시 해보세요');
      }
      return;
    }

    var 본문 = {
      action: 'edit', path: 경로, token: 열쇠,
      changes: Object.keys(글자바뀜).map(function (id) { return { id: id, text: 글자바뀜[id] }; }),
      images:  Object.keys(사진바뀜).map(function (id) { return { id: id, data: 사진바뀜[id] }; })
    };
    잠금(true);
    /* text/plain 으로 보내야 브라우저가 미리 확인(preflight)을 안 보낸다.
       앱스 스크립트는 그 확인 요청을 못 받는다. */
    fetch(서버, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify(본문) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        잠금(false);
        if (j && j.ok) {
          알림('저장했어요. 1~2분 뒤 실제 사이트에 반영돼요', true);
          글자바뀜 = {}; 사진바뀜 = {}; 표시갱신();
        } else {
          알림('저장하지 못했어요: ' + ((j && j.error) || '서버가 대답하지 않았어요'));
        }
      })
      .catch(function () { 잠금(false); 알림('인터넷 연결을 확인하고 다시 눌러주세요'); });
  }

  function 그만두기() {
    글자들.forEach(function (el) { el.innerText = 원래글[el.getAttribute('data-e')]; });
    사진들.forEach(function (img) { img.src = 원래사진[img.getAttribute('data-e-img')]; });
    글자바뀜 = {}; 사진바뀜 = {}; 표시갱신();
    알림('되돌렸어요');
  }

  function 입히기(저장본) {
    Object.keys(저장본.글 || {}).forEach(function (id) {
      var el = document.querySelector('[data-e="' + id + '"]');
      if (!el) return;
      el.innerText = 저장본.글[id];
      // 페이지가 이 글자를 보고 뭔가 맞추는 게 있으면 (전화 버튼 같은 것) 다시 맞추게 알린다
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    });
    Object.keys(저장본.사진 || {}).forEach(function (id) {
      var im = document.querySelector('img[data-e-img="' + id + '"]');
      if (im) im.src = 저장본.사진[id];
    });
  }

  /* ── 화면 조각들 ── */
  var 막대칸, 상태칸, 저장단추;
  function 막대() {
    막대칸 = document.createElement('div');
    막대칸.id = 'kb-editbar';
    막대칸.innerHTML =
      '<span class="kb-eb-dot"></span>' +
      '<span class="kb-eb-txt">편집 중 — <b>글자나 사진을 누르면</b> 바꿀 수 있어요' +
      (시안모드 ? ' <i>(시안 모드 · 이 기기에만 저장)</i>' : '') + '</span>' +
      '<span class="kb-eb-st" id="kb-eb-st"></span>' +
      '<button type="button" class="kb-eb-btn kb-eb-undo">되돌리기</button>' +
      '<button type="button" class="kb-eb-btn kb-eb-save">저장</button>';
    document.body.appendChild(막대칸);
    상태칸 = 막대칸.querySelector('#kb-eb-st');
    저장단추 = 막대칸.querySelector('.kb-eb-save');
    저장단추.addEventListener('click', 저장);
    막대칸.querySelector('.kb-eb-undo').addEventListener('click', 그만두기);
    document.body.style.paddingBottom = '72px';
    표시갱신();
  }
  function 표시갱신() {
    var n = Object.keys(글자바뀜).length + Object.keys(사진바뀜).length;
    상태칸.textContent = n ? '바뀐 곳 ' + n : '';
    저장단추.disabled = !n;
  }
  function 잠금(on) { 저장단추.disabled = on; 저장단추.textContent = on ? '저장하는 중…' : '저장'; }
  var 알림시계;
  function 알림(말, 좋음) {
    var t = document.getElementById('kb-toast');
    if (!t) { t = document.createElement('div'); t.id = 'kb-toast'; document.body.appendChild(t); }
    t.textContent = 말; t.className = 좋음 ? 'on good' : 'on';
    clearTimeout(알림시계); 알림시계 = setTimeout(function () { t.className = ''; }, 3200);
  }
  function 스타일() {
    var s = document.createElement('style');
    s.textContent =
      '.kb-e{outline:2px dashed #E0A100;outline-offset:4px;cursor:text;min-width:1em;border-radius:2px}' +
      '.kb-e:hover,.kb-e:focus{outline-color:#111;outline-style:solid;background:rgba(255,232,92,.18)}' +
      '.kb-e-img{outline:2px dashed #E0A100;outline-offset:4px;cursor:pointer}' +
      '.kb-e-img:hover{outline-color:#111;outline-style:solid;opacity:.85}' +
      '#kb-editbar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;gap:10px;' +
        'padding:12px 16px;background:#111;color:#fff;font:14px/1.4 "Noto Sans KR","Malgun Gothic",system-ui,sans-serif;' +
        'box-shadow:0 -6px 24px rgba(0,0,0,.25);word-break:keep-all}' +
      '#kb-editbar .kb-eb-dot{width:9px;height:9px;border-radius:50%;background:#FFE85C;flex:none;animation:kbpulse 1.6s infinite}' +
      '@keyframes kbpulse{50%{opacity:.35}}' +
      '#kb-editbar .kb-eb-txt{flex:1;min-width:0}#kb-editbar .kb-eb-txt i{opacity:.6;font-style:normal;font-size:12px}' +
      '#kb-editbar .kb-eb-st{font-size:12px;opacity:.75;white-space:nowrap}' +
      '#kb-editbar .kb-eb-btn{border:0;border-radius:8px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '#kb-editbar .kb-eb-undo{background:#333;color:#ddd}' +
      '#kb-editbar .kb-eb-save{background:#FFE85C;color:#111}' +
      '#kb-editbar .kb-eb-save:disabled{opacity:.4;cursor:default}' +
      '#kb-toast{position:fixed;left:50%;bottom:84px;transform:translate(-50%,10px);z-index:2147483001;opacity:0;' +
        'background:#222;color:#fff;padding:10px 16px;border-radius:10px;font:14px "Noto Sans KR",system-ui,sans-serif;' +
        'transition:.25s;pointer-events:none;max-width:90vw;text-align:center;word-break:keep-all}' +
      '#kb-toast.on{opacity:1;transform:translate(-50%,0)}#kb-toast.good{background:#1F7A4D}' +
      '@media(max-width:520px){#kb-editbar{flex-wrap:wrap;font-size:13px}#kb-editbar .kb-eb-txt{flex-basis:100%}}';
    document.head.appendChild(s);
  }

  /* ── SHA-256 ──
     열쇠가 맞는지 확인할 때 쓴다. 브라우저 내장 crypto.subtle 은 https 에서만 돌아서
     파일로 열어 시연할 때 죽는다. 그래서 작은 구현을 직접 들고 다닌다. */
  function sha256(s) {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var b = unescape(encodeURIComponent(s)), l = b.length, w = [], i, j;
    for (i = 0; i < l; i++) w[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
    w[(((l + 8) >> 6) << 4) + 15] = l * 8;
    function R(x, n) { return (x >>> n) | (x << (32 - n)); }
    var W = new Array(64), a, bb, c, d, e, f, g, h, t1, t2;
    for (i = 0; i < w.length; i += 16) {
      a = H[0]; bb = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
      for (j = 0; j < 64; j++) {
        if (j < 16) W[j] = w[i + j] | 0;
        else {
          var s0 = R(W[j-15], 7) ^ R(W[j-15], 18) ^ (W[j-15] >>> 3);
          var s1 = R(W[j-2], 17) ^ R(W[j-2], 19) ^ (W[j-2] >>> 10);
          W[j] = (W[j-16] + s0 + W[j-7] + s1) | 0;
        }
        t1 = (h + (R(e,6) ^ R(e,11) ^ R(e,25)) + ((e & f) ^ (~e & g)) + K[j] + W[j]) | 0;
        t2 = ((R(a,2) ^ R(a,13) ^ R(a,22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+bb)|0; H[2]=(H[2]+c)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    var out = '';
    for (i = 0; i < 8; i++) out += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return out;
  }

  // 시험용. 실제 사이트에서는 쓸 일 없다.
  window.__kbEdit = { sha256: sha256, 시안모드: 시안모드, 경로: 경로 };
})();
