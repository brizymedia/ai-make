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

---

## 자동 글쓰기 도구 (권장)

`gallery/write.html` 을 브라우저로 열면 사례 정보만 넣고 **갤러리 HTML · 네이버 블로그 글 · 인스타 문구**를 한 번에 만들 수 있습니다.
(이 페이지는 `noindex` 라 검색에 안 잡힙니다. 갤러리 목록 상단의 「✎ 글쓰기」 로 들어갑니다.)

### 나오는 것
| 결과물 | 쓰는 곳 |
|---|---|
| 제목 후보 5개 | 블로그 제목 · 글 제목 |
| 네이버 블로그 본문 | 블로그에 붙여넣기 (「― 사진 ―」 자리에 사진) |
| 인스타그램 문구 | 인스타 캡션 (해시태그 30개 포함) |
| 갤러리 글 HTML | `gallery/posts/` 에 저장 |
| 목록 카드 | `gallery/index.html` 의 `<div class="glist">` 맨 위 |

### 자동으로 되는 것
- **지역 감지** — 상호·장소·설명에서 순천/여수/광양/고흥/하동/남원/광주/진주/통영 등 17개 지역
- **업종 감지** — 카페·미용실·학원·가수·펜션·병원 등
- **키워드 삽입** — 유형별 검색 키워드가 제목·본문·해시태그에 자연스럽게
- **구조화 데이터** — BlogPosting JSON-LD 자동 생성 (AI 검색이 읽어감)
- **파일명** — `연월-지역-유형-상호.html` 로 겹치지 않게

### 글 유형 4가지
`홈페이지 제작 사례` / `홍보영상 · 쇼츠 사례` / `행사영상 사례` / `강의 · 팁`
유형마다 본문 구성과 해시태그가 다릅니다.

### 주의
- **「무엇을 어떻게 했나요」는 꼭 직접 쓰세요.** 매번 같은 문장이면 검색에서 저품질로 봅니다.
- 숫자(조회수·문의 건수)가 있으면 꼭 넣으세요. 검색과 AI가 가장 좋아하는 재료입니다.
- 상호에 지역명이 있으면 자동으로 중복을 피합니다.
