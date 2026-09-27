/*
  큰길브리지 전자명함 — 명함 한 장을 그리는 틀.

  이 파일 하나를 두 곳이 같이 읽는다:
    · 만들기 화면(card/index.html) — 미리보기
    · 명함 서버(apps-script/card/Code.gs) — 발행할 때 https://www.ai-make.co.kr/card/template.js 를 읽어 이 함수로 그린다
  그래서 보이는 것과 나가는 것이 어긋나지 않고, 서버는 남이 보낸 HTML 을 받지 않는다(자료만 받아 여기서 그린다).

  지킬 것: document · window 를 건드리지 않는다(서버에서도 돈다). 글자는 반드시 esc() 를 거친다.
          <script> 안에 넣는 값은 스크립트안() 을 거친다 — 이름에 </script> 를 넣어 빠져나오지 못하게.
*/
const esc = (s) => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/* <script> 안에 값을 넣을 때 — JSON 으로 만들고 < 와 줄 끝 글자를 풀어 쓴다 */
const 스크립트안 = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/* 명함은 큰길브리지(분양 브랜드) 아래 둔다. 행사팀에게 파는 물건이라 큰길이벤트가 아니다. */
const 집   = 'https://www.ai-make.co.kr';

/* 명함 윗부분 색. 어두운 바탕에 흰 글씨라 어느 것이든 글씨가 또렷하다. */
const 색들 = [
  { id:'navy',  bg:'#1B2A4A', bg2:'#132038' },
  { id:'ink',   bg:'#1F1D28', bg2:'#141219' },
  { id:'amber', bg:'#7A4A0B', bg2:'#5A3608' },
  { id:'green', bg:'#14432F', bg2:'#0D2E20' },
  { id:'wine',  bg:'#4A1626', bg2:'#340F1B' },
  { id:'steel', bg:'#26343D', bg2:'#1A242B' },
];

const 전화숫자 = (s) => String(s||'').replace(/[^0-9+]/g,'');

/* ── 아이콘 — 그림 파일 없이 글자처럼 쓴다 ─────────────────────── */
const 아이콘 = {
  tel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-9h.6a8.4 8.4 0 0 1 8 8z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  web:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
};

/* ── vCard — 폰 주소록에 그대로 들어간다 ───────────────────────── */
function vcard(d){
  const L = ['BEGIN:VCARD','VERSION:3.0'];
  L.push('N:' + (d.n||'') + ';;;;');
  L.push('FN:' + (d.n||''));
  if(d.c)  L.push('ORG:' + d.c);
  if(d.t)  L.push('TITLE:' + d.t);
  if(d.p)  L.push('TEL;TYPE=CELL:' + d.p);
  if(d.p2) L.push('TEL;TYPE=WORK:' + d.p2);
  if(d.e)  L.push('EMAIL:' + d.e);
  if(d.w)  L.push('URL:' + (/^https?:/i.test(d.w)?d.w:'https://'+d.w));
  if(d.a)  L.push('ADR;TYPE=WORK:;;' + d.a + ';;;;');
  const 메모 = [d.b, (d.g||[]).join(' · '), d.k?('카카오톡 '+d.k):''].filter(Boolean).join(' / ');
  if(메모) L.push('NOTE:' + 메모);
  L.push('END:VCARD');
  return L.join('\r\n');
}

/* ── 명함 한 장을 통째로 만든다 ─────────────────────────────────
   미리보기와 발행이 같은 함수를 쓴다. 보이는 것과 나가는 것이 어긋나면 안 된다. */
