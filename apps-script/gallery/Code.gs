/**
 * 큰길브리지 · 갤러리 글 발행 서버
 * ────────────────────────────────────────────────────────────
 * 구글 앱스 스크립트로 도는 작은 서버입니다. 하는 일은 셋:
 *
 *   1. 글쓰기 도구가 만든 글 파일 → 저장소의 gallery/posts/ 에 커밋
 *   2. 목록 다시 만들기 신호 (GitHub Actions 가 목록·사이트맵·RSS 를 갱신)
 *   3. 올린 글 목록 보기 · 글 내리기
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 * 비밀번호·토큰은 이 파일에 적지 말고 「스크립트 속성」에 넣습니다.
 *
 * ※ 서버가 없어도 글은 올릴 수 있습니다.
 *   글쓰기 도구의 「HTML 파일 내려받기」로 받아 저장소에 직접 올리면 됩니다.
 *   이 서버는 그 과정을 버튼 하나로 줄여줄 뿐입니다.
 */

/* ══ 스크립트 속성에서 설정을 읽어온다 ══
   WRITE_PW       발행 비밀번호 (본인만 아는 값)
   GITHUB_TOKEN   GitHub 토큰 (Contents 쓰기 권한)
   GITHUB_REPO    brizymedia/ai-make                          */
function 설정(키) {
  const v = PropertiesService.getScriptProperties().getProperty(키);
  if (!v) throw new Error('스크립트 속성에 ' + 키 + ' 가 없습니다. README 2단계를 확인해 주세요.');
  return v;
}

const 브랜치   = 'main';
const 글폴더   = 'gallery/posts';
const 사용자   = 'keungil-bridge-writer';

/* ══════════════════════════════════════════════════════════════
   0. 권한 받기

   "UrlFetchApp.fetch를 호출할 수 있는 권한이 없습니다" 가 뜰 때 씁니다.

   편집기 위쪽 함수 목록에서 이 함수(권한받기)를 고르고 「실행」 하세요.
   권한 요청 창이 뜨면 승인하시면 됩니다.
   그 뒤 「배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포」 를 해주세요.
══════════════════════════════════════════════════════════════ */
function 권한받기() {
  // 바깥 인터넷에 연결하는 권한 하나만 씁니다 (깃허브에 글을 올릴 때)
  UrlFetchApp.fetch('https://api.github.com/rate_limit', { muteHttpExceptions: true });
  Logger.log('권한 확인 완료 — 이제 배포를 새 버전으로 다시 해주세요.');
}

/* ══════════════════════════════════════════════════════════════
   설치가 잘 됐는지 눈으로 보는 함수.
   편집기에서 실행하면 로그에 결과가 찍힙니다.
══════════════════════════════════════════════════════════════ */
function 점검() {
  const 속성 = PropertiesService.getScriptProperties();
  ['WRITE_PW', 'GITHUB_TOKEN', 'GITHUB_REPO'].forEach((k) => {
    Logger.log(k + ': ' + (속성.getProperty(k) ? '있음' : '── 없음 ──'));
  });
  const 결과 = 글목록();
  if (결과.ok) Logger.log('저장소 연결 정상 — 올라간 글 ' + 결과.글.length + '편');
  else Logger.log('저장소를 읽지 못했습니다: ' + 결과.error);
}

/* ══════════════════════════════════════════════════════════════
   1. 상태 확인 — 브라우저로 주소를 열면 이게 나옵니다.
══════════════════════════════════════════════════════════════ */
function doGet() {
  const 준비 = {};
  ['WRITE_PW', 'GITHUB_TOKEN', 'GITHUB_REPO'].forEach((k) => {
    준비[k] = !!PropertiesService.getScriptProperties().getProperty(k);
  });
  return 응답({ ok: true, service: 'keungil-bridge-gallery', version: 1, 설정완료: 준비 });
}

