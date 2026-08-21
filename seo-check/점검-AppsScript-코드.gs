/**
 * 큰길브리지 — 홈페이지 SEO 무료 점검기 (백엔드)
 * ─────────────────────────────────────────────────
 * 브라우저는 보안(CORS) 때문에 남의 사이트 HTML 을 직접 읽지 못합니다.
 * 이 스크립트가 구글 서버에서 대신 가져와 점검한 뒤 결과만 돌려줍니다.
 *
 * [설치 방법]  ※ 문의폼 스크립트와 "따로" 만드세요. 섞으면 하나가 고장날 때 둘 다 멈춥니다.
 *  1. https://script.new  접속 (새 Apps Script 프로젝트가 열립니다)
 *  2. 프로젝트 이름을 "큰길브리지 SEO 점검" 으로 바꿉니다
 *  3. 기본 코드를 전부 지우고 이 파일 내용을 통째로 붙여넣습니다
 *  4. 저장(디스크 아이콘) → 배포 → 새 배포
 *       유형: 웹 앱
 *       실행 사용자: 나
 *       액세스 권한: 모든 사용자          ← 반드시 "모든 사용자"
 *  5. 권한 승인 창이 뜹니다. 허용해 주세요.
 *     ("안전하지 않다"는 경고가 나오면 고급 → 이동 을 누르면 됩니다)
 *  6. 나오는 "웹 앱 URL"(https://script.google.com/macros/s/.../exec)을 복사해 알려주세요.
 *     홈페이지에 연결해 드립니다.
 *
 * [잘 되는지 바로 보려면]
 *  웹 앱 URL 뒤에 ?url=naver.com 을 붙여 주소창에 넣어보세요. 결과가 JSON 으로 나옵니다.
 *
 * [코드를 고친 뒤에는]
 *  배포 → 배포 관리 → 연필 아이콘 → 버전: 새 버전 → 배포
 *  (새 버전으로 배포하지 않으면 수정 내용이 반영되지 않습니다)
 */

/** ── 설정 ───────────────────────────────── */
var UA = 'Mozilla/5.0 (compatible; KeungilBridgeSEO/1.0; +https://www.ai-make.co.kr/seo-check/)';
/** ───────────────────────────────────────── */


function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    return json(점검(d.url, d.keyword || ''));
  } catch (err) {
    return json({ ok: false, error: 오류문구(err) });
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.url) {
    try {
      return json(점검(e.parameter.url, e.parameter.keyword || ''));
    } catch (err) {
      return json({ ok: false, error: 오류문구(err) });
    }
  }
  return HtmlService.createHtmlOutput(
    '<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:60px auto;padding:0 20px;line-height:1.8">' +
    '<h2 style="margin:0 0 6px">큰길브리지 SEO 점검기</h2>' +
    '<p style="color:#666;margin:0 0 24px">정상 작동 중입니다.</p>' +
    '<p>주소창 뒤에 <code style="background:#f1f1f1;padding:2px 6px;border-radius:4px">?url=naver.com</code> 을 붙이면 결과를 바로 볼 수 있습니다.</p>' +
    '<p style="margin-top:28px"><a href="https://www.ai-make.co.kr/seo-check/" ' +
    'style="display:inline-block;background:#E8B84B;color:#111;padding:11px 20px;border-radius:8px;' +
    'font-weight:700;text-decoration:none">점검 페이지 열기</a></p></div>'
  ).setTitle('큰길브리지 SEO 점검기');
}


/* ══════════════════════════════════════════════════════
   본체
   ══════════════════════════════════════════════════════ */
