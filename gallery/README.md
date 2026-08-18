# 갤러리(사례 · 소식) 글 추가 방법

새 글 하나 = 파일 하나. 검색엔진이 글마다 따로 색인하도록 이렇게 만들어져 있습니다.

## 1. 글 파일 만들기
`gallery/posts/2026-08-first-post.html` 을 복사해서 이름을 바꿉니다.
- 파일명 규칙: `YYYY-MM-짧은영문.html`  (예: `2026-09-yeosu-cafe.html`)
- 파일 안에서 **반드시 바꿀 곳** (위쪽 주석 참고):
  - `<title>`, `<meta name="description">`
  - `<link rel="canonical">` 와 `og:url` 의 파일명
  - `og:title`, `og:description`, `article:published_time`, `article:tag`
  - JSON-LD 의 `@id`, `mainEntityOfPage`, `headline`, `description`, `datePublished`, `dateModified`, `keywords`
  - `<article>` 안의 본문

## 2. 목록에 카드 추가
`gallery/index.html` 의 `<div class="glist">` 안에 카드를 하나 추가합니다.
```html
<a class="gcard" href="posts/파일명.html" data-cat="web">
  <div class="gthumb" style="background-image:url(../images/썸네일.jpg)"></div>
  <div class="gbody">
    <span class="gcat">홈페이지</span>
    <h2>글 제목</h2>
    <p>두 줄 요약</p>
    <time datetime="2026-09-01">2026.09.01</time>
  </div>
</a>
```
`data-cat` 값: `web`(홈페이지) / `video`(홍보영상·쇼츠) / `event`(행사영상) / `edu`(강의·팁)

## 3. sitemap 갱신 후 푸시
```
node build-sitemap.js
git add -A && git commit -m "갤러리 — 글 제목" && git push
```

## 검색에 잘 걸리는 글 쓰기
- 제목에 **지역명 + 하는 일** 을 자연스럽게 (예: "여수 카페 홈페이지, 3일 만에 오픈한 이야기")
- 첫 문단에 누구를 위해 무엇을 했는지 한 문장으로
- 소제목(h2)을 질문 형태로 쓰면 AI 검색이 답변으로 뽑아갑니다
- 사진에는 alt 를 꼭 (예: `alt="여수 카페 홈페이지 메인 화면"`)
- 글 끝에 전화번호 CTA 는 템플릿에 이미 들어 있습니다