/* ══════════════════════════════════════════════════════════════
   2. 요청 받기
══════════════════════════════════════════════════════════════ */
function doPost(e) {
  try {
    const 요청 = JSON.parse(e.postData.contents);

    if (요청.pw !== 설정('WRITE_PW')) {
      return 응답({ ok: false, error: '비밀번호가 다릅니다' });
    }

    if (요청.action === 'publish') return 응답(잠그고(function () { return 글발행(요청); }));
    if (요청.action === 'list')    return 응답(글목록());
    if (요청.action === 'delete')  return 응답(잠그고(function () { return 글내리기(요청); }));

    return 응답({ ok: false, error: '알 수 없는 요청입니다: ' + 요청.action });

  } catch (err) {
    // 실패를 조용히 삼키지 않는다 — 화면에 그대로 보여준다
    return 응답({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* 같은 글을 두 번 눌러 두 번 올라가는 일을 막는다 */
function 잠그고(일) {
  const 자물쇠 = LockService.getScriptLock();
  if (!자물쇠.tryLock(30000)) {
    return { ok: false, error: '다른 발행이 처리 중입니다. 잠시 뒤 다시 눌러주세요.' };
  }
  try { return 일(); } finally { 자물쇠.releaseLock(); }
}

/* ══════════════════════════════════════════════════════════════
   3. 파일명 검사

   파일명은 브라우저에서 오기 때문에 그대로 믿으면 안 됩니다.
   ../ 같은 걸 넣어 저장소의 엉뚱한 파일을 덮어쓸 수 있기 때문입니다.
   그래서 "글자·숫자·한글·붙임표로만 된 .html" 만 통과시킵니다.
══════════════════════════════════════════════════════════════ */
function 파일명확인(이름) {
  const 값 = String(이름 || '').trim();
  if (!값) return '파일명이 비어 있습니다';
  if (값.length > 120) return '파일명이 너무 깁니다';
  if (값.indexOf('/') >= 0 || 값.indexOf('\\') >= 0) return '파일명에 폴더를 넣을 수 없습니다';
  if (값.indexOf('..') >= 0) return '파일명에 .. 를 넣을 수 없습니다';
  if (!/^[A-Za-z0-9가-힣._-]+\.html$/.test(값)) {
    return '파일명은 영문·숫자·한글·붙임표만 쓰고 .html 로 끝나야 합니다';
  }
  return '';
}

/* ══════════════════════════════════════════════════════════════
   4. 글 발행 — 저장소에 글 파일을 만든다
══════════════════════════════════════════════════════════════ */
function 글발행(요청) {
  const 잘못 = 파일명확인(요청.filename);
  if (잘못) return { ok: false, error: 잘못 };

  const 내용 = String(요청.html || '');
  if (내용.length < 200) return { ok: false, error: '글 내용이 비어 있습니다' };
  if (내용.indexOf('<article') < 0) return { ok: false, error: '글 형식이 아닙니다' };

  const 경로 = 글폴더 + '/' + 요청.filename;

  // 덮어쓰기는 일부러 막는다 — 같은 파일명이면 사고일 가능성이 높다
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() === 200 && !요청.overwrite) {
    return { ok: false, error: '같은 파일명의 글이 이미 있습니다: ' + 요청.filename, 이미있음: true };
  }

  const 본문 = {
    message: '갤러리 — ' + (요청.title || 요청.filename),
    content: Utilities.base64Encode(내용, Utilities.Charset.UTF_8),
    branch: 브랜치,
  };
  if (기존.getResponseCode() === 200) {
    try { 본문.sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  }

  const 응 = 깃허브(경로, 'put', 본문);
  const 코드 = 응.getResponseCode();
  if (코드 !== 200 && 코드 !== 201) {
    return { ok: false, error: '깃허브 저장 실패 (' + 코드 + ') ' + 사유읽기(응) };
  }

  return {
    ok: true,
    파일: 요청.filename,
    주소: 'https://www.ai-make.co.kr/gallery/posts/' + 요청.filename,
    목록갱신: 목록다시만들기(),
  };
}

/* ══════════════════════════════════════════════════════════════
   5. 올라간 글 목록
══════════════════════════════════════════════════════════════ */
function 글목록() {
  const 응 = 깃허브(글폴더, 'get');
  if (응.getResponseCode() !== 200) {
    return { ok: false, error: '목록을 읽지 못했습니다 (' + 응.getResponseCode() + ') ' + 사유읽기(응) };
  }
  let 목록 = [];
  try { 목록 = JSON.parse(응.getContentText()); } catch (err) { return { ok: false, error: '목록 형식 오류' }; }

  const 글 = 목록
    .filter(function (f) { return f.type === 'file' && /\.html$/.test(f.name); })
    .map(function (f) { return { 파일: f.name, 크기: f.size }; })
    .sort(function (a, b) { return a.파일 < b.파일 ? 1 : -1; });

  return { ok: true, 글: 글 };
}

/* ══════════════════════════════════════════════════════════════
   6. 글 내리기 — 파일을 지우면 목록·사이트맵에서도 저절로 빠진다
══════════════════════════════════════════════════════════════ */
function 글내리기(요청) {
  const 잘못 = 파일명확인(요청.filename);
  if (잘못) return { ok: false, error: 잘못 };

  const 경로 = 글폴더 + '/' + 요청.filename;
  const 기존 = 깃허브(경로, 'get');
  if (기존.getResponseCode() === 404) return { ok: false, error: '그런 글이 없습니다' };

  let sha = '';
  try { sha = JSON.parse(기존.getContentText()).sha; } catch (err) { /* 무시 */ }
  if (!sha) return { ok: false, error: '파일 정보를 읽지 못했습니다' };

  const 응 = 깃허브(경로, 'delete', {
    message: '갤러리 글 내림 — ' + 요청.filename,
    sha: sha,
    branch: 브랜치,
  });
  if (응.getResponseCode() !== 200) {
    return { ok: false, error: 사유읽기(응) };
  }
  return { ok: true, 파일: 요청.filename, 목록갱신: 목록다시만들기() };
}

/* ══════════════════════════════════════════════════════════════
   7. 깃허브 파일 읽기 · 쓰기 · 지우기
══════════════════════════════════════════════════════════════ */
function 깃허브(경로, 방법, 본문) {
  // 읽기는 ?ref= 로, 쓰기·지우기는 본문의 branch 로 브랜치를 정한다
  const 주소 = 'https://api.github.com/repos/' + 설정('GITHUB_REPO') + '/contents/' + 경로 +
               (방법 === 'get' ? '?ref=' + 브랜치 + '&t=' + Date.now() : '');
  return UrlFetchApp.fetch(주소, {
    method: 방법,
    headers: {
      Authorization: 'Bearer ' + 설정('GITHUB_TOKEN'),
      Accept: 'application/vnd.github+json',
      'User-Agent': 사용자,
    },
    contentType: 'application/json',
    payload: 본문 ? JSON.stringify(본문) : undefined,
    muteHttpExceptions: true,
  });
}

function 사유읽기(응) {
  let 사유 = 응.getContentText();
  try { 사유 = JSON.parse(사유).message || 사유; } catch (err) { /* 그대로 */ }
  return 사유;
}

/* ══════════════════════════════════════════════════════════════
   8. 목록 다시 만들기 신호

   gallery/index.html 의 글 목록과 sitemap.xml · rss.xml 은
   build-sitemap.js 가 만들어 두는 정적 파일입니다.
   이 신호를 보내면 1~2분 안에 갱신되고,
   실패해도 매일 한 번 도는 자동 작업이 어차피 해줍니다. (그래서 실패해도 안 멈춥니다)
══════════════════════════════════════════════════════════════ */
function 목록다시만들기() {
  try {
    const 응 = UrlFetchApp.fetch(
      'https://api.github.com/repos/' + 설정('GITHUB_REPO') + '/dispatches',
      {
        method: 'post',
        headers: {
          Authorization: 'Bearer ' + 설정('GITHUB_TOKEN'),
          Accept: 'application/vnd.github+json',
          'User-Agent': 사용자,
        },
        contentType: 'application/json',
        payload: JSON.stringify({ event_type: 'post-published' }),
        muteHttpExceptions: true,
      }
    );
    const 코드 = 응.getResponseCode();
    if (코드 === 204) return '요청함 (1~2분 뒤 목록에 반영)';
    return '자동 갱신 대기 (' + 코드 + ')';
  } catch (err) {
    return '자동 갱신 대기';
  }
}

/* ══ 공통 응답 ══ */
function 응답(값) {
  return ContentService
    .createTextOutput(JSON.stringify(값))
    .setMimeType(ContentService.MimeType.JSON);
}