function 점검(입력, 키워드) {
  var url = 주소정리(입력);
  if (!url) return { ok: false, error: '주소를 확인해 주세요. 예) www.ai-make.co.kr' };

  키워드 = String(키워드 || '').trim();

  /* 1) 페이지 가져오기 ───────────────────────── */
  var t0 = Date.now(), res;
  try {
    res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' }
    });
  } catch (err) {
    return { ok: false, error: '사이트에 연결하지 못했습니다. 주소가 맞는지, 사이트가 열려 있는지 확인해 주세요.' };
  }
  var 소요 = Date.now() - t0;
  var 코드 = res.getResponseCode();
  if (코드 >= 400) {
    return { ok: false, error: '사이트가 ' + 코드 + ' 오류를 돌려주었습니다. 주소를 다시 확인해 주세요.' };
  }

  var 바이트 = 0;
  try { 바이트 = res.getContent().length; } catch (e) {}

  var html = res.getContentText();
  /* 오래된 국내 사이트는 EUC-KR 인 경우가 많다. 깨지면 다시 읽는다. */
  if (/charset\s*=\s*["']?\s*(euc-kr|ks_c_5601)/i.test(html)) {
    try { html = res.getContentText('EUC-KR'); } catch (e) {}
  }

  var 기준 = 도메인(url);
  var m = 메타맵(html);
  var 글 = 본문(html);

  /* 요즘 사이트는 화면을 자바스크립트로 그린다. 그러면 HTML 만 받아서는 글이 거의 안 보인다.
     이걸 모르고 '글자 수 0' 이라 찍으면 멀쩡한 사이트를 억울하게 깎는다. 먼저 알아채고 말투를 바꾼다.
     다만 네이버 수집기는 실제로 자바스크립트를 거의 실행하지 않으므로, 이 구조 자체가 검색에는 불리하다. */
  var 스크립트수 = (html.match(/<script/gi) || []).length;
  var 껍데기 = html.indexOf('id="root"') >= 0 || html.indexOf('id="app"') >= 0 ||
               html.indexOf('id="__next"') >= 0 || html.indexOf('id="___gatsby"') >= 0;
  var JS그림 = 글.length < 500 && (껍데기 || 스크립트수 >= 6);

  var 항목 = [];

  /* 2) 기본 ─────────────────────────────────── */
  var title = 정리((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  항목.push(길이검사('title', '기본', '페이지 제목 (title)', title, 15, 45, 10, 10,
    '검색 결과에 굵게 나오는 줄입니다. 가장 중요한 항목이고, 여기 없는 단어로는 거의 검색되지 않습니다.',
    '업종과 지역을 함께 넣어주세요. 예) 순천 홈페이지 제작 · 큰길브리지'));

  var desc = 정리(m.name['description'] || '');
  항목.push(길이검사('desc', '기본', '검색 설명문 (description)', desc, 50, 150, 8, 9,
    '검색 결과에서 제목 밑에 나오는 두 줄입니다. 클릭할지 말지를 여기서 결정합니다.',
    '무엇을 하는 곳인지 + 어디서 하는지를 한 문장으로 적어주세요.'));

  var h1 = (html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).length;
  항목.push({
    id: 'h1', 그룹: '기본', 이름: '대표 제목 (h1)', 값: h1 + '개',
    상태: h1 === 1 ? 'ok' : (h1 === 0 ? 'fail' : 'warn'), g: 6, n: 5,
    설명: '이 페이지가 무엇에 대한 페이지인지 검색엔진에게 알려주는 제목표입니다.',
    처방: h1 === 0 ? 'h1 제목이 없습니다. 페이지 맨 위 큰 제목을 h1 으로 만들어야 합니다.'
        : (h1 > 1 ? 'h1 이 여러 개면 무엇이 대표인지 흐려집니다. 하나만 남기고 나머지는 h2 로 내려주세요.' : '')
  });

  var lang = (html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)/i) || [])[1] || '';
  항목.push({
    id: 'lang', 그룹: '기본', 이름: '언어 설정 (lang)', 값: lang || '없음',
    상태: /^ko/i.test(lang) ? 'ok' : (lang ? 'warn' : 'fail'), g: 3, n: 2,
    설명: '한국어 페이지라고 알려주는 표시입니다. 없으면 해외 검색 결과로 잘못 분류될 수 있습니다.',
    처방: /^ko/i.test(lang) ? '' : 'html 태그에 lang="ko" 를 넣어주세요.'
  });

  var vp = m.name['viewport'] || '';
  var 반응형 = /width\s*=\s*device-width/i.test(vp);
  항목.push({
    id: 'viewport', 그룹: '기본', 이름: '모바일 대응 (viewport)', 값: 반응형 ? '설정됨' : (vp ? '설정 미흡' : '없음'),
    상태: 반응형 ? 'ok' : 'fail', g: 8, n: 7,
    설명: '휴대폰 화면에 맞춰 크기가 조절되는지입니다. 검색 이용자 열에 일곱은 휴대폰으로 봅니다.',
    처방: 반응형 ? ''
        : '모바일에서 글씨가 깨알같이 나옵니다. 구글은 이런 페이지의 순위를 크게 낮춥니다. 반응형으로 다시 만드셔야 합니다.'
  });

  var https = url.indexOf('https://') === 0;
  항목.push({
    id: 'https', 그룹: '기본', 이름: '보안 접속 (HTTPS)', 값: https ? '적용됨' : '안 됨',
    상태: https ? 'ok' : 'fail', g: 7, n: 7,
    설명: '주소창에 자물쇠가 뜨는지입니다.',
    처방: https ? '' : '"안전하지 않음" 경고가 뜨면 손님이 그냥 나갑니다. 무료 SSL 로 바로 해결됩니다.'
  });

  var 파비콘 = /<link[^>]+rel\s*=\s*["'][^"']*icon/i.test(html);
  항목.push({
    id: 'favicon', 그룹: '기본', 이름: '탭 아이콘 (favicon)', 값: 파비콘 ? '있음' : '없음',
    상태: 파비콘 ? 'ok' : 'warn', g: 2, n: 2,
    설명: '브라우저 탭과 즐겨찾기에 뜨는 작은 아이콘입니다.',
    처방: 파비콘 ? '' : '탭이 여러 개 열렸을 때 우리 사이트를 못 찾습니다. 로고로 만들어 넣으면 됩니다.'
  });

  /* 3) 공유 ─────────────────────────────────── */
  항목.push(존재검사('ogtitle', '공유', '공유 제목 (og:title)', m.prop['og:title'], 4, 4,
    '카카오톡·페이스북에 링크를 보냈을 때 카드에 뜨는 제목입니다.',
    'og:title 을 넣어주세요. 없으면 카톡 카드에 주소만 덩그러니 나옵니다.'));

  항목.push(존재검사('ogdesc', '공유', '공유 설명 (og:description)', m.prop['og:description'], 3, 3,
    '공유 카드의 설명 줄입니다.', 'og:description 을 넣어주세요.'));

  항목.push(존재검사('ogimg', '공유', '공유 이미지 (og:image)', m.prop['og:image'], 5, 5,
    '공유 카드에 뜨는 큰 그림입니다. 클릭률이 가장 크게 갈리는 항목입니다.',
    '카톡으로 보냈을 때 그림이 안 뜹니다. 1200×630 이미지를 만들어 og:image 로 지정하면 됩니다.'));

  var tw = m.name['twitter:card'] || m.prop['twitter:card'];
  항목.push({
    id: 'twitter', 그룹: '공유', 이름: '트위터 카드', 값: tw ? tw : '없음',
    상태: tw ? 'ok' : 'warn', g: 2, n: 1,
    설명: 'X(트위터)·스레드에 공유될 때 쓰이는 형식입니다.',
    처방: tw ? '' : 'twitter:card 를 summary_large_image 로 넣으면 큰 그림 카드로 나옵니다.'
  });

  /* 4) 색인 ─────────────────────────────────── */
  var canonTag = (html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/i) || [])[0] || '';
  var canon = canonTag ? 속성(canonTag, 'href') : '';
  항목.push({
    id: 'canonical', 그룹: '색인', 이름: '대표 주소 (canonical)', 값: canon || '없음',
    상태: canon ? 'ok' : 'warn', g: 6, n: 4,
    설명: 'www 가 붙은 주소와 안 붙은 주소를 검색엔진이 다른 페이지로 볼 때가 있습니다. 그때 진짜 주소를 알려줍니다.',
    처방: canon ? '' : '같은 내용이 여러 주소로 잡히면 점수가 나뉩니다. canonical 로 대표 주소를 못박아 주세요.'
  });

  var rb = (m.name['robots'] || '').toLowerCase();
  var 막힘 = /noindex/.test(rb);
  항목.push({
    id: 'robotsmeta', 그룹: '색인', 이름: '검색 허용 (robots 메타)', 값: 막힘 ? 'noindex — 검색 차단됨' : (rb || '허용'),
    상태: 막힘 ? 'fail' : 'ok', g: 8, n: 8,
    설명: '이 페이지를 검색 결과에 넣어도 되는지입니다.',
    처방: 막힘 ? '검색엔진에게 "우리를 빼달라"고 말하고 있습니다. 이게 켜져 있으면 다른 걸 아무리 해도 검색이 안 됩니다. 최우선으로 꺼야 합니다.' : ''
  });

  var rt = 가져오기(기준 + '/robots.txt');
  항목.push({
    id: 'robotstxt', 그룹: '색인', 이름: 'robots.txt', 값: rt.ok ? '있음' : '없음',
    상태: rt.ok ? 'ok' : 'warn', g: 5, n: 5,
    설명: '검색엔진 수집기에게 주는 안내문입니다.',
    처방: rt.ok ? '' : 'robots.txt 가 없으면 수집기가 어디를 봐야 할지 스스로 판단합니다. 만들어 두는 편이 안전합니다.'
  });

  /* 사이트맵 — robots.txt 에 적힌 주소를 먼저 따라간다 */
  var smUrl = (rt.body.match(/Sitemap:\s*(\S+)/i) || [])[1] || (기준 + '/sitemap.xml');
  var sm = 가져오기(smUrl);
  var sm유효 = sm.ok && /<(urlset|sitemapindex)/i.test(sm.body);
  항목.push({
    id: 'sitemap', 그룹: '색인', 이름: 'sitemap.xml', 값: sm유효 ? '있음' : (sm.ok ? '형식 오류' : '없음'),
    상태: sm유효 ? 'ok' : (sm.ok ? 'warn' : 'fail'), g: 7, n: 8,
    설명: '우리 사이트에 어떤 페이지가 있는지 목록으로 알려주는 파일입니다.',
    처방: sm유효 ? '' : '사이트맵이 없으면 새 글을 올려도 검색엔진이 한참 뒤에 발견합니다. 구글 서치콘솔·네이버 서치어드바이저에 제출하려면 반드시 필요합니다.'
  });

  var rss = /<link[^>]+type\s*=\s*["']application\/(rss|atom)\+xml/i.test(html) || 가져오기(기준 + '/rss.xml').ok;
  항목.push({
    id: 'rss', 그룹: '색인', 이름: 'RSS 피드', 값: rss ? '있음' : '없음',
    상태: rss ? 'ok' : 'warn', g: 1, n: 6,
    설명: '새 글이 올라오면 알려주는 자동 알림 파일입니다.',
    처방: rss ? '' : '네이버 서치어드바이저는 RSS 를 따로 받습니다. 새 글의 수집 속도가 눈에 띄게 달라집니다.'
  });

  /* 5) 구조 ─────────────────────────────────── */
  var ld = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  var 유형 = [];
  ld.forEach(function (blk) {
    (blk.match(/"@type"\s*:\s*"([^"]+)"/g) || []).forEach(function (x) {
      var v = x.split('"')[3];
      if (v && 유형.indexOf(v) < 0) 유형.push(v);
    });
  });
  항목.push({
    id: 'jsonld', 그룹: '구조', 이름: '구조화 데이터 (JSON-LD)', 값: ld.length ? (유형.slice(0, 5).join(', ') || ld.length + '개') : '없음',
    상태: ld.length ? 'ok' : 'fail', g: 9, n: 4,
    설명: '업체명·전화번호·영업시간·후기 별점을 검색엔진이 읽을 수 있는 형식으로 정리한 것입니다.',
    처방: ld.length ? '' : 'AI 검색과 구글이 우리 정보를 못 읽습니다. 요즘 순위 차이가 가장 크게 벌어지는 항목입니다.'
  });

  var imgs = html.match(/<img\b[^>]*>/gi) || [];
  var noalt = 0;
  imgs.forEach(function (t) { if (!속성(t, 'alt')) noalt++; });
  항목.push({
    id: 'alt', 그룹: '구조', 이름: '이미지 설명글 (alt)',
    값: imgs.length ? (imgs.length - noalt) + ' / ' + imgs.length + '개' : '이미지 없음',
    상태: !imgs.length ? 'warn' : (noalt === 0 ? 'ok' : (noalt / imgs.length > 0.5 ? 'fail' : 'warn')), g: 4, n: 6,
    설명: '그림이 무엇인지 글로 적어둔 것입니다. 검색엔진은 그림을 눈으로 못 봅니다.',
    처방: !imgs.length ? '이미지가 하나도 없습니다. 네이버는 이미지가 있는 페이지를 더 좋아합니다.'
        : (noalt ? noalt + '개의 그림에 설명이 없습니다. 이미지 검색으로 들어오는 손님을 통째로 놓치고 있습니다.' : '')
  });

  var 글자수 = 글.length;
  항목.push({
    id: 'text', 그룹: '구조', 이름: '본문 글자 수', 값: 글자수.toLocaleString('ko-KR') + '자',
    상태: 글자수 >= 800 ? 'ok' : (글자수 >= 300 || JS그림 ? 'warn' : 'fail'), g: 5, n: 9,
    설명: '페이지에 실제로 들어있는 글의 양입니다.',
    처방: 글자수 >= 800 ? ''
        : (JS그림
          ? '이 사이트는 화면을 자바스크립트로 그립니다. 그래서 밖에서 읽히는 글이 ' + 글자수 + '자뿐입니다. 구글은 어느 정도 읽어내지만, <b>네이버 수집기는 자바스크립트를 거의 실행하지 않습니다.</b> 네이버 검색에 안 나오는 원인이 대개 여기입니다. 중요한 글은 HTML 에 그대로 실어야 합니다.'
          : '네이버는 글이 적은 페이지를 거의 노출하지 않습니다. 서비스 설명·자주 묻는 질문을 글로 채우면 바로 올라갑니다. (권장 800자 이상)')
  });

  var 내부 = 0, 앵커 = 0;
  (html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["']/gi) || []).forEach(function (t) {
    var h = 속성(t, 'href');
    if (!h) return;
    if (h.charAt(0) === '#') { 앵커++; return; }
    if (/^(mailto|tel|sms|javascript):/i.test(h)) return;
    if (h.charAt(0) === '/' || h.indexOf(기준) === 0 || !/^https?:/i.test(h)) 내부++;
  });
  /* 한 장짜리 페이지는 섹션 이동이 곧 메뉴다. 이걸 0으로 세면 멀쩡한 원페이지가 실패로 찍힌다.
     우리 주력 상품이 원페이지다. 우리 고객을 우리 도구가 깎아내리게 둘 수는 없다. */
  var 원페이지 = 내부 < 3 && 앵커 >= 6;
  if (JS그림 && 내부 < 3) 원페이지 = true;   // 메뉴까지 자바스크립트로 그려지는 경우

  항목.push({
    id: 'links', 그룹: '구조', 이름: '내부 링크',
    값: 원페이지 ? '원페이지 구조 (섹션 이동 ' + 앵커 + '개)' : 내부 + '개',
    상태: 내부 >= 8 ? 'ok' : (내부 >= 3 || 원페이지 ? 'warn' : 'fail'), g: 3, n: 3,
    설명: '우리 사이트 안의 다른 페이지로 이어지는 링크입니다.',
    처방: 내부 >= 8 ? ''
        : (원페이지
          ? '한 장으로 된 페이지입니다. 그 자체로 문제는 아닙니다. 다만 검색에 걸릴 문이 하나뿐입니다. 후기 · 사례 · 서비스별 페이지를 따로 만들면 걸릴 키워드가 그만큼 늘어납니다.'
          : '링크가 적으면 검색엔진이 나머지 페이지를 못 찾아갑니다. 메뉴와 본문에서 서로 이어주세요.')
  });

  /* 6) 인증 ─────────────────────────────────── */
  var nv = m.name['naver-site-verification'];
  항목.push({
    id: 'naver', 그룹: '인증', 이름: '네이버 소유확인', 값: nv ? '확인됨' : '메타태그 없음',
    상태: nv ? 'ok' : 'warn', g: 0, n: 8,
    설명: '네이버 서치어드바이저에 내 사이트로 등록되어 있는지입니다.',
    처방: nv ? '' : '네이버에 등록하지 않으면 네이버 검색에 거의 안 나옵니다. 국내 사업장이라면 가장 먼저 하셔야 합니다.'
  });

  /* 구글은 메타태그 말고 HTML 파일·DNS 방식도 있다.
     파일 이름을 알 수 없으므로 "없다"고 단정하지 않는다. 틀린 ❌ 보다 정직한 보류가 낫다. */
  var gg = m.name['google-site-verification'];
  항목.push({
    id: 'google', 그룹: '인증', 이름: '구글 소유확인', 값: gg ? '확인됨 (메타태그)' : '메타태그 방식 아님',
    상태: gg ? 'ok' : 'info', g: 0, n: 0,
    설명: '구글 서치콘솔 소유확인 방식은 메타태그 · HTML 파일 · DNS 세 가지입니다.',
    처방: gg ? ''
        : '메타태그는 안 보입니다. 다만 <b>HTML 파일이나 DNS 방식으로 인증하셨다면 정상</b>이며, 그 두 방식은 페이지 밖에 있어 밖에서는 확인할 방법이 없습니다. 서치콘솔에 데이터가 보인다면 문제 없습니다. — 그래서 이 항목은 점수에 넣지 않습니다.'
  });

  /* 7) 속도 ─────────────────────────────────── */
  항목.push({
    id: 'speed', 그룹: '속도', 이름: '서버 응답 시간', 값: 소요.toLocaleString('ko-KR') + 'ms',
    상태: 소요 < 800 ? 'ok' : (소요 < 2000 ? 'warn' : 'fail'), g: 6, n: 4,
    설명: '주소를 눌렀을 때 서버가 첫 응답을 주기까지 걸린 시간입니다.',
    처방: 소요 < 800 ? '' : '3초를 넘기면 절반 이상이 기다리지 않고 나갑니다. 호스팅 등급이나 이미지 용량을 점검해야 합니다.'
  });

  var kb = Math.round(바이트 / 1024);
  항목.push({
    id: 'size', 그룹: '속도', 이름: '페이지 용량', 값: kb ? kb.toLocaleString('ko-KR') + 'KB' : '측정 불가',
    상태: !kb ? 'warn' : (kb < 800 ? 'ok' : (kb < 2000 ? 'warn' : 'fail')), g: 4, n: 3,
    설명: 'HTML 문서 자체의 크기입니다.',
    처방: kb >= 800 ? '문서가 무겁습니다. 데이터를 아껴 쓰는 손님은 열리기 전에 나갑니다.' : ''
  });

  /* 8) 키워드 (입력했을 때만) ────────────────── */
  var 키워드결과 = null;
  if (키워드) {
    var k = 키워드.toLowerCase();
    var 본문소문자 = 글.toLowerCase();
    var 낱말 = 키워드.split(/\s+/).filter(function (w) { return w.length > 1; });
    var 들어감 = 낱말.filter(function (w) { return 본문소문자.indexOf(w.toLowerCase()) >= 0; }).length;
    키워드결과 = {
      말: 키워드,
      title: title.toLowerCase().indexOf(k) >= 0,
      desc: desc.toLowerCase().indexOf(k) >= 0,
      h1: 정리((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || ['', ''])[1].replace(/<[^>]+>/g, ' ')).toLowerCase().indexOf(k) >= 0,
      본문: 본문소문자.split(k).length - 1,
      낱말: 낱말.length ? 들어감 + ' / ' + 낱말.length : ''
    };
  }

  /* 9) 점수 ─────────────────────────────────── */
  return {
    ok: true,
    url: url,
    코드: 코드,
    점수: { google: 점수내기(항목, 'g'), naver: 점수내기(항목, 'n') },
    항목: 항목,
    키워드: 키워드결과,
    알림: JS그림 ? '이 사이트는 화면을 자바스크립트로 그립니다. 아래 <b>본문 글자 수 · 내부 링크</b> 수치는 실제보다 적게 나옵니다. 다만 네이버 수집기도 똑같이 못 읽으므로, 네이버 검색을 노린다면 그대로 문제가 됩니다.' : '',
    점검시각: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')
  };
}


