/* 업종별 마케팅 안내 페이지 생성기 — node build-marketing.js
 * marketing/index.html (목록) + marketing/event · hospital · small /index.html
 * 요금은 index.html 의 「온라인 마케팅 패키지」와 같아야 한다(10회 월 15만 · 25회 월 30만 · 연간 150만 / 300만).
 * 퍼널·광고 운영·성과금은 상담 후 견적이라 계산기 · 계약서 옵션에 없다(넣으려면 일곱 곳을 같이 고칠 것).
 * 병원 페이지에는 건당 성과금을 넣지 않는다(의료법 제27조 제3항 환자 소개·알선·유인 금지와 충돌할 소지). */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const SITE = 'https://www.ai-make.co.kr/';

const 공통기대 = [
  ['검색에 잡히기까지 시간이 걸립니다', '글이 쌓여 검색에 잡히기까지 보통 수개월이 걸립니다. 첫 3개월은 기반을 만드는 기간이라, 문의 몇 건을 약속하지 않습니다.'],
  ['사장님의 실제 자료가 필요합니다', '사진 · 사례 · 가격 같은 실제 자료를 받아서 씁니다. 자료 없이 글만 찍어내면 검색에서 오히려 밀립니다. 월 1~2번 자료를 주실 수 있어야 효과가 납니다.'],
  ['성과는 숫자로 보여 드립니다', '「유효 문의」(연락처와 필요한 정보를 채운 요청)를 매달 세어 보고서로 드립니다. 중복과 스팸은 뺍니다.'],
];

