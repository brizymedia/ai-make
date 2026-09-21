/**
 * 큰길브리지 문의폼 → Gmail 알림 + 구글시트 저장
 * ────────────────────────────────────────────────
 * [설치 방법]
 *  1. https://sheets.new 에서 새 구글시트를 만듭니다 (이름: 큰길브리지 문의)
 *  2. 확장 프로그램 → Apps Script 클릭
 *  3. 기본 코드를 지우고 이 파일 내용을 통째로 붙여넣습니다
 *  4. 저장(디스크 아이콘) → 배포 → 새 배포
 *       유형: 웹 앱
 *       실행 사용자: 나
 *       액세스 권한: 모든 사용자          ← 반드시 "모든 사용자"
 *  5. 배포를 누르면 권한 승인 창이 뜹니다. 허용해 주세요.
 *     (안전하지 않다는 경고가 나오면 "고급" → "이동" 을 누르면 됩니다)
 *  6. 나오는 "웹 앱 URL"(https://script.google.com/macros/s/.../exec)을 복사해
 *     알려주시면 홈페이지에 연결해 드립니다.
 *
 * [코드를 고친 뒤에는]
 *  배포 → 배포 관리 → 연필 아이콘 → 버전: 새 버전 → 배포
 *  (새 버전으로 배포하지 않으면 수정 내용이 반영되지 않습니다)
 */

/** ── 설정 ───────────────────────────────── */
const TO_EMAIL   = 'gilauto325@gmail.com';   // 알림 받을 이메일
const SHEET_NAME = '문의접수';                // 저장될 시트 탭 이름
const BRAND      = '큰길브리지';
const TEL        = '1533-7295';
const SITE       = 'https://www.ai-make.co.kr';  // 견적서 · 계약서가 있는 주소
const VERSION    = '2026-09-21a';                // 배포 확인용 — 코드를 고칠 때마다 올린다. 주소 뒤에 ?ping=1 을 붙여 열면 이 값이 나온다
/** ───────────────────────────────────────── */


/**
 * 문의 내용을 견적서 작성 화면 주소로 바꾼다.
 *
 * 문의 → 견적서 → 계약서 로 이어지게 하는 고리다.
 * 알림 메일의 버튼을 누르면 고객 정보가 이미 채워진 견적서가 열린다.
 * 견적서에는 서버가 없다. 내용이 주소(#q=) 안에 통째로 담겨서 열린다.
 *
 * quote.html 의 상태 모양과 같아야 한다. 한쪽만 고치면 값이 안 들어간다.
 */
function 견적서주소(d) {
  const 이름 = String(d.name || '').trim();
  const 미리 = {
    cl: { org: 이름, name: '', tel: d.phone || '', email: d.email || '' },
    pj: {
      title: 이름 ? 이름 + ' 홈페이지 제작' : '',
      domain: '', biztype: '',
      purpose: String(d.message || '').trim(),
      plan: String(d.plan || '')
    },
    items: 견적항목(d),
    fin: { vat: 'none', deposit: '50' },
    care: { monthly: '', free: '' },
    sch: { start: '', open: '' },
    note: '',
    meta: { no: '', date: '', valid: '발행일로부터 30일' }
  };
  // base64EncodeWebSafe 는 - _ 를 쓰는 형식이라 브라우저에서 그대로 읽힌다
  const 코드 = Utilities.base64EncodeWebSafe(JSON.stringify(미리), Utilities.Charset.UTF_8);
  return SITE + '/quote.html?admin=1#q=' + 코드;
}

/**
 * 문의 내용을 데모 만들기 화면(demo/make.html)으로 넘긴다.
 * 메일 본문을 붙여넣은 것과 같은 글을 #t= 에 담아 보내면, 그 화면이 상호 · 연락처 · 업종 · 지역을 알아서 읽는다.
 */
function 데모주소(d) {
  const 줄바꿈 = String.fromCharCode(10);
  const 글 = ['성함/상호: ' + String(d.name || '').trim(), '연락처: ' + String(d.phone || '').trim(),
              '이메일: ' + String(d.email || '').trim(), '문의 내용: ' + String(d.message || '').trim()].join(줄바꿈);
  return SITE + '/demo/make.html#t=' + Utilities.base64EncodeWebSafe(글, Utilities.Charset.UTF_8);
}

