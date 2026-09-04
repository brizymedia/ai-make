/**
 * 큰길브리지 — 유입 기록 서버 (세 사이트 공용, Google Apps Script)
 *   큰길브리지 www.ai-make.co.kr · 큰길이벤트 큰길이벤트.com · 이벤트 코리아 www.event-korea.co.kr
 *
 * 하는 일 둘.
 *   1) 기록 — 각 페이지에 붙은 stats.js 가 방문 한 번에 신호 한 번을 보낸다.
 *      POST 본문(JSON) 또는 GET 쿼리. 시트 「방문 기록」에 한 줄씩 쌓인다.
 *      IP·이름 같은 개인정보는 받지 않는다 (앱스 스크립트는 IP 를 볼 수도 없다).
 *   2) 조회 — 현황판(ai-make.co.kr/stats/)이 ?view=summary&key=열쇠&days=30 으로 부르면 집계를 JSON 으로 준다.
 *      열쇠는 스크립트 속성 STATS_KEY 에만 둔다. 이 파일에 적지 않는다.
 *
 * 설치는 같은 폴더 README.md.
 */

/** ── 설정 ─────────────────────────────────────────── */
var 폴더이름 = '큰길브리지 유입';
var 파일이름 = '유입 기록';
var 장이름   = '방문 기록';
var 머리     = ['시각', '사이트', '경로', '제목', '유입', '출처', '검색어', 'utm_source', 'utm_medium', 'utm_campaign', '기기', '방문자', '새방문', '언어', '화면폭'];
var 사이트이름 = { 'ai-make': '큰길브리지', 'keungil': '큰길이벤트', 'event-korea': '이벤트 코리아' };
var 우리도메인 = ['ai-make.co.kr', 'event-korea.co.kr', 'event-korea.com', 'xn--wk0bn7yi8h24iszc.com', 'brizymedia.github.io'];
var 캐시초   = 300;      // 집계는 5분 캐시
var 목록최대 = 40;       // 표 하나에 최대 몇 줄
/** ─────────────────────────────────────────────────── */


/* ══ 진입점 ══════════════════════════════════════════ */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.view) return 조회_(p);
  if (p.s) { 기록_(p); return 텍스트_('ok'); }
  return json_({ ok: true, service: 'kb-stats', version: 1 });
}

function doPost(e) {
  var p = {};
  try { p = JSON.parse((e.postData && e.postData.contents) || '{}'); }
  catch (err) { p = (e && e.parameter) || {}; }
  if (p && p.s) 기록_(p);
  return 텍스트_('ok');
}


/* ══ 1. 기록 ═════════════════════════════════════════ */
function 기록_(p) {
  var 사이트 = 사이트키_(p.s, p.h);
  var 경로 = 다듬기_(p.p, 160) || '/';
  var 제목 = 다듬기_(p.t, 80);
  var ref = 다듬기_(p.r, 300);
  var us = 다듬기_(p.us, 40), um = 다듬기_(p.um, 40), uc = 다듬기_(p.uc, 60);
  var 분류 = 분류_(ref, us, um);
  var 기기 = /^(mobile|pc|tablet)$/.test(String(p.d)) ? String(p.d) : (Number(p.w) && Number(p.w) < 820 ? 'mobile' : 'pc');
  var 방문자 = 다듬기_(p.v, 24) || '-';
  var 새 = (p.n === 1 || p.n === '1') ? 1 : 0;
  var 언어 = 다듬기_(p.l, 12);
  var 폭 = Number(p.w) || '';

  var 줄 = [new Date(), 사이트, 경로, 제목, 분류[0], 분류[1], 검색어_(ref), us, um, uc, 기기, 방문자, 새, 언어, 폭];
  var 자물쇠 = LockService.getScriptLock();
  var 잡음 = false;
  try { 잡음 = 자물쇠.tryLock(5000); } catch (err) {}
  try { 장_().appendRow(줄); }
  finally { if (잡음) { try { 자물쇠.releaseLock(); } catch (err) {} } }
}

function 사이트키_(s, host) {
  s = String(s || '').toLowerCase();
  if (사이트이름[s]) return s;
  host = String(host || '').toLowerCase();
  if (/ai-make/.test(host)) return 'ai-make';
  if (/event-korea/.test(host)) return 'event-korea';
  if (/wk0bn7yi8h24iszc/.test(host)) return 'keungil';
  return s || '?';
}