const T = {
  event: {
    dir: 'event', tag: '이벤트 회사 · 대행사 · 기획사', color: '',
    title: '이벤트 회사 홈페이지 마케팅 — 행사 문의가 오게 만드는 월 관리',
    desc: '홈페이지만 만들고 끝내지 않습니다. 행사 대행사 · 기획사를 위한 네이버 블로그 · 인스타 · 검색 관리와 견적 요청 퍼널을 월 15만원부터. 큰길이벤트기획을 직접 운영하는 큰길브리지가 합니다.',
    h1: '행사 문의가<br><span class="gold">끊기지 않게</span> 만듭니다',
    lead: '홈페이지를 만들었는데 문의가 없다면, 손님이 들어오는 <b style="color:var(--txt)">길</b>이 없는 것입니다. 저희는 행사 회사(큰길이벤트기획)를 직접 운영해서, 담당자가 무엇을 검색하고 무엇을 보고 연락하는지 압니다.',
    pains: [
      ['검색에 안 나옵니다', '「○○ 행사 대행」을 검색하는 담당자는 있는데, 우리 회사는 결과에 없습니다.'],
      ['문의가 전화에만 의존', '전화를 못 받으면 놓치고, 행사 날짜 · 예산을 다시 물어보느라 시간을 씁니다.'],
      ['시즌에만 바쁩니다', '축제 철이 지나면 비는 달이 생깁니다. 평소에도 들어오는 문의가 필요합니다.'],
    ],
    calc: { rate: 20, price: 300, fee: 30, priceLabel: '평균 계약 금액(만원)', rateLabel: '문의 → 계약 성사율', inqWord: '계약' },
    feeNote: '행사는 계약 한 건이 커서, 문의 1~2건만 더 와도 월 마케팅비를 넘기는 업종입니다.',
    biz: { n: '유효 문의', d: ['이름', '연락처', '행사 날짜', '예산'] },
    perf: '이벤트 회사는 <b>유효 문의 1건당 3만원</b>(MC · 가수는 2만원)의 성과금을 선택할 수 있습니다. 월 상한은 계약 때 정하고, 문의가 협의한 건수에 못 미치면 첫 3개월은 다음 달 운영비를 이월 면제합니다.',
    special: null,
    road: [['1주차', '현황 점검 · 키워드 · 경쟁사 조사 · 견적 요청 폼 세팅'], ['2~4주차', '블로그 · 인스타 발행 시작 · 유입 기록 켜기 · 첫 문의 응대 점검'], ['2개월차', '잘 되는 글 · 채널에 집중 · 성과 보고서 1차'], ['3개월차', '성과 점검 · 광고 확대 여부 결정 · 계속 여부 상담']],
    sib: [['병원', '../hospital/'], ['소상공인', '../small/']],
  },
  hospital: {
    dir: 'hospital', tag: '병원 · 의원 · 한의원 · 치과', color: '',
    title: '병원 홈페이지 마케팅 — 의료광고 기준 안에서 예약이 쉬운 동선 | 큰길브리지',
    desc: '병·의원 홈페이지는 위치 · 진료시간 · 진료 안내 · 예약 동선이 전부입니다. 후기 · 전후 사진 없이, 의료광고 기준 안에서 월정액으로 운영합니다.',
    h1: '진료 안내가 잘 보이고<br><span class="gold">예약이 쉬운</span> 병원 홈페이지',
    lead: '환자는 병원을 고르기 전에 검색하고 비교합니다. 그때 <b style="color:var(--txt)">위치 · 진료시간 · 진료 안내 · 예약 방법</b>이 바로 보이게 하는 것이 핵심입니다. 의료광고 규정 안에서만 운영합니다.',
    pains: [
      ['위치 · 진료시간이 불편하게 나옴', '지도와 전화번호를 찾느라 이탈하는 환자가 생깁니다.'],
      ['예약이 전화뿐', '점심 · 진료 중에는 전화를 못 받아 예약이 새어 나갑니다.'],
      ['광고 문구가 불안', '후기 · 전후 사진 같은 금지 표현을 모르고 올려 문제가 될 수 있습니다.'],
    ],
    calc: { rate: 50, price: 30, fee: 45, priceLabel: '1인 평균 진료비(만원 · 입력값)', rateLabel: '예약 요청 → 내원율', inqWord: '내원' },
    feeNote: '진료과와 진료비에 따라 크게 다릅니다. 숫자는 병원 상황에 맞게 바꿔 보세요.',
    biz: { n: '예약 요청', d: ['이름', '연락처', '희망 진료과', '희망 일시'], note: '증상 · 병력 같은 민감정보는 받지 않습니다.' },
    perf: '병원은 <b>건당 성과금을 받지 않고 월정액으로만</b> 운영합니다. 환자 소개 · 유인의 대가로 오해받을 수 있고, 의료법 제27조 제3항(영리 목적의 환자 소개 · 알선 · 유인 금지) 때문입니다.',
    special: {
      t: '의료광고, 이렇게 지킵니다',
      items: ['치료 경험담 · 후기 · 체험단 모집은 하지 않습니다.', '치료 전후 사진, 환부 사진은 올리지 않습니다.', '「최고」 · 「유일」 같은 비교 · 과장 표현, 환자 유인으로 보일 수 있는 할인 문구를 쓰지 않습니다.', '광고를 집행하기 전에 매체별 의료광고 기준을 병원과 함께 확인합니다. 의료광고의 주체는 의료기관이므로 최종 책임은 의료기관에 있고, 계약서에 명시합니다.'],
    },
    road: [['1주차', '현황 점검 · 진료 안내 · 위치 정보 정리 · 예약 동선 설계'], ['2~4주차', '정보성 글 발행 · 유입 기록 켜기 · 예약 폼 점검(증상 · 병력 입력칸 없음)'], ['2개월차', '검색어별 유입 분석 · 성과 보고서 1차'], ['3개월차', '광고 집행 여부 결정(의료광고 기준 확인 후) · 계속 여부 상담']],
    sib: [['이벤트 회사', '../event/'], ['소상공인', '../small/']],
  },
  small: {
    dir: 'small', tag: '소상공인 · 가게 · 1인 사업자', color: '',
    title: '소상공인 홈페이지 마케팅 — 네이버 검색에 나오는 월 15만원 | 큰길브리지',
    desc: '성과금 없이 월 정액만. 네이버 블로그 · 인스타 · 정보 칼럼으로 우리 가게가 검색에 나오게 만듭니다. 광고는 권하지 않습니다.',
    h1: '검색하면 우리 가게가<br><span class="gold">나오게</span> 만드는 월 15만원',
    lead: '큰 광고 대신 <b style="color:var(--txt)">네이버에서 찾아오는 손님</b>부터 만듭니다. 성과금 없이 월 정액만 받고, 복잡한 광고는 권하지 않습니다.',
    pains: [
      ['글 쓸 시간이 없습니다', '블로그 · 홍보는 해야 하는 걸 알지만 매번 밀립니다.'],
      ['광고비가 무섭습니다', '얼마가 나가는지 모르는 광고는 시작하기 겁납니다.'],
      ['문의가 카톡에 흩어짐', '어디서 온 손님인지 몰라 뭘 해야 할지 모릅니다.'],
    ],
    calc: { rate: 40, price: 6, fee: 15, priceLabel: '손님 1명당 평균 결제(만원 · 입력값)', rateLabel: '문의 → 방문 · 주문율', inqWord: '방문·주문' },
    feeNote: '객단가가 낮은 가게는 본전 문의 수가 많아집니다. 솔직히, 객단가가 낮고 재방문이 없는 가게에는 권하지 않습니다.',
    biz: { n: '문의', d: ['이름', '연락처', '문의 내용'] },
    perf: '소상공인은 <b>성과금이 없습니다</b>. 건당 금액이 작아 월 정액만 받는 편이 사장님께 안전합니다. 광고비를 쓰는 운영은 원하실 때만 따로 상담합니다.',
    special: {
      t: '이런 가게에 맞습니다',
      items: ['객단가가 높거나 한 번 오면 오래 이어지는 곳 — 미용 · 학원 · 인테리어 · 펜션 · 수리 · 렌탈 · 공방', '검색해서 찾아오는 손님이 있는 곳(지역 + 업종으로 검색되는 곳)', '월 1~2번 사진과 소식을 주실 수 있는 곳'],
    },
    road: [['1주차', '가게 정보 · 키워드 정리 · 네이버 플레이스 점검'], ['2~4주차', '블로그 발행 시작 · 문의 경로 표시(전화 · 카톡 · 폼)'], ['2개월차', '어떤 글로 손님이 오는지 확인 · 보고서 1차'], ['3개월차', '계속 여부 상담 · 글 횟수 조정(강요 없음)']],
    sib: [['이벤트 회사', '../event/'], ['병원', '../hospital/']],
  },
};

