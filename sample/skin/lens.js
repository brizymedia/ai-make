/* 첫 화면 — 더모스코프(피부 확대경) 렌즈
   피부 질감을 한 번 그려 두고, 마우스나 손가락을 따라 움직이는 렌즈로 확대해서 보여 준다.
   사진이 아니라 코드로 그린 그림이다. 렌즈 안의 눈금(1 mm)은 그림 속 크기와 맞게 계산한다. */
(function () {
  "use strict";
  var cv = document.getElementById("lens");
  if (!cv || !cv.getContext) return;
  var wrap = document.getElementById("lensWrap");
  var poiEl = document.getElementById("poi");
  var ticks = document.getElementById("lensTicks");
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PI2 = Math.PI * 2;
  var S = window.innerWidth < 720 ? 1400 : 1800;   /* 질감 한 변 (픽셀) */
  var u = S / 1800;                                /* 크기 보정 */
  var ZOOM = 2.6;
  var MM = 150 * u;                                /* 그림 속 1 mm 가 질감에서 차지하는 픽셀 */
  var tex = null;

  /* 매번 같은 그림이 나오게 씨앗이 있는 난수 */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 렌즈가 지나가며 이름을 알려 줄 자리 (질감 좌표 비율) */
  var POIS = [
    { x: 0.47, y: 0.43, r: 13, t: "모공", s: "지름 약 0.2 mm" },
    { x: 0.63, y: 0.58, r: 22, t: "피부결", s: "미세한 주름선" },
    { x: 0.35, y: 0.62, r: 26, t: "모세혈관", s: "붉은기의 원인" },
    { x: 0.58, y: 0.31, r: 30, t: "색소", s: "멜라닌 분포" }
  ];

  function build() {
    var c = document.createElement("canvas");
    c.width = c.height = S;
    var g = c.getContext("2d");
    var r = rng(20261001);
    var i, j, x, y;

    /* 1) 바탕 살색 */
    g.fillStyle = "#E9C8BA";
    g.fillRect(0, 0, S, S);

    /* 2) 큰 얼룩 — 혈색과 톤의 완만한 차이 */
    var tones = [[214, 140, 128], [246, 220, 204], [196, 146, 120], [232, 170, 160], [250, 232, 218]];
    for (i = 0; i < 36; i++) {
      x = r() * S; y = r() * S;
      var rad = (180 + r() * 420) * u;
      var tn = tones[Math.floor(r() * tones.length)];
      var a = 0.1 + r() * 0.17;
      var gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(" + tn[0] + "," + tn[1] + "," + tn[2] + "," + a + ")");
      gr.addColorStop(1, "rgba(" + tn[0] + "," + tn[1] + "," + tn[2] + ",0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    /* 3) 피부결 — 육각형 격자를 흔들어 골을 만든다 */
    var step = 64 * u, rowH = step * 0.866;
    var cols = Math.ceil(S / step) + 3, rows = Math.ceil(S / rowH) + 3;
    var pts = [];
    for (j = 0; j < rows; j++) {
      pts[j] = [];
      for (i = 0; i < cols; i++) {
        pts[j][i] = [
          (i - 1) * step + (j % 2) * step / 2 + (r() - 0.5) * step * 0.44,
          (j - 1) * rowH + (r() - 0.5) * step * 0.4
        ];
      }
    }
    /* 면마다 살짝 볼록한 느낌의 밝은 점 */
    for (j = 0; j < rows - 1; j++) {
      for (i = 0; i < cols - 1; i++) {
        var p0 = pts[j][i], p1 = pts[j][i + 1], p2 = pts[j + 1][i];
        var cx = (p0[0] + p1[0] + p2[0]) / 3, cy = (p0[1] + p1[1] + p2[1]) / 3;
        var lg = g.createRadialGradient(cx, cy, 0, cx, cy, step * 0.62);
        lg.addColorStop(0, "rgba(255,238,228,0.2)");
        lg.addColorStop(1, "rgba(255,238,228,0)");
        g.fillStyle = lg;
        g.fillRect(cx - step * 0.62, cy - step * 0.62, step * 1.24, step * 1.24);
      }
    }
    g.lineCap = "round";
    function furrow(a, b, w) {
      if (r() < 0.12) return;
      var mx = (a[0] + b[0]) / 2 + (r() - 0.5) * step * 0.22;
      var my = (a[1] + b[1]) / 2 + (r() - 0.5) * step * 0.22;
      g.lineWidth = (w || 1) * (1.5 + r() * 1.9) * u;
      g.strokeStyle = "rgba(255,244,236,0.34)";
      g.beginPath(); g.moveTo(a[0] + 1.4 * u, a[1] + 1.6 * u); g.quadraticCurveTo(mx + 1.4 * u, my + 1.6 * u, b[0] + 1.4 * u, b[1] + 1.6 * u); g.stroke();
      g.strokeStyle = "rgba(136,78,72," + (0.2 + r() * 0.14) + ")";
      g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, b[0], b[1]); g.stroke();
    }
    for (j = 0; j < rows - 1; j++) {
      for (i = 0; i < cols - 1; i++) {
        furrow(pts[j][i], pts[j][i + 1]);
        if (j % 2 === 0) {
          if (i > 0) furrow(pts[j][i], pts[j + 1][i - 1]);
          furrow(pts[j][i], pts[j + 1][i]);
        } else {
          furrow(pts[j][i], pts[j + 1][i]);
          furrow(pts[j][i], pts[j + 1][i + 1]);
        }
      }
    }

    /* 4) 모공 */
    function pore(px, py, pr) {
      var pg = g.createRadialGradient(px, py, 0, px, py, pr * 2);
      pg.addColorStop(0, "rgba(92,44,44,0.7)");
      pg.addColorStop(0.45, "rgba(120,62,58,0.42)");
      pg.addColorStop(1, "rgba(120,62,58,0)");
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, pr * 2, 0, PI2); g.fill();
      g.lineWidth = 2.2 * u;
      g.strokeStyle = "rgba(255,238,228,0.4)";
      g.beginPath(); g.arc(px, py, pr * 1.28, 0, PI2); g.stroke();
    }
    for (j = 1; j < rows - 1; j++) {
      for (i = 1; i < cols - 1; i++) {
        if (r() < 0.42) pore(pts[j][i][0] + (r() - 0.5) * 10 * u, pts[j][i][1] + (r() - 0.5) * 10 * u, (4.6 + r() * 4.6) * u);
      }
    }

    /* 5) 솜털 */
    for (i = 0; i < 170; i++) {
      x = r() * S; y = r() * S;
      var len = (46 + r() * 70) * u, ang = r() * PI2;
      g.lineWidth = (1 + r() * 0.8) * u;
      g.strokeStyle = "rgba(112,80,66," + (0.22 + r() * 0.2) + ")";
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(ang + 0.5) * len * 0.6, y + Math.sin(ang + 0.5) * len * 0.6, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    }

    /* 6) 잡티 */
    for (i = 0; i < 34; i++) {
      x = r() * S; y = r() * S;
      var sr = (8 + r() * 28) * u;
      var sg = g.createRadialGradient(x, y, 0, x, y, sr);
      sg.addColorStop(0, "rgba(150,96,70," + (0.16 + r() * 0.16) + ")");
      sg.addColorStop(1, "rgba(150,96,70,0)");
      g.fillStyle = sg;
      g.beginPath(); g.arc(x, y, sr, 0, PI2); g.fill();
    }

    /* 7) 렌즈가 이름을 알려 줄 자리를 또렷하게 */
    var p, px, py, aa, ll;
    p = POIS[0]; px = p.x * S; py = p.y * S;
    pore(px, py, p.r * u);
    pore(px - 46 * u, py + 30 * u, 7 * u);
    pore(px + 52 * u, py - 26 * u, 6.5 * u);
    /* 피부결 — 골이 만나는 자리 */
    p = POIS[1]; px = p.x * S; py = p.y * S;
    for (i = 0; i < 6; i++) {
      aa = i * Math.PI / 3 + 0.3; ll = (52 + (i % 2) * 18) * u;
      g.lineWidth = 3.2 * u; g.strokeStyle = "rgba(255,244,236,0.4)";
      g.beginPath(); g.moveTo(px + 1.6 * u, py + 1.8 * u); g.lineTo(px + Math.cos(aa) * ll + 1.6 * u, py + Math.sin(aa) * ll + 1.8 * u); g.stroke();
      g.lineWidth = 2.6 * u; g.strokeStyle = "rgba(128,70,66,0.42)";
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(aa) * ll, py + Math.sin(aa) * ll); g.stroke();
    }
    /* 모세혈관 — 붉은 고리 */
    p = POIS[2]; px = p.x * S; py = p.y * S;
    g.lineJoin = "round";
    g.beginPath(); g.moveTo(px - 60 * u, py + 40 * u);
    g.bezierCurveTo(px - 50 * u, py - 50 * u, px + 20 * u, py - 60 * u, px + 10 * u, py - 6 * u);
    g.bezierCurveTo(px + 4 * u, py + 26 * u, px + 46 * u, py + 40 * u, px + 70 * u, py - 14 * u);
    g.lineWidth = 6.5 * u; g.strokeStyle = "rgba(190,70,84,0.22)"; g.stroke();
    g.lineWidth = 2.6 * u; g.strokeStyle = "rgba(176,50,68,0.78)"; g.stroke();
    /* 색소 — 갈색 덩어리 */
    p = POIS[3]; px = p.x * S; py = p.y * S;
    for (i = 0; i < 9; i++) {
      var bx = px + (r() - 0.5) * 70 * u, by = py + (r() - 0.5) * 60 * u, br = (9 + r() * 15) * u;
      var bg = g.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, "rgba(120,72,48,0.62)");
      bg.addColorStop(1, "rgba(120,72,48,0)");
      g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, PI2); g.fill();
    }

    /* 8) 자잘한 결 (잡음) */
    var id = g.getImageData(0, 0, S, S), d = id.data, n;
    for (i = 0; i < d.length; i += 4) {
      n = (Math.random() - 0.5) * 11;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(id, 0, 0);
    return c;
  }

  /* ── 화면에 그리기 ── */
  var D = 0, dpr = 1, k = 1, Lr = 0;
  var cur = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  var userUntil = 0, running = false, visible = true, t0 = performance.now(), shown = null;

  function clampLens(pt) {
    var c = D / 2, maxR = D / 2 - Lr * 0.82;
    var dx = pt.x - c, dy = pt.y - c, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { pt.x = c + dx / dist * maxR; pt.y = c + dy / dist * maxR; }
  }

  function layout() {
    var first = !D;
    D = wrap.clientWidth || 560;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(D * dpr);
    cv.height = Math.round(D * dpr);
    k = D / S;
    Lr = D * 0.235;
    if (first) { cur.x = target.x = POIS[0].x * D; cur.y = target.y = POIS[0].y * D; }
    clampLens(cur); clampLens(target);
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
    ticks.innerHTML = '<g stroke="#0E2233" stroke-opacity=".55" stroke-width=".22">' + s + '</g>' +
      '<path d="M50 -5.4 L48.3 -2.4 L51.7 -2.4 Z" fill="#B5475C"/>';
  }

  function draw() {
    if (!tex) return;
    var c = D / 2, R = D / 2, lx = cur.x, ly = cur.y, i, a;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, D, D);

    /* 바깥쪽 — 렌즈 없이 본 피부. 조용하게 깔아 둔다 */
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, R, 0, PI2); ctx.clip();
    ctx.drawImage(tex, 0, 0, S, S, 0, 0, D, D);
    ctx.fillStyle = "rgba(243,246,247,0.36)"; ctx.fillRect(0, 0, D, D);
    var vg = ctx.createRadialGradient(c, c, D * 0.3, c, c, R);
    vg.addColorStop(0, "rgba(14,34,51,0)"); vg.addColorStop(1, "rgba(14,34,51,0.2)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, D, D);
    var sh = ctx.createRadialGradient(lx + Lr * 0.04, ly + Lr * 0.1, Lr * 0.98, lx + Lr * 0.04, ly + Lr * 0.1, Lr * 1.34);
    sh.addColorStop(0, "rgba(14,34,51,0.34)"); sh.addColorStop(1, "rgba(14,34,51,0)");
    ctx.fillStyle = sh; ctx.fillRect(0, 0, D, D);
    ctx.restore();

    /* 렌즈 안 — 같은 그림을 확대해서 또렷하게 */
    var sw = (2 * Lr) / (k * ZOOM);
    var sx = Math.max(0, Math.min(S - sw, lx / k - sw / 2));
    var sy = Math.max(0, Math.min(S - sw, ly / k - sw / 2));
    var scale = (2 * Lr) / sw;
    ctx.save();
    ctx.beginPath(); ctx.arc(lx, ly, Lr, 0, PI2); ctx.clip();
    ctx.drawImage(tex, sx, sy, sw, sw, lx - Lr, ly - Lr, 2 * Lr, 2 * Lr);
    var gl = ctx.createRadialGradient(lx - Lr * 0.32, ly - Lr * 0.38, Lr * 0.08, lx, ly, Lr);
    gl.addColorStop(0, "rgba(255,250,244,0.2)"); gl.addColorStop(0.65, "rgba(255,250,244,0)"); gl.addColorStop(1, "rgba(14,34,51,0.32)");
    ctx.fillStyle = gl; ctx.fillRect(lx - Lr, ly - Lr, 2 * Lr, 2 * Lr);

    /* 이름을 알려 줄 자리에는 조준 고리 */
    var best = null, bd = 1e9;
    POIS.forEach(function (p) {
      var px = lx - Lr + (p.x * S - sx) * scale, py = ly - Lr + (p.y * S - sy) * scale;
      var dd = Math.sqrt((px - lx) * (px - lx) + (py - ly) * (py - ly));
      p._x = px; p._y = py;
      if (dd < bd) { bd = dd; best = p; }
      if (dd < Lr * 0.84) {
        var rr = Math.max(p.r * u * scale * 1.5, 12);
        ctx.strokeStyle = "rgba(14,34,51,0.72)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(px, py, rr, 0, PI2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px - rr - 5, py); ctx.lineTo(px - rr + 4, py); ctx.moveTo(px + rr - 4, py); ctx.lineTo(px + rr + 5, py);
        ctx.moveTo(px, py - rr - 5); ctx.lineTo(px, py - rr + 4); ctx.moveTo(px, py + rr - 4); ctx.lineTo(px, py + rr + 5);
        ctx.stroke();
      }
    });

    /* 링 조명 */
    for (i = 0; i < 20; i++) {
      a = i / 20 * PI2;
      var ox = lx + Math.cos(a) * Lr * 0.935, oy = ly + Math.sin(a) * Lr * 0.935;
      var og = ctx.createRadialGradient(ox, oy, 0, ox, oy, Lr * 0.05);
      og.addColorStop(0, "rgba(255,255,255,0.95)"); og.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, Lr * 0.05, 0, PI2); ctx.fill();
    }

    /* 조준선 */
    ctx.strokeStyle = "rgba(14,34,51,0.62)"; ctx.lineWidth = 1; ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(lx - Lr * 0.17, ly); ctx.lineTo(lx - Lr * 0.045, ly); ctx.moveTo(lx + Lr * 0.045, ly); ctx.lineTo(lx + Lr * 0.17, ly);
    ctx.moveTo(lx, ly - Lr * 0.17); ctx.lineTo(lx, ly - Lr * 0.045); ctx.moveTo(lx, ly + Lr * 0.045); ctx.lineTo(lx, ly + Lr * 0.17);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(lx, ly, Lr * 0.045, 0, PI2); ctx.stroke();

    /* 눈금자 — 그림 속 실제 크기에 맞춘 길이 */
    var mm = MM * scale, useMm = 1, barPx = mm;
    if (barPx > Lr * 1.15) { useMm = 0.5; barPx = mm / 2; }
    var by = ly + Lr * 0.66;
    ctx.strokeStyle = "rgba(14,34,51,0.88)"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lx - barPx / 2, by); ctx.lineTo(lx + barPx / 2, by);
    ctx.moveTo(lx - barPx / 2, by - 5); ctx.lineTo(lx - barPx / 2, by + 5);
    ctx.moveTo(lx + barPx / 2, by - 5); ctx.lineTo(lx + barPx / 2, by + 5);
    ctx.stroke();
    ctx.font = "500 " + Math.max(10, Math.round(Lr * 0.088)) + "px 'DM Mono', monospace";
    ctx.textAlign = "center";
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.strokeText(useMm + " mm", lx, by - 9);
    ctx.fillStyle = "rgba(14,34,51,0.92)"; ctx.fillText(useMm + " mm", lx, by - 9);
    ctx.restore();

    /* 렌즈 테두리 */
    var bz = ctx.createLinearGradient(lx - Lr, ly - Lr, lx + Lr, ly + Lr);
    bz.addColorStop(0, "#35516A"); bz.addColorStop(1, "#0E2233");
    ctx.beginPath(); ctx.arc(lx, ly, Lr * 1.07, 0, PI2); ctx.arc(lx, ly, Lr, 0, PI2, true);
    ctx.fillStyle = bz; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
    for (i = 0; i < 90; i++) {
      a = i / 90 * PI2;
      ctx.beginPath();
      ctx.moveTo(lx + Math.cos(a) * Lr * 1.02, ly + Math.sin(a) * Lr * 1.02);
      ctx.lineTo(lx + Math.cos(a) * Lr * 1.055, ly + Math.sin(a) * Lr * 1.055);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.beginPath(); ctx.arc(lx, ly, Lr - 0.5, 0, PI2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Lr * 0.035; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(lx, ly, Lr * 0.88, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
    /* 바깥 테두리 */
    ctx.lineWidth = 3; ctx.strokeStyle = "#0E2233";
    ctx.beginPath(); ctx.arc(c, c, R - 1.5, 0, PI2); ctx.stroke();

    /* 이름표 */
    if (poiEl) {
      if (best && bd < Lr * 0.4) {
        if (shown !== best) {
          shown = best;
          poiEl.querySelector(".poi-t").textContent = best.t;
          poiEl.querySelector(".poi-s").textContent = best.s;
        }
        poiEl.style.transform = "translate(" + best._x.toFixed(1) + "px," + best._y.toFixed(1) + "px)";
        poiEl.classList.toggle("flip", best._x > D * 0.6);
        poiEl.classList.add("on");
      } else {
        poiEl.classList.remove("on");
      }
    }
  }

  function frame(now) {
    if (!running) return;
    var t = (now - t0) / 1000;
    if (now > userUntil && !reduce) {
      var p = POIS[Math.floor(t / 3.6) % POIS.length];
      target.x = p.x * D + Math.sin(t * 1.3) * D * 0.012;
      target.y = p.y * D + Math.cos(t * 1.1) * D * 0.012;
    }
    clampLens(target);
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !tex || reduce || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function toLocal(e) {
    var b = cv.getBoundingClientRect();
    return { x: (e.clientX - b.left) * (D / b.width), y: (e.clientY - b.top) * (D / b.height) };
  }
  function onMove(e) {
    if (e.pointerType === "touch" && e.type === "pointermove" && e.buttons === 0) return;
    var p = toLocal(e);
    target.x = p.x; target.y = p.y;
    userUntil = performance.now() + 2600;
    if (reduce) { clampLens(target); cur.x = target.x; cur.y = target.y; draw(); }
  }
  wrap.addEventListener("pointermove", onMove);
  wrap.addEventListener("pointerdown", onMove);

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.05 }).observe(wrap);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { layout(); draw(); }).observe(wrap);
  } else {
    window.addEventListener("resize", function () { layout(); draw(); });
  }

  buildTicks();
  layout();
  setTimeout(function () {
    tex = build();
    if (reduce) { draw(); } else { draw(); start(); }
  }, 40);

  window.GB = window.GB || {};
  GB.lens = { ready: function () { return !!tex; }, pois: POIS };
})();