/* 어디서 왔나. utm 이 있으면 그것이 우선 — 카톡·문자로 보낸 링크는 참조 정보가 안 오기 때문에 utm 으로 구분한다. */
function 분류_(ref, utmSource, utmMedium) {
  var host = 호스트_(ref);
  if (utmSource) {
    var u = String(utmSource).toLowerCase(), m = String(utmMedium || '').toLowerCase();
    if (/sms|문자|mms|lms/.test(u + m)) return ['문자 링크', 'utm:' + utmSource];
    if (/kakao|카톡|카카오|talk/.test(u + m)) return ['카톡 링크', 'utm:' + utmSource];
    if (/card|명함/.test(u + m)) return ['명함 링크', 'utm:' + utmSource];
    if (/qr/.test(u + m)) return ['QR', 'utm:' + utmSource];
    return ['캠페인 · ' + utmSource, 'utm:' + utmSource];
  }
  if (!host) return ['직접 · 카톡 · 문자', ''];
  for (var i = 0; i < 우리도메인.length; i++) {
    var d = 우리도메인[i];
    if (host === d || host.slice(-d.length - 1) === '.' + d) return ['우리 사이트 이동', host];
  }
  if (/(^|\.)search\.naver\.com$/.test(host) || /(^|\.)m\.search\.naver\.com$/.test(host)) return ['네이버 검색', host];
  if (/naver\.com$|naver\.me$/.test(host)) return ['네이버 (블로그·카페·지도)', host];
  if (/^gemini\.google\.com$/.test(host) || /^bard\.google\.com$/.test(host)) return ['AI 검색', host];
  if (/(^|\.)google\.[a-z.]+$/.test(host) || /^googleusercontent\.com$/.test(host)) return ['구글 검색', host];
  if (/daum\.net$/.test(host)) return ['다음 검색', host];
  if (/bing\.com$|yahoo\.|duckduckgo\.com$|yandex\.|zum\.com$|nate\.com$/.test(host)) return ['기타 검색', host];
  if (/chatgpt\.com$|openai\.com$|perplexity\.ai$|claude\.ai$|anthropic\.com$|copilot\.microsoft\.com$|you\.com$|wrtn\.ai$|clova\.ai$|liner\.com$|felo\.ai$/.test(host)) return ['AI 검색', host];
  if (/instagram\.com$|facebook\.com$|fb\.com$|threads\.net$/.test(host)) return ['인스타 · 페북', host];
  if (/youtube\.com$|youtu\.be$/.test(host)) return ['유튜브', host];
  if (/kakao\.com$|kakaocdn\.net$|band\.us$|t\.co$|twitter\.com$|x\.com$|tistory\.com$|brunch\.co\.kr$|blog\.me$/.test(host)) return ['SNS · 커뮤니티', host];
  return ['다른 사이트', host];
}

