/**
 * 큰길브리지 — 데모 열람 알림 서버 (Google Apps Script)
 *
 * 하는 일은 하나다. 우리가 만들어 보낸 데모 사이트를
 * 누가, 언제, 얼마나 봤는지 알려준다.
 *
 *   GET ?d=데모ID&n=상호&s=세션&e=이벤트&t=초   → 기록 + (필요하면) 메일
 *   GET (아무 값 없이)                          → 살아있는지 확인
 *
 * 왜 GET 하나뿐인가.
 *   데모 페이지에서 부르는 건데, POST 를 쓰면 브라우저가 먼저
 *   허락을 묻는 요청(preflight)을 보내고 앱스 스크립트는 그걸 못 받는다.
 *   GET 은 그 과정이 없어서 어디서든 그냥 꽂힌다.
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 *
 * ※ 이 서버가 죽어도 데모 사이트는 멀쩡하게 보인다.
 *   알림만 안 올 뿐이다. 고객 쪽에는 아무 영향이 없다.
 */

/** ── 설정 ─────────────────────────────────────────── */
var 알림받을주소  = 'gilauto325@gmail.com';   // 열람 알림이 갈 곳
var 뿌리폴더이름  = '큰길브리지 데모';         // 내 드라이브에 자동으로 생긴다
var 기록장이름    = '데모 열람 기록';          // 그 폴더 안에 자동 생성
var 회사이름      = '큰길브리지';

var 뜸한간격_분   = 30;   // 이 시간 안에 또 열면 메일을 다시 보내지 않는다
var 하루메일한도  = 30;   // 안전장치. 하루에 이보다 많은 메일은 보내지 않는다
/** ─────────────────────────────────────────────────── */


/* ══ 진입점 ══════════════════════════════════════════ */
function doGet(e) {
  var p = (e && e.parameter) || {};

  // 값이 없으면 살아있는지 묻는 것으로 본다
  if (!p.d) {
    return json_({ ok: true, service: 'keungil-bridge-demo', version: 1,
                   time: new Date().toISOString() });
  }

  var 자물쇠 = LockService.getScriptLock();
  try {
    자물쇠.waitLock(20000);
    return json_(기록하기_(p));
  } catch (err) {
    // 실패해도 데모 페이지는 아무 일 없어야 한다. 조용히 넘긴다.
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { 자물쇠.releaseLock(); } catch (_) {}
  }
}

// 혹시 POST 로 오는 경우도 같은 길로 보낸다 (sendBeacon 대비)
function doPost(e) {
  return doGet(e);
}


/* ══ 본체 ════════════════════════════════════════════
   이벤트 네 가지
     open  페이지를 열었다
     beat  아직 보고 있다 (t = 열고 나서 몇 초 지났는지)
     deep  아래까지 내려봤다
     bye   창을 닫거나 다른 데로 갔다 (t = 최종 초)
══════════════════════════════════════════════════════ */
function 기록하기_(p) {
  var 데모ID = 다듬기_(p.d, 60);
  var 상호   = 다듬기_(p.n, 80) || 데모ID;
  var 세션   = 다듬기_(p.s, 40) || '?';
  var 이벤트 = 다듬기_(p.e, 10) || 'open';
  var 초     = Math.max(0, Math.min(60 * 60 * 6, Number(p.t) || 0));
  var 전화   = 다듬기_(p.tel, 30);
  var 기기   = p.m === '1' ? '휴대폰' : '컴퓨터';
  var 유입   = 다듬기_(p.r, 120);

  // 우리 식구가 본 건 기록도 알림도 하지 않는다.
  // 데모 주소 뒤에 ?me=1 을 한 번 붙여 열면 그 기기는 계속 조용하다.
  if (p.me === '1') return { ok: true, skipped: '내부 열람' };

  var 캐시 = CacheService.getScriptCache();

  // 이 세션이 지금까지 보고한 초. 늘어난 만큼만 총합에 더한다.
  var 이전초  = Number(캐시.get('t_' + 세션) || 0);
  var 늘어난  = Math.max(0, 초 - 이전초);
  if (초 > 0) 캐시.put('t_' + 세션, String(초), 21600);

  // ── 업체별 요약을 먼저 읽는다 (메일에 「몇 번째 방문」을 쓰려고)
  var 요약 = 업체읽기_(데모ID);
  var 새세션 = 이벤트 === 'open';

  var 방문수    = 요약.방문수 + (새세션 ? 1 : 0);
  var 총초      = 요약.총초 + 늘어난;
  var 최장초    = Math.max(요약.최장초, 초);
  var 끝까지    = 요약.끝까지 + (이벤트 === 'deep' ? 1 : 0);
  var 지난방문  = 요약.마지막;

  업체쓰기_({
    데모ID: 데모ID, 상호: 상호, 전화: 전화 || 요약.전화,
    첫방문: 요약.첫방문 || new Date(),
    마지막: new Date(),
    방문수: 방문수, 총초: 총초, 최장초: 최장초, 끝까지: 끝까지,
    줄: 요약.줄
  });

  기록남기기_([new Date(), 상호, 데모ID, 세션, 이벤트라벨_(이벤트),
               초, 이벤트 === 'deep' ? '예' : '', 기기, 유입]);

  // ── 메일은 「열었을 때」만, 그리고 뜸했을 때만 보낸다
  var 보냈나 = false;
  if (새세션 && 메일보낼때인가_(데모ID, 캐시)) {
    보냈나 = 알림메일_({
      상호: 상호, 데모ID: 데모ID, 전화: 전화 || 요약.전화,
      방문수: 방문수, 지난방문: 지난방문, 총초: 총초,
      최장초: 최장초, 끝까지: 끝까지, 기기: 기기, 유입: 유입
    });
  }

  return { ok: true, mailed: 보냈나 };
}


