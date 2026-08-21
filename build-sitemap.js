/* sitemap.xml + rss.xml 생성
   갤러리에 새 글을 추가한 뒤 `node build-sitemap.js` 를 한 번 실행하면 둘 다 갱신된다.

   - sitemap.xml : 검색엔진에 "이 사이트에 어떤 주소가 있는지" 알려준다
   - rss.xml     : 네이버·구독기에 "새 글이 올라왔다"를 알려준다 (수집이 빨라진다)
*/
const fs = require("fs");
const path = require("path");

const SITE = "https://www.ai-make.co.kr/";
const 사이트명 = "큰길브리지 제작 사례 · 소식";
const 사이트설명 = "전국 어디서든 만드는 홈페이지·홍보영상·행사영상 제작 사례와 소상공인 홍보 이야기";
const root = __dirname;
const today = new Date().toISOString().slice(0, 10);

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

/* ── 글 목록 읽기 ── */
const postsDir = path.join(root, "gallery", "posts");
const 글 = [];
if (fs.existsSync(postsDir)) {
  fs.readdirSync(postsDir).filter(f => f.endsWith(".html")).sort().reverse().forEach(f => {
    const full = path.join(postsDir, f);
    const html = fs.readFileSync(full, "utf8");
    let 제목 = 태그값(html, /<title>([^<]*)<\/title>/);
    제목 = 제목.replace(/\s*\|\s*큰길브리지\s*$/, "");          // 뒤에 붙은 브랜드명은 뺀다
    글.push({
      파일: f,
      url: SITE + "gallery/posts/" + f,
      제목: 제목,
      설명: 태그값(html, /<meta name="description" content="([^"]*)"/),
      발행: 태그값(html, /article:published_time" content="([^"]*)"/),
      분류: 태그값(html, /article:section" content="([^"]*)"/),
      lastmod: lastmod(full)
    });
  });
}

/* ── sitemap.xml ── */
const urls = [
  { loc: SITE, lastmod: lastmod(path.join(root, "index.html")), priority: "1.0", changefreq: "weekly" },
  { loc: SITE + "gallery/", lastmod: lastmod(path.join(root, "gallery", "index.html")), priority: "0.8", changefreq: "weekly" },
  { loc: SITE + "seo-check/", lastmod: lastmod(path.join(root, "seo-check", "index.html")), priority: "0.9", changefreq: "monthly" },
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

console.log("sitemap.xml — 주소 " + urls.length + "개");
urls.forEach(u => console.log("   " + u.loc));
console.log("rss.xml — 글 " + 글.length + "편");
글.forEach(p => console.log("   " + p.제목 + "  (" + (p.발행 || "날짜없음").slice(0, 10) + ")"));
