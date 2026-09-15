/*
  큰길브리지 내부 화면(/me/) 도구.
  링크 · 할 일 목록은 links.enc.json 에 암호로 봉해 둔다(소스에 평문 없음). 이 파일 자체에는 비밀이 없다.

    node me/tool.mjs decrypt "<암호>"            → 목록 JSON 을 화면에 출력
    node me/tool.mjs encrypt "<암호>" < 목록.json → links.enc.json 새로 봉함
    node me/tool.mjs check   "<암호>"            → 할 일 항목을 실제로 확인(서버 ping · 파일 검사)해 ✅/⏳ 갱신 → 다시 봉함 → index.html 다시 만듦
    node me/tool.mjs build   "<암호>"            → index.html 만 다시 만듦

  매일 아침 루틴은 check 만 돌리고 바뀐 것이 있으면 커밋한다.
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const ENC = path.join(here, 'links.enc.json');
const OUT = path.join(here, 'index.html');
const ITER = 400000;
const [cmd, pass] = process.argv.slice(2);
if (!cmd || !pass) { console.error('쓰는 법: node me/tool.mjs decrypt|encrypt|check|build "<암호>"'); process.exit(1); }

const b64 = (b) => Buffer.from(b).toString('base64');
const seoulDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

function encrypt(obj) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(Buffer.from(JSON.stringify(obj), 'utf8')), c.final()]);
  return { salt: b64(salt), iv: b64(iv), data: b64(Buffer.concat([enc, c.getAuthTag()])), iter: ITER };
}
function decrypt(box) {
  const salt = Buffer.from(box.salt, 'base64'), iv = Buffer.from(box.iv, 'base64'), all = Buffer.from(box.data, 'base64');
  const key = crypto.pbkdf2Sync(pass, salt, box.iter || ITER, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(all.subarray(all.length - 16));
  return JSON.parse(Buffer.concat([d.update(all.subarray(0, all.length - 16)), d.final()]).toString('utf8'));
}
function load() { return decrypt(JSON.parse(fs.readFileSync(ENC, 'utf8'))); }
function save(obj) { fs.writeFileSync(ENC, JSON.stringify(encrypt(obj), null, 2) + '\n'); }

/* ── 할 일 확인 ──────────────────────────────────────────
   항목의 check 모양:
     { "kind": "http-match", "url": "...", "pattern": "정규식" }   → 그 주소의 본문이 정규식과 맞으면 끝난 것
     { "kind": "file-match", "file": "stats/stats.js", "pattern": "정규식" } → 이 저장소 파일이 정규식과 맞으면 끝난 것
   check 가 없으면 사람이 알려 줘야 하는 항목(그대로 둔다). */
async function fetchText(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'keungil-me-check' } });
    return await r.text();
  } catch (e) { return ''; }
}
async function runCheck(it) {
  const c = it.check; if (!c) return null;
  const re = new RegExp(c.pattern);
  if (c.kind === 'http-match') return re.test(await fetchText(c.url));
  if (c.kind === 'file-match') { try { return re.test(fs.readFileSync(path.join(root, c.file), 'utf8')); } catch (e) { return false; } }
  return null;
}
async function check(L) {
  const today = seoulDate();
  let changed = false;
  for (const sec of L.sections) {
    if (!sec.todo) continue;
    for (const it of sec.items) {
      const ok = await runCheck(it);
      if (ok === true && !it.done) { it.done = today; changed = true; console.log('✅ 끝남:', it.t); }
      else if (ok === false && it.done && it.check) { delete it.done; changed = true; console.log('⏳ 다시 열림:', it.t); }
    }
    // 끝난 지 14일 지난 항목은 목록에서 뺀다
    const before = sec.items.length;
    sec.items = sec.items.filter(it => !it.done || (Date.parse(today) - Date.parse(it.done)) < 14 * 86400e3);
    if (sec.items.length !== before) changed = true;
    // 남은 것 위, 끝난 것 아래
    sec.items.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
  }
  L.checked = today;
  return changed;
}