const CSS = `
.hero{position:relative;padding:54px 0 60px;overflow:hidden;background:radial-gradient(900px 480px at 80% 0,rgba(232,184,75,.18),transparent 60%),radial-gradient(700px 480px at -5% 40%,rgba(63,211,198,.10),transparent 60%)}
.hero .btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}
.pcard h3{margin:6px 0}.pcard p{color:var(--dim);font-size:.95rem}
.flow{display:grid;gap:12px;margin-top:26px;counter-reset:s}
@media(min-width:760px){.flow{grid-template-columns:repeat(4,1fr)}}
.flow>div{background:var(--ink-3);border:1px solid var(--line);border-radius:var(--r);padding:20px 18px;counter-increment:s}
.flow>div:before{content:counter(s);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--ink);font-weight:800;font-size:.85rem;margin-bottom:10px}
.flow p{font-size:.9rem;color:var(--dim);margin-top:4px}
.honest li{list-style:none;padding:14px 0 14px 34px;position:relative;border-bottom:1px solid var(--line)}
.honest li:before{content:"!";position:absolute;left:0;top:15px;width:22px;height:22px;border-radius:50%;background:rgba(255,107,74,.15);color:var(--coral);text-align:center;line-height:22px;font-weight:800;font-size:.8rem}
.honest b{display:block}.honest span{color:var(--dim);font-size:.94rem}
.be{display:grid;gap:18px;margin-top:24px}
@media(min-width:800px){.be{grid-template-columns:1fr 1fr}}
.be .box{background:var(--ink-3);border:1px solid var(--line);border-radius:var(--r);padding:22px}
.be label{display:block;font-size:.88rem;color:var(--dim);margin-top:14px}
.be label:first-child{margin-top:0}
.be label b{float:right;color:var(--txt)}
.be input[type=range]{width:100%;accent-color:var(--gold)}
.bign{font-size:clamp(2rem,6vw,2.8rem);font-weight:800;color:var(--gold);letter-spacing:-.03em;line-height:1.1;margin:8px 0}
.pk{display:grid;gap:14px;margin-top:22px}
@media(min-width:760px){.pk{grid-template-columns:1fr 1fr}}
.pk .card h3{color:var(--gold);font-size:.95rem;letter-spacing:.04em}
.pk .pr{font-size:1.7rem;font-weight:800;margin:4px 0}
.pk .pr small{font-size:.9rem;color:var(--dim);font-weight:600}
.pk ul,.ck{list-style:none;margin-top:10px}
.pk li,.ck li{padding:8px 0 8px 22px;position:relative;font-size:.93rem;border-top:1px solid var(--line)}
.pk li:before,.ck li:before{content:"✓";position:absolute;left:0;color:var(--teal);font-weight:800}
.line2{display:flex;justify-content:space-between;gap:12px;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--ink-2);font-size:.92rem;margin-top:8px}
.line2 span{color:var(--dim)}.line2 b{text-align:right}
.tl{margin-top:24px;border-left:2px solid var(--line);margin-left:8px}
.tl div{position:relative;padding:0 0 22px 24px}
.tl div:before{content:"";position:absolute;left:-7px;top:7px;width:12px;height:12px;border-radius:50%;background:var(--gold)}
.tl b{color:var(--gold);font-size:.85rem}
.sibs{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:18px}
.fine{font-size:.8rem;color:var(--mute);margin-top:14px;line-height:1.8}
`;

