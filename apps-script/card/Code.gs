/**
 * 큰길브리지 — 전자명함 서버 (Google Apps Script)
 *
 * card/index.html 에서 「명함 발행하기」를 누르면 여기로 옵니다.
 * 신청 · 접수 문자 · 비밀번호 없이 누구나 바로 발행합니다. 그래서 지키는 것이 셋 있습니다.
 *
 *   1. 남이 보낸 HTML 은 받지 않는다.
 *      명함에 적을 자료(이름 · 전화 …)만 받아서, 사이트에 있는 명함 틀
 *      (https://www.ai-make.co.kr/card/template.js — 만들기 화면의 미리보기와 같은 파일)로 서버가 직접 그린다.
 *      아무 HTML 이나 받으면 우리 도메인에 남의 페이지(피싱 · 악성 스크립트)가 올라간다.
 *   2. 명함은 만든 기기만 고친다.
 *      발행할 때 기기가 만든 열쇠의 지문(SHA-256)을 명함 안에 박아 두고, 같은 주소에 다시 올릴 땐 열쇠가 맞아야 한다.
 *      열쇠가 없는 옛 명함 · 다른 기기에서 고칠 때는 관리자 비밀번호(UPLOAD_PW)로만.
 *   3. 하루 발행 수를 막아 둔다 (전체 · 전화번호별).
 *
 * 받은 것은 깃허브 main 브랜치에 파일로 씁니다. 깃허브 페이지가 1~2분 안에 올려 줍니다.
 *   card/{주소}/index.html   완성된 명함 (og 태그가 박혀 있어 카톡 미리보기가 뜬다)
 *   card/img/{주소}.jpg      인물 사진 (작은 동그라미)
 *   card/bg/{주소}.jpg       배경 사진 (크게 깔린다)
 *   card/og/{주소}.jpg       카톡·문자 미리보기용 1200×630
 *
 * ── 설치 ────────────────────────────────────────────────
 * 1. script.google.com → 「큰길 명함 발행」 프로젝트 → Code.gs 에 이 파일 내용을 통째로 붙여넣기
 * 2. 프로젝트 설정 → 스크립트 속성
 *      GITHUB_TOKEN    (필수) 깃허브 토큰 — brizymedia/ai-make 에 Contents 쓰기 권한
 *      GITHUB_REPO     (필수) brizymedia/ai-make
 *      UPLOAD_PW       (선택) 관리자 비밀번호 — 남의 명함 고치기 · 지우기에 쓴다. 없으면 그 기능은 꺼진다
 *      OPEN_PUBLISH    (선택) off 로 두면 관리자 비밀번호가 있어야만 발행된다 (도배를 당했을 때 잠그는 스위치)
 *      OPEN_DAILY_MAX  (선택) 하루에 받아 줄 발행 수. 비우면 80
 * 3. 함수 「점검」 실행 → 권한 허용 → 로그에 「쓰기 권한 정상」 · 「명함 틀 정상」
 * 4. 배포 → 배포 관리 → 연필 → 새 버전 → 배포   (주소는 그대로)
 * 5. 주소를 브라우저로 열어 {"ok":true,"service":"keungil-card","render":"server"…} 가 보이면 끝
 *
 * 토큰 · 비밀번호는 절대 이 파일에 적지 마세요. 스크립트 속성에만 둡니다.
 */

const 브랜치 = 'main';          // 깃허브 페이지가 보고 있는 브랜치
const 주소틀 = /^[a-z0-9][a-z0-9-]{1,38}$/;   // 명함 주소로 쓸 수 있는 글자
const 버전  = '2026-09-21a';    // 배포 확인용 — 코드를 고칠 때마다 올린다
const 집    = 'https://www.ai-make.co.kr';
const 틀주소 = 집 + '/card/template.js';
const 그림한도 = 900 * 1024;    // 사진 한 장 (만들기 화면이 줄여서 보내므로 보통 100~250KB)

/* ══════════════════════════════════════════════════════════════
   진입점
══════════════════════════════════════════════════════════════ */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.check) return 응답(쓸수있나(p.check));
  return 응답({ ok: true, service: 'keungil-card', version: 버전, render: 'server', open: 열린발행() });
}