/* ══ 메일 ════════════════════════════════════════════ */
function 메일보낼때인가_(데모ID, 캐시) {
  // 방금 보냈으면 참는다
  if (캐시.get('m_' + 데모ID)) return false;

  // 하루 한도를 넘으면 참는다 (봇이 긁어도 메일함이 안 터지게)
  var 속성 = PropertiesService.getScriptProperties();
  var 오늘 = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
  var 키   = '보낸수_' + 오늘;
  var 센것 = Number(속성.getProperty(키) || 0);
  if (센것 >= 하루메일한도) return false;

  속성.setProperty(키, String(센것 + 1));
  캐시.put('m_' + 데모ID, '1', 뜸한간격_분 * 60);
  return true;
}

function 알림메일_(정보) {
  var 줄 = [];
  줄.push(정보.상호 + 이가_(정보.상호) + ' 방금 데모를 열었습니다.');
  줄.push('');

  if (정보.전화) {
    줄.push('  전화     ' + 정보.전화 + '      ← 지금 걸면 받습니다');
  } else {
    줄.push('  전화     (명단에 번호가 없습니다)');
  }
  줄.push('  데모     https://www.ai-make.co.kr/demo/' + 정보.데모ID + '/');
  줄.push('  기기     ' + 정보.기기);
  if (정보.유입) 줄.push('  들어온 곳 ' + 정보.유입);
  줄.push('');

  줄.push('  이번이   ' + 정보.방문수 + '번째 방문');
  if (정보.지난방문) {
    줄.push('  지난 방문 ' + kst_(정보.지난방문));
  }
  if (정보.총초 > 0) {
    줄.push('  누적     ' + 시간말_(정보.총초) + '  (최장 한 번에 ' + 시간말_(정보.최장초) + ')');
  }
  if (정보.끝까지 > 0) {
    줄.push('  아래까지 내려본 적 ' + 정보.끝까지 + '번  ← 관심이 있다는 뜻입니다');
  }
  줄.push('');

  // 여러 번 왔으면 그 말을 해준다. 전화 순서를 정하는 기준이 된다.
  if (정보.방문수 >= 2) {
    줄.push('두 번 이상 열어본 곳입니다. 오늘 걸 곳 중에 제일 앞입니다.');
  } else {
    줄.push('지금이 전화하기 제일 좋은 때입니다. 화면을 보고 있는 중입니다.');
  }
  줄.push('');
  줄.push('— ' + 회사이름 + ' 데모 알림. 열람 기록은 내 드라이브 「' + 뿌리폴더이름 + '」 폴더에 쌓입니다.');

  try {
    MailApp.sendEmail({
      to: 알림받을주소,
      subject: '[데모] ' + 정보.상호 + ' — 지금 보고 있습니다',
      body: 줄.join('\n'),
      name: 회사이름
    });
    return true;
  } catch (err) {
    // 메일이 막혀도 기록은 남아야 한다
    기록남기기_([new Date(), 정보.상호, 정보.데모ID, '', '메일 실패',
                 0, '', '', String((err && err.message) || err)]);
    return false;
  }
}


