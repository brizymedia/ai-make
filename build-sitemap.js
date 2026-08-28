/* 갤러리 목록 + sitemap.xml + rss.xml 생성
   `node build-sitemap.js` 한 번이면 셋 다 갱신된다.

   - gallery/index.html : 글 목록 카드 (GLIST:START ~ GLIST:END 사이만 다시 만든다)
   - sitemap.xml        : 검색엔진에 "이 사이트에 어떤 주소가 있는지" 알려준다
   - rss.xml            : 네이버·구독기에 "새 글이 올라왔다"를 알려준다 (수집이 빨라진다)

   ── 글 하나 = 파일 하나 ──
   gallery/posts/ 에 html 파일을 넣기만 하면 목록·사이트맵·RSS 에 저절로 들어간다.
   파일을 지우면 셋 다에서 저절로 빠진다. 목록을 손으로 고칠 필요가 없다.

   글 파일이 갖고 있어야 하는 것 (없으면 아래 기본값으로 때운다):
     <title>                              제목
     <meta name="description">            요약
     <meta property="article:published_time">  발행일  ← 목록 정렬 기준
     <meta property="article:section">    분류 이름 (화면에 보이는 글자)
     <meta name="gallery-cat">            분류 슬러그 web|video|event|edu (필터 버튼용)
     <meta name="gallery-thumb">          썸네일 — 이미지 경로(gallery/ 기준) 또는 linear-gradient(...)
*/
const fs = require("fs");
const path = require("path");

const SITE = "https://www.ai-make.co.kr/";
const 사이트명 = "큰길브리지 제작 사례 · 소식";
const 사이트설명 = "전국 어디서든 만드는 홈페이지·홍보영상·행사영상 제작 사례와 소상공인 홍보 이야기";
const root = __dirname;
const today = new Date().toISOString().slice(0, 10);

/* 분류 이름 → 슬러그. gallery-cat 이 없는 옛날 글을 위한 대비책 */
const 분류표 = {
  "홈페이지": "web",
  "홍보영상 · 쇼츠": "video",
  "행사영상": "event",
  "강의 · 팁": "edu"
};
const 슬러그이름 = { web: "홈페이지", video: "홍보영상 · 쇼츠", event: "행사영상", edu: "강의 · 팁" };

/* 썸네일이 없는 글에 돌아가며 쓰는 기본 그라디언트 — 목록이 허전해 보이지 않게 */
const 기본썸네일 = [
  "linear-gradient(135deg,#1F3A4D,#B8862F 60%,#2A1F16)",
  "linear-gradient(135deg,#16303F,#3FD3C6 55%,#0E1B22)",
  "linear-gradient(135deg,#1F3A2E,#E8B84B 58%,#241A0F)",
  "linear-gradient(135deg,#2B1F3D,#FF6B4A 58%,#1A1016)"
];

