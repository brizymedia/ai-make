/* ═══════════════════════════════════════════════════════════════
   큰길브리지 — 갤러리 · 블로그 · 인스타 글 자동 작성
   상호·장소·설명에서 지역과 업종을 감지해, 유형별 템플릿으로 글을 만든다.
   같은 문장이 반복되면 검색에서 저품질로 보므로 후보를 여러 개 두고 무작위로 고른다.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var SITE = "https://www.ai-make.co.kr";
  var TEL = "1533-7295";

  /* ── 지역 감지 ── */
  var 지역표 = [
    ["순천", ["순천", "순천만", "신대", "조례", "연향"]],
    ["여수", ["여수", "돌산", "웅천", "엑스포", "여천"]],
    ["광양", ["광양", "중마", "광양읍", "광양항"]],
    ["고흥", ["고흥", "녹동", "나로", "소록"]],
    ["하동", ["하동", "화개", "섬진"]],
    ["남원", ["남원", "춘향", "광한"]],
    ["광주", ["광주", "상무", "충장", "첨단", "수완"]],
    ["진주", ["진주", "남강", "혁신도시"]],
    ["통영", ["통영", "강구안", "도남"]],
    ["보성", ["보성", "벌교"]], ["구례", ["구례"]], ["곡성", ["곡성"]], ["담양", ["담양"]],
    ["나주", ["나주"]], ["목포", ["목포"]], ["사천", ["사천", "삼천포"]], ["거제", ["거제"]]
  ];
  /* ── 업종 감지 ── */
  var 업종표 = [
    ["카페 · 식당", ["카페", "커피", "식당", "맛집", "베이커리", "레스토랑", "밥집", "포차", "술집", "브런치"]],
    ["미용실 · 뷰티", ["헤어", "미용", "네일", "속눈썹", "피부", "왁싱", "에스테틱", "살롱", "뷰티"]],
    ["학원 · 공방", ["학원", "교습", "공방", "클래스", "레슨", "아카데미", "스튜디오", "교실"]],
    ["가수 · 아티스트", ["가수", "아티스트", "트로트", "밴드", "보컬", "싱어", "연주자", "국악"]],
    ["이벤트 · 행사 회사", ["이벤트", "행사", "기획사", "무대", "음향", "축제"]],
    ["펜션 · 숙박", ["펜션", "숙박", "게스트", "민박", "호텔", "캠핑", "글램핑"]],
    ["병원 · 의원", ["병원", "의원", "한의", "치과", "약국", "클리닉"]],
    ["기업 · 협회", ["주식회사", "㈜", "협회", "조합", "재단", "법인", "센터"]],
    ["1인 사업자 · 프리랜서", ["프리랜서", "1인", "작가", "포토", "디자이너"]]
  ];
  /* 촬영·대면 강의로 직접 찾아가는 지역. 제작 자체는 전국 어디든 비대면으로 진행한다. */
  var 방문지역 = ["순천", "여수", "광양", "고흥", "하동", "남원", "광주", "진주", "통영"];
  var 방문지역줄 = 방문지역.join(" · ");

  function 찾기(표, 글) {
    var g = String(글 || "").toLowerCase();
    return 표.filter(function (p) { return p[1].some(function (k) { return g.indexOf(k.toLowerCase()) >= 0; }); })
             .map(function (p) { return p[0]; });
  }
  function 골라(a) { return a[Math.floor(Math.random() * a.length)]; }
  function 섞기(a, n) { return a.slice().sort(function () { return Math.random() - .5; }).slice(0, n); }
  function 엮기(줄들) {
    return 줄들.filter(function (x) { return x !== false && x != null && x !== undefined; })
               .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  /* 파일명 슬러그 — 영문이 있으면 영문, 없으면 한글을 그대로 쓴다.
     GitHub Pages 는 한글 경로를 지원하고, 한글 URL 이 검색에도 불리하지 않다. */
  function 슬러그(s) {
    /* 한글·영문·숫자를 모두 남기고 나머지만 하이픈으로 바꾼다.
       영문만 뽑으면 순한글 상호가 통째로 사라져 파일명이 겹친다. */
    var 정리 = String(s || "").trim()
      .replace(/[^가-힣a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    return 정리 ? 정리.slice(0, 50).replace(/-+$/, "") : "post";
  }
  /* 앞말 받침에 따라 조사를 고른다 (예: 카페를 / 식당을) */
  function 조사(말, 받침있을때, 받침없을때) {
    var 끝 = String(말 || "").replace(/[^가-힣]/g, "").slice(-1);
    if (!끝) return 받침없을때;
    var 코드 = 끝.charCodeAt(0) - 0xAC00;
    if (코드 < 0 || 코드 > 11171) return 받침없을때;
    return (코드 % 28) ? 받침있을때 : 받침없을때;
  }
  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); setTimeout(function () { t.classList.remove("on"); }, 1900); }

  /* ── 유형별 설정 ── */
  var 유형 = {
    web: {
      라벨: "홈페이지", cat: "web", 일: "홈페이지",
      키워드: ["홈페이지 제작", "반응형 홈페이지", "랜딩페이지 제작", "소상공인 홈페이지", "홈페이지 제작 회사 추천"],
      해시: ["홈페이지제작", "반응형홈페이지", "랜딩페이지제작", "소상공인홈페이지", "홈페이지제작업체", "웹디자인"]
    },
    video: {
      라벨: "홍보영상 · 쇼츠", cat: "video", 일: "홍보영상",
      키워드: ["홍보영상 제작", "쇼츠 제작", "릴스 제작", "유튜브 영상 제작", "소상공인 홍보"],
      해시: ["홍보영상제작", "쇼츠제작", "릴스제작", "숏폼제작", "유튜브영상제작", "매장홍보", "소상공인홍보"]
    },
    event: {
      라벨: "행사영상", cat: "event", 일: "행사영상",
      키워드: ["행사영상 제작", "축제 영상", "공연 영상 촬영", "행사 스케치 영상", "유튜브 영상 제작"],
      해시: ["행사영상제작", "축제영상", "공연영상", "행사촬영", "스케치영상", "이벤트영상"]
    },
    edu: {
      라벨: "강의 · 팁", cat: "edu", 일: "강의",
      키워드: ["AI 강의", "유튜브 강의", "소상공인 홍보", "AI 활용법", "홈페이지 직접 만들기"],
      해시: ["AI강의", "유튜브강의", "소상공인홍보", "AI활용", "챗GPT활용", "1인사업자"]
    }
  };

  /* ═══ 제목 후보 — 유형별 5개씩 ═══ */
  function 제목만들기(d) {
    /* 상호에 이미 지역명이 들어 있으면 앞에 또 붙이지 않는다 (예: "여수 여수 돌산 카페") */
    var 겹침 = d.지역 && d.이름.indexOf(d.지역) >= 0;
    var 지 = (d.지역 && !겹침) ? d.지역 + " " : "";
    var 지역명 = d.지역 || "전남";
    var n = d.이름, 업 = d.업종 || "";
    var 표 = {
      web: [
        지 + n + " 홈페이지 만든 이야기 | 큰길브리지",
        지 + (업 || "매장") + " 홈페이지 제작 — " + n + " 사례",
        n + ", 10만원 홈페이지로 " + (d.결과 ? "이렇게 달라졌습니다" : "시작했습니다"),
        지역명 + " 홈페이지 제작 회사를 찾는다면 — " + n + " 제작기",
        (d.날짜 ? d.날짜 + " " : "") + 지 + n + " 반응형 홈페이지 오픈"
      ],
      video: [
        지 + n + " 홍보영상 · 쇼츠 제작 사례 | 큰길브리지",
        지 + (업 || "매장") + " 릴스 만들기 — " + n + " 30초 영상",
        n + " 홍보영상, 촬영 없이 이렇게 만들었습니다",
        지역명 + " 홍보영상 제작 — " + n + " 숏폼 작업기",
        "스크롤을 멈추게 한 15초 — " + 지 + n + " 쇼츠"
      ],
      event: [
        지 + n + " 행사영상 촬영·편집 후기 | 큰길브리지",
        지역명 + " 행사영상 제작 — " + n + " 스케치 영상",
        n + " 현장, 이렇게 담았습니다 — 행사영상 제작기",
        (d.날짜 ? d.날짜 + " " : "") + 지 + n + " 공연·행사 영상 기록",
        지역명 + " 축제·행사 영상 업체를 찾는다면 — " + n + " 사례"
      ],
      edu: [
        n + " — " + 지역명 + " 소상공인이 알아야 할 온라인 홍보",
        지 + "AI 강의 후기 — " + n,
        n + ", 컴퓨터 몰라도 할 수 있습니다 | 큰길브리지",
        지역명 + " 사장님을 위한 " + n,
        n + " — 상담에서 가장 많이 나온 질문 정리"
      ]
    };
    return 표[d.유형];
  }

  /* ═══ 블로그 본문 — 유형별 구성 ═══ */
  function 블로그만들기(d) {
    var 겹침 = d.지역 && d.이름.indexOf(d.지역) >= 0;
    var 지 = (d.지역 && !겹침) ? d.지역 + " " : "";
    var 지역명 = d.지역 || "전국";
    var 다른지역 = 방문지역.filter(function (r) { return r !== d.지역; }).join(" · ");
    var 서명 = 엮기([
      "─────────────",
      "큰길브리지 · 대표 김효민",
      "홈페이지 제작 · 홍보영상 · 쇼츠 · AI 강의",
      "전국 어디든 비대면 진행 · 직접 방문 — " + 방문지역줄,
      "홈페이지 " + SITE,
      "상담 " + TEL + " (평일 09:00~19:00)"
    ]);

    var 인트로 = {
      web: [
        지 + d.이름 + " 홈페이지를 만들었습니다.",
        (d.날짜 ? d.날짜 + ", " : "") + 지 + d.이름 + "의 홈페이지가 문을 열었습니다.",
        지역명 + "에서 " + (d.업종 || "가게") + 조사(d.업종 || "가게", "을", "를") + " 하시는 " + d.이름 + " 사장님의 홈페이지 이야기입니다."
      ],
      video: [
        지 + d.이름 + "의 홍보영상을 만들었습니다.",
        (d.날짜 ? d.날짜 + ", " : "") + 지 + d.이름 + " 숏폼 영상 작업기입니다.",
        지 + d.이름 + (d.업종 ? "(" + d.업종 + ")" : "") + ", 30초 안에 다 담아야 했습니다."
      ],
      event: [
        지 + d.이름 + " 현장에 다녀왔습니다.",
        (d.날짜 ? d.날짜 + ", " : "") + 지 + d.이름 + "의 영상 기록입니다.",
        지역명 + "에서 열린 " + d.이름 + ", 카메라로 담은 하루입니다."
      ],
      edu: [
        지역명 + " 소상공인 분들과 이야기하다 보면 늘 같은 고민이 나옵니다.",
        d.이름 + "에 대해 정리했습니다.",
        "상담에서 가장 많이 들은 이야기부터 풀어보겠습니다."
      ]
    };

    var 본문 = {
      web: function () {
        return 엮기([
          골라(인트로.web), "",
          (d.날짜 ? "📅 오픈 : " + d.날짜 : false),
          (d.장소 ? "📍 위치 : " + d.장소 : false),
          (d.업종 ? "🏷 업종 : " + d.업종 : false), "",
          d.설명, "",
          "― 사진 ―", "",
          "■ 이렇게 만들었습니다",
          "· 손님이 궁금해하는 순서대로 화면을 배치했습니다",
          "· 휴대폰에서 먼저 보이게 만들었습니다 (검색 유입의 대부분이 모바일입니다)",
          "· 전화 · 카톡 · 지도 버튼을 한 번에 누를 수 있게 두었습니다",
          "· 네이버와 구글에서 " + 지역명 + " " + (d.업종 || "업종") + "으로 검색될 수 있게 세팅했습니다",
          "", "― 사진 ―", "",
          (d.결과 ? "■ 오픈 후\n" + d.결과 : false),
          (d.고객말 ? "\n" + d.고객말 + "\n" : false),
          "", "■ 비용과 기간",
          "반응형 원페이지 기준 제작비 10만원(VAT 별도), 자료 주신 날부터 5영업일이면 오픈합니다.",
          "오픈 후에는 월 1만원 호스팅·관리비에 수정 2회가 포함됩니다. 페이지가 여러 개 필요하거나 예약·결제가 붙으면 고급형(50만원)으로 올라갑니다.", "",
          "사진이 없어도, 문구를 못 쓰셔도 괜찮습니다. 통화하면서 같이 만듭니다.", "",
          "홈페이지 제작은 전국 어디서든 전화와 카카오톡으로 진행합니다. " + (d.업종 || "가게") + " 홈페이지를 고민 중이시라면 편하게 전화 주세요. 촬영이 필요하면 " + 방문지역줄 + "은 직접 찾아뵙습니다.", "",
          서명, "", 해시태그(d, false)
        ]);
      },
      video: function () {
        return 엮기([
          골라(인트로.video), "",
          (d.날짜 ? "📅 작업 : " + d.날짜 : false),
          (d.장소 ? "📍 촬영 : " + d.장소 : false),
          (d.업종 ? "🏷 업종 : " + d.업종 : false), "",
          d.설명, "",
          "― 사진 ―", "",
          "■ 30초 영상에 들어간 것",
          "· 첫 3초에 무엇을 파는 곳인지 바로 보이게",
          "· 소리를 끄고 봐도 이해되는 한글 자막",
          "· AI 성우 내레이션과 배경음악",
          "· 인스타 릴스(9:16) · 피드(1:1) · 유튜브(16:9) 세 규격으로 리사이즈",
          "", "― 사진 ―", "",
          (d.결과 ? "■ 올린 뒤\n" + d.결과 : false),
          (d.고객말 ? "\n" + d.고객말 + "\n" : false),
          "", "■ 비용",
          "30초 기준 1편 10만원(VAT 별도)입니다. 기획 · 편집 · 자막 · 내레이션 · 음악 · 썸네일 · 수정 2회가 모두 포함이라 따로 붙는 옵션비가 없습니다.",
          "촬영본이 없으셔도 됩니다. AI로 이미지와 영상 소스를 만들어 채웁니다.", "",
          "홍보영상은 전국 어디서든 제작합니다. 촬영이 필요하면 " + 방문지역줄 + "은 직접 방문하고, 그 외 지역도 일정 협의 후 갑니다.", "",
          서명, "", 해시태그(d, false)
        ]);
      },
      event: function () {
        return 엮기([
          골라(인트로.event), "",
          (d.날짜 ? "📅 일시 : " + d.날짜 : false),
          (d.장소 ? "📍 장소 : " + d.장소 : false), "",
          d.설명, "",
          "― 사진 ―", "",
          "■ 이렇게 담았습니다",
          "· 행사 시작 전 준비 과정부터 기록",
          "· 무대와 객석을 함께 담아 현장 분위기를 살렸습니다",
          "· 하이라이트만 뽑아 숏폼 버전도 함께 만들었습니다",
          "· 주최 측이 바로 올릴 수 있게 자막과 로고를 넣어 납품했습니다",
          "", "― 사진 ―", "",
          (d.결과 ? "■ 결과\n" + d.결과 : false),
          (d.고객말 ? "\n" + d.고객말 + "\n" : false),
          "",
          "행사는 다시 오지 않습니다. 그날 기록이 남아야 다음 해 홍보가 쉬워집니다.",
          "전국 어디든 축제 · 공연 · 체육대회 · 기념식 준비 중이시라면 일정만 알려주세요. " + 방문지역줄 + "은 촬영까지 직접 갑니다.", "",
          서명, "", 해시태그(d, false)
        ]);
      },
      edu: function () {
        return 엮기([
          골라(인트로.edu), "", d.설명, "",
          "― 사진 ―", "",
          "■ 자주 나오는 질문",
          "· 컴퓨터를 잘 못하는데 할 수 있나요 → 오히려 그런 분들을 위한 내용입니다",
          "· 뭘 준비해야 하나요 → 휴대폰과 지금 하시는 일 이야기면 충분합니다",
          "· 배우면 뭘 할 수 있나요 → 홍보 문구 · 이미지 · 짧은 영상을 직접 만들 수 있습니다",
          "", "― 사진 ―", "",
          (d.결과 ? "■ 실제로 이런 변화가 있었습니다\n" + d.결과 : false),
          (d.고객말 ? "\n" + d.고객말 + "\n" : false),
          "",
          "AI 활용 1:1 강의는 시간당 10만원부터입니다. 업종과 수준에 맞춰 그날 진도를 조정하고, 상인회 · 협회 단체 출강도 나갑니다.",
          "온라인 강의는 전국 어디서든 가능하고, " + 방문지역줄 + "은 직접 방문해 대면으로 진행합니다.", "",
          서명, "", 해시태그(d, false)
        ]);
      }
    };
    return 본문[d.유형]();
  }

  /* ═══ 인스타 문구 ═══ */
  function 인스타만들기(d) {
    var 겹침 = d.지역 && d.이름.indexOf(d.지역) >= 0;
    var 지 = (d.지역 && !겹침) ? d.지역 + " " : "";
    var 훅 = {
      web: ["🖥 " + 지 + d.이름 + " 홈페이지 오픈!", 지 + d.이름 + ", 이제 검색됩니다 ✨", "10만원으로 시작한 " + 지 + d.이름 + " 홈페이지 📱"],
      video: ["🎬 " + 지 + d.이름 + " 홍보영상 완성!", "30초에 다 담았습니다 — " + 지 + d.이름 + " ✨", 지 + d.이름 + " 릴스, 이렇게 만들었어요 📹"],
      event: ["🎪 " + 지 + d.이름 + " 현장!", 지 + d.이름 + ", 그날의 기록 🎥", "📸 " + 지 + d.이름 + " 스케치"],
      edu: ["💡 " + d.이름, "AI, 어렵지 않습니다 — " + d.이름 + " 🤖", "🎓 " + 지 + "소상공인 AI 강의 이야기"]
    };
    var 짧은설명 = String(d.설명 || "").split(/(?<=[.!?])\s+/)[0] || "";
    return 엮기([
      골라(훅[d.유형]), "",
      짧은설명, "",
      (d.결과 ? "📈 " + d.결과 : false),
      (d.고객말 ? "💬 " + d.고객말 : false),
      (d.장소 ? "📍 " + d.장소 : false),
      (d.날짜 ? "📅 " + d.날짜 : false), "",
      "홈페이지 · 홍보영상 · AI 강의",
      "상담 " + TEL + " · 프로필 링크에서 견적 확인",
      "", 해시태그(d, true)
    ]);
  }

  /* ═══ 해시태그 ═══ */
  function 해시태그(d, 인스타) {
    var 세트 = [];
    var 이름표 = String(d.이름 || "").replace(/[^가-힣A-Za-z0-9]/g, "");
    if (이름표 && 이름표.length <= 14) 세트.push(이름표);
    (d.지역들 || []).forEach(function (r) {
      세트.push(r + "홈페이지제작", r + "홍보영상", r + "소상공인");
    });
    유형[d.유형].해시.forEach(function (t) { 세트.push(t); });
    if (d.지역) 세트.push(d.지역 + "이벤트", d.지역 + "맛집홍보");
    if (d.업종) 세트.push(String(d.업종).replace(/[^가-힣A-Za-z0-9]/g, ""));
    세트.push("큰길브리지", "전남홈페이지제작", "경남홈페이지제작", "소상공인마케팅");
    if (인스타) 세트.push("자영업자", "사장님", "온라인마케팅", "웹사이트", "홍보", "instagram", "smallbusiness");
    var 고유 = 세트.filter(function (v, i, a) { return v && a.indexOf(v) === i; }).slice(0, 인스타 ? 30 : 15);
    return 고유.map(function (t) { return "#" + t; }).join(" ");
  }

  /* ═══ 갤러리 HTML ═══ */
  function HTML만들기(d, 제목) {
    var 파일 = d.파일명;
    var url = SITE + "/gallery/posts/" + 파일;
    var iso = d.날짜iso || new Date().toISOString().slice(0, 10);
    var 요약 = String(d.설명 || "").slice(0, 110).replace(/\s+$/, "") + "…";
    var 본문줄 = String(d.설명 || "").split(/\n+/).filter(Boolean)
      .map(function (p) { return "  <p>" + esc(p) + "</p>"; }).join("\n");
    var ld = {
      "@context": "https://schema.org", "@type": "BlogPosting",
      "@id": url, "mainEntityOfPage": url, "headline": 제목,
      "description": 요약, "image": SITE + "/og.png",
      "datePublished": iso + "T09:00:00+09:00", "dateModified": iso + "T09:00:00+09:00",
      "inLanguage": "ko-KR",
      "author": { "@type": "Organization", "name": "큰길브리지", "url": SITE + "/" },
      "publisher": { "@id": SITE + "/#business" },
      "keywords": 유형[d.유형].키워드.concat((d.지역들 || []).map(function (r) { return r + " 홈페이지 제작"; }))
    };
    return [
      '<!DOCTYPE html>', '<html lang="ko">', '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + esc(제목) + (제목.indexOf("큰길브리지") >= 0 ? "" : " | 큰길브리지") + '</title>',
      '<meta name="description" content="' + esc(요약) + '">',
      '<meta name="robots" content="index, follow, max-image-preview:large">',
      '<link rel="canonical" href="' + url + '">',
      '<meta property="og:type" content="article">',
      '<meta property="og:title" content="' + esc(제목) + '">',
      '<meta property="og:description" content="' + esc(요약) + '">',
      '<meta property="og:url" content="' + url + '">',
      '<meta property="og:image" content="' + SITE + '/og.png">',
      '<meta property="og:site_name" content="큰길브리지">',
      '<meta property="og:locale" content="ko_KR">',
      '<meta property="article:published_time" content="' + iso + 'T09:00:00+09:00">',
      '<meta property="article:section" content="' + 유형[d.유형].라벨 + '">',
      '',
      '<!-- 갤러리 목록 자동 생성용 — build-sitemap.js 가 읽는다 -->',
      '<meta name="gallery-cat" content="' + 유형[d.유형].cat + '">',
      '<meta name="gallery-thumb" content="' + 썸네일(d.유형) + '">'
    ].concat(유형[d.유형].키워드.slice(0, 3).map(function (k) { return '<meta property="article:tag" content="' + k + '">'; }))
     .concat([
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">',
      '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">',
      '<link rel="stylesheet" href="../gallery.css">',
      '<script type="application/ld+json">', JSON.stringify(ld, null, 1), '<\/script>',
      '</head>', '<body>', '',
      '<nav class="gnav"><div class="gnav-in">',
      '  <a href="../../" class="brand">',
      '    <svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">',
      '      <path d="M2 30 C 10 12, 30 12, 38 30" stroke="#E8B84B" stroke-width="2.2" stroke-linecap="round"/>',
      '      <path d="M2 30 H38" stroke="#3FD3C6" stroke-width="2.2" stroke-linecap="round"/>',
      '      <circle cx="20" cy="17" r="2.6" fill="#E8B84B"/>',
      '    </svg>',
      '    <span class="brand-txt"><span class="brand-ko">큰길브리지</span><span class="brand-en">KEUNGIL BRIDGE</span></span>',
      '  </a>',
      '  <div class="gnav-links"><a href="../../#service">홈페이지</a><a href="../../#video">영상제작</a><a href="../../#price">요금 · 견적</a><a href="../" aria-current="page">사례 · 소식</a></div>',
      '  <a href="tel:' + TEL + '" class="gnav-cta">' + TEL + '</a>',
      '</div></nav>', '',
      '<article class="post">',
      '  <div class="post-meta"><span class="mono">' + 유형[d.유형].라벨 + '</span><time datetime="' + iso + '">' + iso.replace(/-/g, ".") + '</time></div>',
      '  <h1>' + esc(제목) + '</h1>',
      '  <p class="lead">' + esc(요약) + '</p>',
      '',
      '  <!-- 사진을 넣을 자리: <figure><img src="../images/파일.jpg" alt="' + esc((d.지역 || "") + " " + d.이름 + " " + 유형[d.유형].일) + '"><figcaption>설명</figcaption></figure> -->',
      '',
      본문줄,
      '',
      (d.결과 ? '  <h2>결과</h2>\n  <p>' + esc(d.결과) + '</p>\n' : ''),
      (d.고객말 ? '  <blockquote>' + esc(d.고객말) + '</blockquote>\n' : ''),
      '  <h2>' + (d.지역 || "전국 어디서든") + ' ' + 유형[d.유형].일 + '이 필요하시면</h2>',
      '  <p>전국 어디서든 전화와 카카오톡으로 진행합니다. 촬영이나 대면 강의가 필요하면 ' + 방문지역줄 + '은 직접 찾아뵙습니다. 지금 하고 계신 일만 말씀해 주시면 필요한 것과 필요 없는 것을 솔직하게 알려드립니다.</p>',
      '',
      '  <div class="cta">',
      '    <div><b>상담은 무료입니다.</b><small>' + 유형[d.유형].일 + ' 문의 · 견적</small></div>',
      '    <a href="tel:' + TEL + '">' + TEL + '</a>',
      '  </div>',
      '',
      '  <nav class="post-nav"><a href="../">← 사례 · 소식 목록</a><a href="../../#price">요금 · 견적 계산기 →</a></nav>',
      '</article>', '',
      '<footer class="gfoot"><div class="wrap">',
      '  <p><b>큰길브리지</b> · 대표 김효민 · 대표번호 <a href="tel:' + TEL + '">' + TEL + '</a></p>',
      '  <p>전국 홈페이지 제작 · 홍보영상 · 쇼츠 · AI 강의 &nbsp;|&nbsp; 직접 방문 — ' + 방문지역줄 + '</p>',
      '  <a href="../../" class="gback">← 큰길브리지 홈으로</a>',
      '</div></footer>', '</body>', '</html>', ''
    ]).join("\n");
  }

  /* ═══ 썸네일 ═══
     유형마다 색이 다른 그라디언트. 글 파일의 gallery-thumb 메타와 목록 카드가
     같은 값을 써야 목록을 다시 만들어도 그림이 바뀌지 않는다. */
  function 썸네일(유형키) {
    var 색 = { web: "#2A3550,#0B0F18 70%),linear-gradient(140deg,rgba(232,184,75,.35)",
               video: "#4A2C2A,#0B0F18 70%),linear-gradient(140deg,rgba(255,107,74,.3)",
               event: "#1E4A46,#0B0F18 70%),linear-gradient(140deg,rgba(63,211,198,.32)",
               edu: "#3A2A4E,#0B0F18 70%),linear-gradient(140deg,rgba(232,184,75,.24)" }[유형키];
    return "radial-gradient(120% 100% at 20% 10%," + 색 + ",transparent 60%)";
  }

  /* ═══ 목록 카드 ═══
     build-sitemap.js 가 목록을 자동으로 만들기 때문에 이제 붙여넣을 일은 거의 없다.
     서버 없이 손으로 올릴 때를 위해 남겨둔다. */
  function 카드만들기(d, 제목) {
    var 요약 = String(d.설명 || "").slice(0, 90).replace(/\s+$/, "") + "…";
    return [
      '    <a class="gcard" href="posts/' + d.파일명 + '" data-cat="' + 유형[d.유형].cat + '">',
      '      <div class="gthumb" style="background:' + 썸네일(d.유형) + '"></div>',
      '      <div class="gbody">',
      '        <span class="gcat">' + 유형[d.유형].라벨 + '</span>',
      '        <h2>' + esc(제목) + '</h2>',
      '        <p>' + esc(요약) + '</p>',
      '        <time datetime="' + d.날짜iso + '">' + d.날짜iso.replace(/-/g, ".") + '</time>',
      '      </div>',
      '    </a>'
    ].join("\n");
  }

  /* ═══ 실행 ═══ */
  function 만들기() {
    var 이름 = $("#in-name").value.trim();
    if (!이름) { toast("상호 · 사례 이름을 넣어주세요"); $("#in-name").focus(); return; }

    var 장소 = $("#in-place").value.trim();
    var 설명 = $("#in-desc").value.trim() || "자세한 내용은 상담 때 말씀드리겠습니다.";
    var 전체 = [이름, 장소, 설명].join(" ");
    var 지역들 = 찾기(지역표, 전체);
    var 업종감지 = 찾기(업종표, 전체);
    var 날짜v = $("#in-date").value;

    var d = {
      유형: ($$('input[name=kind]').filter(function (r) { return r.checked; })[0] || {}).value || "web",
      이름: 이름, 장소: 장소, 설명: 설명,
      지역들: 지역들, 지역: 지역들[0] || "",
      업종: $("#in-biz").value || 업종감지[0] || "",
      날짜: 날짜v ? 날짜v.replace(/-/g, ".") : "",
      날짜iso: 날짜v || new Date().toISOString().slice(0, 10),
      고객말: $("#in-quote").value.trim(),
      결과: $("#in-result").value.trim()
    };
    /* 파일명: 연월-지역-유형-상호. 상호에 지역명이 겹치면 빼서 짧게 만든다 */
    var 상호핵심 = d.지역 ? 이름.split(d.지역).join("").trim() : 이름;
    if (!상호핵심) 상호핵심 = 이름;
    d.파일명 = d.날짜iso.slice(0, 7) + "-"
      + 슬러그([d.지역, 유형[d.유형].cat, 상호핵심].filter(Boolean).join("-")) + ".html";
    /* 상호가 비어 유형만 남는 일이 없도록 한 번 더 확인 */
    if (/^\d{4}-\d{2}-(web|video|event|edu)\.html$/.test(d.파일명)) {
      d.파일명 = d.파일명.replace(/\.html$/, "-" + Date.now().toString().slice(-4) + ".html");
    }

    $("#detect").innerHTML =
      "감지 → 지역 <b>" + (지역들.length ? 지역들.join(", ") : "없음 · 상호나 장소에 지역명을 넣으면 검색이 훨씬 잘 됩니다") + "</b>" +
      " · 업종 <b>" + (d.업종 || "미지정") + "</b>" +
      " · 유형 <b>" + 유형[d.유형].라벨 + "</b><br>파일명 <b>" + d.파일명 + "</b>";

    var 제목들 = 제목만들기(d);
    $("#titles").innerHTML = 제목들.map(function (t) {
      return '<div><input readonly value="' + esc(t) + '"><button class="btn btn-sub" data-t="' + esc(t) + '">복사</button></div>';
    }).join("");
    $$("#titles [data-t]").forEach(function (b) {
      b.addEventListener("click", function () { 복사(b.dataset.t, "제목을 복사했습니다"); });
    });

    var 대표제목 = 제목들[0];
    $("#cap-blog").value = 블로그만들기(d);
    $("#cap-insta").value = 인스타만들기(d);
    $("#cap-html").value = HTML만들기(d, 대표제목);
    $("#cap-card").value = 카드만들기(d, 대표제목);
    window.__파일명 = d.파일명;
    window.__제목 = 대표제목;
    발행알림("", "");                    // 앞 글의 결과 메시지를 지운다

    $("#out").hidden = false;
    $("#out-empty").hidden = true;
    $("#out").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function 복사(text, msg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { 폴백(text); });
    } else { 폴백(text); }
    function 폴백(t) {
      var ta = document.createElement("textarea");
      ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(msg); } catch (e) { window.prompt("복사하세요", t); }
      document.body.removeChild(ta);
    }
  }

  $("#go").addEventListener("click", 만들기);
  $("#reset").addEventListener("click", function () {
    ["in-name", "in-place", "in-date", "in-desc", "in-quote", "in-result"].forEach(function (id) { $("#" + id).value = ""; });
    $("#in-biz").value = "";
    $("#out").hidden = true; $("#out-empty").hidden = false;
  });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { 복사($("#" + b.dataset.copy).value, "복사했습니다"); });
  });
  $("#dl-html").addEventListener("click", function () {
    var blob = new Blob([$("#cap-html").value], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = window.__파일명 || "post.html";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
    toast("내려받았습니다 · gallery/posts/ 에 넣으세요");
  });

  /* ═══════════════════════════════════════════════════════════
     홈페이지에 바로 올리기

     앱스 스크립트 서버가 글 파일을 저장소에 커밋하고,
     목록 · 사이트맵 · RSS 는 GitHub Actions 가 알아서 다시 만든다.
     서버가 없어도 「HTML 파일 내려받기」로 올리면 결과는 같다.
     ═══════════════════════════════════════════════════════════ */
  var 저장 = (function () {
    /* 시크릿 창이나 저장을 막아둔 브라우저에서는 localStorage 접근 자체가 예외를 던진다 */
    try { var t = "__t"; window.localStorage.setItem(t, "1"); window.localStorage.removeItem(t); return window.localStorage; }
    catch (e) { return null; }
  })();
  var 키주소 = "kb-pub-url", 키암호 = "kb-pub-pw", 키기억 = "kb-pub-save";

  function 발행알림(글, 종류) {
    var el = $("#pub-msg");
    el.className = "pub-msg" + (종류 ? " " + 종류 : "");
    el.innerHTML = 글;
  }

  /* 배포 주소에서 실수를 걸러낸다 — /exec 가 아니면 거의 항상 오타다 */
  function 주소확인(u) {
    var v = String(u || "").trim();
    if (!v) return "발행 서버 주소를 넣어주세요";
    if (v.indexOf("https://script.google.com/macros/s/") !== 0) {
      return "주소가 https://script.google.com/macros/s/… 로 시작해야 합니다";
    }
    if (v.slice(-5) !== "/exec") {
      return "주소가 /exec 로 끝나야 합니다 (/dev 는 나만 열 수 있어 안 됩니다)";
    }
    return "";
  }

  (function 설정불러오기() {
    if (!저장) { $("#pub-save").checked = false; return; }
    var 기억 = 저장.getItem(키기억) !== "0";
    $("#pub-save").checked = 기억;
    if (기억) {
      $("#pub-url").value = 저장.getItem(키주소) || "";
      $("#pub-pw").value = 저장.getItem(키암호) || "";
    }
  })();

  $("#pub-save").addEventListener("change", function () {
    if (!저장) return;
    if (this.checked) { 저장.setItem(키기억, "1"); }
    else { 저장.setItem(키기억, "0"); 저장.removeItem(키주소); 저장.removeItem(키암호); }
  });

  $("#pub-go").addEventListener("click", function () {
    var 버튼 = this;
    var html = $("#cap-html").value;
    if (!html) { 발행알림("먼저 「글 만들기」를 눌러주세요.", "bad"); return; }

    var 주소 = $("#pub-url").value.trim();
    var 잘못 = 주소확인(주소);
    if (잘못) { 발행알림(잘못, "bad"); $("#pub-url").focus(); return; }

    var pw = $("#pub-pw").value;
    if (!pw) { 발행알림("발행 비밀번호를 넣어주세요.", "bad"); $("#pub-pw").focus(); return; }

    if (저장 && $("#pub-save").checked) {
      저장.setItem(키주소, 주소); 저장.setItem(키암호, pw); 저장.setItem(키기억, "1");
    }

    버튼.disabled = true;
    발행알림("올리는 중…", "");

    /* text/plain 으로 보내야 브라우저가 미리 확인(preflight)을 안 보낸다.
       앱스 스크립트는 그 확인에 답을 못 해서, 안 그러면 CORS 로 막힌다. */
    fetch(주소, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "publish",
        pw: pw,
        filename: window.__파일명,
        title: window.__제목 || "",
        html: html
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        버튼.disabled = false;
        if (!j.ok) {
          if (j.이미있음) {
            발행알림("같은 파일명의 글이 이미 있습니다.<br>제목이나 날짜를 바꿔 파일명을 다르게 만든 뒤 다시 눌러주세요.", "bad");
          } else {
            발행알림("올리지 못했습니다 — " + (j.error || "알 수 없는 오류"), "bad");
          }
          return;
        }
        발행알림(
          "올렸습니다. 홈페이지에 보이기까지 1~2분 걸립니다.<br>" +
          '<a href="' + j.주소 + '" target="_blank" rel="noopener">' + j.주소 + "</a>" +
          (j.목록갱신 ? "<br>목록 갱신: " + j.목록갱신 : ""),
          "ok"
        );
        toast("홈페이지에 올렸습니다");
      })
      .catch(function (err) {
        버튼.disabled = false;
        발행알림(
          "서버에 닿지 못했습니다 — " + (err && err.message ? err.message : err) +
          "<br>주소가 맞는지, 배포 시 액세스 권한이 <b>「모든 사용자」</b>인지 확인해 주세요.",
          "bad"
        );
      });
  });
})();
