/* 큰길브리지 유입 기록 — 세 사이트 공용.
   <script defer src="https://www.ai-make.co.kr/stats/stats.js" data-site="ai-make|keungil|event-korea"></script>
   방문 한 번에 신호 한 번. 보내는 것: 사이트 · 경로 · 제목 · 참조 주소 · utm · 기기 · 화면폭 · 언어 · 이 브라우저의 무작위 번호.
   이름·전화·IP 같은 개인정보는 없다. 서버 주소가 비어 있으면 아무것도 하지 않는다.
   내 방문을 빼고 싶으면 아무 페이지든 ?me=1 을 붙여 한 번 열면 그 브라우저는 이후 기록되지 않는다. */
(function () {
  var 서버 = '';   // 유입 서버 /exec 주소 — 배포 뒤 여기 한 곳만 채운다

  try {
    if (!서버) return;
    var ua = navigator.userAgent || '';
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|monitor/i.test(ua)) return;
    var q = new URLSearchParams(location.search);
    if (q.get('me') === '1') { localStorage.setItem('kb-me', '1'); return; }
    if (localStorage.getItem('kb-me')) return;
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && q.get('stats') !== 'test') return;

    var 태그 = document.currentScript, 사이트 = (태그 && 태그.getAttribute('data-site')) || location.hostname;
    var id = null, 새 = 0;
    try {
      id = localStorage.getItem('kb-vid');
      if (!id) { id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem('kb-vid', id); 새 = 1; }
    } catch (e) { id = 'na'; }

    var p = {
      s: 사이트, h: location.hostname,
      p: location.pathname, t: (document.title || '').slice(0, 80),
      r: (document.referrer || '').slice(0, 300),
      us: q.get('utm_source') || '', um: q.get('utm_medium') || '', uc: q.get('utm_campaign') || '',
      d: /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile' : (/iPad|Tablet/i.test(ua) ? 'tablet' : 'pc'),
      w: screen.width || 0, v: id, n: 새, l: navigator.language || ''
    };
    var 몸 = JSON.stringify(p);
    var 갔다 = false;
    if (navigator.sendBeacon) { try { 갔다 = navigator.sendBeacon(서버, 몸); } catch (e) { 갔다 = false; } }
    if (!갔다) { var img = new Image(); img.src = 서버 + '?' + new URLSearchParams(p).toString() + '&_=' + Date.now(); }
  } catch (e) { /* 통계는 실패해도 페이지에 영향을 주면 안 된다 */ }
})();