function doPost(e) {
  try {
    const 요청 = JSON.parse(e.postData.contents);

    if (요청.action === 'card2')  return 응답(잠그고(function () { return 명함발행(요청); }));
    if (요청.action === 'delete') return 응답(잠그고(function () { return 명함삭제(요청); }));
    /* 옛 화면(2026-09-21 이전)은 완성된 HTML 을 보냈다. 이제 받지 않는다 */
    if (요청.action === 'card')   return 응답({ ok: false, error: '명함 만들기 화면이 새로 바뀌었습니다. 화면을 새로고침한 뒤 다시 발행해 주세요' });

    return 응답({ ok: false, error: '알 수 없는 요청입니다: ' + 요청.action });

  } catch (err) {
    // 실패를 조용히 삼키지 않는다 — 화면에 그대로 보여준다
    return 응답({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ══════════════════════════════════════════════════════════════
   명함 발행
══════════════════════════════════════════════════════════════ */
function 명함발행(요청) {
  const 주소 = String(요청.slug || '').toLowerCase();
  if (!주소틀.test(주소)) {
    return { ok: false, error: '명함 주소는 영문 소문자·숫자·하이픈으로 2~39자여야 합니다' };
  }
  if (막힌주소(주소)) {
    return { ok: false, error: '「' + 주소 + '」 는 쓸 수 없는 주소입니다. 다른 것으로 해주세요' };
  }

  const d = 명함자료(요청.d);
  if (!d.n) return { ok: false, error: '이름을 적어 주세요' };
  if (d.p.replace(/[^0-9]/g, '').length < 8) return { ok: false, error: '전화번호를 적어 주세요' };

  const 관리 = 관리자(요청.pw);
  if (!관리 && !열린발행()) return { ok: false, error: '지금은 관리자만 발행할 수 있습니다. 문의 1533-7295' };

  /* 기기 열쇠 — 만들기 화면이 한 번 만들어 그 브라우저에 넣어 둔 긴 난수. 명함에는 지문(SHA-256)만 남는다 */
  const 열쇠 = String(요청.owner || '');
  if (!관리 && !/^[0-9a-f]{32,128}$/.test(열쇠)) return { ok: false, error: '화면을 새로고침한 뒤 다시 발행해 주세요 (기기 열쇠가 없습니다)' };
  let 지문 = 열쇠 ? sha256_(열쇠) : '';

  /* 이미 있는 주소면 — 만든 기기(열쇠가 같음)나 관리자만 덮어쓴다 */
  const 기존 = 깃허브('card/' + 주소 + '/index.html', 'get');
  if (기존.getResponseCode() === 200) {
    const 옛지문 = 지문읽기_(기존);
    if (!관리) {
      if (!옛지문) return { ok: false, error: '「' + 주소 + '」 는 이미 쓰고 있는 주소입니다. 다른 주소로 정해 주세요' };
      if (옛지문 !== 지문) return { ok: false, error: '「' + 주소 + '」 는 이미 쓰고 있는 주소입니다. 내 명함이라면 처음 만든 기기(브라우저)에서 고쳐 주세요. 다른 기기라면 새 주소로 만들거나 1533-7295 로 연락 주세요' };
    } else if (옛지문) {
      지문 = 옛지문;          // 관리자가 고쳐 줘도 원래 주인의 열쇠는 그대로 둔다
    }
  }

  if (!관리) { const 막힘 = 한도확인_(d.p); if (막힘) return { ok: false, error: 막힘 }; }

  const 그림 = {};
  const 칸들 = [['photo', '인물 사진'], ['bg', '배경 사진'], ['og', '미리보기 그림']];
  for (let i = 0; i < 칸들.length; i++) {
    const v = 요청[칸들[i][0]];
    if (!v) continue;
    const 탈 = 그림확인_(v, 칸들[i][1]);
    if (탈) return { ok: false, error: 탈 };
    그림[칸들[i][0]] = String(v);
  }

  /* 사이트의 명함 틀로 그린다 (미리보기와 같은 함수) */
  const 주소들 = {
    photo: 그림.photo ? 집 + '/card/img/' + 주소 + '.jpg' : '',
    bg:    그림.bg    ? 집 + '/card/bg/'  + 주소 + '.jpg' : '',
    og:    그림.og    ? 집 + '/card/og/'  + 주소 + '.jpg' : '',
    url:   집 + '/card/' + 주소 + '/',
    owner: 지문,
  };
  const html = 틀읽기_().명함HTML(d, 주소들);
  if (!html || html.length < 500 || html.length > 400000) return { ok: false, error: '명함을 그리지 못했습니다. 잠시 뒤 다시 눌러 주세요' };

  // 사진부터 올린다. 사진이 없는 채로 명함이 먼저 뜨면 깨져 보인다.
  if (그림.photo) { const r = 깃허브에올리기('card/img/' + 주소 + '.jpg', 그림.photo, '명함 인물: ' + 주소); if (!r.ok) return r; }
  if (그림.bg)    { const r = 깃허브에올리기('card/bg/'  + 주소 + '.jpg', 그림.bg,    '명함 배경: ' + 주소); if (!r.ok) return r; }
  if (그림.og)    { const r = 깃허브에올리기('card/og/'  + 주소 + '.jpg', 그림.og,    '명함 미리보기: ' + 주소); if (!r.ok) return r; }

  const r = 깃허브에올리기('card/' + 주소 + '/index.html', base64(html), '명함 발행: ' + 주소);
  if (!r.ok) return r;
  if (!관리) 한도올리기_(d.p);

  // 명단 — 누가 명함을 만들었는지 시트에 남긴다. 여기서 실패해도 발행은 된 것이다.
  let 명단 = null;
  try {
    const l = 요청.lead || {};
    명단 = 명단남기기({ name: d.n, tel: d.p, job: l.job || (d.g || []).slice(0, 3).join('·') || d.t, co: l.co || d.c,
                        email: l.email || d.e, consent: l.consent }, 주소);
  } catch (err) { 명단 = { ok: false, error: String(err && err.message ? err.message : err) }; }

  return { ok: true, slug: 주소, url: 주소들.url, lead: 명단 };
}

/** 명함에 들어갈 자료만 추린다 — 모르는 칸은 버리고, 줄바꿈을 없애고, 길이를 자른다 */
function 명함자료(v) {
  v = v || {};
  const 줄끝 = [String.fromCharCode(8232), String.fromCharCode(8233)];   /* 유니코드 줄 구분자 — 소스에 그대로 적으면 문법 오류가 난다 */
  function 글(x, 길이) {
    let t = String(x === null || x === undefined ? '' : x).replace(/\s+/g, ' ');
    줄끝.forEach(function (c) { t = t.split(c).join(' '); });
    return t.trim().slice(0, 길이);
  }
  return {
    n: 글(v.n, 40), t: 글(v.t, 40), c: 글(v.c, 60), b: 글(v.b, 140),
    p: 글(v.p, 24), p2: 글(v.p2, 60), e: 글(v.e, 80), k: 글(v.k, 200), w: 글(v.w, 200), a: 글(v.a, 120),
    g: (Array.isArray(v.g) ? v.g : []).slice(0, 14).map(function (x) { return 글(x, 20); }).filter(function (x) { return x; }),
    col: 글(v.col, 12),
  };
}

/** JPEG 인지, 너무 크지 않은지 */
function 그림확인_(b64, 이름) {
  const s = String(b64);
  if (s.length > 그림한도 * 1.4) return 이름 + '이 너무 큽니다';
  if (!/^[A-Za-z0-9+\/=]+$/.test(s)) return 이름 + '을 읽지 못했습니다';
  let 앞;
  try { 앞 = Utilities.base64Decode(s.slice(0, 16)); } catch (err) { return 이름 + '을 읽지 못했습니다'; }
  // JPEG 는 FF D8 FF 로 시작한다 (앱스 스크립트의 바이트는 부호가 있어 -1, -40, -1)
  if (!(앞.length >= 3 && (앞[0] & 255) === 255 && (앞[1] & 255) === 216 && (앞[2] & 255) === 255)) return 이름 + '은 JPG 여야 합니다';
  return '';
}

/** 이미 있는 명함 파일에서 주인 지문을 읽는다 */
function 지문읽기_(응) {
  try {
    const 파일 = JSON.parse(응.getContentText());
    const 글 = Utilities.newBlob(Utilities.base64Decode(String(파일.content || '').replace(/\s/g, ''))).getDataAsString('UTF-8');
    const m = /<meta name="card-owner" content="([0-9a-f]{64})">/.exec(글);
    return m ? m[1] : '';
  } catch (err) { return ''; }
}

/** 사이트에 있는 명함 틀을 읽어 온다. 5분 동안 기억해 둔다 */
function 틀읽기_() {
  const 창고 = CacheService.getScriptCache();
  let 코드 = 창고.get('card-template');
  if (!코드) {
    const 응 = UrlFetchApp.fetch(틀주소 + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (응.getResponseCode() !== 200) throw new Error('명함 틀을 읽지 못했습니다 (' + 응.getResponseCode() + '). 잠시 뒤 다시 눌러 주세요');
    코드 = 응.getContentText('UTF-8');
    if (코드.indexOf('function 명함HTML') < 0) throw new Error('명함 틀이 이상합니다. 관리자에게 알려 주세요 (1533-7295)');
    if (코드.length < 95000) 창고.put('card-template', 코드, 300);
  }
  return new Function(코드 + '\n;return { 명함HTML: 명함HTML };')();
}

/* ── 하루 발행 수 ── 전체는 스크립트 속성에(날짜별 한 칸), 전화번호별은 6시간 기억 창고에 */
function 오늘_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function 한도확인_(전화) {
  const 속성 = PropertiesService.getScriptProperties();
  const 최대 = Number(속성.getProperty('OPEN_DAILY_MAX')) || 80;
  if (Number(속성.getProperty('count:' + 오늘_()) || 0) >= 최대) return '오늘은 발행이 많아 잠시 닫았습니다. 내일 다시 해 주시거나 1533-7295 로 연락 주세요';
  const 번호 = String(전화).replace(/[^0-9]/g, '');
  if (Number(CacheService.getScriptCache().get('tel:' + 번호) || 0) >= 8) return '같은 번호로 너무 여러 번 발행했습니다. 몇 시간 뒤에 다시 해 주세요';
  return '';
}
function 한도올리기_(전화) {
  const 속성 = PropertiesService.getScriptProperties(), 키 = 'count:' + 오늘_();
  속성.setProperty(키, String(Number(속성.getProperty(키) || 0) + 1));
  속성.getKeys().forEach(function (k) { if (k.indexOf('count:') === 0 && k !== 키) 속성.deleteProperty(k); });
  const 창고 = CacheService.getScriptCache(), 번호 = 'tel:' + String(전화).replace(/[^0-9]/g, '');
  창고.put(번호, String(Number(창고.get(번호) || 0) + 1), 21600);
}

function 명함삭제(요청) {
  if (!관리자(요청.pw)) return { ok: false, error: '명함 지우기는 관리자만 할 수 있습니다' };
  const 주소 = String(요청.slug || '').toLowerCase();
  if (!주소틀.test(주소)) return { ok: false, error: '주소가 이상합니다' };

  const 결과 = ['card/' + 주소 + '/index.html', 'card/img/' + 주소 + '.jpg',
                'card/bg/' + 주소 + '.jpg', 'card/og/' + 주소 + '.jpg']
    .map(function (경로) { return 깃허브에서지우기(경로); });

  const 지운것 = 결과.filter(function (r) { return r.ok; }).length;
  if (!지운것) return { ok: false, error: '지울 것이 없습니다' };
  return { ok: true, 지움: 지운것 };
}

/** 이미 쓰이고 있는 주소인지 미리 본다 (발행 전에 알려주려고) */
function 쓸수있나(주소) {
  주소 = String(주소 || '').toLowerCase();
  if (!주소틀.test(주소)) return { ok: false, error: '쓸 수 없는 글자가 있습니다' };
  if (막힌주소(주소))    return { ok: false, error: '이미 쓰이는 주소입니다' };
  const 응 = 깃허브('card/' + 주소 + '/index.html', 'get');
  return { ok: true, 있음: 응.getResponseCode() === 200 };
}

/** 사이트가 이미 쓰고 있는 이름은 명함 주소로 내주면 안 된다 */
function 막힌주소(주소) {
  return ['img', 'bg', 'og', 'index', 'admin', 'api', 'new', 'card', 'template', 'sample'].indexOf(주소) >= 0;
}

/* ══════════════════════════════════════════════════════════════
   깃허브 파일 쓰기 · 지우기  (전부 main 브랜치)
══════════════════════════════════════════════════════════════ */
function 깃허브(경로, 방법, 본문) {
  const 주소 = 'https://api.github.com/repos/' + 설정('GITHUB_REPO') + '/contents/' + 경로 +
               (방법 === 'get' ? '?ref=' + 브랜치 + '&t=' + Date.now() : '');
  return UrlFetchApp.fetch(주소, {
    method: 방법,
    headers: {
      Authorization: 'Bearer ' + 설정('GITHUB_TOKEN'),
      Accept: 'application/vnd.github+json',
      'User-Agent': 'keungil-card',
    },
    contentType: 'application/json',
    payload: 본문 ? JSON.stringify(본문) : undefined,
    muteHttpExceptions: true,
  });
}

function 깃허브에올리기(경로, base64내용, 메모) {
  const 본문 = { message: 메모, content: base64내용, branch: 브랜치 };

  // 이미 있는 파일이면 sha 를 같이 보내야 덮어쓸 수 있다
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() === 200) {
    try { 본문.sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  }

  const 응   = 깃허브(경로, 'put', 본문);
  const 코드 = 응.getResponseCode();
  if (코드 === 200 || 코드 === 201) return { ok: true };
  return { ok: false, error: '깃허브 저장 실패 (' + 코드 + ') ' + 사유읽기(응) };
}

function 깃허브에서지우기(경로) {
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() !== 200) return { ok: false, 없음: true };

  let sha = '';
  try { sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  if (!sha) return { ok: false, error: '파일 정보를 읽지 못했습니다' };

  const 응 = 깃허브(경로, 'delete', { message: '명함 삭제: ' + 경로, sha: sha, branch: 브랜치 });
  return 응.getResponseCode() === 200 ? { ok: true } : { ok: false, error: 사유읽기(응) };
}

/* ══════════════════════════════════════════════════════════════
   자잘한 것들
══════════════════════════════════════════════════════════════ */
function base64(글) {
  return Utilities.base64Encode(Utilities.newBlob(글, 'text/html').getBytes());
}

function sha256_(글) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 글, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function 설정(키) {
  const v = PropertiesService.getScriptProperties().getProperty(키);
  if (!v) throw new Error('스크립트 속성 ' + 키 + ' 가 비어 있습니다');
  return v;
}
function 옵션(키) { return PropertiesService.getScriptProperties().getProperty(키) || ''; }

/** 관리자 비밀번호(UPLOAD_PW)가 정해져 있고, 보낸 것이 그것과 같을 때만 */
function 관리자(pw) { const 비번 = 옵션('UPLOAD_PW'); return !!비번 && typeof pw === 'string' && pw === 비번; }
function 열린발행() { return 옵션('OPEN_PUBLISH').toLowerCase() !== 'off'; }

/** 같은 주소에 두 사람이 동시에 발행하면 하나가 사라진다. 순서대로 처리한다. */
function 잠그고(일) {
  const 자물쇠 = LockService.getScriptLock();
  try { 자물쇠.waitLock(25000); } catch (err) {
    return { ok: false, error: '다른 발행이 진행 중입니다. 잠시 뒤 다시 눌러주세요' };
  }
  try { return 일(); } finally { try { 자물쇠.releaseLock(); } catch (err) { /* 무시 */ } }
}

function 사유읽기(응) {
  let 사유 = 응.getContentText();
  try { 사유 = JSON.parse(사유).message || 사유; } catch (err) { /* 그대로 */ }
  return 사유;
}

function 응답(값) {
  return ContentService.createTextOutput(JSON.stringify(값))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════════════════════════════════════════════
   설치할 때 한 번씩 눌러보는 것들 (갤러리 스크립트와 같은 이름)
══════════════════════════════════════════════════════════════ */

function 권한받기() {
  // 바깥 인터넷(깃허브 · 명함 틀) + 드라이브 · 시트(이벤트인 명단) 권한을 묻습니다
  UrlFetchApp.fetch('https://api.github.com/rate_limit', { muteHttpExceptions: true });
  Logger.log('권한 확인 완료 — 이제 배포를 새 버전으로 다시 해주세요.');
}

function 점검() {
  const 속성 = PropertiesService.getScriptProperties();
  ['GITHUB_TOKEN', 'GITHUB_REPO'].forEach(function (k) {
    Logger.log(k + ': ' + (속성.getProperty(k) ? '있음' : '── 없음 ──'));
  });
  Logger.log('UPLOAD_PW(관리자 비밀번호): ' + (속성.getProperty('UPLOAD_PW') ? '있음' : '없음 — 남의 명함 고치기 · 지우기가 꺼져 있습니다'));
  Logger.log('발행: ' + (열린발행() ? '누구나 바로 발행' : '관리자만 (OPEN_PUBLISH=off)'));
  try {
    const 응 = 깃허브('card', 'get');
    const 코드 = 응.getResponseCode();
    if (코드 === 200) {
      let n = 0;
      try { n = JSON.parse(응.getContentText()).length; } catch (err) { /* 무시 */ }
      Logger.log('깃허브 연결 정상 — card 폴더에 ' + n + '개 있습니다');
    } else if (코드 === 404) {
      Logger.log('깃허브 연결 정상 — card 폴더는 아직 비어 있습니다 (처음이면 맞습니다)');
    } else {
      Logger.log('깃허브가 거절했습니다 (' + 코드 + ') ' + 사유읽기(응));
    }
  } catch (err) {
    Logger.log('깃허브를 읽지 못했습니다: ' + err.message);
  }
  쓸권한점검();
  try {
    CacheService.getScriptCache().remove('card-template');
    const html = 틀읽기_().명함HTML(명함자료({ n: '점검', p: '010-0000-0000' }), { url: 집 + '/card/test/' });
    Logger.log(html.indexOf('<title>점검') > 0 ? '명함 틀 정상 — 사이트의 template.js 로 그렸습니다' : '── 명함 틀이 이상합니다');
  } catch (err) { Logger.log('── 명함 틀을 읽지 못했습니다: ' + err.message); }
}

/* 읽기는 공개 저장소라 아무 토큰이나 되지만, 쓰기는 토큰이 이 저장소에 「Contents: Read and write」 권한을 가져야 한다.
   발행 때 「403 Resource not accessible by personal access token」 이 나오는 것이 바로 이 경우 — 미리 잡는다 */
function 쓸권한점검() {
  try {
    const 응 = UrlFetchApp.fetch('https://api.github.com/repos/' + 설정('GITHUB_REPO'), {
      headers: { Authorization: 'Bearer ' + 설정('GITHUB_TOKEN'), Accept: 'application/vnd.github+json', 'User-Agent': 'keungil-card' },
      muteHttpExceptions: true,
    });
    const 코드 = 응.getResponseCode();
    if (코드 === 401) { Logger.log('── 토큰이 틀렸거나 만료됐습니다 (401). GITHUB_TOKEN 을 다시 넣어 주세요'); return; }
    if (코드 === 404) { Logger.log('── 저장소 이름이 틀렸습니다 (404). GITHUB_REPO 는 brizymedia/ai-make'); return; }
    let 권한 = null;
    try { 권한 = JSON.parse(응.getContentText()).permissions || null; } catch (err) { /* 무시 */ }
    if (권한 && 권한.push) Logger.log('쓰기 권한 정상 — 이 토큰으로 명함을 올릴 수 있습니다');
    else Logger.log('── 이 토큰은 ' + 설정('GITHUB_REPO') + ' 에 쓸 권한이 없습니다. 발행하면 403 이 납니다. brizymedia 계정으로 로그인해서 토큰을 새로 만들고(Only select repositories → brizymedia/ai-make, Contents → Read and write) GITHUB_TOKEN 에 넣어 주세요');
  } catch (err) {
    Logger.log('권한 확인 실패: ' + err.message);
  }
}


/* ══════════════════════════════════════════════════════════════
   이벤트인 명단 — 명함을 만든 사람을 「이벤트 코리아 / 이벤트인 명단」 시트에 남긴다.
   이벤트 코리아 명단 서버와 같은 폴더·같은 파일 이름을 쓰므로 한 시트에 모인다.
   (둘 다 형님 계정으로 돌아가니 같은 드라이브다)
   열: 등록시각 · 이름 · 전화 · 직군 · 지역 · 출처 · 문자동의 · 최근활동 · 메모 · 마지막문자
══════════════════════════════════════════════════════════════ */
const 명단폴더 = '이벤트 코리아';
const 명단파일 = '이벤트인 명단';

function 명단남기기(l, slug) {
  const 이름 = 다듬기_(l.name, 40), 전화 = 전화정리_(l.tel), 직군 = 다듬기_(l.job, 30);
  const 동의 = l.consent === true || l.consent === 'Y' ? 'Y' : 'N';
  const 메모 = 다듬기_([l.co, l.email, '명함 ' + slug].filter(function (x) { return x; }).join(' · '), 200);
  if (!전화 || !이름) return { ok: false, error: '이름·휴대폰이 없어 명단에는 남기지 않음' };

  const sh = 명단시트_();
  const 끝 = sh.getLastRow();
  if (끝 >= 2) {
    const 값 = sh.getRange(2, 1, 끝 - 1, 10).getValues();
    for (let i = 0; i < 값.length; i++) {
      if (String(값[i][2]) === 전화) {
        const 줄 = i + 2;
        let 출처들 = String(값[i][5] || '');
        if (출처들.indexOf('명함') < 0) 출처들 = 출처들 ? 출처들 + ' · 명함' : '명함';
        sh.getRange(줄, 2).setValue(이름);
        if (직군) sh.getRange(줄, 4).setValue(직군);
        sh.getRange(줄, 6).setValue(출처들);
        if (동의 === 'Y') sh.getRange(줄, 7).setValue('Y');
        sh.getRange(줄, 8).setValue(new Date());
        sh.getRange(줄, 9).setValue(메모);
        return { ok: true, new: false };
      }
    }
  }
  sh.appendRow([new Date(), 이름, 전화, 직군, '', '명함', 동의, new Date(), 메모, '']);
  return { ok: true, new: true };
}

function 명단시트_() {
  const 폴더 = (function () {
    const 뿌리 = DriveApp.getRootFolder(), it = 뿌리.getFoldersByName(명단폴더);
    return it.hasNext() ? it.next() : 뿌리.createFolder(명단폴더);
  })();
  let ss = null;
  const it = 폴더.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (it.hasNext()) { const f = it.next(); if (f.getName() === 명단파일) { ss = SpreadsheetApp.open(f); break; } }
  if (!ss) { ss = SpreadsheetApp.create(명단파일); DriveApp.getFileById(ss.getId()).moveTo(폴더); }
  let sh = ss.getSheetByName('명단');
  if (sh) return sh;
  sh = ss.insertSheet('명단');
  sh.appendRow(['등록시각', '이름', '전화', '직군', '지역', '출처', '문자동의', '최근활동', '메모', '마지막문자']);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#E1EAE2');
  const 기본 = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (기본 && ss.getSheets().length > 1) { try { ss.deleteSheet(기본); } catch (err) { /* 무시 */ } }
  return sh;
}

function 다듬기_(v, 길이) { if (v === null || v === undefined) return ''; return String(v).replace(/[\r\n\t]/g, ' ').trim().slice(0, 길이); }

/* 010-1234-5678 · +82 10 1234 5678 → 01012345678. 휴대폰이 아니면 빈 값 */
function 전화정리_(v) {
  let d = String(v || '').replace(/[^0-9]/g, '');
  if (d.indexOf('8210') === 0) d = '0' + d.slice(2);
  return /^01[016789][0-9]{7,8}$/.test(d) ? d : '';
}