function 호스트_(ref) {
  var m = /^[a-z]+:\/\/([^\/?#:]+)/i.exec(String(ref || ''));
  if (!m) return '';
  var h = m[1].toLowerCase();
  if (h.indexOf('www.') === 0) h = h.slice(4);
  return h;
}

/* 참조 주소에 검색어가 실려 오면(요즘은 드물다) 뽑아 둔다 */
function 검색어_(ref) {
  var m = /[?&](query|q|p|wd)=([^&#]+)/i.exec(String(ref || ''));
  if (!m) return '';
  try { return 다듬기_(decodeURIComponent(m[2].replace(/\+/g, ' ')), 60); } catch (err) { return ''; }
}


/* ══ 2. 조회 ═════════════════════════════════════════ */
function 조회_(p) {
  var 열쇠 = PropertiesService.getScriptProperties().getProperty('STATS_KEY') || '';
  if (!열쇠) return json_({ ok: false, error: '서버에 STATS_KEY 가 없습니다. 스크립트 속성에 열쇠를 넣어 주세요' });
  if (String(p.key || '') !== 열쇠) return json_({ ok: false, error: '열쇠가 다릅니다' });

  var days = Math.max(1, Math.min(365, Number(p.days) || 30));
  if (p.view === 'recent') return json_(최근_(Math.min(200, Number(p.n) || 40)));
  if (p.view !== 'summary') return json_({ ok: false, error: '모르는 view' });

  var 캐시 = CacheService.getScriptCache(), ck = 'sum:' + days;
  if (!p.fresh) { var 있 = 캐시.get(ck); if (있) return 텍스트json_(있); }
  var 결과 = JSON.stringify(집계_(days));
  try { 캐시.put(ck, 결과, 캐시초); } catch (err) { /* 100KB 넘으면 캐시만 건너뜀 */ }
  return 텍스트json_(결과);
}

function 집계_(days) {
  var 지금 = new Date(), 시작 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate() - (days - 1));   // 오늘 포함 days 일
  var 값 = 전체값_();
  var 통 = { all: 새통_() };
  Object.keys(사이트이름).forEach(function (k) { 통[k] = 새통_(); });

  for (var i = 0; i < 값.length; i++) {
    var r = 값[i], t = r[0] instanceof Date ? r[0] : new Date(r[0]);
    if (!(t >= 시작)) continue;
    var 사이트 = String(r[1] || '?');
    if (!통[사이트]) 통[사이트] = 새통_();
    담기_(통[사이트], r, t);
    담기_(통.all, r, t);
  }
  var out = { ok: true, days: days, from: 날짜_(시작), to: 날짜_(지금), generated: 지금.toISOString(), rows: 값.length, sites: {} };
  Object.keys(통).forEach(function (k) { out.sites[k] = 마무리_(통[k], 시작, days); });
  return out;
}

function 새통_() {
  return { pv: 0, 새: 0, 방문자: {}, 검색방문자: {}, byDay: {}, bySource: {}, bySourceUV: {}, byHost: {}, byPage: {}, byDevice: {}, byCampaign: {}, byKeyword: {}, byHour: new Array(24).fill(0) };
}

function 담기_(통, r, t) {
  var 유입 = String(r[4] || '?'), 출처 = String(r[5] || ''), 경로 = String(r[2] || '/'), 기기 = String(r[10] || 'pc'), 방문자 = String(r[11] || '-');
  var 캠 = r[7] ? [r[7], r[8], r[9]].filter(String).join(' / ') : '', 키 = String(r[6] || ''), 날 = 날짜_(t);
  통.pv++;
  if (Number(r[12]) === 1) 통.새++;
  통.방문자[방문자] = 1;
  if (!통.byDay[날]) 통.byDay[날] = { pv: 0, v: {} };
  통.byDay[날].pv++; 통.byDay[날].v[방문자] = 1;
  통.bySource[유입] = (통.bySource[유입] || 0) + 1;
  if (!통.bySourceUV[유입]) 통.bySourceUV[유입] = {};
  통.bySourceUV[유입][방문자] = 1;
  if (검색인가_(유입)) 통.검색방문자[방문자] = 1;
  if (출처 && 출처.indexOf('utm:') !== 0) 통.byHost[출처] = (통.byHost[출처] || 0) + 1;
  통.byPage[경로] = (통.byPage[경로] || 0) + 1;
  통.byDevice[기기] = (통.byDevice[기기] || 0) + 1;
  if (캠) 통.byCampaign[캠] = (통.byCampaign[캠] || 0) + 1;
  if (키) 통.byKeyword[키] = (통.byKeyword[키] || 0) + 1;
  통.byHour[t.getHours()]++;
}

function 검색인가_(유입) { return /검색$/.test(유입); }   // 네이버 검색 · 구글 검색 · 다음 검색 · 기타 검색 · AI 검색

function 마무리_(통, 시작, days) {
  var 검색 = 0, 검색uv = Object.keys(통.검색방문자).length;
  Object.keys(통.bySource).forEach(function (k) { if (검색인가_(k)) 검색 += 통.bySource[k]; });
  var byDay = [];
  for (var i = 0; i < days; i++) {
    var d = new Date(시작.getFullYear(), 시작.getMonth(), 시작.getDate() + i), k = 날짜_(d), v = 통.byDay[k];
    byDay.push([k, v ? v.pv : 0, v ? Object.keys(v.v).length : 0]);
  }
  var bySource = 정렬_(통.bySource, 목록최대).map(function (x) { x.push(Object.keys(통.bySourceUV[x[0]] || {}).length); return x; });
  return {
    pv: 통.pv, uv: Object.keys(통.방문자).length, new_: 통.새, search: 검색, searchUV: 검색uv,
    byDay: byDay, bySource: bySource, byHost: 정렬_(통.byHost, 목록최대), byPage: 정렬_(통.byPage, 목록최대),
    byDevice: 정렬_(통.byDevice, 5), byCampaign: 정렬_(통.byCampaign, 목록최대), byKeyword: 정렬_(통.byKeyword, 목록최대), byHour: 통.byHour
  };
}

function 정렬_(obj, n) {
  return Object.keys(obj).map(function (k) { return [k, obj[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
}

function 최근_(n) {
  var sh = 장_(), 끝 = sh.getLastRow();
  if (끝 < 2) return { ok: true, rows: [] };
  var 부터 = Math.max(2, 끝 - n + 1);
  var 값 = sh.getRange(부터, 1, 끝 - 부터 + 1, 머리.length).getValues().reverse();
  return { ok: true, rows: 값.map(function (r) { return [r[0] instanceof Date ? r[0].toISOString() : String(r[0]), r[1], r[2], r[4], r[5], r[10], r[12], r[9] || r[7] || '']; }) };
}

function 전체값_() {
  var sh = 장_(), 끝 = sh.getLastRow();
  if (끝 < 2) return [];
  return sh.getRange(2, 1, 끝 - 1, 13).getValues();
}


/* ══ 시트 · 폴더 ═════════════════════════════════════ */
function 장_() {
  var ss = 파일_();
  var sh = ss.getSheetByName(장이름);
  if (sh) return sh;
  sh = ss.insertSheet(장이름);
  sh.appendRow(머리);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 머리.length).setFontWeight('bold').setBackground('#E8E1CF');
  var 기본 = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (기본 && ss.getSheets().length > 1) { try { ss.deleteSheet(기본); } catch (err) {} }
  return sh;
}

function 파일_() {
  var 폴더 = 폴더_();
  var it = 폴더.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (it.hasNext()) { var f = it.next(); if (f.getName() === 파일이름) return SpreadsheetApp.open(f); }
  var ss = SpreadsheetApp.create(파일이름);
  DriveApp.getFileById(ss.getId()).moveTo(폴더);
  return ss;
}

function 폴더_() {
  var 뿌리 = DriveApp.getRootFolder(), it = 뿌리.getFoldersByName(폴더이름);
  return it.hasNext() ? it.next() : 뿌리.createFolder(폴더이름);
}


/* ══ 잔손질 ══════════════════════════════════════════ */
function 다듬기_(v, 길이) { if (v === null || v === undefined) return ''; return String(v).replace(/[\r\n\t]/g, ' ').trim().slice(0, 길이); }
function 날짜_(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function 텍스트json_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function 텍스트_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }


/* ══════════════════════════════════════════════════════════════
   설치 확인. 편집기에서 「점검」을 고르고 ▶ 실행 — 처음엔 권한 창이 뜹니다.
══════════════════════════════════════════════════════════════ */
function 점검() {
  var sh = 장_();
  Logger.log('기록 시트 : ' + sh.getParent().getUrl());
  Logger.log('쌓인 줄   : ' + Math.max(0, sh.getLastRow() - 1));
  var 열쇠 = PropertiesService.getScriptProperties().getProperty('STATS_KEY');
  Logger.log('STATS_KEY : ' + (열쇠 ? '있음 (' + 열쇠.length + '자)' : '── 없음 — 프로젝트 설정 → 스크립트 속성에 STATS_KEY 를 넣어 주세요 ──'));
  Logger.log('분류 시험 : ' + JSON.stringify([분류_('https://m.search.naver.com/search.naver?query=x', '', ''), 분류_('https://www.google.com/', '', ''), 분류_('', 'sms', ''), 분류_('https://chatgpt.com/', '', '')]));
}

/* 시험 기록 몇 줄 — 현황판이 그려지는지 볼 때. 다 보고 「시험기록지우기」. */
function 시험기록() {
  var 보기 = [
    { s: 'ai-make', p: '/', t: '큰길브리지', r: 'https://m.search.naver.com/search.naver?query=%EC%88%9C%EC%B2%9C+%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80', d: 'mobile', v: 'test-a', n: 1, l: 'ko-KR', w: 390 },
    { s: 'keungil', p: '/', t: '큰길이벤트기획', r: 'https://www.google.com/', d: 'pc', v: 'test-b', n: 1, l: 'ko-KR', w: 1440 },
    { s: 'event-korea', p: '/', t: '이벤트 코리아', r: '', us: 'sms', uc: 'test', d: 'mobile', v: 'test-c', n: 1, l: 'ko-KR', w: 412 },
    { s: 'keungil', p: '/quote.html', t: '견적', r: 'https://xn--wk0bn7yi8h24iszc.com/', d: 'pc', v: 'test-b', n: 0, l: 'ko-KR', w: 1440 }
  ];
  보기.forEach(function (p) { p.t = '[시험] ' + p.t; 기록_(p); });
  CacheService.getScriptCache().removeAll(['sum:1', 'sum:7', 'sum:30', 'sum:90']);
  Logger.log('시험 기록 4줄 넣음');
}
function 시험기록지우기() {
  var sh = 장_(), 끝 = sh.getLastRow(), n = 0;
  if (끝 < 2) return;
  var 값 = sh.getRange(2, 1, 끝 - 1, 머리.length).getValues();
  for (var i = 값.length - 1; i >= 0; i--) if (String(값[i][3]).indexOf('[시험]') === 0 || /^test-/.test(String(값[i][11]))) { sh.deleteRow(i + 2); n++; }
  CacheService.getScriptCache().removeAll(['sum:1', 'sum:7', 'sum:30', 'sum:90']);
  Logger.log('시험 기록 ' + n + '줄 지움');
}