/* ══ 기록장 · 첫째 장: 일어난 일 전부 ════════════════ */
function 기록남기기_(줄) {
  기록시트_().appendRow(줄);
}

function 기록시트_() {
  return 장_('열람',
    ['시각','상호','데모ID','세션','무슨 일','머문 초','끝까지','기기','들어온 곳'],
    '#E1EAE2',
    function (sh) { sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 220); });
}


/* ══ 기록장 · 둘째 장: 업체별 요약 (이게 영업 명단이다) ══ */
function 업체시트_() {
  return 장_('업체별',
    ['상호','데모ID','전화','방문','총 머문 시간','최장 한 번',
     '끝까지 본 횟수','첫 방문','마지막 방문','초(정렬용)'],
    '#FBF0D5',
    function (sh) {
      sh.setColumnWidth(1, 240); sh.setColumnWidth(8, 150); sh.setColumnWidth(9, 150);
      sh.hideColumns(10);   // 정렬에만 쓰는 칸
    });
}

function 업체읽기_(데모ID) {
  var sh = 업체시트_();
  var 끝 = sh.getLastRow();
  if (끝 >= 2) {
    var 값 = sh.getRange(2, 1, 끝 - 1, 10).getValues();
    for (var i = 0; i < 값.length; i++) {
      if (String(값[i][1]) === 데모ID) {
        return {
          줄: i + 2,
          전화: String(값[i][2] || ''),
          방문수: Number(값[i][3]) || 0,
          총초: Number(값[i][9]) || 0,
          최장초: 초읽기_(값[i][5]),
          끝까지: Number(값[i][6]) || 0,
          첫방문: 값[i][7] || null,
          마지막: 값[i][8] || null
        };
      }
    }
  }
  return { 줄: 0, 전화: '', 방문수: 0, 총초: 0, 최장초: 0,
           끝까지: 0, 첫방문: null, 마지막: null };
}

function 업체쓰기_(o) {
  var sh = 업체시트_();
  var 줄값 = [o.상호, o.데모ID, o.전화, o.방문수, 시간말_(o.총초), 시간말_(o.최장초),
              o.끝까지, o.첫방문, o.마지막, o.총초];
  if (o.줄 > 0) sh.getRange(o.줄, 1, 1, 10).setValues([줄값]);
  else          sh.appendRow(줄값);
}


/* ══ 기록장 파일 · 드라이브 폴더 ═════════════════════ */
function 기록장_() {
  var 폴더 = 뿌리폴더_();
  var it = 폴더.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName() === 기록장이름) return SpreadsheetApp.open(f);
  }
  var ss = SpreadsheetApp.create(기록장이름);
  DriveApp.getFileById(ss.getId()).moveTo(폴더);
  return ss;
}

/* 장을 가져온다. 없으면 머리글까지 얹어서 만든다.
   이미 있으면 그대로 돌려준다 — 쌓인 기록을 절대 건드리지 않는다. */
function 장_(이름, 머리, 색, 꾸미기) {
  var ss = 기록장_();
  var sh = ss.getSheetByName(이름);
  if (sh) return sh;

  sh = ss.insertSheet(이름);
  sh.appendRow(머리);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 머리.length).setFontWeight('bold').setBackground(색);
  if (꾸미기) { try { 꾸미기(sh); } catch (_) {} }
  기본장치우기_(ss);
  return sh;
}

/* 문서를 새로 만들면 빈 기본 장(Sheet1 · 시트1)이 하나 딸려온다.
   쓸 장이 생긴 뒤에 비어 있는 그것만 치운다. */
function 기본장치우기_(ss) {
  var 장들 = ss.getSheets();
  if (장들.length < 2) return;
  for (var i = 0; i < 장들.length; i++) {
    var 이름 = 장들[i].getName();
    if ((이름 === 'Sheet1' || 이름 === '시트1') && 장들[i].getLastRow() === 0) {
      try { ss.deleteSheet(장들[i]); } catch (_) {}
      return;
    }
  }
}

function 뿌리폴더_() {
  var 부모 = DriveApp.getRootFolder();
  var it = 부모.getFoldersByName(뿌리폴더이름);
  return it.hasNext() ? it.next() : 부모.createFolder(뿌리폴더이름);
}