function 명함HTML(d, opt){
  opt = opt || {};
  const 색 = 색들.find(c=>c.id===d.col) || 색들[0];
  const 사진주소 = opt.photo || '';     // 인물 — 작은 원
  const 배경주소 = opt.bg    || '';     // 배경 — 크게 깔리는 것
  const og  = opt.og  || '';
  const url = opt.url || '';
  /* 명함 이름(주소의 마지막 칸). 미리보기(url 없음)에서는 비어 있고, 그러면 좋아요 · 댓글 자리에 안내만 보인다 */
  const 주소 = (/\/card\/([a-z0-9][a-z0-9-]*)\/?$/.exec(url) || [])[1] || '';
  /* 구워 넣는 좋아요 · 댓글 — 서버가 댓글이 달린 뒤 명함을 다시 그릴 때 넣어 준다(opt.social).
     검색엔진은 스크립트가 나중에 불러오는 글을 잘 못 보므로, 여기 박힌 글만 검색에 잡힌다. */
  const 소셜 = opt.social && typeof opt.social === 'object' ? opt.social : null;
  const 댓글들 = 소셜 && Array.isArray(소셜.comments) ? 소셜.comments.slice(0, 50) : [];
  const 이름 = d.n || '이름';
  const 소속 = [d.c, d.t].filter(Boolean).join(' · ');

  const 줄 = [];
  const 넣기 = (ico, 라벨, 값, href) => { if(!값) return;
    const 안 = `<span class="ic">${아이콘[ico]}</span><span class="tx"><span class="lb">${라벨}</span><span class="vl">${esc(값)}</span></span>`;
    줄.push(href ? `<a class="r" href="${esc(href)}">${안}<span class="go">›</span></a>` : `<div class="r">${안}</div>`);
  };
  넣기('tel','휴대폰', d.p,  d.p  ? 'tel:'+전화숫자(d.p)  : '');
  넣기('tel','사무실', d.p2, d.p2 ? 'tel:'+전화숫자(d.p2) : '');
  넣기('mail','이메일', d.e,  d.e ? 'mailto:'+d.e : '');
  넣기('chat','카카오톡', d.k, /^(https?:\/\/)?open\.kakao\.com\//i.test(d.k||'') ? (/^https?:/i.test(d.k)?d.k:'https://'+d.k) : '');
  넣기('web','홈페이지', d.w, d.w ? (/^https?:/i.test(d.w)?d.w:'https://'+d.w) : '');
  넣기('pin','주소', d.a, d.a ? 'https://map.kakao.com/?q='+encodeURIComponent(d.a) : '');

  const 태그 = (d.g||[]).map(g=>`<span class="tag">${esc(g)}</span>`).join('');
  const 설명 = [소속, d.b].filter(Boolean).join(' · ') || '전자명함';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(이름)}${소속?' · '+esc(소속):''}</title>
<meta name="description" content="${esc(설명)}">
${opt.owner ? `<meta name="card-owner" content="${esc(opt.owner)}">` : ''}
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(이름)}${d.t?' '+esc(d.t):''}">
<meta property="og:description" content="${esc(설명)}">
${og ? `<meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">` : ''}
${'' /* og:url 과 canonical 은 일부러 넣지 않는다.
        그 태그가 있으면 카톡이 「이 글의 진짜 주소는 이것」이라며 뒤의 ?v= 를 떼어버리고,
        예전에 읽어둔 미리보기를 계속 보여준다. 명함을 고쳐도 새 그림이 안 뜬다.
        명함은 주소 하나에 내용 하나뿐이라 canonical 로 묶을 것도 없다. */}
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index,follow,max-image-preview:large">
<script type="application/ld+json">${스크립트안(인물정보(d, { url: url, photo: 사진주소 }))}<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
  :root{ --top:${색.bg}; --top2:${색.bg2}; }
  *{ box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body{
    background:#EEF0F4; color:#15171C; line-height:1.65; word-break:keep-all;
    font-family:'Noto Sans KR',system-ui,'Malgun Gothic',sans-serif;
    padding:0 0 calc(2.5rem + env(safe-area-inset-bottom));
  }
  .card{ max-width:26rem; margin:0 auto; background:#fff; min-height:100vh; }
  @media (min-width:520px){
    body{ padding-top:1.5rem; }
    .card{ min-height:0; border-radius:1.4rem; overflow:hidden; box-shadow:0 20px 50px -24px rgba(10,14,25,.45); }
  }

  .head{ position:relative; background:linear-gradient(165deg,var(--top),var(--top2)); color:#fff; }
  /* 배경은 크게 깔고, 인물은 그 아래 걸치는 작은 원으로 */
  /* 배경은 16:10 이면 폰에서 너무 높다. 명함은 전화번호가 먼저 보여야 한다. */
  .bg{ width:100%; aspect-ratio:2/1; object-fit:cover; display:block; }
  .head .txt{ padding:1rem 1.25rem 1.25rem; }
  .head.has-face .txt{ padding-top:0; }
  .face{
    width:4.6rem; height:4.6rem; border-radius:50%; object-fit:cover; display:block;
    border:3px solid #fff; box-shadow:0 6px 18px -6px rgba(0,0,0,.55);
    margin:-2.3rem 0 .7rem 1.25rem;     /* 배경 아래 절반쯤 걸치게 */
    position:relative; background:#DDE1EA;
  }
  .head:not(.has-bg) .face{ margin:1.25rem 0 .7rem 1.25rem; }
  .nm{ font-size:1.7rem; font-weight:900; letter-spacing:-.035em; line-height:1.15; }
  /* 직함과 회사는 한 줄로 — 두 줄로 나누면 그만큼 번호가 밀린다 */
  .ttl{ font-size:.92rem; font-weight:700; margin-top:.3rem; color:rgba(255,255,255,.9); }
  .ttl .dot{ opacity:.45; margin:0 .35rem; font-weight:400; }
  .ttl .org{ font-weight:500; color:rgba(255,255,255,.72); }
  .bio{ font-size:.86rem; line-height:1.55; margin-top:.55rem; color:rgba(255,255,255,.82); }
  .tags{ display:flex; flex-wrap:wrap; gap:.3rem; margin-top:.7rem; }
  .tag{
    font-size:.72rem; font-weight:700; padding:.24rem .55rem; border-radius:.35rem;
    background:rgba(255,255,255,.15); color:rgba(255,255,255,.95);
  }

  /* 바로 누르는 것 셋 — 이름 바로 아래에 둔다 */
  .quick{
    display:grid; grid-template-columns:repeat(3,1fr); gap:1px;
    background:#E4E7EE; border-bottom:1px solid #E4E7EE;
  }
  .quick.two{ grid-template-columns:repeat(2,1fr); }
  .quick a{
    display:flex; flex-direction:column; align-items:center; gap:.3rem;
    padding:.95rem .4rem .85rem; background:#fff; text-decoration:none;
    color:var(--top); font-size:.8rem; font-weight:800; letter-spacing:-.01em;
  }
  .quick a:active{ background:#F1F4F9; }
  .quick svg{ width:1.35rem; height:1.35rem; }

  .rows{ padding:.2rem 0; }
  .r{
    display:flex; align-items:center; gap:.8rem; width:100%;
    padding:.7rem 1.25rem; text-decoration:none; color:inherit;
    border-bottom:1px solid #EDEFF3;
  }
  .r:last-child{ border-bottom:none; }
  a.r:active{ background:#F4F6FA; }
  .ic{ flex:none; width:1.2rem; height:1.2rem; color:#9AA0B0; }
  .ic svg{ width:100%; height:100%; display:block; }
  .tx{ flex:1; min-width:0; display:flex; flex-direction:column; }
  .lb{ font-size:.7rem; font-weight:700; color:#8A8FA0; letter-spacing:.02em; }
  .vl{ font-size:.98rem; font-weight:700; color:#15171C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .go{ flex:none; color:#C6CAD5; font-size:1.15rem; line-height:1; }

  .acts{ padding:1rem 1.25rem 1.25rem; display:grid; gap:.5rem; }
  .btn{
    display:flex; align-items:center; justify-content:center; gap:.5rem;
    padding:.95rem 1rem; border-radius:.55rem; border:1px solid #DDE1EA;
    background:#fff; color:#15171C; text-decoration:none;
    font-family:inherit; font-size:.98rem; font-weight:800; cursor:pointer;
  }
  .btn svg{ width:1.15rem; height:1.15rem; }
  .btn.pri{ background:var(--top); color:#fff; border-color:transparent; }
  .btn:active{ transform:translateY(1px); }

  /* 아래쪽 — 큰길브리지 링크 · 좋아요 · 댓글 · 나도 만들기 */
  .brand{
    display:flex; align-items:center; justify-content:space-between; gap:.6rem;
    margin:0 1.25rem; padding:.85rem 1rem; border-radius:.7rem;
    background:#F4F6FA; color:#3D4250; text-decoration:none; font-size:.82rem; font-weight:700;
  }
  .brand b{ color:var(--top); font-weight:900; }
  .brand .go{ color:#9AA0B0; font-size:1.1rem; line-height:1; }
  .social{ margin:1.1rem 1.25rem 0; padding-top:1rem; border-top:1px solid #EDEFF3; }
  .social .ph{ font-size:.8rem; color:#9AA0B0; text-align:center; padding:.6rem 0 .2rem; }
  .likes{ display:flex; align-items:center; gap:.7rem; }
  .like{
    display:inline-flex; align-items:center; gap:.4rem; padding:.55rem .95rem; border-radius:2rem;
    border:1px solid #DDE1EA; background:#fff; color:#3D4250;
    font-family:inherit; font-size:.9rem; font-weight:800; cursor:pointer;
  }
  .like svg{ width:1.05rem; height:1.05rem; }
  .like.on{ border-color:transparent; background:#FDECEF; color:#D6336C; }
  .like.static{ cursor:default; }
  .like .n{ font-variant-numeric:tabular-nums; }
  .likes .who{ font-size:.78rem; color:#8A8FA0; }
  .cmts{ margin-top:.9rem; display:grid; gap:.55rem; }
  .cmt{ padding:.65rem .8rem; border-radius:.6rem; background:#F7F8FB; }
  .cmt .hd{ display:flex; align-items:baseline; gap:.5rem; font-size:.74rem; color:#8A8FA0; }
  .cmt .hd b{ color:#3D4250; font-size:.8rem; }
  .cmt .hd button{ margin-left:auto; border:0; background:none; color:#B0B5C2; font-family:inherit; font-size:.72rem; cursor:pointer; }
  .cmt p{ font-size:.9rem; margin-top:.15rem; white-space:pre-wrap; word-break:break-word; }
  .cmts .none{ font-size:.82rem; color:#9AA0B0; text-align:center; padding:.4rem 0; }
  .cform{ margin-top:.8rem; display:grid; gap:.45rem; }
  .cform input,.cform textarea{
    width:100%; padding:.65rem .8rem; border:1px solid #DDE1EA; border-radius:.55rem;
    font-family:inherit; font-size:.9rem; color:#15171C; background:#fff;
  }
  .cform textarea{ min-height:4.2rem; resize:vertical; }
  .cform .row{ display:flex; gap:.45rem; align-items:center; }
  .cform .row input{ flex:1; min-width:0; }
  .cform .row button{
    flex:none; padding:.65rem 1rem; border-radius:.55rem; border:0;
    background:var(--top); color:#fff; font-family:inherit; font-size:.9rem; font-weight:800; cursor:pointer;
  }
  .cform .row button[disabled]{ opacity:.5; cursor:default; }
  .cform small{ font-size:.72rem; color:#9AA0B0; line-height:1.5; }
  .social .msg{ font-size:.8rem; color:#8A8FA0; margin-top:.4rem; min-height:1em; }
  .social .msg.bad{ color:#C2410C; }

  .foot{ padding:1.2rem 1.25rem 1.5rem; text-align:center; font-size:.74rem; color:#9AA0B0; }
  .foot a{ color:#6B7284; text-decoration:none; font-weight:700; }
</style>
  <script defer src="https://www.ai-make.co.kr/stats/stats.js" data-site="ai-make"><\/script>
</head>
<body>
<div class="card">
  <div class="head${배경주소?' has-bg':''}${사진주소?' has-face':''}">
    ${배경주소 ? `<img class="bg" src="${esc(배경주소)}" alt="">` : ''}
    ${사진주소 ? `<img class="face" src="${esc(사진주소)}" alt="${esc(이름)}">` : ''}
    <div class="txt">
      <div class="nm">${esc(이름)}</div>
      ${(d.t || d.c) ? `<div class="ttl">${d.t ? esc(d.t) : ''}${(d.t && d.c) ? '<span class="dot">·</span>' : ''}${d.c ? `<span class="org">${esc(d.c)}</span>` : ''}</div>` : ''}
      ${d.b ? `<div class="bio">${esc(d.b)}</div>` : ''}
      ${태그 ? `<div class="tags">${태그}</div>` : ''}
    </div>
  </div>

  <!-- 명함을 받으면 바로 하는 세 가지. 목록보다 위에 둔다. -->
  <div class="quick${d.p ? '' : ' two'}">
    ${d.p ? `<a href="tel:${esc(전화숫자(d.p))}">${아이콘.tel}전화</a>` : ''}
    ${d.p ? `<a href="sms:${esc(전화숫자(d.p))}">${아이콘.msg}문자</a>` : ''}
    <a href="#" id="save">${아이콘.save}연락처 저장</a>
  </div>

  <div class="rows">${줄.join('')}</div>

  <div class="acts">
    <button class="btn" id="share">명함 링크 공유</button>
  </div>

  <!-- 이 명함을 만든 곳. 명함을 받은 사람이 홈페이지 제작으로 이어지는 문이다. -->
  <a class="brand" href="${집}/" target="_blank" rel="noopener"><span>홈페이지 제작 · 큰길브리지 <b>www.ai-make.co.kr</b></span><span class="go">›</span></a>

  <!-- 좋아요 · 댓글 — 발행된 명함에서는 ../social.js 가 서버에서 받아 채운다. 미리보기에는 안내만 보인다. -->
  <section class="social" id="kb-social" data-slug="${esc(주소)}"${소셜 ? ' data-baked="1"' : ''}>
    ${소셜 ? 구운소셜(소셜, 댓글들) : `<p class="ph">${주소 ? '좋아요 · 댓글을 불러오는 중…' : '발행하면 여기에 좋아요 · 댓글이 붙습니다'}</p>`}
  </section>

  <p class="foot">전자명함 · <a href="${집}/card/all/">명함 모음</a> · <a href="${집}/card/">나도 무료로 만들기</a></p>
</div>

<!-- 고칠 때 이 내용을 그대로 불러온다. 사람 눈에는 안 보인다. -->
<script type="application/json" id="card-data">${스크립트안(d)}<\/script>

<script>
(function(){
  var vcf = ${스크립트안(vcard(d))};
  var 이름 = ${스크립트안(이름)};
  document.getElementById('save').addEventListener('click', function(e){
    e.preventDefault();          // 링크라서 안 막으면 맨 위로 튄다
    var blob = new Blob([vcf], { type:'text/vcard;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 이름 + '.vcf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
  });
  document.getElementById('share').addEventListener('click', async function(){
    if (navigator.share) { try { await navigator.share({ title:이름+' 명함', url:location.href }); return; } catch(e){ if(e.name==='AbortError') return; } }
    try { await navigator.clipboard.writeText(location.href); alert('명함 주소를 복사했습니다'); }
    catch(e){ prompt('이 주소를 복사하세요', location.href); }
  });
})();
<\/script>
${주소 ? '<script defer src="../social.js?v=20260927b"><\/script>' : ''}
</body>
</html>`;
}

/* ── 검색엔진용 인물 정보 (schema.org Person) ─────────────────────
   명함에 보이는 것과 같은 내용을 기계가 읽는 형태로 한 번 더 적는다. 없는 칸은 넣지 않는다. */
function 인물정보(d, o){
  o = o || {};
  const p = { '@context': 'https://schema.org', '@type': 'Person', name: d.n || '이름' };
  if (d.t) p.jobTitle = d.t;
  if (d.c) p.worksFor = { '@type': 'Organization', name: d.c };
  /* 사무실 칸에 주소를 적는 분이 있다 — 전화 모양(숫자 · + · 괄호 · 하이픈, 숫자 8자 이상)인 것만 전화로 적는다 */
  const 전화들 = [d.p, d.p2].filter(x => x && /^[0-9+()\s.-]+$/.test(String(x).trim()) && 전화숫자(x).length >= 8);
  if (전화들.length) p.telephone = 전화들;
  if (d.e) p.email = d.e;
  if (o.url) p.url = o.url;
  if (o.photo) p.image = o.photo;
  if (d.b) p.description = d.b;
  if (d.a) p.address = { '@type': 'PostalAddress', streetAddress: d.a, addressCountry: 'KR' };
  if (d.w) p.sameAs = [/^https?:/i.test(d.w) ? d.w : 'https://' + d.w];
  if (d.g && d.g.length) p.knowsAbout = d.g.slice(0, 14);
  return p;
}

/* 서버가 구워 넣는 좋아요 · 댓글. social.js 가 살아나면 같은 모양의 살아 있는 것으로 바꿔 끼운다. */
const 하트 = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.1C1 8.3 3.3 4.9 6.8 4.9c1.9 0 3.5 1 4.4 2.5.9-1.5 2.5-2.5 4.4-2.5 3.5 0 5.8 3.4 4.3 7-2 4.5-9.5 9.1-9.5 9.1z"/></svg>';
function 날짜(at){
  const t = new Date(Number(at) + 9 * 3600 * 1000);          // 한국 시간
  if (isNaN(t.getTime())) return '';
  return t.getUTCFullYear() + '.' + (t.getUTCMonth() + 1) + '.' + t.getUTCDate();
}
function 구운소셜(s, 댓글들){
  const n = Number(s.likes) || 0;
  const 목록 = 댓글들.length
    ? 댓글들.map(c => `<div class="cmt"><div class="hd"><b>${esc(c.name || '익명')}</b><span>${esc(날짜(c.at))}</span></div><p>${esc(c.text || '')}</p></div>`).join('')
    : '<p class="none">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>';
  return `<div class="likes"><span class="like static">${하트}<span>좋아요</span> <span class="n">${n}</span></span><span class="who">${댓글들.length ? '댓글 ' + 댓글들.length + '개' : '이 명함이 도움이 됐다면 눌러 주세요'}</span></div>
    <div class="cmts">${목록}</div>
    <p class="ph">댓글 쓰기 칸을 불러오는 중…</p>`;
}

/* ── 명함 모음 페이지 · 사이트맵 — 서버가 명함을 발행할 때마다 다시 만든다 ────────
   list = [{ slug, n, c, t, at('YYYY-MM-DD'), photo }] (card/list.json) */
function 명함사이트맵(list){
  const L = Array.isArray(list) ? list.filter(x => x && /^[a-z0-9][a-z0-9-]*$/.test(x.slug)) : [];
  const 날 = (x) => /^\d{4}-\d{2}-\d{2}/.test(String(x.at || '')) ? String(x.at).slice(0, 10) : '';
  const 최신 = L.map(날).filter(Boolean).sort().pop() || '';
  const url = (loc, lastmod, freq) => '  <url>\n    <loc>' + loc + '</loc>\n' + (lastmod ? '    <lastmod>' + lastmod + '</lastmod>\n' : '') + '    <changefreq>' + freq + '</changefreq>\n  </url>\n';
  let out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  out += url(집 + '/card/', 최신, 'weekly');
  out += url(집 + '/card/all/', 최신, 'daily');
  L.forEach(x => { out += url(집 + '/card/' + x.slug + '/', 날(x), 'weekly'); });
  return out + '</urlset>\n';
}

function 명함모음HTML(list){
  const L = (Array.isArray(list) ? list.filter(x => x && /^[a-z0-9][a-z0-9-]*$/.test(x.slug)) : [])
    .slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const 항목 = L.map(x => {
    const 부제 = [x.t, x.c].filter(Boolean).map(esc).join(' · ');
    return `<li><a href="${집}/card/${esc(x.slug)}/"><b>${esc(x.n || x.slug)}</b>${부제 ? `<span>${부제}</span>` : ''}<em>›</em></a></li>`;
  }).join('');
  const 설명 = '큰길브리지에서 만든 행사팀 · 소상공인 · 영업인의 전자명함 ' + L.length + '장. 이름 · 하는 일 · 연락처를 한 번에.';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>전자명함 모음 · 큰길브리지</title>
<meta name="description" content="${esc(설명)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${집}/card/all/">
<meta property="og:type" content="website">
<meta property="og:title" content="전자명함 모음 · 큰길브리지">
<meta property="og:description" content="${esc(설명)}">
<meta property="og:image" content="${집}/card/sample-og.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ background:#EEF0F4; color:#15171C; line-height:1.65; word-break:keep-all; font-family:'Noto Sans KR',system-ui,'Malgun Gothic',sans-serif; padding:1.5rem 1rem 3rem; }
  .wrap{ max-width:32rem; margin:0 auto; }
  .eyebrow{ font-size:.78rem; font-weight:900; letter-spacing:.14em; color:#1B2A4A; }
  h1{ font-size:1.7rem; font-weight:900; letter-spacing:-.03em; line-height:1.25; margin-top:.4rem; }
  .sub{ color:#5B6170; font-size:.95rem; margin-top:.5rem; }
  ul{ list-style:none; margin-top:1.4rem; display:grid; gap:.5rem; }
  li a{ display:flex; align-items:center; gap:.7rem; padding:.9rem 1.05rem; background:#fff; border-radius:.8rem; text-decoration:none; color:inherit; box-shadow:0 8px 24px -18px rgba(10,14,25,.35); }
  li a:active{ background:#F4F6FA; }
  li b{ font-size:1.02rem; font-weight:800; }
  li span{ flex:1; min-width:0; font-size:.84rem; color:#6B7284; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  li em{ margin-left:auto; color:#C6CAD5; font-style:normal; font-size:1.15rem; }
  .cta{ margin-top:1.8rem; display:grid; gap:.5rem; }
  .btn{ display:flex; align-items:center; justify-content:center; padding:.95rem 1rem; border-radius:.6rem; border:1px solid #DDE1EA; background:#fff; color:#15171C; text-decoration:none; font-weight:800; }
  .btn.pri{ background:#1B2A4A; color:#fff; border-color:transparent; }
  .foot{ margin-top:1.6rem; text-align:center; font-size:.76rem; color:#9AA0B0; }
  .foot a{ color:#6B7284; text-decoration:none; font-weight:700; }
</style>
<script defer src="https://www.ai-make.co.kr/stats/stats.js" data-site="ai-make"><\/script>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">큰길브리지 전자명함</p>
  <h1>전자명함 모음 <small style="font-size:.9rem;color:#6B7284;font-weight:700;">${L.length}장</small></h1>
  <p class="sub">행사팀 · 소상공인 · 영업인이 큰길브리지에서 만든 무료 전자명함입니다. 눌러서 전화 · 문자 · 연락처 저장을 바로 할 수 있습니다.</p>
  <ul>${항목 || '<li><a href="${집}/card/"><b>아직 발행된 명함이 없습니다</b><em>›</em></a></li>'}</ul>
  <div class="cta">
    <a class="btn pri" href="${집}/card/">나도 무료로 명함 만들기</a>
    <a class="btn" href="${집}/">홈페이지 제작 · 큰길브리지</a>
  </div>
  <p class="foot">주식회사 브리지미디어 · 1533-7295 · <a href="${집}/">www.ai-make.co.kr</a></p>
</div>
</body>
</html>`;
}
