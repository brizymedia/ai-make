/* 첫 화면 — 얼굴에서 피부까지 쭉 확대되는 장면
   예쁜 얼굴 사진으로 시작해 뺨 · 피부결 · 모공까지 카메라가 다가간다.
   사진 세 장(얼굴 · 뺨 · 피부 확대)을 크기에 맞춰 이어 붙이며, 모두 AI 로 만든 가상 인물이다.
   확대는 코드로 계산한 하나의 값(p)으로 움직인다 — 처음에는 저절로, 그 뒤에는 단추와 눈금으로 직접. */
(function () {
  "use strict";
  var cv = document.getElementById("lens");
  if (!cv || !cv.getContext) return;
  var wrap = document.getElementById("lensWrap");
  var ticks = document.getElementById("lensTicks");
  var rangeEl = document.getElementById("lensRange");
  var xEl = document.getElementById("lensX");
  var barEl = document.getElementById("lensBar");
  var barT = document.getElementById("lensBarT");
  var poiEls = [document.getElementById("poiA"), document.getElementById("poiB")];
  var stageBtns = Array.prototype.slice.call(document.querySelectorAll(".hud-stages button"));
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.innerWidth < 720;

  /* ── 조정값 ── */
  var ZMAX = 13;            /* 끝까지 확대했을 때 배율 */
  var AFIT = 0.93;          /* 얼굴 사진이 원 안에서 차지하는 폭 (1 이면 원에 꽉 참) */
  var TA = { x: 0.34, y: 0.5 };   /* 얼굴 사진에서 다가갈 뺨의 자리 (사진 비율 좌표) */
  var ZM = 3.6, ZB = 7;    /* 뺨 사진 · 피부 확대 사진이 원을 덮기 시작하는 배율 */
  var MX = 0.46, MY = 0.45, BX = 0.5, BY = 0.5;   /* 각 사진에서 화면 가운데에 올 자리 */
  var POIS = [
    { x: 0.537, y: 0.576, t: "모공", s: "지름 약 0.1 mm" },
    { x: 0.6, y: 0.43, t: "피부결", s: "미세한 결" }
  ];
  var FOV0 = 200;           /* 처음 화면의 가로 폭이 실제로 몇 mm 인지 (눈금자 계산용) */

  /* ── 사진 ── */
  var IM = { A: { ok: false }, M: { ok: false }, B: { ok: false } };
  function load(key, file, done) {
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      IM[key] = { ok: true, img: img };
      if (done) done();
      kick();
    };
    img.onerror = function () { IM[key] = { ok: false }; if (key === "A") wrap.classList.add("no-img"); };
    img.src = "img/" + file + (small ? "-s" : "") + ".webp?v=20261001b";
  }

  function smooth(v, a, b) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function zoomOf(p) { return Math.exp(p * Math.log(ZMAX)); }

  /* ── 상태 ── */
  var S = { p: 0, intro: 0, ox: 0, oy: 0, tox: 0, toy: 0, anim: null };
  var D = 0, dpr = 1, raf = 0, fadeAt = 0, bg = "#E9EDF0", pulse = 0, vis = true;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function layout() {
    D = wrap.clientWidth || 520;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(D * dpr);
    cv.height = Math.round(D * dpr);
    kick();
  }
  function buildTicks() {
    if (!ticks) return;
    var s = "", i, a, len, r0 = 51.2;
    for (i = 0; i < 120; i++) {
      a = i * 3 * Math.PI / 180;
      len = i % 10 === 0 ? 4.4 : (i % 5 === 0 ? 3 : 1.8);
      s += '<line x1="' + (50 + Math.cos(a) * r0).toFixed(2) + '" y1="' + (50 + Math.sin(a) * r0).toFixed(2) +
        '" x2="' + (50 + Math.cos(a) * (r0 + len)).toFixed(2) + '" y2="' + (50 + Math.sin(a) * (r0 + len)).toFixed(2) + '"/>';
    }
    ticks.setAttribute("viewBox", "-6 -6 112 112");
    ticks.innerHTML = '<g stroke="#0E2233" stroke-opacity=".5" stroke-width=".22">' + s + '</g>' +
      '<path d="M50 -5.4 L48.3 -2.4 L51.7 -2.4 Z" fill="#B5475C"/>';
  }

  /* 확대 값 p(0~1)를 움직이는 두 가지 방법 */
  function zoomTo(p1, ms) {
    if (reduce) { S.anim = null; S.p = p1; kick(); return; }
    var p0 = S.p, t0 = 0;
    S.anim = function (now) {
      if (!t0) t0 = now;
      var u = Math.min(1, (now - t0) / ms);
      S.p = p0 + (p1 - p0) * ease(u);
      if (u >= 1) { S.anim = null; return false; }
      return true;
    };
    kick();
  }
  function startIntro() {
    fadeAt = performance.now();
    if (reduce) { S.intro = 1; kick(); return; }
    kick();
    /* 첫 화면에서 원이 보일 때 시작한다. 폰에서 원이 화면 아래에 있으면 보일 때까지 기다린다 */
    function go() { setTimeout(function () { if (!S.anim && S.p === 0) zoomTo(1, 6200); }, 1700); }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.55 });
      io.observe(wrap);
    } else { go(); }
  }

  function frame(now) {
    raf = 0;
    var busy = false;
    if (IM.A.ok && S.intro < 1) { S.intro = reduce ? 1 : Math.min(1, (now - fadeAt) / 1000); busy = S.intro < 1; }
    if (S.anim && S.anim(now)) busy = true;
    var k = reduce ? 1 : 0.09;
    S.ox += (S.tox - S.ox) * k;
    S.oy += (S.toy - S.oy) * k;
    if (Math.abs(S.tox - S.ox) > 0.002 || Math.abs(S.toy - S.oy) > 0.002) busy = true;
    pulse = now;
    draw();
    hud();
    if (busy || (!reduce && S.p < 0.12 && S.intro >= 1 && vis)) raf = requestAnimationFrame(frame);
  }

  /* ── 그리기 ── */
  function layer(im, w, cx, cy, ox, oy, a) {
    if (a <= 0.003 || !im.ok) return;
    var R = D / 2;
    ctx.globalAlpha = S.intro * a;
    ctx.drawImage(im.img, R + ox - cx * w, R + oy - cy * w, w, w);
  }
  function draw() {
    if (!IM.A.ok || !D) return;
    var R = D / 2, Z = zoomOf(S.p);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, D, D);
    ctx.save();
    ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, D, D);

    /* 시점이 마우스나 손가락을 따라 조금 움직인다 */
    var sh = (0.012 + 0.04 * smooth(S.p, 0.1, 0.7)) * D, ox = S.ox * sh, oy = S.oy * sh;
    /* 카메라가 뺨으로 다가가는 길 */
    var pan = smooth(Z, 1, 3.4), cx = 0.5 + (TA.x - 0.5) * pan, cy = 0.5 + (TA.y - 0.5) * pan;
    var wA = D * AFIT * Z, aM = smooth(Z, ZM * 0.9, ZM * 1.3), aB = smooth(Z, ZB * 0.9, ZB * 1.3);
    var mOn = IM.M.ok && aM > 0, bOn = IM.B.ok && aB > 0;
    if (!(mOn && aM >= 1) && !(bOn && aB >= 1)) {
      /* 얼굴 사진이 원보다 조금 작을 때, 사진 가장자리 한 줄을 늘여 바깥을 이어 준다 */
      var ax = R + ox - cx * wA, ay = R + oy - cy * wA, im = IM.A.img, iw = im.naturalWidth, ih = im.naturalHeight;
      if (Z < 1.4) {
        ctx.globalAlpha = S.intro;
        if (ay > 0.5) ctx.drawImage(im, 0, 0, iw, 3, ax, 0, wA, ay + 1);
        if (ay + wA < D - 0.5) ctx.drawImage(im, 0, ih - 3, iw, 3, ax, ay + wA - 1, wA, D - ay - wA + 1);
        if (ax > 0.5) ctx.drawImage(im, 0, 0, 3, ih, 0, ay, ax + 1, wA);
        if (ax + wA < D - 0.5) ctx.drawImage(im, iw - 3, 0, 3, ih, ax + wA - 1, ay, D - ax - wA + 1, wA);
      }
      layer(IM.A, wA, cx, cy, ox, oy, 1);
    }
    if (mOn && !(bOn && aB >= 1)) layer(IM.M, D * 1.3 * Z / ZM, MX, MY, ox, oy, aM);
    if (bOn) layer(IM.B, D * 1.3 * Z / ZB, BX, BY, ox, oy, aB);
    ctx.globalAlpha = 1;

    /* 렌즈 느낌: 가장자리가 살짝 어두워지고, 다가갈수록 조금 더 진해진다 */
    var vg = ctx.createRadialGradient(R, R, R * 0.5, R, R, R);
    vg.addColorStop(0, "rgba(14,34,51,0)");
    vg.addColorStop(1, "rgba(14,34,51," + (0.03 + 0.1 * smooth(S.p, 0.15, 0.9)).toFixed(3) + ")");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, D, D);

    /* 처음 화면: 다가갈 자리를 알려 주는 고리 (얇은 원 하나, 눈금 없음) */
    var ra = (1 - smooth(S.p, 0, 0.1)) * smooth(S.intro, 0.6, 1);
    if (ra > 0.01) {
      var rx = R + ox + (TA.x - cx) * wA, ry = R + oy + (TA.y - cy) * wA;
      var rr = D * 0.07 * (1 + 0.06 * Math.sin(pulse / 380));
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(14,34,51," + (0.16 * ra).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.8; ctx.strokeStyle = "rgba(255,255,255," + (0.95 * ra).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + (0.95 * ra).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(rx, ry, 2.6, 0, Math.PI * 2); ctx.fill();
    }

    /* 유리에 비치는 빛 */
    ctx.lineCap = "round";
    ctx.lineWidth = D * 0.012; ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.beginPath(); ctx.arc(R, R, R * 0.93, Math.PI * 1.06, Math.PI * 1.3); ctx.stroke();
    ctx.restore();

    /* 바깥 테두리 */
    ctx.lineWidth = 5; ctx.strokeStyle = "#0E2233";
    ctx.beginPath(); ctx.arc(R, R, R - 2.5, 0, Math.PI * 2); ctx.stroke();
  }

  /* ── 아래 눈금판 · 이름표 ── */
  var lastStage = -1, lastX = "";
  function hud() {
    var Z = zoomOf(S.p), R = D / 2;
    var xt = "×" + (Z < 10 ? Z.toFixed(1) : String(Math.round(Z)));
    if (xt !== lastX) { lastX = xt; if (xEl) xEl.textContent = xt; }
    if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = String(Math.round(S.p * 1000));
    var st = S.p < 0.25 ? 0 : (S.p < 0.8 ? 1 : 2);
    if (st !== lastStage) {
      lastStage = st;
      stageBtns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === st ? "true" : "false"); });
    }
    /* 눈금자는 사진 위가 아니라 아래 눈금판에 둔다. 길이는 그림 속 실제 크기에 맞춘다 */
    var fov = FOV0 / Z, nice = [20, 10, 5, 2, 1, 0.5, 0.2, 0.1], j, len = 0.1;
    for (j = 0; j < nice.length; j++) { if (D * nice[j] / fov <= 96) { len = nice[j]; break; } }
    if (barEl) { barEl.style.width = (D * len / fov).toFixed(1) + "px"; barT.textContent = len + " mm"; }
    /* 끝까지 확대했을 때만 모공 · 피부결 이름표 */
    var pa = smooth(S.p, 0.9, 0.99), wB = D * 1.3 * Z / ZB, sh = (0.012 + 0.04 * smooth(S.p, 0.1, 0.7)) * D;
    poiEls.forEach(function (el, i) {
      if (!el) return;
      var po = POIS[i], px = R + S.ox * sh + (po.x - BX) * wB, py = R + S.oy * sh + (po.y - BY) * wB;
      var dx = px - R, dy = py - R, inside = Math.sqrt(dx * dx + dy * dy) < R * 0.8;
      el.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px)";
      el.classList.toggle("on", pa > 0.6 && inside && IM.B.ok);
      el.classList.toggle("flip", px > D * 0.58);
    });
  }

  /* ── 마우스 · 손가락 · 단추 ── */
  function pointer(e) {
    if (reduce) return;
    var b = wrap.getBoundingClientRect();
    S.tox = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2));
    S.toy = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2));
    kick();
  }
  wrap.addEventListener("pointermove", function (e) { if (e.pointerType === "touch" && e.buttons === 0) return; pointer(e); });
  wrap.addEventListener("pointerdown", pointer);
  wrap.addEventListener("pointerleave", function () { S.tox = 0; S.toy = 0; kick(); });
  if (rangeEl) rangeEl.addEventListener("input", function () { S.anim = null; S.p = (+rangeEl.value) / 1000; kick(); });
  stageBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var p1 = +b.getAttribute("data-p");
      zoomTo(p1, 900 + Math.abs(p1 - S.p) * 2400);
    });
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; if (vis) kick(); }, { threshold: 0.01 }).observe(wrap);
  }
  buildTicks();
  layout();
  if (window.ResizeObserver) { new ResizeObserver(layout).observe(wrap); } else { window.addEventListener("resize", layout); }
  load("A", "face", function () { startIntro(); load("M", "cheek"); load("B", "macro"); });

  window.GB = window.GB || {};
  GB.lens = {
    ready: function () { return IM.A.ok; },
    p: function () { return S.p; },
    set: function (p) { S.anim = null; S.intro = 1; S.p = p; kick(); }
  };
})();