const HEAD = (title, desc, url) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${SITE}og.png">
<link rel="icon" href="${SITE}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="__CSS__funnel.css">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="${SITE}"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M2 30 C 10 12, 30 12, 38 30" stroke="#E8B84B" stroke-width="2.4" stroke-linecap="round"/><path d="M2 30 H38" stroke="#3FD3C6" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="17" r="2.8" fill="#E8B84B"/></svg>큰길브리지</a>
  <a class="tel" href="tel:1533-7295">무료상담 <b>1533-7295</b></a>
</div></header>
`;

const FOOT = `<footer class="foot"><div class="wrap">
  <span>(주)브리지미디어</span><span>큰길브리지</span><span>대표 김효민</span><span>사업자등록번호 813-81-02252</span><span>대표번호 1533-7295</span><br>
  <span>전남광주통합특별시 광양시 광양읍 강변동길 1, 2층</span><span><a href="${SITE}">www.ai-make.co.kr</a></span>
  <br><span><a href="${SITE}policy/#terms">이용약관</a></span><span><a href="${SITE}policy/#privacy"><b>개인정보처리방침</b></a></span><span>gilauto325@gmail.com</span>
</div></footer>
<script defer src="${SITE}stats/stats.js" data-site="ai-make"></script>
</body></html>
`;

const 패키지 = `
<div class="pk">
  <div class="card"><h3>콘텐츠 10회</h3><div class="pr">월 15만원 <small>· 연간 케어팩 150만원</small></div>
    <ul><li>네이버 블로그 기사 10회</li><li>인스타 · 페이스북 · 스레드 홍보 10회</li><li>정보 칼럼 10회</li><li>AI 검색 트래픽 관리 · 월간 보고서</li></ul></div>
  <div class="card"><h3>콘텐츠 25회</h3><div class="pr">월 30만원 <small>· 연간 케어팩 300만원</small></div>
    <ul><li>네이버 블로그 기사 25회</li><li>인스타 · 페이스북 · 스레드 홍보 25회</li><li>정보 칼럼 25회</li><li>AI 검색 트래픽 관리 · 격주 보고서</li></ul></div>