/* ══════════════════════════════════════════════════════
   도우미
   ══════════════════════════════════════════════════════ */
function 점수내기(항목, 키) {
  var 총 = 0, 획득 = 0;
  항목.forEach(function (it) {
    var w = it[키] || 0;
    if (!w || it.상태 === 'info') return;      // info 는 채점하지 않는다
    총 += w;
    획득 += w * (it.상태 === 'ok' ? 1 : (it.상태 === 'warn' ? 0.5 : 0));
  });
  return 총 ? Math.round(획득 / 총 * 100) : 0;
}

function 길이검사(id, 그룹, 이름, 값, 최소, 최대, g, n, 설명, 처방) {
  var len = 값.length;
  var 상태 = !len ? 'fail' : (len < 최소 || len > 최대 ? 'warn' : 'ok');
  var 메모 = !len ? 처방
    : (len < 최소 ? '너무 짧습니다. ' + 최소 + '~' + 최대 + '자를 권합니다. ' + 처방
    : (len > 최대 ? '너무 깁니다. 검색 결과에서 뒷부분이 잘립니다. ' + 최대 + '자 안으로 줄여주세요.' : ''));
  return {
    id: id, 그룹: 그룹, 이름: 이름,
    값: 값 ? (값.length > 70 ? 값.slice(0, 70) + '…' : 값) + ' (' + len + '자)' : '없음',
    상태: 상태, g: g, n: n, 설명: 설명, 처방: 메모
  };
}

