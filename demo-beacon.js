/**
 * 큰길브리지 — 데모 열람 알림 조각
 *
 * 데모 페이지 맨 아래에 이 한 줄만 넣으면 된다:
 *
 *   <script src="/demo-beacon.js"
 *           data-d="한아름"
 *           data-n="한아름노인주간보호센터"
 *           data-tel="061-000-0000"></script>
 *
 *   data-d    데모 구분용 짧은 이름 (폴더 이름과 같게)
 *   data-n    메일에 찍힐 상호 (없으면 data-d 를 쓴다)
 *   data-tel  메일에 같이 찍을 전화번호 (없어도 된다)
 *
 * 하는 일
 *   페이지를 열면 → 알림 서버에 한 번 알린다 (여기서 메일이 간다)
 *   보고 있는 동안 → 15초·30초·1분·2분·5분·그다음 5분마다 살아있다고 알린다
 *   아래까지 내려보면 → 「관심 있다」고 따로 알린다
 *   창을 닫으면 → 최종 머문 시간을 알린다
 *
 * 우리가 볼 때는 알림이 안 가게 하는 법
 *   데모 주소 뒤에 ?me=1 을 붙여 한 번 열면 그 기기는 그 뒤로 계속 조용하다.
 *   (되돌리려면 ?me=0 을 붙여 열면 된다)
 *
 * 이 조각은 어떤 일이 있어도 페이지를 망가뜨리지 않는다.
 * 서버가 죽어도, 인터넷이 끊겨도, 브라우저가 오래된 것이어도
 * 전부 조용히 넘어가고 데모는 그대로 보인다.
 */
(function () {
  'use strict';

  /* ── 알림 서버 주소 ──────────────────────────────────
     앱스 스크립트를 「웹 앱」으로 배포하면 나오는 /exec 주소.
     비어 있으면 이 조각은 아무 일도 하지 않는다.        */
  var 서버 = '';
  /* ─────────────────────────────────────────────────── */

  if (!서버) return;

  var 태그 = document.currentScript;
  if (!태그) {
    var 전부 = document.getElementsByTagName('script');
    태그 = 전부[전부.length - 1];
  }
  if (!태그) return;

  var 데모ID = (태그.getAttribute('data-d') || '').trim();
  if (!데모ID) return;

  var 상호 = (태그.getAttribute('data-n') || '').trim() || 데모ID;
  var 전화 = (태그.getAttribute('data-tel') || '').trim();

  /* ── 우리 식구인지 확인 ── */
  var 나인가 = false;
  try {
    var 물음 = location.search || '';
    if (물음.indexOf('me=1') >= 0) { localStorage.setItem('kb-me', '1'); }
    if (물음.indexOf('me=0') >= 0) { localStorage.removeItem('kb-me'); }
    나인가 = localStorage.getItem('kb-me') === '1';
  } catch (e) {
    // 시크릿 창이거나 저장이 막힌 브라우저. 그냥 손님으로 본다.
  }

  /* ── 이번에 본 것을 묶을 번호 ── */
  var 세션 = '';
  try {
    세션 = sessionStorage.getItem('kb-sid') || '';
    if (!세션) {
      세션 = 번호만들기();
      sessionStorage.setItem('kb-sid', 세션);
    }
  } catch (e) {
    세션 = 번호만들기();
  }

  function 번호만들기() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var 시작 = Date.now();
  var 휴대폰 = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  var 유입 = '';
  try {
    if (document.referrer) 유입 = document.referrer.replace(/^https?:\/\//, '').split('/')[0];
  } catch (e) {}

  function 지난초() {
    return Math.round((Date.now() - 시작) / 1000);
  }

  /* ── 서버에 알리기 ────────────────────────────────────
     응답을 읽을 일이 없으니 no-cors 로 던진다. 그래서
     브라우저가 미리 허락을 묻는 절차(preflight)가 없다.
     keepalive 를 켜두면 창이 닫히는 중에도 끝까지 나간다. */
  function 알리기(이벤트, 초) {
    if (나인가 && 이벤트 !== 'open') return;   // 내부 열람은 아무것도 안 보낸다
    try {
      var q = '?d=' + encodeURIComponent(데모ID)
            + '&n=' + encodeURIComponent(상호)
            + '&s=' + encodeURIComponent(세션)
            + '&e=' + encodeURIComponent(이벤트)
            + '&t=' + encodeURIComponent(초 || 0)
            + '&m=' + (휴대폰 ? '1' : '0');
      if (전화) q += '&tel=' + encodeURIComponent(전화);
      if (유입) q += '&r=' + encodeURIComponent(유입);
      if (나인가) q += '&me=1';

      if (window.fetch) {
        fetch(서버 + q, { mode: 'no-cors', cache: 'no-store', keepalive: true })
          .catch(function () {});
      } else {
        // 아주 오래된 브라우저용. 그림 하나 불러오는 척하면서 요청만 보낸다.
        new Image().src = 서버 + q + '&_=' + Date.now();
      }
    } catch (e) {
      // 알림 실패는 못 본 척한다. 데모가 멀쩡한 게 더 중요하다.
    }
  }

  /* ── 열었다 ── */
  알리기('open', 0);

  /* ── 아직 보고 있다 ──
     처음엔 자주, 나중엔 뜸하게. 오래 켜둔 창이 서버를 두드리지 않게. */
  var 시각표 = [15, 30, 60, 120, 300];
  var 다음 = 0;
  var 시계 = setInterval(function () {
    if (document.hidden) return;            // 다른 탭에 가 있으면 세지 않는다
    var 초 = 지난초();
    if (다음 < 시각표.length) {
      if (초 >= 시각표[다음]) { 알리기('beat', 초); 다음++; }
    } else if (초 % 300 < 5) {
      알리기('beat', 초);
    }
  }, 5000);

  /* ── 아래까지 내려봤다 ── */
  var 깊이알림했나 = false;
  function 스크롤확인() {
    if (깊이알림했나) return;
    var 문서 = document.documentElement;
    var 전체 = Math.max(문서.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var 본곳 = (window.pageYOffset || 문서.scrollTop || 0) + window.innerHeight;
    if (전체 > 0 && 본곳 / 전체 >= 0.7) {
      깊이알림했나 = true;
      알리기('deep', 지난초());
      window.removeEventListener('scroll', 스크롤확인);
    }
  }
  window.addEventListener('scroll', 스크롤확인, { passive: true });
  setTimeout(스크롤확인, 1500);   // 페이지가 짧아서 스크롤이 없는 경우

  /* ── 나갔다 ──
     pagehide 가 제일 믿을 만하다. 휴대폰에서는 앱을 내리는 것도 잡아준다. */
  var 인사했나 = false;
  function 인사() {
    if (인사했나) return;
    인사했나 = true;
    clearInterval(시계);
    알리기('bye', 지난초());
  }
  window.addEventListener('pagehide', 인사);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') 인사();
  });
})();