</div>
<p class="fine">연간 케어팩은 12개월을 10개월 가격으로 선결제합니다. 모두 VAT 별도. 홈페이지를 큰길브리지에서 만드신 분 대상이며, 회사형은 요금 계산기에서 바로 고를 수 있고 베이직 · 고급형은 상담으로 추가합니다.</p>`;

const 문의늘리기 = (병원) => `
<h3 style="margin-top:34px">문의를 더 늘리고 싶다면 <span class="mute" style="font-size:.85rem;font-weight:600">· 상담 후 견적</span></h3>
<div class="line2"><span>견적 요청 · 예약 퍼널 세팅(1회)</span><b>30만원부터</b></div>
<div class="line2"><span>퍼널 운영 · 월간 보고서</span><b>월 15만원부터</b></div>
<div class="line2"><span>광고 운영 대행</span><b>광고비의 15% 안팎 · 월 최소 30만원</b></div>
<div class="line2"><span>광고비</span><b>실비 · 고객 명의 계정에 고객 카드로 직접 결제</b></div>
<p class="fine">광고비는 저희가 받아서 집행하지 않습니다.${병원 ? ' 병원은 광고를 집행하기 전에 의료광고 기준을 먼저 확인합니다.' : ''} 금액은 업종과 지역을 본 뒤 확정합니다.</p>`;

function 페이지(t) {
  const c = t.calc;
  const 단위 = c.inqWord;
  return HEAD(t.title.includes('|') ? t.title : t.title + ' | 큰길브리지', t.desc, 'marketing/' + t.dir + '/').split('__CSS__').join('../../') + `
<section class="hero"><div class="wrap">
  <span class="eyebrow">${t.tag} 마케팅</span>
  <h1>${t.h1}</h1>
  <p class="lead" style="max-width:700px">${t.lead}</p>
  <div class="btns"><a class="btn gold" href="${SITE}#contact">무료로 현재 상태 점검받기 →</a><a class="btn" href="tel:1533-7295">전화 1533-7295</a></div>
</div></section>

<section class="sec alt"><div class="wrap">
  <span class="eyebrow">이런 고민</span><h2>혹시 이런 상태이신가요?</h2>
  <div class="grid g3" style="margin-top:22px">${t.pains.map(p => `<div class="card pcard"><h3>${p[0]}</h3><p>${p[1]}</p></div>`).join('')}</div>
</div></section>

<section class="sec"><div class="wrap">
  <span class="eyebrow">구조</span><h2>손님이 들어오는 길, 네 칸으로 만듭니다</h2>
  <div class="flow">
    <div><h3>찾게 한다</h3><p>네이버 블로그 · 지역 검색에 글이 쌓여 발견됩니다.</p></div>
    <div><h3>믿게 한다</h3><p>홈페이지와 실제 사례로 「맡겨도 되겠다」를 만듭니다.</p></div>
    <div><h3>문의하게 한다</h3><p>견적 · 예약 폼으로 필요한 정보까지 한 번에 받습니다.</p></div>
    <div><h3>기록한다</h3><p>어디서 온 문의인지 매달 보고서로 확인합니다.</p></div>
  </div>
</div></section>

<section class="sec alt"><div class="wrap">
  <span class="eyebrow">솔직하게</span><h2>시작하기 전에, 미리 말씀드립니다</h2>
  <ul class="honest" style="margin-top:14px">${공통기대.map(x => `<li><b>${x[0]}</b><span>${x[1]}</span></li>`).join('')}</ul>
</div></section>

