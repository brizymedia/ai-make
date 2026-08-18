/* sitemap.xml 생성 — 새 글을 gallery/posts/ 에 추가한 뒤 `node build-sitemap.js` 실행
   갤러리 목록(gallery/index.html)의 카드 링크와 posts/ 폴더의 파일을 읽어 자동으로 넣는다. */
const fs = require("fs");
const path = require("path");

const SITE = "https://www.ai-make.co.kr/";
const root = __dirname;
const today = new Date().toISOString().slice(0, 10);

function lastmod(p) {
  try { return fs.statSync(p).mtime.toISOString().slice(0, 10); } catch (e) { return today; }
}

const urls = [
  { loc: SITE, lastmod: lastmod(path.join(root, "index.html")), priority: "1.0", changefreq: "weekly" },
  { loc: SITE + "gallery/", lastmod: lastmod(path.join(root, "gallery", "index.html")), priority: "0.8", changefreq: "weekly" }
];

const postsDir = path.join(root, "gallery", "posts");
if (fs.existsSync(postsDir)) {
  fs.readdirSync(postsDir)
    .filter(f => f.endsWith(".html"))
    .sort()
    .reverse()
    .forEach(f => {
      urls.push({ loc: SITE + "gallery/posts/" + f, lastmod: lastmod(path.join(postsDir, f)), priority: "0.7", changefreq: "monthly" });
    });
}

const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => [
    "  <url>",
    "    <loc>" + u.loc + "</loc>",
    "    <lastmod>" + u.lastmod + "</lastmod>",
    "    <changefreq>" + u.changefreq + "</changefreq>",
    "    <priority>" + u.priority + "</priority>",
    "  </url>"].join("\n")),
  "</urlset>", ""].join("\n");

fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
console.log("sitemap.xml 생성 — URL " + urls.length + "개");
urls.forEach(u => console.log("  " + u.loc));