/* ── 페이지 ────────────────────────────────────────────── */
function build(L) {
  const box = encrypt(L);
  const built = L.checked || seoulDate();
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>내부 화면 — 큰길브리지</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg">
<style>
:root{--bg:#12100C;--surface:#1B1813;--line:#2E2A22;--ink:#F6F1E7;--ink2:#C9C2B3;--ink3:#8E877A;--amber:#F5A524;--ok:#8BE0B4}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'Noto Sans KR',system-ui,'Malgun Gothic',sans-serif;line-height:1.6;word-break:keep-all;padding:1.4rem 1rem 4rem}
.wrap{max-width:60rem;margin:0 auto}
.eyebrow{font-size:.74rem;font-weight:900;letter-spacing:.18em;color:var(--amber)}
h1{font-size:1.5rem;font-weight:900;letter-spacing:-.03em;margin:.4rem 0 .2rem}
.sub{color:var(--ink3);font-size:.85rem;margin:0 0 1.2rem}
.lock{max-width:26rem;margin:2.5rem auto;background:var(--surface);border:1px solid var(--line);border-radius:1rem;padding:1.4rem}
.lock h2{margin:0 0 .3rem;font-size:1.1rem}
.lock p{margin:0 0 .9rem;color:var(--ink3);font-size:.85rem}
input{width:100%;padding:.8rem .9rem;border-radius:.65rem;border:1px solid var(--line);background:rgba(0,0,0,.35);color:var(--ink);font:inherit;font-size:1rem}
input:focus{outline:none;border-color:rgba(245,165,36,.6)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;padding:.75rem 1rem;border-radius:.7rem;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--ink);font:inherit;font-weight:700;cursor:pointer;text-decoration:none}
.btn.pri{background:var(--amber);color:#12100C;border-color:transparent;width:100%;margin-top:.7rem;font-size:1rem}
.btn.sm{padding:.45rem .7rem;font-size:.8rem}
.warn{color:#F0A98F;font-size:.85rem;min-height:1.4em;margin:.6rem 0 0}
.top{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap}
section{margin-top:1.4rem}
section h2{font-size:.95rem;font-weight:800;color:var(--amber);letter-spacing:.02em;margin:0 0 .6rem;padding-bottom:.4rem;border-bottom:1px solid var(--line)}
section h2 small{font-weight:500;color:var(--ink3);margin-left:.5rem;letter-spacing:0}
.grid{display:grid;gap:.6rem}
@media(min-width:760px){.grid{grid-template-columns:1fr 1fr}}
.item{display:flex;gap:.8rem;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:.85rem;padding:.85rem .95rem}
.item .tx{flex:1;min-width:0}
.item b{display:block;font-size:.95rem}
.item a b{color:var(--ink)}
.item a{text-decoration:none}
.item a:hover b{color:var(--amber)}
.item .d{font-size:.8rem;color:var(--ink3);margin-top:.15rem;line-height:1.5}
.item .cp{font-size:.78rem;color:var(--ink2);margin-top:.35rem;padding:.45rem .6rem;background:rgba(0,0,0,.3);border-radius:.5rem;white-space:pre-wrap;word-break:break-all}
.item .btn{flex:none;margin-top:.1rem}
.todo .item{border-style:dashed}
.todo .item.done{opacity:.55;border-style:solid}
.todo .item.done b{color:var(--ok)}
.todo .item .st{font-size:.74rem;font-weight:800;color:var(--amber);margin-right:.35rem}
.todo .item.done .st{color:var(--ok)}
#toast{position:fixed;left:50%;bottom:1.5rem;transform:translate(-50%,1rem);background:#F6F1E7;color:#12100C;font-size:.88rem;font-weight:700;padding:.65rem 1.1rem;border-radius:9999px;opacity:0;pointer-events:none;transition:.2s;z-index:50}
#toast.on{opacity:1;transform:translate(-50%,0)}
[hidden]{display:none!important}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">KEUNGIL BRIDGE · 내부</div>
  <div class="top">
    <div><h1>큰길브리지 내부 화면</h1><p class="sub">일 처리 · 손님에게 보내는 링크 · 남은 일. 매일 아침 확인 · ${built} 기준</p></div>
    <button class="btn sm" id="lockbtn" hidden>🔒 잠그기 (이 기기에서 지움)</button>
  </div>

  <div class="lock" id="lock">
    <h2>암호를 넣어 주세요</h2>
    <p>맞으면 이 기기는 기억해서 다음부터 바로 열립니다.</p>
    <form id="f"><input id="pw" type="password" placeholder="암호" autocomplete="current-password" autofocus><button class="btn pri" type="submit">열기</button></form>
    <p class="warn" id="warn"></p>
  </div>

  <div id="body" hidden></div>
</div>
<div id="toast"></div>

<script>
/* 링크 목록은 아래 글자 안에 암호로 봉해져 있다 (PBKDF2 ${ITER}회 + AES-256-GCM). 암호 없이는 풀리지 않는다. */
var SALT = '${box.salt}', IV = '${box.iv}', DATA = '${box.data}', ITER = ${ITER}, KEY_STORE = 'kb-me-key';
var $ = function(s){ return document.querySelector(s); };
function b2a(b64){ var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
function a2b(buf){ var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
function toast(m){ var t = $('#toast'); t.textContent = m; t.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(function(){ t.className = ''; }, 2200); }

async function keyFromPass(pass){
  var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt: b2a(SALT), iterations: ITER, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, true, ['decrypt']);
}
async function open(key){
  var pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv: b2a(IV) }, key, b2a(DATA));
  return JSON.parse(new TextDecoder().decode(pt));
}
function render(L){
  $('#body').innerHTML = L.sections.map(function(sec){
    var left = sec.todo ? sec.items.filter(function(i){ return !i.done; }).length : 0;
    return '<section class="' + (sec.todo ? 'todo' : '') + '"><h2>' + esc(sec.h) + (sec.todo ? '<small>남은 것 ' + left + '개' + (L.checked ? ' · ' + esc(L.checked) + ' 확인' : '') + '</small>' : '') + '</h2><div class="grid">' + sec.items.map(function(it){
      var st = sec.todo ? '<span class="st">' + (it.done ? '✅ ' + esc(it.done) + ' 끝남' : '⏳ 남음') + '</span>' : '';
      var head = it.u ? '<a href="' + esc(it.u) + '" target="_blank" rel="noopener"><b>' + st + esc(it.t) + ' ↗</b></a>' : '<b>' + st + esc(it.t) + '</b>';
      var body = (it.d ? '<div class="d">' + esc(it.d) + '</div>' : '') + (it.copy ? '<div class="cp">' + esc(it.copy) + '</div>' : '');
      var btn = it.copy ? '<button class="btn sm" data-copy="' + esc(it.copy) + '">복사</button>' : (it.u ? '<button class="btn sm" data-copy="' + esc(it.u) + '">링크 복사</button>' : '');
      return '<div class="item' + (it.done ? ' done' : '') + '"><div class="tx">' + head + body + '</div>' + btn + '</div>';
    }).join('') + '</div></section>';
  }).join('');
  $('#body').hidden = false; $('#lock').hidden = true; $('#lockbtn').hidden = false;
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function(b){
    b.addEventListener('click', async function(){
      var t = b.getAttribute('data-copy');
      try { await navigator.clipboard.writeText(t); toast('복사했습니다'); } catch (e) { prompt('복사해서 쓰세요', t); }
    });
  });
}
$('#f').addEventListener('submit', async function(e){
  e.preventDefault();
  var pass = $('#pw').value; $('#warn').textContent = '확인 중…';
  try {
    var key = await keyFromPass(pass);
    var L = await open(key);
    try { localStorage.setItem(KEY_STORE, a2b(await crypto.subtle.exportKey('raw', key))); } catch (err) {}
    $('#warn').textContent = ''; render(L);
  } catch (err) { $('#warn').textContent = '암호가 맞지 않습니다'; $('#pw').select(); }
});
$('#lockbtn').addEventListener('click', function(){ try { localStorage.removeItem(KEY_STORE); } catch (e) {} location.reload(); });
(async function(){
  var raw = null; try { raw = localStorage.getItem(KEY_STORE); } catch (e) {}
  if (!raw) return;
  try { var key = await crypto.subtle.importKey('raw', b2a(raw), { name:'AES-GCM' }, true, ['decrypt']); render(await open(key)); }
  catch (e) { try { localStorage.removeItem(KEY_STORE); } catch (err) {} }
})();
</script>
</body>
</html>
`;
  fs.writeFileSync(OUT, html);
  console.log('built index.html', html.length, 'bytes,', L.sections.reduce((n, s) => n + s.items.length, 0), 'items');
}

/* ── 명령 ─────────────────────────────────────────────── */
if (cmd === 'decrypt') { console.log(JSON.stringify(load(), null, 2)); }
else if (cmd === 'encrypt') { const obj = JSON.parse(fs.readFileSync(0, 'utf8')); save(obj); console.log('봉함 →', ENC); }
else if (cmd === 'build') { build(load()); }
else if (cmd === 'check') {
  const L = load(); const before = new Set(L.sections.filter(s => s.todo).flatMap(s => s.items.filter(i => i.done).map(i => i.t)));
  const changed = await check(L); save(L); build(L);
  const todo = L.sections.filter(s => s.todo).flatMap(s => s.items);
  const newlyDone = todo.filter(i => i.done && !before.has(i.t)).map(i => i.t);
  console.log(changed ? '바뀐 것 있음' : '바뀐 것 없음', '· 확인일', L.checked);
  console.log('✅ 끝남으로 바뀐 것: ' + (newlyDone.length ? newlyDone.join(', ') : '없음'));
  console.log('⏳ 남은 것: ' + todo.filter(i => !i.done).length + '개');
}
else { console.error('모르는 명령:', cmd); process.exit(1); }