/** 다음 단계 단추 둘 — 데모 신청이면 데모가 앞(노랑), 아니면 견적서가 앞 */
function 다음단추(d) {
  const 데모 = /데모/.test(String(d.service || '') + ' ' + String(d.message || ''));
  const 노랑 = 'display:inline-block;background:#E8B84B;color:#07090F;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin:0 8px 8px 0';
  const 흰색 = 'display:inline-block;background:#fff;border:1px solid #E8B84B;color:#8A6512;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;margin:0 8px 8px 0';
  const 데모단추 = '<a href="' + 데모주소(d) + '" style="' + (데모 ? 노랑 : 흰색) + '">🎨 무료 데모 만들기</a>';
  const 견적단추 = '<a href="' + 견적서주소(d) + '" style="' + (데모 ? 흰색 : 노랑) + '">📄 이 문의로 견적서 작성</a>';
  /* 전자명함은 신청 · 접수 문자 없이 바로 발행된다(2026-09-21). 발행되면 알림이 오고, 그 명함을 바로 열어 볼 수 있게 한다.
     주소는 우리 사이트의 /card/ 아래일 때만 단추로 만든다 (남이 넣은 주소를 단추로 만들지 않는다) */
  const 명함 = /명함/.test(String(d.service || ''));
  const 명함주소 = String(d.page || '');
  const 명함단추 = (명함 && /^https:\/\/www\.ai-make\.co\.kr\/card\/[a-z0-9][a-z0-9-]{1,38}\/$/.test(명함주소))
    ? '<a href="' + 명함주소 + '" style="' + 노랑 + '">🪪 발행된 명함 보기</a>' : '';
  if (명함) return 명함단추 + 데모단추.replace(노랑, 흰색) + 견적단추.replace(노랑, 흰색);
  return 데모 ? 데모단추 + 견적단추 : 견적단추 + 데모단추;
}


/**
 * 손님이 계산기에서 고른 항목을 견적서 형식으로 바꾼다.
 *
 * 홈페이지가 items 를 자료 그대로 보내주면 그걸 쓰고,
 * 예전 방식(글로 된 견적 상세)만 있으면 한 줄씩 뜯어 읽는다.
 * 「· 고급형 (5페이지 맞춤 디자인) — 500,000원」 같은 줄이다.
 */
function 견적항목(d) {
  if (Array.isArray(d.items) && d.items.length) {
    return d.items
      .filter(function (it) { return it && it.n; })
      .map(function (it) { return { n: String(it.n), q: 1, p: Number(it.p) || 0 }; });
  }

  const 글 = String(d.quote || '').trim();
  if (!글) return [];

  return 글.split('\n').map(function (줄) {
    const 조각 = 줄.replace(/^[·\-\s]+/, '').split('—');
    if (조각.length < 2) return null;
    const 이름 = 조각[0].trim();
    const 값 = Number(조각[1].replace(/[^0-9]/g, '')) || 0;
    return 이름 ? { n: 이름, q: 1, p: 값 } : null;
  }).filter(function (x) { return x; });
}