function 존재검사(id, 그룹, 이름, 값, g, n, 설명, 처방) {
  var 있음 = !!(값 && String(값).trim());
  return {
    id: id, 그룹: 그룹, 이름: 이름, 값: 있음 ? '있음' : '없음',
    상태: 있음 ? 'ok' : 'fail', g: g, n: n, 설명: 설명, 처방: 있음 ? '' : 처방
  };
}

function 주소정리(입력) {
  var s = String(입력 || '').trim().replace(/\s+/g, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  if (!/^https?:\/\/[^\/\s]+\.[^\/\s]{2,}/i.test(s)) return '';
  /* 사설·내부 주소는 막는다 */
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(s)) return '';
  return s;
}

function 도메인(url) {
  var m = url.match(/^(https?:\/\/[^\/]+)/i);
  return m ? m[1] : url;
}

function 가져오기(url) {
  try {
    var r = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': UA }
    });
    var ok = r.getResponseCode() === 200;
    return { ok: ok, body: ok ? r.getContentText().slice(0, 4000) : '' };
  } catch (e) {
    return { ok: false, body: '' };
  }
}

function 메타맵(html) {
  var out = { name: {}, prop: {} };
  (html.match(/<meta\b[^>]*>/gi) || []).forEach(function (t) {
    var n = 속성(t, 'name'), p = 속성(t, 'property'), c = 정리(속성(t, 'content'));
    if (n && !out.name[n.toLowerCase()]) out.name[n.toLowerCase()] = c;
    if (p && !out.prop[p.toLowerCase()]) out.prop[p.toLowerCase()] = c;
  });
  return out;
}

function 속성(태그, 이름) {
  var re = new RegExp('\\b' + 이름 + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
  var m = 태그.match(re);
  if (!m) return '';
  return m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : (m[3] || ''));
}

function 본문(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function 정리(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function 오류문구(err) {
  var s = String((err && err.message) || err || '');
  if (/Address unavailable|DNS|UnknownHost/i.test(s)) return '그런 주소를 찾지 못했습니다. 철자를 확인해 주세요.';
  if (/Timeout|timed out/i.test(s)) return '사이트 응답이 너무 느려 시간이 초과되었습니다.';
  return '점검 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.';
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
