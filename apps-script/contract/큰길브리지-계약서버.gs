/**
 * 큰길브리지 — 홈페이지 제작 전자계약 서버 (Google Apps Script)
 *
 * contract.html 이 부르는 백엔드다.
 *   POST {action:'store', contract, hash}   → 계약서 저장하고 짧은 ID 발급
 *   GET  ?id=ID                             → 계약서 불러오기 (고객 화면이 부른다)
 *   POST {action:'sign', ...}               → 서명 접수 · PDF 생성 · 드라이브 저장 · 양측 메일 · 대장 기록
 *   POST {action:'ping'}                    → 살아있는지 확인
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 *
 * ※ 서버 없이도 contract.html 은 돌아간다. 다만 링크가 길어지고,
 *   PDF 자동 생성 · 자동 메일 · 계약 대장이 없다.
 */

/** ── 설정 ─────────────────────────────────────────── */
var ROOT_FOLDER_NAME = '큰길브리지 계약서';    // 내 드라이브에 자동으로 만들어진다
var SHEET_NAME       = '계약 대장';            // 그 폴더 안에 자동 생성
var COMPANY_NAME     = '큰길브리지';
var COMPANY_EMAIL    = 'gilauto325@gmail.com'; // 서명본을 항상 받을 주소
var COMPANY_TEL      = '1533-7295';
var ALLOW_RESIGN     = false;                  // true 로 두면 이미 서명된 계약에 다시 서명할 수 있다
/** ─────────────────────────────────────────────────── */


/* ══ 진입점 ══════════════════════════════════════════ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.id) return json_(getContract_(p.id));
  return json_({ ok: true, service: 'keungil-bridge-contract', version: 1, time: new Date().toISOString() });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: '잘못된 요청 형식입니다' }); }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (body.action) {
      case 'ping':  return json_({ ok: true, version: 1 });
      case 'store': return json_(storeContract_(body));
      case 'sign':  return json_(signContract_(body));
      default:      return json_({ ok: false, error: '알 수 없는 요청입니다' });
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}


/* ══ 저장 · 조회 ═════════════════════════════════════ */
function storeContract_(body) {
  var c = body.contract;
  if (!c || !c.cl || !c.pj) throw new Error('계약 내용이 비어 있습니다');
  var id = newId_();
  var rec = { id: id, status: 'pending', createdAt: new Date().toISOString(),
              hash: body.hash || '', contract: c };
  dataFolder_().createFile(id + '.json', JSON.stringify(rec), 'application/json');
  appendLog_({ id: id, status: '발송', contract: c, hash: rec.hash });
  return { ok: true, id: id };
}

function getContract_(id) {
  var rec = readRecord_(id);
  if (!rec) return { ok: false, error: '계약서를 찾을 수 없습니다. 링크를 다시 확인해 주세요.' };
  var out = { ok: true, id: rec.id, status: rec.status, contract: rec.contract, hash: rec.hash };
  if (rec.status === 'signed') {
    out.signedAt = rec.signedAt; out.signer = rec.signer;
    out.pdfUrl = rec.pdfUrl; out.sig = rec.sig || '';
  }
  return out;
}