/* ══ 잔손질 ══════════════════════════════════════════ */
function 다듬기_(v, 길이) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\r\n\t]/g, ' ').trim().slice(0, 길이);
}

/* 「센터가」 / 「의원이」 — 끝 글자에 받침이 있는지 보고 조사를 고른다.
   메일에 상호가 그대로 들어가니 이게 틀리면 남이 쓴 것처럼 보인다. */
function 이가_(말) {
  var s = String(말 || '').trim();
  if (!s) return '가';
  var 끝 = s.charCodeAt(s.length - 1);
  if (끝 < 0xAC00 || 끝 > 0xD7A3) return '가';   // 한글이 아니면 무리하지 않는다
  return ((끝 - 0xAC00) % 28) === 0 ? '가' : '이';
}

function 이벤트라벨_(e) {
  if (e === 'open') return '열었다';
  if (e === 'beat') return '보고 있다';
  if (e === 'deep') return '아래까지 봤다';
  if (e === 'bye')  return '나갔다';
  return e;
}

function 시간말_(초) {
  초 = Math.round(Number(초) || 0);
  if (초 < 60) return 초 + '초';
  var 분 = Math.floor(초 / 60), ㅅ = 초 % 60;
  if (분 < 60) return 분 + '분' + (ㅅ ? ' ' + ㅅ + '초' : '');
  var 시 = Math.floor(분 / 60);
  return 시 + '시간 ' + (분 % 60) + '분';
}

// 「2분 40초」 같은 글자를 다시 초로 되돌린다 (요약 칸을 읽을 때 쓴다)
function 초읽기_(말) {
  if (typeof 말 === 'number') return 말;
  var s = String(말 || '');
  var 시 = /(\d+)시간/.exec(s), 분 = /(\d+)분/.exec(s), ㅅ = /(\d+)초/.exec(s);
  return (시 ? Number(시[1]) * 3600 : 0) + (분 ? Number(분[1]) * 60 : 0) + (ㅅ ? Number(ㅅ[1]) : 0);
}

function kst_(d) {
  try { return Utilities.formatDate(new Date(d), 'Asia/Seoul', 'M월 d일 HH:mm'); }
  catch (_) { return String(d); }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
                       .setMimeType(ContentService.MimeType.JSON);
}


/* ══════════════════════════════════════════════════════════════
   설치가 잘 됐는지 눈으로 보는 함수.
   편집기 위쪽 함수 목록에서 「점검」을 고르고 「실행」 하세요.
   처음 실행하면 권한 요청 창이 뜹니다. 승인하시면 됩니다.
══════════════════════════════════════════════════════════════ */
function 점검() {
  var ss = 기록장_();
  기록시트_(); 업체시트_();
  Logger.log('기록장 주소 : ' + ss.getUrl());
  Logger.log('알림받을주소 : ' + 알림받을주소);
  Logger.log('폴더        : 내 드라이브 > ' + 뿌리폴더이름);
  Logger.log('');
  Logger.log('여기까지 나왔으면 설치는 끝났습니다.');
  Logger.log('이제 「시험알림」을 실행해서 메일이 오는지 보세요.');
}

/* 시험용 알림 한 통. 메일이 실제로 오는지 확인할 때 씁니다. */
function 시험알림() {
  var 결과 = 기록하기_({
    d: '시험', n: '[시험] 한아름노인주간보호센터', tel: '061-000-0000',
    s: 'test' + Date.now(), e: 'open', t: '0', m: '1', r: '문자'
  });
  Logger.log(JSON.stringify(결과));
  Logger.log(결과.mailed ? '메일을 보냈습니다. 받은편지함을 보세요.'
                         : '메일을 보내지 않았습니다 (30분 안에 이미 보냈거나 한도 초과).');
}

/* 시험 기록을 지웁니다. 실제 영업 시작 전에 한 번 실행하세요. */
function 시험기록지우기() {
  var 지운수 = 0;
  [기록시트_(), 업체시트_()].forEach(function (sh) {
    var 끝 = sh.getLastRow();
    if (끝 < 2) return;
    var 값 = sh.getRange(2, 1, 끝 - 1, 2).getValues();
    for (var i = 값.length - 1; i >= 0; i--) {
      var 한줄 = String(값[i][0]) + String(값[i][1]);
      if (한줄.indexOf('시험') >= 0) { sh.deleteRow(i + 2); 지운수++; }
    }
  });
  Logger.log('시험 기록 ' + 지운수 + '줄을 지웠습니다.');
}