<section class="sec"><div class="wrap">
  <span class="eyebrow">본전 계산</span><h2>한 달에 문의가 몇 건이면 본전일까요?</h2>
  <p class="lead" style="margin-top:10px">숫자를 ${t.tag}의 실제 값으로 바꿔 보세요. <b style="color:var(--txt)">마케팅비를 벌려면 필요한 문의 수</b>만 계산합니다. 매출 보장이 아닙니다.</p>
  <div class="be">
    <div class="box">
      <label>${c.rateLabel} <b id="bv"></b></label><input type="range" id="b" min="5" max="100" value="${c.rate}">
      <label>${c.priceLabel} <b id="cv"></b></label><input type="range" id="c" min="1" max="${t.dir === 'event' ? 1000 : t.dir === 'hospital' ? 200 : 30}" value="${c.price}">
      <label>월 마케팅비(만원) <b id="fv"></b></label><input type="range" id="f" min="15" max="90" step="5" value="${c.fee}">
    </div>
    <div class="box">
      <div class="dim" style="font-size:.9rem">본전이 되려면, 한 달에 필요한 문의</div>
      <div class="bign" id="need"></div>
      <div class="dim" id="explain" style="font-size:.92rem"></div>
      <p class="fine">${t.feeNote}<br>홈페이지 제작비와 광고비는 계산에 넣지 않았습니다. 이익이 아니라 마케팅비 회수 기준입니다.</p>
    </div>
  </div>
</div></section>

<section class="sec alt"><div class="wrap">
  <span class="eyebrow">요금</span><h2>월 패키지</h2>
  ${패키지}
  ${문의늘리기(t.dir === 'hospital')}
  <div class="card" style="margin-top:24px"><h3 style="margin-bottom:6px">성과는 「${t.biz.n}」로 셉니다</h3>
    <p class="dim" style="font-size:.95rem">다음을 채운 요청만 유효 문의로 세고, 중복과 스팸은 뺍니다: <b style="color:var(--txt)">${t.biz.d.join(' · ')}</b>${t.biz.note ? '<br><span class="mute">' + t.biz.note + '</span>' : ''}</p>
    <p style="margin-top:12px;font-size:.95rem">${t.perf}</p></div>
</div></section>

${t.special ? `<section class="sec"><div class="wrap"><span class="eyebrow">${t.dir === 'hospital' ? '의료광고' : '대상'}</span><h2>${t.special.t}</h2><ul class="ck" style="margin-top:14px">${t.special.items.map(x => `<li>${x}</li>`).join('')}</ul></div></section>` : ''}

<section class="sec${t.special ? ' alt' : ''}"><div class="wrap">
  <span class="eyebrow">진행</span><h2>처음 3개월, 이렇게 진행합니다</h2>
  <div class="tl">${t.road.map(r => `<div><b>${r[0]}</b><p>${r[1]}</p></div>`).join('')}</div>
</div></section>

<section class="sec${t.special ? '' : ' alt'}"><div class="wrap center">
  <span class="eyebrow">다음 단계</span><h2>먼저 현재 상태를 무료로 점검해 드립니다</h2>
  <p class="lead" style="max-width:560px;margin:14px auto 0">검색 노출 · 홈페이지 · 문의 동선을 확인하고 맞는 패키지를 권해 드립니다. 강요하지 않습니다.</p>
  <div class="btns" style="justify-content:center;display:flex;gap:10px;flex-wrap:wrap;margin-top:24px"><a class="btn gold" href="${SITE}#contact">무료 점검 신청 →</a><a class="btn" href="${SITE}seo-check/">내 사이트 SEO 점검기</a></div>
  <div class="sibs">${t.sib.map(s => `<a class="btn" href="${s[1]}">${s[0]} 마케팅 보기</a>`).join('')}</div>
  <p class="fine" style="max-width:640px;margin:22px auto 0">계산은 예시이며 성과를 보장하지 않습니다. 금액은 VAT 별도입니다. 광고비는 고객 명의 · 고객 카드로 직접 결제합니다.</p>