function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    // 스팸봇 차단 — 사람에게는 보이지 않는 칸이 채워져 있으면 무시
    if (d.website) return json({ ok: true });

    const 접수시각 = d.at || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    /* 1) 구글시트에 기록 */
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(['접수시각', '성함/상호', '연락처', '이메일', '필요 서비스', '문의 내용', '예상 견적', '견적 상세']);
      sh.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#FBF0D5');
      sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 140); sh.setColumnWidth(3, 130);
      sh.setColumnWidth(4, 190); sh.setColumnWidth(5, 150); sh.setColumnWidth(6, 300);
      sh.setColumnWidth(7, 110); sh.setColumnWidth(8, 360);
      sh.setFrozenRows(1);
    }
    sh.appendRow([
      접수시각,
      d.name || '',
      d.phone || '',
      d.email || '',
      d.service || '',
      d.message || '',
      d.total || '',
      d.quote || ''
    ]);

    /* 이 시트의 '문의접수' 탭으로 바로 가는 주소 */
    const 시트주소 = ss.getUrl() + '#gid=' + sh.getSheetId();

    /* 2) 이메일 알림 */
    const tel = String(d.phone || '').replace(/[^0-9]/g, '');
    const html =
      '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Malgun Gothic\',sans-serif;max-width:600px">' +

        '<div style="background:#07090F;color:#EDEAE3;border-radius:14px;padding:18px 22px;margin-bottom:20px">' +
          '<div style="font-size:11px;letter-spacing:.2em;color:#E8B84B;font-weight:bold">NEW INQUIRY</div>' +
          '<div style="font-size:20px;font-weight:bold;margin-top:5px">' + esc(d.name || '이름 없음') + ' 님의 문의</div>' +
          '<div style="font-size:13px;color:#9AA3B2;margin-top:4px">' + esc(d.service || '') + '</div>' +
        '</div>' +

        (d.total
          ? '<div style="background:#FBF6E8;border:1px solid #E8D9A8;border-radius:12px;padding:14px 18px;margin-bottom:18px">' +
              '<div style="font-size:11px;letter-spacing:.14em;color:#9A7B1F;font-weight:bold">고객이 계산한 예상 견적</div>' +
              '<div style="font-size:24px;font-weight:bold;color:#8A6A12;margin-top:4px">' + esc(d.total) + '</div>' +
            '</div>'
          : '') +

        '<table style="width:100%;border-collapse:collapse;font-size:15px">' +
          row('성함/상호', esc(d.name)) +
          row('연락처', tel ? '<a href="tel:' + tel + '" style="color:#B98A22;font-weight:bold;text-decoration:none">' + esc(d.phone) + '</a>' : '(없음)') +
          row('이메일', d.email ? '<a href="mailto:' + esc(d.email) + '" style="color:#B98A22">' + esc(d.email) + '</a>' : '(없음)') +
          row('필요 서비스', esc(d.service)) +
          row('문의 내용', esc(d.message || '(없음)').replace(/\n/g, '<br>')) +
          row('접수시각', esc(접수시각)) +
        '</table>' +

        (d.quote
          ? '<div style="margin-top:18px">' +
              '<div style="font-size:12px;color:#666;font-weight:bold;margin-bottom:6px">견적 상세</div>' +
              '<pre style="background:#F7F7F8;border:1px solid #E4E4E7;border-radius:10px;padding:14px;' +
              'font-size:13px;line-height:1.7;white-space:pre-wrap;margin:0;font-family:inherit">' + esc(d.quote) + '</pre>' +
            '</div>'
          : '') +

        /* 다음에 할 일 — 문의를 받고 나서 바로 견적서로 넘어갈 수 있게 */
        '<div style="margin-top:22px;background:#FDF8EC;border:1px solid #F0DFB4;border-radius:12px;padding:16px 18px">' +
          '<div style="font-size:12px;color:#8A6512;font-weight:bold;letter-spacing:.04em;margin-bottom:10px">다음 단계</div>' +
          다음단추(d) +
          '<div style="font-size:12.5px;color:#8A7B57;margin-top:6px;line-height:1.6">' +
            '<b>발행된 명함 보기</b>(명함 알림일 때) — 신청 · 접수 문자 없이 손님이 바로 발행한 명함입니다. 열어 보고 홈페이지 · 콜백 문자를 권해 보세요.<br>' +
            '<b>무료 데모 만들기</b> — 문의 내용이 채워진 채 열립니다. 업종 · 지역만 확인하고 「문자로 보내기」.<br>' +
            '<b>견적서 작성</b> — 고객 정보가 채워진 채 열립니다. 요금제와 옵션만 고르고, 「이 견적으로 계약서 작성」으로 계약서까지.' +
          '</div>' +
        '</div>' +

        '<p style="margin-top:18px">' +
          (tel
            ? '<a href="tel:' + tel + '" style="display:inline-block;background:#0F1720;color:#EDEAE3;' +
              'text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;margin-right:8px">📞 바로 전화 걸기</a>'
            : '') +
          '<a href="' + 시트주소 + '" style="display:inline-block;background:#F4F4F5;color:#3F3F46;' +
          'text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px">📋 전체 문의 목록 보기</a>' +
        '</p>' +

        '<p style="color:#8A8A93;font-size:12.5px;margin-top:20px;border-top:1px solid #eee;padding-top:12px">' +
          BRAND + ' 홈페이지 문의폼에서 자동 발송된 메일입니다.<br>' +
          (d.page ? '<span style="color:#B4B4BC;font-size:11.5px">' + esc(d.page) + '</span>' : '') +
        '</p>' +
      '</div>';

    MailApp.sendEmail({
      to: TO_EMAIL,
      subject: '[' + BRAND + ' 문의] ' + (d.name || '이름없음') + ' 님' + (d.total ? ' · ' + d.total : ''),
      htmlBody: html,
      name: BRAND + ' 문의접수',
      replyTo: d.email || undefined
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* 브라우저에서 URL 을 직접 열었을 때 — 동작 확인 + 시트 바로가기 */
function doGet(e) {
  // 배포가 최신인지 확인: …/exec?ping=1 → {"ok":true,"version":"…"}
  if (e && e.parameter && e.parameter.ping) return json({ ok: true, service: BRAND + ' 문의', version: VERSION, buttons: ['견적서', '데모', '발행된 명함 보기'] });
  let 시트주소 = '';
  try { 시트주소 = SpreadsheetApp.getActiveSpreadsheet().getUrl(); } catch (e) {}
  const html =
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Malgun Gothic\',sans-serif;' +
    'max-width:460px;margin:60px auto;padding:0 20px;text-align:center">' +
      '<div style="font-size:15px;color:#2E7D32;font-weight:bold">✅ ' + BRAND + ' 문의폼 수신 서버 정상</div>' +
      (시트주소
        ? '<p style="margin-top:26px"><a href="' + 시트주소 + '" style="display:inline-block;' +
          'background:#0F1720;color:#EDEAE3;text-decoration:none;font-weight:bold;' +
          'padding:14px 28px;border-radius:12px">📋 문의 목록 시트 열기</a></p>'
        : '<p style="color:#B00020;margin-top:20px">시트를 찾지 못했습니다. 이 스크립트가 구글시트 안에서 만들어졌는지 확인해 주세요.</p>') +
      '<p style="color:#8A8A93;font-size:12.5px;margin-top:22px">이 주소를 즐겨찾기 해두면 언제든 문의 목록을 열 수 있습니다.</p>' +
    '</div>';
  return HtmlService.createHtmlOutput(html).setTitle(BRAND + ' 문의 접수');
}


/* ── 보조 함수 ── */
function row(label, value) {
  return '<tr>' +
    '<td style="padding:10px 12px;background:#FBF9F4;font-weight:bold;color:#3A3222;' +
    'width:110px;border:1px solid #EAE4D6;vertical-align:top">' + label + '</td>' +
    '<td style="padding:10px 12px;border:1px solid #EAE4D6">' + (value || '') + '</td></tr>';
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