function lastmod(p) {
  try { return fs.statSync(p).mtime.toISOString().slice(0, 10); } catch (e) { return today; }
}
function 태그값(html, re) {
  const m = html.match(re);
  return m ? m[1] : "";
}
function xml이스케이프(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
/* HTML 본문에 넣을 때 — 따옴표까지 막아야 style="..." 이 깨지지 않는다 */
function html이스케이프(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── 글 목록 읽기 ── */
const postsDir = path.join(root, "gallery", "posts");
const 글 = [];
if (fs.existsSync(postsDir)) {
  fs.readdirSync(postsDir).filter(f => f.endsWith(".html")).forEach(f => {
    const full = path.join(postsDir, f);
    const html = fs.readFileSync(full, "utf8");

    let 제목 = 태그값(html, /<title>([^<]*)<\/title>/);
    제목 = 제목.replace(/\s*\|\s*큰길브리지\s*$/, "");          // 뒤에 붙은 브랜드명은 뺀다

    const 분류이름 = 태그값(html, /article:section" content="([^"]*)"/);
    let 슬러그 = 태그값(html, /<meta name="gallery-cat" content="([^"]*)"/);
    if (!슬러그) 슬러그 = 분류표[분류이름] || "edu";

    글.push({
      파일: f,
      url: SITE + "gallery/posts/" + f,
      제목: 제목,
      설명: 태그값(html, /<meta name="description" content="([^"]*)"/),
      발행: 태그값(html, /article:published_time" content="([^"]*)"/),
      분류: 분류이름 || 슬러그이름[슬러그] || "",
      슬러그: 슬러그,
      썸네일: 태그값(html, /<meta name="gallery-thumb" content="([^"]*)"/),
      lastmod: lastmod(full)
    });
  });
}

/* 최신 글이 위로. 발행일이 같으면 파일명 역순 */
글.sort((a, b) => {
  const A = a.발행 || a.파일.slice(0, 7), B = b.발행 || b.파일.slice(0, 7);
  if (A !== B) return A < B ? 1 : -1;
  return a.파일 < b.파일 ? 1 : -1;
});

/* ── gallery/index.html 의 글 목록 ── */
const 목록파일 = path.join(root, "gallery", "index.html");
if (fs.existsSync(목록파일)) {
  const 원본 = fs.readFileSync(목록파일, "utf8");
  const 시작표시 = "<!-- GLIST:START -->";
  const 끝표시 = "<!-- GLIST:END -->";
  const i = 원본.indexOf(시작표시);
  const j = 원본.indexOf(끝표시);

  if (i < 0 || j < 0 || j < i) {
    console.log("! gallery/index.html 에서 GLIST:START / GLIST:END 표시를 못 찾았습니다. 목록은 건너뜁니다.");
  } else {
    const 카드 = 글.map((p, n) => {
      const t = p.썸네일 || 기본썸네일[n % 기본썸네일.length];
      /* linear-/radial-gradient 면 background, 아니면 이미지 경로 (gallery/ 기준) */
      const 배경 = t.indexOf("gradient(") >= 0
        ? "background:" + t
        : "background-image:url(" + t + ")";
      const 날짜 = (p.발행 || "").slice(0, 10);
      return [
        '    <a class="gcard" href="posts/' + p.파일 + '" data-cat="' + p.슬러그 + '">',
        '      <div class="gthumb" style="' + html이스케이프(배경) + '"></div>',
        '      <div class="gbody">',
        '        <span class="gcat">' + html이스케이프(p.분류) + "</span>",
        "        <h2>" + html이스케이프(p.제목) + "</h2>",
        "        <p>" + html이스케이프(p.설명) + "</p>",
        날짜 ? '        <time datetime="' + 날짜 + '">' + 날짜.replace(/-/g, ".") + "</time>" : "",
        "      </div>",
        "    </a>"
      ].filter(Boolean).join("\n");
    }).join("\n");

    const 새목록 = 원본.slice(0, i + 시작표시.length) + "\n" + 카드 + "\n    " + 원본.slice(j);
    fs.writeFileSync(목록파일, 새목록);
  }
}

/* ── sitemap.xml ── */
const urls = [
  { loc: SITE, lastmod: lastmod(path.join(root, "index.html")), priority: "1.0", changefreq: "weekly" },
  { loc: SITE + "gallery/", lastmod: lastmod(목록파일), priority: "0.8", changefreq: "weekly" },
  { loc: SITE + "seo-check/", lastmod: lastmod(path.join(root, "seo-check", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "suncheon/", lastmod: lastmod(path.join(root, "suncheon", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "yeosu/", lastmod: lastmod(path.join(root, "yeosu", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "gwangyang/", lastmod: lastmod(path.join(root, "gwangyang", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "goheung/", lastmod: lastmod(path.join(root, "goheung", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "hadong/", lastmod: lastmod(path.join(root, "hadong", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "namwon/", lastmod: lastmod(path.join(root, "namwon", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "gwangju/", lastmod: lastmod(path.join(root, "gwangju", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "jinju/", lastmod: lastmod(path.join(root, "jinju", "index.html")), priority: "0.9", changefreq: "monthly" },
  { loc: SITE + "tongyeong/", lastmod: lastmod(path.join(root, "tongyeong", "index.html")), priority: "0.9", changefreq: "monthly" },
  ...글.map(p => ({ loc: p.url, lastmod: p.lastmod, priority: "0.7", changefreq: "monthly" }))
];
const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => [
    "  <url>",
    "    <loc>" + u.loc + "</loc>",
    "    <lastmod>" + u.lastmod + "</lastmod>",
    "    <changefreq>" + u.changefreq + "</changefreq>",
    "    <priority>" + u.priority + "</priority>",
    "  </url>"].join("\n")),
  "</urlset>", ""].join("\n");
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap);

/* ── rss.xml ── */
function rfc822(iso) {
  const d = iso ? new Date(iso) : new Date();
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}
const 최신 = 글.length ? rfc822(글[0].발행) : new Date().toUTCString();
const rss = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  "  <channel>",
  "    <title>" + xml이스케이프(사이트명) + "</title>",
  "    <link>" + SITE + "gallery/</link>",
  "    <description>" + xml이스케이프(사이트설명) + "</description>",
  "    <language>ko</language>",
  "    <lastBuildDate>" + 최신 + "</lastBuildDate>",
  '    <atom:link href="' + SITE + 'rss.xml" rel="self" type="application/rss+xml"/>',
  ...글.map(p => [
    "    <item>",
    "      <title>" + xml이스케이프(p.제목) + "</title>",
    "      <link>" + p.url + "</link>",
    "      <guid isPermaLink=" + '"true"' + ">" + p.url + "</guid>",
    "      <description>" + xml이스케이프(p.설명) + "</description>",
    (p.분류 ? "      <category>" + xml이스케이프(p.분류) + "</category>" : ""),
    "      <pubDate>" + rfc822(p.발행) + "</pubDate>",
    "    </item>"].filter(Boolean).join("\n")),
  "  </channel>",
  "</rss>", ""].join("\n");
fs.writeFileSync(path.join(root, "rss.xml"), rss);

console.log("갤러리 목록 — 글 " + 글.length + "편");
글.forEach(p => console.log("   [" + p.슬러그 + "] " + p.제목 + "  (" + (p.발행 || "날짜없음").slice(0, 10) + ")"));
console.log("sitemap.xml — 주소 " + urls.length + "개");
console.log("rss.xml — 글 " + 글.length + "편");