/* ══ 서명 ════════════════════════════════════════════ */
function signContract_(body) {
  var c = body.contract;
  if (!c) throw new Error('계약 내용이 없습니다');
  if (!body.sig || String(body.sig).indexOf('data:image/png;base64,') !== 0) throw new Error('서명 이미지가 없습니다');
  if (!body.signer || !body.signer.name) throw new Error('서명자 이름이 없습니다');

  var id = String(body.id || '').trim();
  var rec = id ? readRecord_(id) : null;

  /* 이미 서명된 계약에 다시 들어온 경우 — 덮어쓰지 않고 기존 것을 돌려준다 */
  if (rec && rec.status === 'signed' && !ALLOW_RESIGN) {
    return { ok: true, id: rec.id, pdfUrl: rec.pdfUrl, already: true };
  }
  if (!rec) { id = newId_(); rec = { id: id, status: 'pending', createdAt: new Date().toISOString(), contract: c }; }

  /* 문서 확인 코드 — 고객 화면이 보낸 것과 서버가 다시 계산한 것을 비교해 기록한다.
     내용이 중간에 바뀌었는지 나중에 확인할 수 있다. */
  var serverHash = sha256_(JSON.stringify(stripApi_(c)));
  var hashMatch  = !body.hash || body.hash === serverHash;

  var ts    = body.ts || new Date().toISOString();
  var title = safe_(c.pj && c.pj.title) || '홈페이지';
  var org   = safe_(c.cl && c.cl.org) || safe_(c.cl && c.cl.name) || '고객';
  var no    = safe_(c.meta && c.meta.no) || id;
  var total = calcTotal_(c);

  /* PDF — 고객 화면이 만든 HTML 을 그대로 PDF 로 바꾼다 */
  var html = String(body.html || '');
  var pdfName = ('홈페이지제작계약서_' + no + '_' + org).replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) + '.pdf';
  var folder = subFolder_(rootFolder_(), String(new Date().getFullYear()));
  var pdfFile = null, pdfUrl = '';
  if (html) {
    try {
      var blob = Utilities.newBlob(html, 'text/html', pdfName.replace(/\.pdf$/, '.html')).getAs('application/pdf');
      blob.setName(pdfName);
      pdfFile = folder.createFile(blob);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfUrl = pdfFile.getUrl();
    } catch (err) {
      rec.pdfError = String((err && err.message) || err);   // PDF 실패해도 계약은 성립시킨다
    }
  }

  /* 서명 이미지 원본도 따로 보관 */
  try {
    var sigBytes = Utilities.base64Decode(String(body.sig).split(',')[1]);
    folder.createFile(Utilities.newBlob(sigBytes, 'image/png', '서명_' + no + '_' + safe_(body.signer.name) + '.png'));
  } catch (_) {}

  rec.status     = 'signed';
  rec.signedAt   = ts;
  rec.signer     = { name: body.signer.name, tel: body.signer.tel || '', email: body.signer.email || '' };
  rec.hash       = serverHash;
  rec.clientHash = body.hash || '';
  rec.hashMatch  = hashMatch;
  rec.ua         = body.ua || '';
  rec.pdfUrl     = pdfUrl;
  rec.pdfId      = pdfFile ? pdfFile.getId() : '';
  rec.sig        = body.sig;      // 다시 열었을 때 서명을 보여주려고 보관
  rec.contract   = c;
  writeRecord_(rec);

  /* 메일 — 회사와 고객 양쪽으로 */
  var to = body.to || {};
  var recipients = uniq_([COMPANY_EMAIL, to.customer, rec.signer.email,
                          safe_(c.cl && c.cl.email)].filter(isEmail_));
  var 플랜 = { basic: '베이직', premium: '고급형', enterprise: '기업형' };
  var text = [
    '홈페이지 제작 전자계약이 체결되었습니다.', '',
    '계약번호   : ' + no,
    '사이트     : ' + title,
    '도메인     : ' + (safe_(c.pj && c.pj.domain) || '미정'),
    '요금제     : ' + (플랜[c.pj && c.pj.plan] || '-'),
    '계약자     : ' + org + ' / ' + rec.signer.name + (rec.signer.tel ? ' (' + rec.signer.tel + ')' : ''),
    '계약금액   : ' + total.toLocaleString('ko-KR') + '원',
    '오픈 예정  : ' + (safe_(c.sch && c.sch.open) || '협의'),
    '서명시각   : ' + kst_(ts) + ' (KST)',
    '문서확인   : ' + serverHash.slice(0, 32) + '…' + (hashMatch ? '' : '   ※ 확인 코드 불일치 — 내용을 대조해 보세요'),
    '',
    pdfUrl ? '계약서 PDF : ' + pdfUrl : '(PDF 생성 실패 — 첨부만 확인해 주세요)',
    '',
    '첨부된 PDF 를 보관해 주세요.',
    '이 메일은 ' + COMPANY_NAME + ' 전자계약 시스템이 자동으로 보낸 것입니다.',
    COMPANY_NAME + ' (주식회사 브리지미디어) · ' + COMPANY_TEL + ' · ' + COMPANY_EMAIL
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: '[' + COMPANY_NAME + '] 홈페이지 제작 계약 체결 — ' + title,
      body: text, name: COMPANY_NAME,
      attachments: pdfFile ? [pdfFile.getBlob()] : []
    });
  } catch (err) {
    rec.mailError = String((err && err.message) || err);
    writeRecord_(rec);   // 메일이 실패해도 계약 자체는 성립한다. 기록만 남긴다.
  }

  appendLog_({ id: id, status: '서명완료', contract: c, hash: serverHash,
               signer: rec.signer, signedAt: ts, pdfUrl: pdfUrl, hashMatch: hashMatch });

  return { ok: true, id: id, pdfUrl: pdfUrl, hash: serverHash, hashMatch: hashMatch, mailedTo: recipients };
}