</div></section>

${FOOT.replace('</body></html>', '')}
<script>
(function(){
  function $(i){return document.getElementById(i)}
  var b=$('b'),c=$('c'),f=$('f');
  function 천(n){return Math.round(n).toLocaleString('ko-KR')}
  function upd(){
    var r=+b.value,p=+c.value,fee=+f.value;
    $('bv').textContent=r+'%';$('cv').textContent=천(p)+'만원';$('fv').textContent=천(fee)+'만원';
    var per=r/100*p;
    var need=Math.ceil(fee/per);
    $('need').textContent=need+'건';
    $('explain').textContent='문의 1건의 기대 매출은 '+(Math.round(per*10)/10)+'만원 → 월 '+fee+'만원을 회수하려면 문의 '+need+'건이 필요합니다.';
  }
  [b,c,f].forEach(function(e){e.addEventListener('input',upd)});upd();
})();
</script>
</body></html>
`;
}

function 목록() {
  const 카드 = [
    ['event', '1', '이벤트 회사 · 대행사 · 기획사', '행사 문의가 끊기지 않게. 유효 문의 성과금 선택 가능.'],
    ['hospital', '2', '병원 · 의원 · 한의원 · 치과', '의료광고 기준 안에서, 월정액으로 예약 동선 관리.'],
    ['small', '3', '소상공인 · 가게', '성과금 없이 월 15만원부터. 네이버 검색에 나오게.'],
  ];
  return HEAD('홈페이지 마케팅 — 만들고 끝내지 않고 문의가 오게 | 큰길브리지', '홈페이지 제작 뒤의 마케팅. 이벤트 회사 · 병원 · 소상공인 업종별 월 관리 안내와 본전 계산기.', 'marketing/').split('__CSS__').join('../') + `
<section class="hero"><div class="wrap">
  <span class="eyebrow">홈페이지 마케팅</span>
  <h1>홈페이지는 <span class="gold">시작</span>일 뿐,<br>문의가 와야 합니다</h1>
  <p class="lead" style="max-width:680px">업종마다 손님이 찾는 길이 다릅니다. 업종을 고르면 그 업종에 맞는 마케팅 구성과 요금, 지켜야 할 것을 보여 드립니다.</p>
</div></section>
<section class="sec alt"><div class="wrap">
  <div class="grid g3">${카드.map(k => `<a class="card" href="${k[0]}/" style="text-decoration:none;display:block"><span class="eyebrow">${k[1]}</span><h3 style="font-size:1.2rem">${k[2]}</h3><p class="dim" style="font-size:.94rem;margin-top:8px">${k[3]}</p><p class="gold" style="margin-top:14px;font-weight:700">자세히 보기 →</p></a>`).join('')}</div>
</div></section>
<section class="sec"><div class="wrap">
  <span class="eyebrow">공통 원칙</span><h2>어느 업종이든 이렇게 합니다</h2>
  <ul class="honest" style="margin-top:14px">${공통기대.map(x => `<li><b>${x[0]}</b><span>${x[1]}</span></li>`).join('')}</ul>
  <p class="fine">광고비는 고객 명의 · 고객 카드로 직접 결제합니다. 성과를 보장하지 않으며, 금액은 VAT 별도입니다.</p>
</div></section>
<section class="sec alt"><div class="wrap center"><h2>어느 쪽인지 모르겠다면</h2>
  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:22px"><a class="btn gold" href="${SITE}#contact">무료 점검 신청 →</a><a class="btn" href="tel:1533-7295">전화 1533-7295</a></div></div></section>
${FOOT}`;
}

fs.mkdirSync(path.join(root, 'marketing'), { recursive: true });
fs.writeFileSync(path.join(root, 'marketing', 'index.html'), 목록());
for (const k of Object.keys(T)) {
  const d = path.join(root, 'marketing', T[k].dir);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), 페이지(T[k]));
}
console.log('marketing/ 4장 생성');
