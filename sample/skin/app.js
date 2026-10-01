/* 결빛 피부과의원 샘플 — 화면 동작
   진료 안내 · 칼럼 · 피부 정보 · 상담 코너 · 예약 · 관리자 미리보기
   모든 입력(예약, 상담 글)은 이 기기의 localStorage 에만 저장된다. 서버로 보내지 않는다. */
(function () {
  "use strict";
  var GB = window.GB;
  var D = document;
  function $(s, el) { return (el || D).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || D).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장이 막힌 브라우저 */ } }
  };
  var K_RSV = "gb_sample_rsv", K_QNA = "gb_sample_qna";

  /* ── 알림 ── */
  var toastT = 0;
  function toast(msg, ms) {
    var el = $("#toast");
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, ms || 3400);
  }

  /* ── 날짜와 시간 (한국 시간 기준. 날짜는 YYYY-MM-DD 글자로 다룬다) ── */
  function seoul() {
    var f = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
    var o = {};
    f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday] };
  }
  function ymd(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function today() { var n = seoul(); return ymd(n.y, n.m, n.d); }
  function parts(k) { var p = k.split("-"); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function addDays(k, n) {
    var p = parts(k), t = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  function dowOf(k) { var p = parts(k); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  function toMin(t) { var a = t.split(":"); return (+a[0]) * 60 + (+a[1]); }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function dotDate(k) { return k.replace(/-/g, "."); }
  function longDate(k) { var p = parts(k); return p.m + "월 " + p.d + "일 (" + GB.dayName[dowOf(k)] + ")"; }

  /* ── 진료 일정 ── */
  function dayInfo(k) {
    var dow = dowOf(k), hol = GB.holidays[k] || null, hr = GB.hours[dow];
    if (hol || !hr) return { open: false, hol: hol, dow: dow };
    return { open: true, from: hr[0], to: hr[1], dow: dow, lunch: dow === 6 ? null : GB.lunch };
  }
  function slotsOf(k) {
    var di = dayInfo(k), out = [];
    if (!di.open) return out;
    var a = toMin(di.from), b = toMin(di.to) - 30, m;
    for (m = a; m <= b; m += 30) {
      if (di.lunch && m >= toMin(di.lunch[0]) && m < toMin(di.lunch[1])) continue;
      out.push(fromMin(m));
    }
    return out;
  }
  function nextOpen(k) {
    var i, n;
    for (i = 1; i <= 14; i++) { n = addDays(k, i); if (dayInfo(n).open) return n; }
    return null;
  }
  function hash(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mineActive() { return store.get(K_RSV, []).filter(function (b) { return b.status !== "취소"; }); }
  function isFull(k, t) {
    if (hash("gb" + k + t) % 100 < 28) return true;      /* 샘플용으로 일부 시간은 마감 */
    return mineActive().some(function (b) { return b.date === k && b.time === t; });
  }
  function isPast(k, t) {
    var n = seoul(), tk = ymd(n.y, n.m, n.d);
    if (k < tk) return true;
    if (k > tk) return false;
    return toMin(t) < n.h * 60 + n.mi + 60;               /* 지금부터 1시간 안쪽은 받지 않는다 */
  }

  /* ── 진료 상태 (머리글 · 요약 띠) ── */
  function renderStatus() {
    var n = seoul(), k = ymd(n.y, n.m, n.d), di = dayInfo(k), now = n.h * 60 + n.mi;
    var chip = $("#statusChip"), qT = $("#qToday"), qN = $("#qNote");
    var a = "", b = "", open = false, nx, nd;
    if (di.open) {
      var f = toMin(di.from), t = toMin(di.to);
      if (now >= f && now < t) {
        if (di.lunch && now >= toMin(di.lunch[0]) && now < toMin(di.lunch[1])) { a = "점심시간"; b = "· " + di.lunch[1] + " 재개"; }
        else { a = "진료 중"; b = "· " + di.to + "까지"; open = true; }
      } else if (now < f) { a = "진료 전"; b = "· " + di.from + " 시작"; }
    }
    if (!a) {
      nx = nextOpen(k);
      a = di.open ? "진료 종료" : (di.hol ? "오늘 휴진" : "오늘 휴진");
      b = nx ? "· " + (nx === addDays(k, 1) ? "내일" : GB.dayName[dowOf(nx)] + "요일") + " " + dayInfo(nx).from + " 진료" : "";
    }
    chip.classList.toggle("open", open);
    chip.innerHTML = '<i></i><span class="s-a">' + esc(a) + '</span><span class="s-b">' + esc(b) + '</span>';
    if (di.open) {
      qT.textContent = "오늘(" + GB.dayName[n.dow] + ") " + di.from + " – " + di.to;
      qN.textContent = (di.lunch ? "점심 " + di.lunch[0] + " – " + di.lunch[1] : "점심시간 없이 진료") + (n.dow === 3 ? " · 야간진료" : "");
    } else {
      qT.textContent = "오늘은 휴진입니다";
      nx = nextOpen(k);
      qN.textContent = (di.hol ? di.hol + " · " : "") + (nx ? "다음 진료 " + longDate(nx) + " " + dayInfo(nx).from : "");
    }
    return { a: a, b: b, open: open };
  }
  function renderHours() {
    var n = seoul(), order = [1, 2, 3, 4, 5, 6, 0], h = "";
    order.forEach(function (dw) {
      var hr = GB.hours[dw], on = n.dow === dw;
      if (!hr) { h += '<tr class="off' + (on ? " today" : "") + '"><th>' + GB.dayName[dw] + '</th><td>휴진</td><td>공휴일 포함</td></tr>'; return; }
      h += '<tr' + (on ? ' class="today"' : "") + '><th>' + GB.dayName[dw] + '</th><td>' + hr[0] + ' – ' + hr[1] + '</td><td>' +
        (dw === 6 ? "점심시간 없음" : (dw === 3 ? "야간진료 · 점심 " + GB.lunch[0] + " – " + GB.lunch[1] : "점심 " + GB.lunch[0] + " – " + GB.lunch[1])) + '</td></tr>';
    });
    $("#hoursTable").innerHTML = h;
  }

  /* ── 머리글 메뉴 · 이동 ── */
  function go(id) {
    var el = D.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function initNav() {
    var nav = $("#nav"), burger = $("#burger");
    function setOpen(v) {
      nav.classList.toggle("open", v);
      burger.setAttribute("aria-expanded", v ? "true" : "false");
      burger.setAttribute("aria-label", v ? "메뉴 닫기" : "메뉴 열기");
    }
    burger.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setOpen(false); });
    D.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    var links = {};
    $$("a", nav).forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting) return;
          $$("a.on", nav).forEach(function (a) { a.classList.remove("on"); });
          if (links[x.target.id]) links[x.target.id].classList.add("on");
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      Object.keys(links).forEach(function (id) { var s = D.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ── 겹쳐 뜨는 창 (칼럼 읽기 · 안내 · 관리자) ── */
  var lastFocus = null;
  function focusables(root) {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', root).filter(function (el) { return el.offsetParent !== null; });
  }
  function trap(e, root) {
    if (e.key !== "Tab") return;
    var f = focusables(root);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function lock(v) { D.body.style.overflow = v ? "hidden" : ""; }

  function openReader(id) {
    var c = GB.columns.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    lastFocus = D.activeElement;
    $("#rdBody").innerHTML = colHtml(c);
    $("#reader").hidden = false;
    lock(true);
    $("#rdScroll").scrollTop = 0;
    progress();
    $(".reader-pn").focus();
    try { history.replaceState(null, "", "#column=" + id); } catch (e) { /* 주소 바꾸기가 막힌 경우 */ }
  }
  function closeReader() {
    var r = $("#reader");
    if (r.hidden) return;
    r.hidden = true;
    lock(!$("#modal").hidden);
    try { if (location.hash.indexOf("#column=") === 0) history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* 무시 */ }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function progress() {
    var sc = $("#rdScroll"), max = sc.scrollHeight - sc.clientHeight;
    $("#rdProg").style.width = (max > 0 ? Math.min(100, sc.scrollTop / max * 100) : 0) + "%";
  }
  function openModal(kind) {
    var md = $("#modal"), pn = $(".modal-pn", md);
    lastFocus = D.activeElement;
    $("#mdBody").innerHTML = modalHtml(kind);
    pn.classList.toggle("wide", kind === "admin");
    md.hidden = false;
    lock(true);
    if (kind === "admin") adminBind();
    pn.focus();
  }
  function closeModal() {
    var md = $("#modal");
    if (md.hidden) return;
    md.hidden = true;
    lock(!$("#reader").hidden);
    renderQna(); renderMine(); renderSlots(); renderSummary();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function initOverlays() {
    $("#rdScroll").addEventListener("scroll", progress);
    D.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#modal").hidden) closeModal();
        else if (!$("#reader").hidden) closeReader();
        else if (GB.chat && GB.chat.isOpen && GB.chat.isOpen()) GB.chat.close();
        return;
      }
      if (!$("#modal").hidden) trap(e, $(".modal-pn"));
      else if (!$("#reader").hidden) trap(e, $(".reader-pn"));
    });
    D.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-go],[data-chat],[data-ask],[data-col],[data-reserve],[data-modal],[data-close],[data-fake-tel],[data-tx]") : null;
      if (!t) return;
      if (t.hasAttribute("data-fake-tel")) { toast("샘플이라 전화는 연결되지 않습니다. 실제 제작에서는 병원 대표번호로 바로 연결됩니다.", 4400); return; }
      if (t.getAttribute("data-close") === "reader") { closeReader(); return; }
      if (t.getAttribute("data-close") === "modal") { closeModal(); return; }
      if (t.getAttribute("data-modal")) { openModal(t.getAttribute("data-modal")); return; }
      if (t.getAttribute("data-col")) { openReader(t.getAttribute("data-col")); return; }
      if (t.hasAttribute("data-reserve")) { closeReader(); closeModal(); openReserve({ tx: t.getAttribute("data-reserve") }); return; }
      if (t.getAttribute("data-go")) { closeReader(); closeModal(); go(t.getAttribute("data-go")); return; }
      if (t.hasAttribute("data-chat")) { if (GB.chat) GB.chat.open(); return; }
      if (t.getAttribute("data-ask")) { if (GB.chat) GB.chat.ask(t.getAttribute("data-ask")); return; }
      if (t.getAttribute("data-tx")) { selectTx(t.getAttribute("data-tx"), true); return; }
    });
  }

  /* ── 진료 안내 ── */
  var txSel = "acne";
  function txById(id) { return GB.treatments.filter(function (t) { return t.id === id; })[0]; }
  function renderTx() {
    var list = $("#txList"), panel = $("#txPanel"), t = txById(txSel);
    list.innerHTML = GB.treatments.map(function (x) {
      var on = x.id === txSel;
      return '<button class="tx-item" type="button" role="tab" id="txTab-' + x.id + '" aria-selected="' + on + '" aria-controls="txPanel" data-txid="' + x.id + '" tabindex="' + (on ? 0 : -1) + '">' +
        '<span class="tx-en">' + esc(x.en) + '</span><span class="tx-name">' + esc(x.name) + '</span></button>';
    }).join("");
    panel.setAttribute("aria-labelledby", "txTab-" + t.id);
    var first = t.name.split(" · ")[0];
    panel.innerHTML = '<div class="txp">' +
      '<p class="txp-en">' + esc(t.en) + '</p><h3>' + esc(t.name) + '</h3><p class="txp-line">' + esc(t.line) + '</p>' +
      '<div class="txp-cols"><div><h4>이런 분께</h4><ul class="ticks">' + t.who.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + '</ul></div>' +
      '<div><h4>진료는 이렇게 진행됩니다</h4><ol class="flow">' + t.flow.map(function (f) { return "<li><b>" + esc(f[0]) + "</b><span>" + esc(f[1]) + "</span></li>"; }).join("") + '</ol></div></div>' +
      '<p class="txp-note"><b>알아두세요</b>' + esc(t.note) + '</p>' +
      '<div class="txp-cta"><button class="btn btn-ink" type="button" data-reserve="' + t.id + '">이 진료로 예약하기 <svg class="ic"><use href="#i-arrow"/></svg></button>' +
      '<button class="btn btn-line" type="button" data-ask="' + esc(first) + ' 진료는 어떻게 진행되나요?"><svg class="ic"><use href="#i-lens"/></svg> AI에게 물어보기</button>' +
      (t.col ? '<button class="link" type="button" data-col="' + t.col + '">관련 칼럼 읽기</button>' : "") + '</div></div>';
  }
  function selectTx(id, scroll) {
    if (!txById(id)) return;
    txSel = id;
    renderTx();
    if (scroll) go("treatments");
  }
  function initTx() {
    var list = $("#txList");
    list.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".tx-item") : null;
      if (b) { txSel = b.getAttribute("data-txid"); renderTx(); }
    });
    list.addEventListener("keydown", function (e) {
      var ids = GB.treatments.map(function (t) { return t.id; }), i = ids.indexOf(txSel), n = i;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % ids.length;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + ids.length) % ids.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = ids.length - 1;
      else return;
      e.preventDefault();
      txSel = ids[n];
      renderTx();
      var b = $("#txTab-" + txSel);
      if (b) b.focus();
    });
  }

  /* ── 원장님 칼럼 ── */
  function colMeta(c) { return dotDate(c.date) + " · " + c.min + "분 읽기"; }
  function renderCols() {
    var cs = GB.columns, f = cs[0];
    $("#colGrid").innerHTML =
      '<button class="col-feat" type="button" data-col="' + f.id + '"><span class="col-cat">' + esc(f.cat) + '</span><h3>' + esc(f.title) + '</h3><p>' + esc(f.lead) + '</p>' +
      '<span class="col-meta">' + colMeta(f) + ' <svg class="ic"><use href="#i-arrow"/></svg></span></button>' +
      '<div class="col-list">' + cs.slice(1).map(function (c) {
        return '<button class="col-row" type="button" data-col="' + c.id + '"><span class="col-cat">' + esc(c.cat) + '</span><h3>' + esc(c.title) + '</h3><span class="col-meta">' + colMeta(c) + '</span><svg class="ic"><use href="#i-arrow"/></svg></button>';
      }).join("") + '</div>';
  }
  function colHtml(c) {
    var body = c.body.map(function (b) {
      if (b.t === "h") return "<h4>" + esc(b.x) + "</h4>";
      if (b.t === "p") return "<p>" + esc(b.x) + "</p>";
      if (b.t === "ul") return "<ul>" + b.x.map(function (li) { return "<li>" + esc(li) + "</li>"; }).join("") + "</ul>";
      if (b.t === "note") return '<div class="rd-note"><b>원장님 한마디</b><p>' + esc(b.x) + "</p></div>";
      return "";
    }).join("");
    var btns = c.tx.map(function (id) {
      var t = txById(id);
      return t ? '<button class="btn btn-line btn-sm" type="button" data-reserve="' + id + '">' + esc(t.name.split(" · ")[0]) + ' 진료 예약</button>' : "";
    }).join("");
    return '<p class="col-cat">' + esc(c.cat) + '</p><h2 id="rdTitle">' + esc(c.title) + '</h2><p class="rd-lead">' + esc(c.lead) + '</p>' +
      '<p class="rd-by">윤하진 원장 · ' + colMeta(c) + '</p><div class="rd-body">' + body + '</div>' +
      '<div class="rd-cta"><h4>이 글과 관련된 진료</h4><div class="btns">' + btns +
      '<button class="btn btn-ink btn-sm" type="button" data-ask="' + esc(c.ask || c.title) + '"><svg class="ic"><use href="#i-lens"/></svg> AI에게 더 물어보기</button></div></div>' +
      '<p class="rd-disc">이 글은 일반적인 건강 정보이며 개인의 진단과 치료를 대신하지 않습니다. 증상이 있다면 진료를 받으세요.</p>';
  }

  /* ── 피부 단면 그림 (코드로 그린다) ── */
  function layersSvg() {
    var W = 640, H = 430, i, x, y, t, d;
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function dej(px) { return 162 + 7 * Math.sin(px / 15.5) + 3.5 * Math.sin(px / 5.7 + 1); }
    function low(px) { return 318 + 5 * Math.sin(px / 41); }
    function f1(n) { return n.toFixed(1); }
    var fwdDej = "", revDej = "", fwdLow = "", revLow = "";
    for (x = 0; x <= W; x += 4) {
      fwdDej += (x ? "L" : "M") + x + "," + f1(dej(x));
      fwdLow += (x ? "L" : "M") + x + "," + f1(low(x));
    }
    for (x = W; x >= 0; x -= 4) {
      revDej += "L" + x + "," + f1(dej(x));
      revLow += "L" + x + "," + f1(low(x));
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="피부 단면 그림. 번호 버튼을 누르면 각 층의 설명이 나옵니다.">';
    s += '<defs><linearGradient id="gEpi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3D9CF"/><stop offset="1" stop-color="#E6B2A5"/></linearGradient>' +
      '<linearGradient id="gDer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F9E2D9"/><stop offset="1" stop-color="#F2CDC1"/></linearGradient></defs>';

    /* 표피 (살아 있는 세포층) */
    s += '<g class="ly" data-ly="epi"><path d="M0,86L' + W + ',86L' + W + ',' + f1(dej(W)) + revDej + 'Z" fill="url(#gEpi)"/>';
    for (y = 98; y <= 146; y += 12) {
      for (x = 8 + (y % 24 ? 13 : 0); x < W; x += 27) {
        var ny = y + (rnd() - 0.5) * 4;
        if (ny < dej(x) - 22) s += '<ellipse cx="' + f1(x + (rnd() - 0.5) * 8) + '" cy="' + f1(ny) + '" rx="6.5" ry="3.6" fill="#D28C80" opacity=".42"/>';
      }
    }
    s += '</g>';

    /* 각질층 — 벽돌처럼 쌓인 세포 */
    s += '<g class="ly" data-ly="corneum"><rect x="0" y="70" width="' + W + '" height="16" fill="#E9D6CB"/>';
    for (x = 0; x < W; x += 28) {
      s += '<rect x="' + x + '" y="70.5" width="27" height="7.5" fill="none" stroke="#C9AE9F" stroke-width=".8"/>' +
        '<rect x="' + (x + 14) + '" y="78.5" width="27" height="7.5" fill="none" stroke="#C9AE9F" stroke-width=".8"/>';
    }
    s += '</g>';

    /* 기저층과 멜라닌세포 */
    s += '<g class="ly" data-ly="basal">';
    for (x = 6; x < W; x += 11) {
      s += '<ellipse cx="' + x + '" cy="' + f1(dej(x) - 7) + '" rx="4.6" ry="7.6" fill="#DF9F91" stroke="#C0806F" stroke-width=".5"/>' +
        '<circle cx="' + x + '" cy="' + f1(dej(x) - 9) + '" r="2.2" fill="#8C4C45"/>';
    }
    [50, 130, 210, 398, 500, 596].forEach(function (mx) {
      var my = dej(mx) - 14;
      s += '<ellipse cx="' + mx + '" cy="' + f1(my) + '" rx="6" ry="4.4" fill="#5C3527"/>' +
        '<path d="M' + (mx - 4) + ',' + f1(my - 2) + 'l-9,-11M' + (mx + 4) + ',' + f1(my - 2) + 'l9,-11M' + mx + ',' + f1(my - 4) + 'l0,-15" stroke="#5C3527" stroke-width="1.7" stroke-linecap="round" fill="none"/>';
    });
    s += '</g>';

    /* 진피 — 콜라겐과 탄력섬유 */
    s += '<g class="ly" data-ly="dermis"><path d="' + fwdDej + 'L' + W + ',' + f1(low(W)) + revLow + 'Z" fill="url(#gDer)"/>';
    for (i = 0; i < 46; i++) {
      var x0 = rnd() * 600 - 20, y0 = dej(x0) + 24 + rnd() * (low(x0) - dej(x0) - 54);
      var len = 90 + rnd() * 150, amp = 2.5 + rnd() * 4, ph = rnd() * 6;
      d = "";
      for (t = 0; t <= len; t += 6) d += (t ? "L" : "M") + f1(x0 + t) + "," + f1(y0 + amp * Math.sin(t / 11 + ph));
      s += '<path d="' + d + '" stroke="' + (i % 3 ? "rgba(255,255,255,.78)" : "rgba(214,150,136,.66)") + '" stroke-width="' + (i % 3 ? 2.2 : 1.3) + '" fill="none" stroke-linecap="round"/>';
    }
    for (i = 0; i < 12; i++) {
      var ex = rnd() * 560, ey = dej(ex) + 30 + rnd() * 110;
      d = "";
      for (t = 0; t <= 100; t += 4) d += (t ? "L" : "M") + f1(ex + t) + "," + f1(ey + 3 * Math.sin(t / 5 + i));
      s += '<path d="' + d + '" stroke="#A7786A" stroke-opacity=".5" stroke-width=".9" fill="none"/>';
    }
    s += '</g>';

    /* 피하지방 */
    s += '<g class="ly" data-ly="fat"><path d="' + fwdLow + 'L' + W + ',' + H + 'L0,' + H + 'Z" fill="#F8EBC9"/>';
    for (i = 0; i < 4; i++) {
      for (x = 18 + (i % 2) * 21; x < W + 20; x += 42) {
        s += '<circle cx="' + x + '" cy="' + (348 + i * 22) + '" r="19.5" fill="#FCF3D9" stroke="#E4CC91" stroke-width="1.2"/>' +
          '<path d="M' + (x - 10) + ',' + (344 + i * 22) + 'a11,11 0 0 1 9,-7" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".9"/>';
      }
    }
    s += '</g>';
    return s + layersSvg2(dej, low, f1, rnd);
  }
  function layersSvg2(dej, low, f1, rnd) {
    var s = "", t, d;
    /* 모낭 · 피지선 · 털 · 털세움근 */
    s += '<g class="ly" data-ly="follicle">' +
      '<path d="M388,' + f1(dej(388) + 4) + 'C372,176 350,190 312,214" stroke="#BB7B6E" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M287,84C287,150 281,218 288,252Q300,282 312,252C319,218 313,150 313,84Z" fill="#F2C6B9" stroke="#C68D7F" stroke-width="1.4"/>' +
      '<ellipse cx="262" cy="198" rx="25" ry="15.5" fill="#F6E19E" stroke="#D2B35A" stroke-width="1.3"/>' +
      '<ellipse cx="338" cy="191" rx="25" ry="15.5" fill="#F6E19E" stroke="#D2B35A" stroke-width="1.3"/>' +
      '<g fill="#EBCB74" opacity=".8"><circle cx="254" cy="196" r="4"/><circle cx="268" cy="203" r="3.4"/><circle cx="270" cy="190" r="3"/><circle cx="332" cy="188" r="4"/><circle cx="346" cy="195" r="3.4"/><circle cx="344" cy="184" r="3"/></g>' +
      '<path d="M300,22C307,48 294,68 300,92L300,254" stroke="#3A2A25" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="300" cy="262" r="13" fill="#E8A598" stroke="#C68D7F" stroke-width="1.3"/><circle cx="300" cy="267" r="5" fill="#C9625A"/></g>';

    /* 땀샘 — 꼬불꼬불한 관 */
    d = "M470,246C462,226 476,208 466,190C458,174 470,160 462,144C456,130 466,118 458,100L457,72";
    var cd = "";
    for (t = 0; t <= 22; t += 0.35) {
      var rr = 4 + t * 0.62;
      cd += (t ? "L" : "M") + f1(470 + rr * Math.cos(t)) + "," + f1(262 + rr * Math.sin(t) * 0.8);
    }
    s += '<g class="ly" data-ly="sweat"><path d="' + d + '" stroke="#86AABD" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      '<path d="' + cd + '" stroke="#86AABD" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="457" cy="71" r="3" fill="#6B93A8"/></g>';

    /* 모세혈관과 혈관 */
    var vs = "";
    [120, 208, 352, 425, 520].forEach(function (px) {
      var y0 = dej(px) + 10;
      vs += '<path d="M' + (px - 5) + ',' + f1(y0 + 36) + 'L' + (px - 5) + ',' + f1(y0 + 7) + 'Q' + px + ',' + f1(y0 - 6) + ' ' + (px + 5) + ',' + f1(y0 + 7) + 'L' + (px + 5) + ',' + f1(y0 + 36) + '" fill="none" stroke="#C8404F" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M' + (px + 5) + ',' + f1(y0 + 12) + 'L' + (px + 5) + ',' + f1(y0 + 36) + '" stroke="#6F8FB8" stroke-width="2.6" fill="none"/>' +
        '<path d="M' + (px - 5) + ',' + f1(y0 + 36) + 'L' + (px - 7) + ',292M' + (px + 5) + ',' + f1(y0 + 36) + 'L' + (px + 7) + ',300" stroke="#C8404F" stroke-opacity=".55" stroke-width="1.4" fill="none"/>';
    });
    s += '<g class="ly" data-ly="vessel">' + vs +
      '<path d="M0,294C90,282 170,304 270,292S420,284 520,296S600,288 640,292" stroke="#C8404F" stroke-width="5" fill="none" opacity=".85"/>' +
      '<path d="M0,303C90,292 170,312 270,301S420,293 520,305S600,297 640,301" stroke="#6F8FB8" stroke-width="4" fill="none" opacity=".85"/></g>';

    /* 층 이름 (장식) */
    s += '<g aria-hidden="true" font-family="Pretendard Variable, sans-serif" font-size="11.5" font-weight="600" fill="#7A3342" stroke="#FBF7F4" stroke-width="3" stroke-linejoin="round" style="paint-order:stroke">' +
      '<text x="10" y="124">표피 EPIDERMIS</text><text x="10" y="204">진피 DERMIS</text><text x="10" y="372">피하지방 HYPODERMIS</text></g>';

    /* 번호 단추 */
    var pos = { corneum: [604, 78], basal: [562, f1(dej(562) - 28)], dermis: [96, 246], follicle: [300, 150], sweat: [498, 262], vessel: [146, 190], fat: [520, 374] };
    GB.layers.forEach(function (l) {
      var p = pos[l.id];
      s += '<g class="hs" data-ly="' + l.id + '" tabindex="0" role="button" aria-label="' + l.no + '번 ' + esc(l.name) + '" transform="translate(' + p[0] + ' ' + p[1] + ')">' +
        '<circle r="23" fill="transparent"/><circle class="hs-c" r="12.5"/><text text-anchor="middle" y="4.3">' + l.no + '</text></g>';
    });
    return s + "</svg>";
  }

  /* ── 피부 단면 눌러 보기 ── */
  var lySel = null, lyTopic = null;
  function lyById(id) { return GB.layers.filter(function (l) { return l.id === id; })[0]; }
  function renderLayers(keepFocus) {
    var box = $("#layersSvg");
    if (!box.firstChild) box.innerHTML = layersSvg();
    var on = lyTopic != null ? GB.layerTopics[lyTopic].ids : (lySel ? [lySel] : []);
    box.classList.toggle("has-on", on.length > 0);
    $$(".ly", box).forEach(function (g) { g.classList.toggle("on", on.indexOf(g.getAttribute("data-ly")) >= 0); });
    $$(".hs", box).forEach(function (g) {
      var sel = g.getAttribute("data-ly") === lySel;
      g.classList.toggle("on", sel);
      g.setAttribute("aria-pressed", sel ? "true" : "false");
    });
    $$("#layerTopics .topic").forEach(function (b, i) { b.setAttribute("aria-pressed", lyTopic === i ? "true" : "false"); });
    var l = lySel ? lyById(lySel) : null, h = "";
    if (l) {
      h += '<p class="lp-no">' + l.no + ' / ' + GB.layers.length + '</p><h4>' + esc(l.name) + '</h4><p class="lp-en">' + esc(l.en) + '</p>';
      if (lyTopic != null) h += '<p class="lp-topic"><b>' + esc(GB.layerTopics[lyTopic].label) + '</b> — ' + esc(GB.layerTopics[lyTopic].msg) + '</p>';
      h += '<p>' + esc(l.text) + '</p><div class="lp-act">';
      l.tx.forEach(function (id) {
        var t = txById(id);
        if (t) h += '<button type="button" data-tx="' + id + '">' + esc(t.name.split(" · ")[0]) + ' 진료 보기</button>';
      });
      if (l.q) h += '<button type="button" data-ask="' + esc(l.q) + '">AI에게 물어보기</button>';
      h += '</div>';
    } else {
      h += '<p class="lp-no">SKIN LAYERS</p><h4>눌러서 알아보세요</h4><p>그림의 번호 단추나 위의 고민 단추를 누르면 그곳이 하는 일과 관련된 고민을 알려드립니다.</p>';
    }
    h += '<ol class="lp-list">' + GB.layers.map(function (x) {
      return '<li><button type="button" data-lyb="' + x.id + '"' + (x.id === lySel ? ' class="on"' : "") + '><i>' + x.no + '</i>' + esc(x.name) + '</button></li>';
    }).join("") + '</ol>';
    $("#layersPanel").innerHTML = h;
    if (keepFocus) { var b = $('[data-lyb="' + keepFocus + '"]', $("#layersPanel")); if (b) b.focus(); }
  }
  function initLayers() {
    $("#layerTopics").innerHTML = GB.layerTopics.map(function (tp, i) {
      return '<button class="topic" type="button" data-topic="' + i + '" aria-pressed="false">' + esc(tp.label) + '</button>';
    }).join("");
    renderLayers();
    var card = $(".layers");
    card.addEventListener("click", function (e) {
      var hs = e.target.closest(".hs"), tp = e.target.closest("[data-topic]"), lb = e.target.closest("[data-lyb]");
      if (hs) { lySel = hs.getAttribute("data-ly"); lyTopic = null; renderLayers(); }
      else if (tp) {
        var i = +tp.getAttribute("data-topic");
        if (lyTopic === i) { lyTopic = null; lySel = null; } else { lyTopic = i; lySel = GB.layerTopics[i].ids[0]; }
        renderLayers();
      } else if (lb) { lySel = lb.getAttribute("data-lyb"); lyTopic = null; renderLayers(lySel); }
    });
    card.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("hs")) {
        e.preventDefault();
        lySel = e.target.getAttribute("data-ly"); lyTopic = null;
        renderLayers();
        var again = $('.hs[data-ly="' + lySel + '"]', card);
        if (again) again.focus();
      }
    });
  }

  /* ── 피부 타입 체크 ── */
  var ans = [];
  function scoreOf(a) {
    var sc = { d: 0, o: 0, s: 0 };
    a.forEach(function (oi, qn) { var o = GB.quiz[qn].o[oi][1]; sc.d += o.d || 0; sc.o += o.o || 0; sc.s += o.s || 0; });
    return sc;
  }
  function quizType(sc) {
    var d = sc.d, o = sc.o;
    if (d >= o + 3) return "dry";
    if (o >= d + 3) return "oily";
    if (d >= 3 && o >= 3) return "combo";
    if (d <= 2 && o <= 2) return "normal";
    return d > o ? "dry" : "oily";
  }
  function tips(arr) { return '<ul class="ticks">' + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }
  function renderQuiz() {
    var box = $("#quizBody"), n = ans.length, total = GB.quiz.length;
    if (n >= total) {
      var sc = scoreOf(ans), ty = GB.quizTypes[quizType(sc)], sn = GB.quizTypes.sens;
      box.innerHTML = '<div class="qz-res"><p class="lp-no">RESULT</p><h4>' + esc(ty.name) + '</h4><p>' + esc(ty.text) + '</p>' + tips(ty.tips) +
        (sc.s >= 3 ? '<div class="qz-sens"><b>' + esc(sn.name) + '</b> ' + esc(sn.text) + tips(sn.tips) + '</div>' : "") +
        '<div class="qz-acts"><button class="btn btn-ink btn-sm" type="button" data-reserve="">피부 상담 예약</button><button class="btn btn-line btn-sm" type="button" data-qz="restart">다시 해 보기</button></div>' +
        '<p class="sample-note">참고용입니다. 피부 상태의 진단은 진료실에서 이루어집니다.</p></div>';
      return;
    }
    var q = GB.quiz[n];
    box.innerHTML = '<div class="qz-top"><span>문항 ' + (n + 1) + ' / ' + total + '</span>' + (n ? '<button class="link" type="button" data-qz="back">이전 문항</button>' : "") + '</div>' +
      '<div class="qz-bar"><i style="width:' + Math.round(n / total * 100) + '%"></i></div><p class="qz-q">' + esc(q.q) + '</p>' +
      '<div class="qz-opts">' + q.o.map(function (o, i) { return '<button class="qz-opt" type="button" data-qo="' + i + '">' + esc(o[0]) + '</button>'; }).join("") + '</div>';
  }
  function initQuiz() {
    renderQuiz();
    $("#quizBody").addEventListener("click", function (e) {
      var o = e.target.closest("[data-qo]"), z = e.target.closest("[data-qz]");
      if (o) { ans.push(+o.getAttribute("data-qo")); renderQuiz(); }
      else if (z) { if (z.getAttribute("data-qz") === "restart") ans = []; else ans.pop(); renderQuiz(); }
    });
  }

  /* ── 자외선 · 질문 · 구성 안내 ── */
  var UVC = ["#2F8A3F", "#8F6C00", "#B85A0A", "#D8202F", "#7A3E98"];
  function uvUpdate() {
    var r = $("#uvRange"), v = +r.value, i = 0;
    while (i < GB.uv.length - 1 && v > GB.uv[i].max) i++;
    var b = GB.uv[i];
    $("#uvNum").textContent = v >= 11 ? "11+" : String(v);
    $("#uvNum").style.color = UVC[i];
    $("#uvName").textContent = b.name;
    $("#uvTip").textContent = b.tip;
    r.setAttribute("aria-valuetext", (v >= 11 ? "11 이상" : v) + ", " + b.name);
  }
  function renderFaq() {
    $("#faqList").innerHTML = GB.faq.map(function (f) { return '<details class="fq"><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join("");
  }
  function renderFeatures() {
    $("#featGrid").innerHTML = GB.features.map(function (f) { return '<div class="feat"><h3>' + esc(f.t) + '</h3><p>' + esc(f.d) + '</p></div>'; }).join("");
  }

  /* ── 상담 코너 ── */
  var qCat = "전체";
  var SECRET_SEED = { id: "qs1", cat: "진료 안내", who: "비공개", date: "2026-09-01", title: "비공개 글입니다", secret: true, seed: true };
  function minePosts() { return store.get(K_QNA, []); }
  function renderQna() {
    $("#qnaChips").innerHTML = GB.qnaCats.map(function (c) {
      return '<button class="chip" type="button" data-qc="' + esc(c) + '" aria-pressed="' + (c === qCat) + '">' + esc(c) + '</button>';
    }).join("");
    var mine = minePosts().map(function (p) { p.mine = true; return p; });
    var all = mine.concat(GB.qna.slice(0, 3), [SECRET_SEED], GB.qna.slice(3));
    var list = all.filter(function (p) { return qCat === "전체" || p.cat === qCat || (qCat === "기미 · 색소" && p.cat === "기미 · 색소"); });
    $("#qnaList").innerHTML = list.length ? list.map(qaHtml).join("") : '<p class="slots-empty">이 분류의 글이 아직 없습니다. 오른쪽에서 첫 질문을 남겨 보세요.</p>';
  }
  function qaHtml(p) {
    var st = p.mine ? (p.answer ? "done" : "wait") : "done";
    var stText = st === "done" ? "답변 완료" : "답변 대기";
    var head = '<summary><span class="qa-cat">' + esc(p.cat) + '</span><span class="qa-t">' + (p.secret ? '<svg class="ic"><use href="#i-lock"/></svg> ' : "") + esc(p.title) + (p.mine && p.secret ? " (나만 보기)" : "") + '</span>' +
      '<span class="qa-meta">' + esc(p.who) + ' · ' + dotDate(p.date) + (p.mine ? " · 내가 쓴 글" : "") + '</span><span class="qa-st ' + st + '">' + stText + '</span></summary>';
    if (p.secret && !p.mine) {
      return '<div class="qa locked">' + head.replace('<summary>', '<div class="qa-sum">').replace('</summary>', '</div>') + '</div>';
    }
    var body = '<div class="qa-b"><div class="qa-q"><b>Q</b><div>' + esc(p.q) + '</div></div>';
    if (p.mine) {
      if (p.answer) body += '<div class="qa-a"><b>A</b><div>' + esc(p.answer) + '<small>윤하진 원장 · 관리자 화면에서 등록한 답변</small></div></div>';
      if (p.ai) body += '<div class="qa-a ai"><b>AI</b><div>' + esc(p.ai) + '<small>AI 예비 안내 · 일반 정보이며 원장님의 답변이 아닙니다</small></div></div>';
      if (!p.answer) body += '<p class="sample-note">샘플이라 원장님 답변은 달리지 않습니다. 아래 「관리자 화면」에서 직접 답변을 달아 환자 화면에 어떻게 보이는지 확인해 보세요.</p>';
      body += '<p><button class="link" type="button" data-qdel="' + esc(p.id) + '">이 글 삭제</button></p>';
    } else {
      body += '<div class="qa-a"><b>A</b><div>' + esc(p.a) + '<small>윤하진 원장 · 샘플 답변</small></div></div>';
    }
    return '<details class="qa' + (p.mine ? " mine" : "") + '"' + (p.open ? " open" : "") + '>' + head + body + '</div></details>';
  }
  function initQna() {
    $("#askCat").innerHTML = GB.qnaCats.slice(1).concat(["기타"]).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join("");
    renderQna();
    $("#qnaChips").addEventListener("click", function (e) {
      var b = e.target.closest("[data-qc]");
      if (b) { qCat = b.getAttribute("data-qc"); renderQna(); }
    });
    $("#qnaList").addEventListener("click", function (e) {
      var del = e.target.closest("[data-qdel]");
      if (!del) return;
      var id = del.getAttribute("data-qdel");
      store.set(K_QNA, minePosts().filter(function (p) { return p.id !== id; }));
      renderQna();
      toast("내가 쓴 글을 삭제했습니다.");
    });
    $("#askForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var err = $("#askErr"), title = $("#askTitle").value.trim(), body = $("#askBody").value.trim(), name = $("#askName").value.trim();
      var msg = "";
      if (title.length < 2) msg = "제목을 두 글자 이상 적어 주세요.";
      else if (body.length < 10) msg = "내용을 열 글자 이상 적어 주세요. 언제부터, 어떤 증상인지 알려 주시면 답변이 정확해집니다.";
      else if (!$("#askAgree").checked) msg = "개인정보 수집 · 이용에 동의해 주세요.";
      err.hidden = !msg;
      err.textContent = msg;
      if (msg) return;
      var rep = GB.reply ? GB.reply(body + " " + title) : null;
      var post = {
        id: "m" + Date.now(), cat: $("#askCat").value, who: name || "익명", date: today(), title: title, q: body,
        secret: $("#askSecret").checked, open: true, answer: "",
        ai: rep && !rep.fallback ? rep.text : "문의해 주셔서 감사합니다. 진료 시간에 확인한 뒤 원장님이 직접 답변드립니다. 증상이 급하거나 심해지면 기다리지 말고 내원해 주세요."
      };
      var arr = minePosts();
      arr.unshift(post);
      store.set(K_QNA, arr.slice(0, 20));
      $("#askTitle").value = ""; $("#askBody").value = ""; $("#askSecret").checked = false;
      qCat = "전체";
      renderQna();
      toast("질문이 등록되었습니다. 샘플이라 이 기기에만 저장됩니다.");
      var first = $("#qnaList .qa.mine");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ── 진료 예약 ── */
  var R = { tx: "", kind: "초진", date: "", time: "", vy: 0, vm: 0 };
  function rvTypes() {
    return GB.treatments.map(function (t) { return { id: t.id, name: t.name }; }).concat([{ id: "etc", name: "기타 피부 고민" }]);
  }
  function rvTypeName(id) {
    var f = rvTypes().filter(function (t) { return t.id === id; })[0];
    return f ? f.name : "";
  }
  function renderTypes() {
    $("#rvTypes").innerHTML = rvTypes().map(function (t) {
      return '<button class="rv-type" type="button" role="radio" aria-checked="' + (R.tx === t.id) + '" data-rt="' + t.id + '">' + esc(t.name) + '</button>';
    }).join("");
    $$("#rvKind button").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-v") === R.kind ? "true" : "false"); });
  }
  function hasAvail(k) {
    return slotsOf(k).some(function (t) { return !isFull(k, t) && !isPast(k, t); });
  }
  function renderCal() {
    var td = today(), tp = parts(td), maxK = addDays(td, 60), mp = parts(maxK);
    var first = ymd(R.vy, R.vm, 1), start = dowOf(first), dim = new Date(Date.UTC(R.vy, R.vm, 0)).getUTCDate(), i, d;
    var h = '<div class="cal-hd"><b>' + R.vy + '년 ' + R.vm + '월</b><div class="cal-nav">' +
      '<button type="button" data-cm="-1" aria-label="이전 달"' + (R.vy * 12 + R.vm <= tp.y * 12 + tp.m ? " disabled" : "") + '><svg class="ic"><use href="#i-left"/></svg></button>' +
      '<button type="button" data-cm="1" aria-label="다음 달"' + (R.vy * 12 + R.vm >= mp.y * 12 + mp.m ? " disabled" : "") + '><svg class="ic"><use href="#i-right"/></svg></button></div></div><div class="cal-grid">';
    GB.dayName.forEach(function (n) { h += '<span class="cal-dow">' + n + '</span>'; });
    for (i = 0; i < start; i++) h += "<span></span>";
    for (d = 1; d <= dim; d++) {
      var k = ymd(R.vy, R.vm, d), di = dayInfo(k), ok = k >= td && k <= maxK && di.open && hasAvail(k);
      var cls = "cal-d" + (di.dow === 0 ? " sun" : "") + (k === td ? " today" : "") + (k === R.date ? " sel" : "") + (di.hol && k >= td ? " hol" : "");
      h += '<button type="button" class="' + cls + '" data-cd="' + k + '"' + (ok ? "" : " disabled") + (k === R.date ? ' aria-pressed="true"' : "") +
        ' aria-label="' + R.vm + '월 ' + d + '일 ' + GB.dayName[di.dow] + '요일' + (di.hol ? " " + di.hol + " 휴진" : "") + '">' + d + (ok ? '<span class="dot"></span>' : "") + '</button>';
    }
    h += '</div><p class="cal-legend"><i></i>예약 가능한 시간이 있는 날</p>';
    $("#rvCal").innerHTML = h;
  }
  function renderSlots() {
    var box = $("#rvSlots");
    if (!R.date) { box.innerHTML = '<div class="slots-empty">먼저 날짜를 선택해 주세요.<br>예약할 수 있는 날에는 초록 점이 있습니다.</div>'; return; }
    var di = dayInfo(R.date), all = slotsOf(R.date), any = false;
    var groups = [["오전", function (m) { return m < 720; }], ["오후", function (m) { return m >= 720 && m < 1080; }], ["저녁", function (m) { return m >= 1080; }]];
    var h = '<p class="slot-date"><b>' + longDate(R.date) + '</b> · ' + di.from + ' – ' + di.to + '</p>';
    groups.forEach(function (g) {
      var items = all.filter(function (t) { return g[1](toMin(t)); });
      if (!items.length) return;
      h += '<div class="slot-g"><h4>' + g[0] + '</h4><div class="slot-row">' + items.map(function (t) {
        var off = isFull(R.date, t) || isPast(R.date, t);
        if (!off) any = true;
        return '<button type="button" class="slot' + (R.time === t ? " sel" : "") + '" data-st="' + t + '"' + (off ? " disabled" : "") + (R.time === t ? ' aria-pressed="true"' : "") + '>' + t + '</button>';
      }).join("") + '</div></div>';
    });
    if (!any) h += '<div class="slots-empty">이 날은 예약이 모두 찼습니다. 다른 날짜를 선택해 주세요.</div>';
    box.innerHTML = h;
  }
  function openReserve(o) {
    o = o || {};
    if (o.tx && rvTypeName(o.tx)) R.tx = o.tx;
    if (o.date && dayInfo(o.date).open) {
      var pp = parts(o.date);
      R.date = o.date; R.vy = pp.y; R.vm = pp.m;
      R.time = (o.time && slotsOf(o.date).indexOf(o.time) >= 0 && !isFull(o.date, o.time) && !isPast(o.date, o.time)) ? o.time : "";
    }
    showForm();
    renderTypes(); renderCal(); renderSlots(); renderSummary();
    go("reserve");
    if (o.tx && rvTypeName(o.tx)) toast(rvTypeName(o.tx) + " 진료로 예약을 시작합니다.", 2400);
  }
  GB.openReserve = openReserve;
  function showForm() { $(".rv-main").hidden = false; $("#rvDone").hidden = true; }
  function maskPhone(p) {
    var a = String(p || "").split("-");
    return a.length === 3 ? a[0] + "-****-" + a[2] : "***";
  }
  function renderSummary() {
    var name = $("#rvName").value.trim(), phone = $("#rvPhone").value.trim();
    var rows = [["진료", R.tx ? rvTypeName(R.tx) : ""], ["방문", R.kind], ["날짜", R.date ? longDate(R.date) : ""], ["시간", R.time], ["예약자", name ? name + (phone ? " · " + phone : "") : ""]];
    $("#rvSum").innerHTML = '<h3>예약 내용</h3><dl>' + rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd' + (r[1] ? "" : ' class="empty"') + '>' + (r[1] ? esc(r[1]) : "아직 선택 전") + '</dd></div>';
    }).join("") + '</dl><p class="form-err" id="rvErr" role="alert" hidden></p>' +
      '<button class="btn btn-flush" type="button" id="rvGo">예약 확정하기</button>' +
      '<p class="sample-note"><svg class="ic"><use href="#i-lock"/></svg> 샘플이라 입력한 내용은 서버로 전송되지 않고 이 기기에만 저장됩니다.</p>';
  }
  function validate() {
    var name = $("#rvName").value.trim(), digits = $("#rvPhone").value.replace(/\D/g, "");
    if (!R.tx) return ["진료 분야를 선택해 주세요.", "#rvTypes .rv-type"];
    if (!R.date) return ["날짜를 선택해 주세요.", "#rvCal"];
    if (!R.time) return ["시간을 선택해 주세요.", "#rvSlots"];
    if (isFull(R.date, R.time)) return ["방금 이 시간이 마감되었습니다. 다른 시간을 선택해 주세요.", "#rvSlots"];
    if (name.length < 2) return ["예약자 이름을 입력해 주세요.", "#rvName"];
    if (!/^01\d{8,9}$/.test(digits)) return ["휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.", "#rvPhone"];
    if (!$("#rvAgree").checked) return ["개인정보 수집 · 이용에 동의해 주세요.", "#rvAgree"];
    return null;
  }
  function rand4() { return (Math.random().toString(36) + "0000").slice(2, 6).toUpperCase(); }
  function submitReserve() {
    var v = validate(), err = $("#rvErr");
    if (v) {
      err.textContent = v[0]; err.hidden = false;
      var el = $(v[1]);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (/^(INPUT|TEXTAREA|BUTTON)$/.test(el.tagName)) el.focus({ preventScroll: true });
      }
      return;
    }
    var n = seoul();
    var b = {
      id: "GB-" + String(n.y).slice(2) + pad(n.m) + pad(n.d) + "-" + rand4(), tx: R.tx, txName: rvTypeName(R.tx), kind: R.kind,
      date: R.date, time: R.time, name: $("#rvName").value.trim(), phone: $("#rvPhone").value.trim(), memo: $("#rvMemo").value.trim(), status: "확정", at: Date.now()
    };
    var arr = store.get(K_RSV, []);
    arr.unshift(b);
    store.set(K_RSV, arr.slice(0, 20));
    showDone(b);
  }
  function showDone(b) {
    $(".rv-main").hidden = true;
    var done = $("#rvDone");
    done.hidden = false;
    done.innerHTML = '<p class="tk-k">RESERVED</p><h3>예약이 접수되었습니다</h3><p>' + esc(b.name) + '님, 아래 시간에 뵙겠습니다. 변경이나 취소는 예약 시간 2시간 전까지 가능합니다.</p>' +
      '<div class="ticket"><p class="no">' + esc(b.id) + '</p><dl><div><dt>진료</dt><dd>' + esc(b.txName) + ' · ' + esc(b.kind) + '</dd></div>' +
      '<div><dt>일시</dt><dd>' + longDate(b.date) + ' ' + b.time + '</dd></div><div><dt>장소</dt><dd>결빛 피부과의원 · 서울특별시 강남구 샘플로 123, 4층</dd></div>' +
      '<div><dt>연락처</dt><dd>' + esc(maskPhone(b.phone)) + '</dd></div></dl></div>' +
      '<div class="btns"><button class="btn btn-ink" type="button" data-ics="' + esc(b.id) + '"><svg class="ic"><use href="#i-dl"/></svg> 캘린더에 추가</button>' +
      '<button class="btn btn-line" type="button" data-rvc="' + esc(b.id) + '">예약 취소</button><button class="btn btn-line" type="button" data-rvnew>새 예약하기</button></div>' +
      '<p class="sample-note"><svg class="ic"><use href="#i-lock"/></svg> 실제 사이트에서는 확정 즉시 카카오 알림톡이 나가고 관리자 화면에 예약이 쌓입니다. 이 샘플의 예약은 이 기기에만 저장됩니다.</p>';
    R.time = "";
    renderMine(); renderCal(); renderSlots(); renderSummary();
    go("reserve");
  }
  function renderMine() {
    var arr = store.get(K_RSV, []), h = '<h4>내 예약 확인</h4>';
    if (!arr.length) h += '<p class="none">이 기기에서 만든 예약이 여기에 나타납니다.</p>';
    arr.slice(0, 5).forEach(function (b) {
      var off = b.status === "취소";
      h += '<div class="my-rv' + (off ? " off" : "") + '"><div><b>' + longDate(b.date) + ' ' + b.time + '</b><small>' + esc(b.txName) + ' · ' + esc(b.id) + (off ? " · 취소됨" : "") + '</small></div>' +
        (off ? "" : '<button class="link" type="button" data-rvc="' + esc(b.id) + '">취소</button>') + '</div>';
    });
    $("#rvMine").innerHTML = h;
  }
  function cancelRsv(id) {
    var arr = store.get(K_RSV, []), dn = $("#rvDone");
    arr.forEach(function (b) { if (b.id === id) b.status = "취소"; });
    store.set(K_RSV, arr);
    renderMine(); renderCal(); renderSlots();
    if (!dn.hidden) {
      dn.innerHTML = '<p class="tk-k" style="color:var(--ink-mute)">CANCELED</p><h3>예약이 취소되었습니다</h3><p>다시 예약하시려면 아래 단추를 눌러 주세요.</p><div class="btns" style="margin-top:22px"><button class="btn btn-ink" type="button" data-rvnew>새 예약하기</button></div>';
    }
    toast("예약을 취소했습니다.");
  }
  function downloadIcs(id) {
    var b = store.get(K_RSV, []).filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    var p = parts(b.date), t = b.time.split(":");
    var st = new Date(Date.UTC(p.y, p.m - 1, p.d, +t[0] - 9, +t[1], 0)), en = new Date(st.getTime() + 30 * 60000);
    function z(x) { return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + "T" + pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + "00Z"; }
    var nl = String.fromCharCode(13, 10);
    var text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Keungil Bridge//Skin Clinic Sample//KO", "BEGIN:VEVENT", "UID:" + b.id + "@sample", "DTSTAMP:" + z(new Date()),
      "DTSTART:" + z(st), "DTEND:" + z(en), "SUMMARY:결빛 피부과 진료 예약 (샘플)", "LOCATION:서울특별시 강남구 샘플로 123, 4층 (가상 주소)",
      "DESCRIPTION:" + b.txName + " · 샘플 예약입니다. 실제 예약이 아닙니다.", "END:VEVENT", "END:VCALENDAR"].join(nl);
    var url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" })), a = D.createElement("a");
    a.href = url; a.download = "gyeolbit-reservation.ics";
    D.body.appendChild(a); a.click(); D.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("캘린더 파일을 내려받았습니다. 열어서 일정에 추가하세요.");
  }
  function radioKeys(box, sel, pick) {
    box.addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].indexOf(e.key) < 0) return;
      var items = $$(sel, box), i = items.indexOf(D.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = (e.key === "ArrowRight" || e.key === "ArrowDown") ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[n].focus();
      pick(items[n]);
    });
  }
  function fmtPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  }
  function initReserve() {
    var n = seoul(), sec = $("#reserve");
    R.vy = n.y; R.vm = n.m;
    renderTypes(); renderCal(); renderSlots(); renderSummary(); renderMine();
    function pickType(b) { R.tx = b.getAttribute("data-rt"); renderTypes(); renderSummary(); }
    sec.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-rt]"))) { pickType(t); }
      else if ((t = e.target.closest("#rvKind button"))) { R.kind = t.getAttribute("data-v"); renderTypes(); renderSummary(); }
      else if ((t = e.target.closest("[data-cm]"))) {
        R.vm += +t.getAttribute("data-cm");
        if (R.vm < 1) { R.vm = 12; R.vy--; } else if (R.vm > 12) { R.vm = 1; R.vy++; }
        renderCal();
      } else if ((t = e.target.closest("[data-cd]"))) {
        R.date = t.getAttribute("data-cd");
        if (R.time && (slotsOf(R.date).indexOf(R.time) < 0 || isFull(R.date, R.time) || isPast(R.date, R.time))) R.time = "";
        renderCal(); renderSlots(); renderSummary();
        if (window.innerWidth <= 720) $("#rvSlots").scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if ((t = e.target.closest("[data-st]"))) { R.time = t.getAttribute("data-st"); renderSlots(); renderSummary(); }
      else if (e.target.closest("#rvGo")) { submitReserve(); }
      else if ((t = e.target.closest("[data-ics]"))) { downloadIcs(t.getAttribute("data-ics")); }
      else if ((t = e.target.closest("[data-rvc]"))) { cancelRsv(t.getAttribute("data-rvc")); }
      else if (e.target.closest("[data-rvnew]")) {
        R.tx = ""; R.date = ""; R.time = "";
        showForm(); renderTypes(); renderCal(); renderSlots(); renderSummary();
        go("reserve");
      }
    });
    radioKeys($("#rvTypes"), ".rv-type", pickType);
    radioKeys($("#rvKind"), "button", function (b) { R.kind = b.getAttribute("data-v"); renderTypes(); renderSummary(); });
    $("#rvName").addEventListener("input", renderSummary);
    $("#rvPhone").addEventListener("input", function () { this.value = fmtPhone(this.value); renderSummary(); });
    $("#rvAgree").addEventListener("change", renderSummary);
  }

  /* ── 안내 창 · 관리자 화면 미리보기 ── */
  var adminTab = "dash", seedState = {}, seedRsv = null;
  function modalHtml(kind) {
    if (kind === "privacy") {
      return '<h3 id="mdTitle">개인정보 수집 · 이용 안내</h3><p class="md-sub">샘플 화면입니다. 실제 제작에서는 병원의 개인정보처리방침에 맞춰 작성합니다.</p>' +
        '<div class="md-sec"><h4>수집 항목</h4><p>이름, 휴대폰 번호, 진료 분야, 불편한 점(선택)</p>' +
        '<h4>수집 목적</h4><p>진료 예약의 확인 · 변경 · 취소 안내, 상담 글 답변 안내</p>' +
        '<h4>보유 기간</h4><p>목적을 달성하면 지체 없이 파기합니다. 법령에 따라 보존해야 하는 정보는 해당 기간 동안 보관합니다.</p>' +
        '<h4>동의하지 않을 권리</h4><p>동의를 거부할 수 있으며, 이 경우 온라인 예약과 상담 글 등록이 제한됩니다. 전화로 예약하실 수 있습니다.</p>' +
        '<h4>이 샘플에서는</h4><ul><li>입력한 내용은 서버로 전송되지 않고 이 기기의 브라우저에만 저장됩니다.</li><li>브라우저의 저장 데이터를 지우면 함께 사라집니다.</li></ul></div>';
    }
    if (kind === "nonCovered") {
      return '<h3 id="mdTitle">비급여 진료비 안내</h3><p class="md-sub">건강보험이 적용되지 않는 진료의 비용입니다. 시행하기 전에 진료실에서 항목별로 다시 설명드립니다.</p>' +
        '<table class="md-table"><thead><tr><th>항목</th><th>금액</th><th>안내</th></tr></thead><tbody>' +
        GB.nonCovered.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>"; }).join("") + '</tbody></table>' +
        '<p class="md-note">샘플 금액입니다. 실제 제작에서는 병원이 게시하는 비급여 진료비용을 그대로 싣고, 관리자 화면에서 직접 고칠 수 있게 만듭니다. 건강보험이 적용되는 진료의 본인부담금은 이 표에 포함되지 않습니다.</p>';
    }
    if (kind === "admin") { adminTab = "dash"; return adminHtml(); }
    return "";
  }
  function adminBind() { /* 클릭은 initAdmin 에서 한 번만 연결한다 */ }
  function seedList() {
    if (seedRsv) return seedRsv;
    var k1 = nextOpen(today()) || today(), k2 = nextOpen(k1) || k1, k3 = nextOpen(k2) || k2;
    function at(k, i) { var s = slotsOf(k); return s.length ? s[(i * 3 + 2) % s.length] : "10:00"; }
    seedRsv = [
      { id: "GB-SAMPLE-A1", name: "김○○", txName: "여드름 · 여드름 흉터", kind: "초진", date: k1, time: at(k1, 1), status: "확정", seed: true },
      { id: "GB-SAMPLE-A2", name: "박○○", txName: "탈모 · 두피 질환", kind: "재진", date: k1, time: at(k1, 3), status: "확정", seed: true },
      { id: "GB-SAMPLE-A3", name: "이○○", txName: "점 · 피부 종양 검진", kind: "초진", date: k2, time: at(k2, 2), status: "확정", seed: true },
      { id: "GB-SAMPLE-A4", name: "최○○", txName: "아토피 · 습진 · 두드러기", kind: "재진", date: k3, time: at(k3, 4), status: "확정", seed: true }
    ];
    return seedRsv;
  }
  function allRsv() {
    var mine = store.get(K_RSV, []).map(function (b) { var c = {}, k; for (k in b) c[k] = b[k]; c.mine = true; return c; });
    var seeds = seedList().map(function (b) { var c = {}, k; for (k in b) c[k] = b[k]; if (seedState[b.id]) c.status = seedState[b.id]; return c; });
    return mine.concat(seeds).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  }
  function pill(st) { return '<span class="pill ' + (st === "확정" || st === "답변 완료" ? "ok" : (st === "취소" ? "off" : "wait")) + '">' + esc(st) + '</span>'; }
  function adminHtml() {
    var nav = [["dash", "대시보드"], ["rsv", "예약 현황"], ["qna", "상담 답변"]].map(function (x) {
      return '<button type="button" data-at="' + x[0] + '"' + (x[0] === adminTab ? ' class="on"' : "") + '>' + x[1] + '</button>';
    }).join("") + ["칼럼 관리", "진료시간 · 휴진", "병원 정보"].map(function (l) { return '<button type="button" disabled title="샘플에서는 생략했습니다">' + l + '</button>'; }).join("");
    return '<h3 id="mdTitle">관리자 화면 미리보기</h3><p class="md-sub">병원에서 쓰게 될 화면입니다. 방금 이 샘플에서 한 예약과 남긴 상담 글이 그대로 나타납니다.</p>' +
      '<div class="adm"><div class="adm-side"><b>결빛 관리자</b>' + nav + '</div><div class="adm-main" id="admMain">' + admMain() + '</div></div>';
  }
  function rsvTable(rows) {
    if (!rows.length) return '<p class="adm-hint">예약이 없습니다.</p>';
    return '<table class="adm-table"><thead><tr><th>일시</th><th>이름</th><th>진료</th><th>상태</th><th>관리</th></tr></thead><tbody>' + rows.map(function (b) {
      var p = parts(b.date), cancelled = b.status === "취소";
      return '<tr><td>' + p.m + '.' + pad(p.d) + '(' + GB.dayName[dowOf(b.date)] + ') ' + b.time + '</td><td>' + esc(b.name) + (b.mine ? " <small>(내 예약)</small>" : "") + '</td>' +
        '<td>' + esc(b.txName.split(" · ")[0]) + ' · ' + esc(b.kind) + '</td><td>' + pill(b.status) + '</td>' +
        '<td><div class="adm-act"><button type="button" data-ar="' + (cancelled ? "confirm" : "cancel") + '" data-id="' + esc(b.id) + '">' + (cancelled ? "다시 확정" : "취소") + '</button>' +
        '<button type="button" data-ar="notify" data-id="' + esc(b.id) + '">알림톡</button></div></td></tr>';
    }).join("") + '</tbody></table>';
  }
  function admMain() {
    var rows = allRsv(), td = today(), mine = store.get(K_QNA, []);
    if (adminTab === "rsv") {
      return '<p class="adm-hint">환자가 예약하면 이 표에 바로 쌓입니다. 취소나 확정을 누르면 상태가 바뀝니다.</p>' + rsvTable(rows);
    }
    if (adminTab === "qna") {
      if (!mine.length) return '<p class="adm-hint">상담 코너에서 질문을 남기면 여기에 나타납니다. 답변을 등록하면 환자 화면에 원장님 답변으로 바로 표시됩니다.</p>';
      return '<p class="adm-hint">아래에 답변을 적고 등록하면 상담 코너의 해당 글에 원장님 답변으로 표시됩니다.</p>' + mine.map(function (p) {
        return '<div class="adm-post"><h5><span>' + esc(p.title) + '</span>' + pill(p.answer ? "답변 완료" : "답변 대기") + '</h5>' +
          '<div>' + esc(p.who) + ' · ' + esc(p.cat) + (p.secret ? " · 비공개" : "") + '<br>' + esc(p.q) + '</div>' +
          '<textarea rows="3" id="rp-' + esc(p.id) + '" placeholder="원장님 답변을 적어 주세요">' + esc(p.answer || "") + '</textarea>' +
          '<div class="adm-act" style="margin-top:8px"><button type="button" data-reply="' + esc(p.id) + '">답변 등록</button></div></div>';
      }).join("");
    }
    var todayN = rows.filter(function (b) { return b.date === td && b.status !== "취소"; }).length;
    var wait = mine.filter(function (p) { return !p.answer; }).length;
    var active = rows.filter(function (b) { return b.status !== "취소"; }).length;
    return '<div class="adm-tiles"><div class="adm-tile"><small>오늘 예약</small><b>' + todayN + '</b></div><div class="adm-tile"><small>전체 예약</small><b>' + active + '</b></div>' +
      '<div class="adm-tile"><small>답변 대기</small><b>' + wait + '</b></div></div>' +
      '<p class="adm-hint">다가오는 예약입니다. 샘플 데이터와 이 기기에서 만든 예약이 함께 보입니다.</p>' + rsvTable(rows.slice(0, 6));
  }
  function paintAdmin() {
    var m = $("#admMain");
    if (!m) return;
    m.innerHTML = admMain();
    $$(".adm-side button[data-at]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-at") === adminTab); });
  }
  function initAdmin() {
    $("#mdBody").addEventListener("click", function (e) {
      var t = e.target.closest("[data-at]");
      if (t) { adminTab = t.getAttribute("data-at"); paintAdmin(); return; }
      t = e.target.closest("[data-ar]");
      if (t) {
        var act = t.getAttribute("data-ar"), id = t.getAttribute("data-id");
        if (act === "notify") { toast("환자에게 예약 안내 알림톡이 발송됩니다. 샘플에서는 실제로 보내지 않습니다.", 4000); return; }
        var st = act === "cancel" ? "취소" : "확정", arr = store.get(K_RSV, []), hit = false;
        arr.forEach(function (b) { if (b.id === id) { b.status = st; hit = true; } });
        if (hit) store.set(K_RSV, arr); else seedState[id] = st;
        paintAdmin();
        return;
      }
      t = e.target.closest("[data-reply]");
      if (t) {
        var pid = t.getAttribute("data-reply"), box = D.getElementById("rp-" + pid), text = box ? box.value.trim() : "";
        if (!text) { toast("답변 내용을 적어 주세요."); return; }
        var posts = store.get(K_QNA, []);
        posts.forEach(function (p) { if (p.id === pid) p.answer = text; });
        store.set(K_QNA, posts);
        paintAdmin();
        toast("답변을 등록했습니다. 상담 코너에 원장님 답변으로 바로 표시됩니다.", 4000);
      }
    });
  }

  /* ── 스크롤하면 부드럽게 나타나기 ── */
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    var els = $$(".sec-head,.tx,.doc-portrait,.doc-copy,.col-grid>*,.layers,.info-2>*,.faq,.board,.ask>*,.rv-block,.rv-side>*,.visit-grid>*,.feat,.fd-cta,.hero-facts li");
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    els.forEach(function (el, i) {
      el.setAttribute("data-rvl", "");
      if (el.classList.contains("feat") || el.parentNode.classList.contains("hero-facts")) el.style.transitionDelay = ((i % 4) * 70) + "ms";
      io.observe(el);
    });
  }

  function init() {
    renderStatus(); renderHours();
    setInterval(renderStatus, 60000);
    initNav(); initOverlays();
    renderTx(); initTx(); renderCols();
    initLayers(); initQuiz();
    $("#uvRange").addEventListener("input", uvUpdate); uvUpdate();
    renderFaq(); renderFeatures();
    initQna(); initReserve(); initAdmin(); initReveal();
    var m = /^#column=([a-z]+)$/.exec(location.hash);
    if (m) openReader(m[1]);
  }
  GB.toast = toast; GB.go = go; GB.openReader = openReader; GB.openModal = openModal; GB.selectTx = selectTx;
  GB.seoul = seoul; GB.today = today; GB.dayInfo = dayInfo; GB.nextOpen = nextOpen; GB.slotsOf = slotsOf;
  GB.isFull = isFull; GB.isPast = isPast; GB.longDate = longDate; GB.dowOf = dowOf; GB.addDays = addDays; GB.status = renderStatus;
  GB.mineRsv = function () { return store.get(K_RSV, []); };
  init();
})();