/* ══ 계약 대장 (스프레드시트) ═════════════════════════ */
function appendLog_(o) {
  var sh = logSheet_();
  var c = o.contract || {};
  var 플랜 = { basic: '베이직', premium: '고급형', enterprise: '기업형' };
  sh.appendRow([
    new Date(), o.id, o.status,
    safe_(c.meta && c.meta.no),
    safe_(c.pj && c.pj.title), safe_(c.pj && c.pj.domain),
    플랜[c.pj && c.pj.plan] || '',
    safe_(c.cl && c.cl.org), safe_(c.cl && c.cl.name),
    safe_(c.cl && c.cl.tel), safe_(c.cl && c.cl.email),
    calcTotal_(c),
    safe_(c.care && c.care.monthly),
    safe_(c.sch && c.sch.open),
    o.signer ? safe_(o.signer.name) : '',
    o.signedAt ? kst_(o.signedAt) : '',
    o.pdfUrl || '', o.hash || '',
    o.hashMatch === false ? '확인코드 불일치' : ''
  ]);
}

function logSheet_() {
  var root = rootFolder_();
  var it = root.getFilesByType(MimeType.GOOGLE_SHEETS);
  var file = null;
  while (it.hasNext()) { var f = it.next(); if (f.getName() === SHEET_NAME) { file = f; break; } }
  var ss;
  if (file) ss = SpreadsheetApp.open(file);
  else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(root);
    var sh = ss.getActiveSheet();
    sh.setName('대장');
    sh.appendRow(['기록시각','문서ID','상태','계약번호','사이트','도메인','요금제',
                  '상호','담당자','연락처','이메일','계약금액','월 관리비','오픈 예정',
                  '서명자','서명시각','PDF','문서확인코드','비고']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 19).setFontWeight('bold').setBackground('#FBF0D5');
  }
  return ss.getSheets()[0];
}


/* ══ 드라이브 ════════════════════════════════════════ */
function rootFolder_() { return subFolder_(DriveApp.getRootFolder(), ROOT_FOLDER_NAME); }
function dataFolder_() { return subFolder_(rootFolder_(), '_data'); }
function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function readRecord_(id) {
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(id)) return null;
  var it = dataFolder_().getFilesByName(id + '.json');
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) { return null; }
}
function writeRecord_(rec) {
  var it = dataFolder_().getFilesByName(rec.id + '.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(rec));
  else dataFolder_().createFile(rec.id + '.json', JSON.stringify(rec), 'application/json');
}


/* ══ 유틸 ════════════════════════════════════════════ */
function newId_() {
  /* 헷갈리는 글자(I, O, 0, 1)는 뺐다. 전화로 불러줄 수 있어야 한다. */
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function stripApi_(c) {
  var o = JSON.parse(JSON.stringify(c));
  if (o.meta) delete o.meta.api;   // 서버 주소는 계약 내용이 아니다. 확인 코드에서 뺀다.
  delete o.sig;                    // 서명 자체도 뺀다. 서명 전후 코드가 같아야 대조가 된다.
  return o;
}
/* contract.html 의 계산과 반드시 같아야 한다. 한쪽만 고치면 금액이 어긋난다. */
function calcTotal_(c) {
  var num = function (v) { return +String(v == null ? '' : v).replace(/[^0-9.-]/g, '') || 0; };
  var sum = 0;
  (c.items || []).forEach(function (it) { sum += num(it.q) * num(it.p); });
  var vat = (c.fin && c.fin.vat) === 'excl' ? Math.round(sum * 0.1) : 0;
  return sum + vat;
}
function safe_(v) { return v == null ? '' : String(v); }
function kst_(iso) {
  try { return Utilities.formatDate(new Date(iso), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'); }
  catch (e) { return String(iso); }
}
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }
function uniq_(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
