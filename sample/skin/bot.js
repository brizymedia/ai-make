/* 결빛 피부과의원 샘플 — AI 상담 챗봇
   서버도 AI 서비스도 쓰지 않는다. 병원 자료(진료시간, 진료 안내, 칼럼)를 미리 정리해 두고
   질문의 낱말을 읽어 알맞은 안내를 고르는 방식이다. 실제 제작에서는 병원이 준 자료로 이 내용을 채운다.
   원칙: 진단 · 처방은 하지 않는다. 일반 정보만 안내하고 진료와 예약으로 이어 준다. */
(function () {
  "use strict";
  var GB = window.GB, D = document;
  function $(s) { return D.querySelector(s); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function toMin(t) { var a = t.split(":"); return (+a[0]) * 60 + (+a[1]); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, ""); }
  function count(n, list) {
    var s = 0;
    list.forEach(function (k) { if (n.indexOf(k[0]) >= 0) s += k[1]; });
    return s;
  }

  /* 오늘 진료 상황을 말로 풀어 준다 */
  function todayText() {
    var k = GB.today(), di = GB.dayInfo(k), n = GB.seoul(), now = n.h * 60 + n.mi, nx;
    if (!di.open) {
      nx = GB.nextOpen(k);
      return "오늘은 " + (di.hol ? di.hol + "이라 " : "") + "휴진이에요." + (nx ? " 다음 진료는 " + GB.longDate(nx) + " " + GB.dayInfo(nx).from + "부터예요." : "");
    }
    var s = "오늘은 " + di.from + " – " + di.to + " 진료해요. " + (di.lunch ? "점심시간은 " + di.lunch[0] + " – " + di.lunch[1] + "이에요. " : "점심시간 없이 진료해요. ");
    if (now < toMin(di.from)) return s + "아직 진료 시작 전이에요.";
    if (now >= toMin(di.to)) { nx = GB.nextOpen(k); return s + "오늘 진료는 끝났어요." + (nx ? " 다음 진료는 " + GB.longDate(nx) + " " + GB.dayInfo(nx).from + "부터예요." : ""); }
    if (di.lunch && now >= toMin(di.lunch[0]) && now < toMin(di.lunch[1])) return s + "지금은 점심시간이에요. " + di.lunch[1] + "부터 다시 진료해요.";
    return s + "지금 진료 중이에요.";
  }

  /* 진료 분야를 알아보는 낱말 */
  var TXK = {
    acne: ["여드름", "뾰루지", "트러블", "턱드름", "여드름흉터"],
    atopy: ["아토피", "습진", "가려", "가렵", "두드러기", "접촉피부염", "건조"],
    pigment: ["기미", "잡티", "색소", "검버섯", "주근깨", "토닝"],
    hair: ["탈모", "머리빠", "머리카락", "두피", "비듬", "정수리", "빠지"],
    aging: ["주름", "탄력", "노화", "처짐", "리프팅"],
    wart: ["사마귀", "티눈", "무좀", "곰팡이", "물집", "대상포진", "헤르페스"],
    mole: ["점이", "점을", "점빼", "점제거", "점진료", "점검진", "피부종양", "모반", "피부암", "흑색종", "검은점", "검은줄"]
  };
  function findTx(n) {
    var best = "", bs = 0, id;
    for (id in TXK) {
      var s = 0;
      TXK[id].forEach(function (w) { if (n.indexOf(w) >= 0) s++; });
      if (s > bs) { bs = s; best = id; }
    }
    return best;
  }
  var ctx = { topic: "" };
  var COST = [["비용", 1], ["가격", 1], ["얼마", 1], ["진료비", 1], ["비급여", 1]];
  var CHIPS_HOME = ["오늘 진료하나요?", "예약하고 싶어요", "처음 가는데 준비물은요?", "여드름 짜도 되나요?", "위치가 어디예요?", "진료비는 어떻게 되나요?"];
  function A(label, type, arg) { return { label: label, type: type, arg: arg || "" }; }
  function txA(id) { var t = GB.treatments.filter(function (x) { return x.id === id; })[0]; return t ? A(t.name.split(" · ")[0] + " 진료 예약", "reserve", id) : null; }
  function topicActs(id, col) {
    var a = [];
    if (col) a.push(A("원장님 칼럼 읽기", "col", col));
    if (txA(id)) a.push(txA(id));
    return a;
  }

  function R(text, chips, acts) { return { text: text, chips: chips || [], acts: acts || [] }; }

  /* 질문의 종류 — k: [낱말, 점수]. 점수 합이 가장 높은 안내를 고른다 (같으면 앞에 있는 것) */
  var INTENTS = [
    { id: "emergency", k: [["응급", 10], ["숨쉬", 10], ["호흡", 10], ["얼굴이붓", 10], ["입술이붓", 10], ["목이붓", 10], ["피가멈추", 10], ["119", 10], ["쓰러", 8], ["의식", 5], ["화상", 6], ["고열", 5]],
      a: function () { return R("숨쉬기가 힘들거나 얼굴, 입술, 목이 붓는 증상, 의식이 흐려지는 증상, 멈추지 않는 출혈은 응급 상황일 수 있어요. 기다리지 말고 119에 전화하거나 가까운 응급실로 가세요."); } },
    { id: "walkin", k: [["예약없이", 8], ["바로가도", 6], ["그냥가도", 6], ["당일접수", 5], ["워크인", 4]],
      a: function () { return R("예약 없이도 방문하실 수 있지만, 예약하신 분의 진료가 우선이라 대기가 길어질 수 있어요. 온라인으로 예약하시면 정해진 시간에 편하게 오실 수 있어요.", ["진료시간 알려 주세요"], [A("온라인 예약하기", "reserve", "")]); } },
    { id: "rchange", k: [["예약변경", 8], ["예약취소", 8], ["예약확인", 6], ["취소", 3], ["변경", 3], ["미루", 3], ["일정바꿔", 5]],
      a: function () { return R("예약 변경과 취소는 예약 시간 2시간 전까지 가능해요. 예약 화면의 「내 예약 확인」에서 직접 취소하거나 전화로 알려 주세요. 취소한 뒤에는 새로 예약하실 수 있어요.", ["새로 예약하고 싶어요"], [A("내 예약 확인", "go", "reserve")]); } },
    { id: "acne", topic: "acne", col: "acne", k: [["여드름", 5], ["뾰루지", 4], ["트러블", 4], ["턱드름", 5], ["짜도", 3], ["짜면", 3], ["면포", 3]],
      a: function () { return R("여드름은 모낭 속에서 일어나는 염증이라, 손으로 짜면 염증이 주변으로 번지고 붉은 자국이나 흉터가 남기 쉬워요. 순한 세안, 오일이 적은 보습, 자외선 차단이 기본이에요. 자주 반복되거나 아프면 약과 치료가 필요하니 진료를 권해요.\n\n가임기 여성은 일부 먹는 약이 제한되니 진료 때 임신 계획을 꼭 알려 주세요.", ["여드름 치료는 얼마나 걸려요?", "여드름 흉터도 진료하나요?"], topicActs("acne", "acne")); } },
    { id: "atopy", topic: "atopy", col: "atopy", k: [["아토피", 5], ["습진", 5], ["가려", 4], ["가렵", 4], ["긁", 3], ["보습", 3], ["스테로이드", 4], ["연고", 2], ["두드러기", 4], ["접촉피부염", 5], ["건조", 3]],
      a: function () { return R("가려워서 긁을수록 염증이 커지는 악순환이 생겨요. 샤워는 미지근한 물로 짧게 하고, 물기가 마르기 전 3분 안에 보습제를 듬뿍 바르는 것이 기본이에요. 스테로이드 연고는 처방받은 강도와 기간, 부위를 지키면 염증을 효과적으로 가라앉혀요. 밤에 긁느라 잠이 깰 정도라면 치료가 필요한 단계예요.\n\n얼굴이나 입술이 붓거나 숨쉬기 힘든 두드러기는 바로 응급실로 가세요.", ["스테로이드 연고가 걱정돼요", "아이도 진료하나요?"], topicActs("atopy", "atopy")); } },
    { id: "pigment", topic: "pigment", col: "melasma", k: [["기미", 5], ["잡티", 5], ["색소", 4], ["검버섯", 5], ["주근깨", 4], ["미백", 3], ["칙칙", 2], ["토닝", 3]],
      a: function () { return R("기미, 잡티, 검버섯은 모두 갈색 반점으로 보이지만 원인과 깊이가 달라 치료도 달라요. 그래서 진단이 먼저예요. 자외선 차단은 치료의 전제이고, 기미는 재발이 잦아서 치료 뒤 관리 계획이 중요해요. 진단 없이 강한 자극을 주면 오히려 진해질 수 있어요.", ["기미는 완치가 되나요?", "자외선차단제는 어떻게 발라요?"], topicActs("pigment", "melasma")); } },
    { id: "hair", topic: "hair", col: "hair", k: [["탈모", 5], ["머리빠", 4], ["머리카락", 3], ["두피", 4], ["비듬", 4], ["정수리", 3], ["빠지", 3], ["m자", 3]],
      a: function () { return R("하루에 50~100가닥 빠지는 것은 정상 범위예요. 모발이 가늘어지고 M자 이마나 정수리가 비어 보이거나, 동전처럼 둥글게 빠진 곳이 있으면 진료를 권해요. 탈모 약은 성별, 나이, 임신 계획에 따라 달라서 인터넷 정보를 보고 임의로 드시지 않는 게 좋아요.", ["탈모 치료는 얼마나 걸려요?", "두피가 가려워요"], topicActs("hair", "hair")); } },
    { id: "aging", topic: "aging", col: "sunscreen", k: [["주름", 5], ["탄력", 4], ["노화", 4], ["처짐", 4], ["리프팅", 4], ["시술", 2]],
      a: function () { return R("노화 관련 시술은 종류마다 효과와 한계, 회복 기간, 부작용이 달라요. 진찰로 피부 상태를 본 뒤 맞는 선택지를 설명드려요. 효과에는 개인차가 있고, 대부분 건강보험이 적용되지 않아요. 기본은 자외선 차단과 보습이에요.", ["시술 후 회복은 얼마나 걸려요?", "진료비는 어떻게 되나요?"], topicActs("aging", "sunscreen")); } },
    { id: "wart", topic: "wart", col: "", k: [["사마귀", 5], ["티눈", 5], ["무좀", 5], ["곰팡이", 4], ["물집", 3], ["대상포진", 5], ["헤르페스", 5]],
      a: function (n) {
        var extra = n.indexOf("대상포진") >= 0 ? "\n\n대상포진이 의심되면 증상이 나타난 뒤 가능한 한 빨리, 보통 3일 안에 진료를 받는 것이 좋아요." : "";
        return R("사마귀는 바이러스 감염이라 한 번에 끝나지 않고 여러 번 치료해야 하는 경우가 많아요. 스스로 떼거나 깎으면 주변으로 번질 수 있어요. 티눈과 무좀은 비슷해 보여도 치료가 달라서, 진찰로 구분하는 것이 먼저예요." + extra, ["진료는 어떻게 진행되나요?"], topicActs("wart", ""));
      } },
    { id: "mole", topic: "mole", col: "mole", k: [["점이", 4], ["점을", 3], ["점빼", 4], ["점제거", 4], ["점진료", 4], ["점검진", 4], ["피부종양", 4], ["모반", 5], ["피부암", 5], ["흑색종", 5], ["검은점", 4], ["검은줄", 4]],
      a: function () { return R("점은 대부분 양성이지만, 비대칭, 울퉁불퉁한 경계, 여러 가지 색, 6mm 이상의 크기, 모양이나 색, 크기의 변화 중 하나라도 있으면 확인이 필요해요. 손발바닥이나 손발톱 밑의 검은 점이나 줄이 커지면 미루지 마세요. 더모스코피라는 확대경으로 통증 없이 관찰할 수 있어요.\n\n진단 없이 점을 없애는 것은 권하지 않아요.", ["점 검진은 어떻게 하나요?"], topicActs("mole", "mole")); } },
    { id: "sunscreen", col: "sunscreen", k: [["자외선", 4], ["선크림", 5], ["썬크림", 5], ["차단제", 5], ["spf", 3]],
      a: function () { return R("얼굴과 목에는 검지와 중지 위에 길게 짜 올린 양, 즉 두 줄 정도가 필요하다고 알려져 있어요. 야외에서는 2~3시간마다 덧바르고, 땀을 많이 흘렸거나 물에 들어갔다 나오면 다시 발라 주세요. 일상에서는 SPF 30 이상, PA+++ 이상이면 충분한 경우가 많아요.", ["오늘 자외선은 어느 정도예요?"], [A("원장님 칼럼 읽기", "col", "sunscreen"), A("자외선 지수 보기", "go", "uvCard")]); } },
    { id: "skintype", k: [["피부타입", 5], ["지성", 3], ["건성", 3], ["복합성", 3], ["민감성", 3], ["내피부", 2]],
      a: function () { return R("피부 타입 체크를 해 보세요. 6문항이고 1분이면 끝나요. 참고용이라 진단은 아니지만 세안과 보습을 고르는 데 도움이 돼요.", [], [A("피부 타입 체크하러 가기", "go", "quizCard")]); } },
    { id: "pregnancy", k: [["임신", 5], ["수유", 5], ["임산부", 5], ["모유", 3]],
      a: function () { return R("임신 중이거나 수유 중이어도 받을 수 있는 진료가 많지만, 쓸 수 있는 약과 시술이 제한돼요. 진료 때 임신과 수유 여부를 꼭 알려 주세요. 임의로 약을 드시거나 바르지 마세요.", ["예약하고 싶어요"], [A("온라인 예약하기", "reserve", "")]); } },
    { id: "kids", k: [["아이", 3], ["아기", 3], ["소아", 4], ["어린이", 4], ["미성년", 5], ["청소년", 3], ["자녀", 3], ["초등", 2], ["중학", 2]],
      a: function () { return R("아이도 진료받을 수 있어요. 미성년자는 진료 내용에 따라 보호자의 동의나 동행이 필요할 수 있고, 시술은 보호자와 함께 오시는 것이 원칙이에요. 예약하실 때 메모에 아이의 나이와 증상을 적어 주시면 도움이 돼요.", ["예약하고 싶어요"], [A("온라인 예약하기", "reserve", "")]); } },
    { id: "first", k: [["처음", 3], ["초진", 4], ["준비물", 5], ["준비", 2], ["가져", 3], ["지참", 3], ["신분증", 4], ["뭘챙", 3], ["뭐챙", 3], ["화장", 2]],
      a: function () { return R("처음 오실 때는 신분증(건강보험 자격 확인용)과 복용 중인 약의 이름이나 처방전을 가져오세요. 이전에 받은 피부과 진료 기록이 있다면 함께 보여 주세요. 화장은 가볍게 하고 오시거나 지우고 오셔도 괜찮아요.", ["진료비는 어떻게 되나요?", "예약하고 싶어요"]); } },
    { id: "insurance", k: [["실손", 5], ["보험", 3], ["영수증", 3], ["세부내역", 4], ["진단서", 3], ["서류", 2]],
      a: function () { return R("실손보험 청구는 보험사의 약관과 진료 내용에 따라 달라요. 진료비 영수증과 세부내역서는 발급해 드려요. 보장 여부는 가입하신 보험사에 확인해 주세요. 진단서가 필요하면 진료 때 말씀해 주세요."); } },
    { id: "cost", k: [["비용", 4], ["가격", 4], ["얼마", 3], ["진료비", 5], ["비급여", 5], ["급여", 3], ["요금", 3], ["건강보험", 4], ["보험적용", 4], ["보험되", 4]],
      a: function () { return R("건강보험이 적용되는 진료와 적용되지 않는 진료(비급여)로 나뉘어요. 비급여 항목의 진료비는 이 홈페이지의 비급여 안내와 원내에 게시하고, 시행하기 전에 항목별로 설명드려요. 정확한 비용은 진찰 후에 정해져요.", ["실손보험도 되나요?"], [A("비급여 진료비 보기", "modal", "nonCovered"), A("온라인 예약하기", "reserve", "")]); } },
    { id: "after", k: [["시술후", 5], ["회복", 4], ["다운타임", 5], ["붓기", 3], ["일상생활", 3]],
      a: function () { return R("시술마다 회복 기간과 주의사항이 달라요. 시술 전에 미리 안내해 드리고, 중요한 일정이 있다면 미리 말씀해 주세요. 시술 후 붓기나 통증이 점점 심해지거나 열이 나면 기다리지 말고 병원에 연락해 주세요."); } },
    { id: "duration", k: [["얼마나걸", 6], ["기간", 3], ["완치", 3], ["낫나", 3], ["낫는", 3], ["효과", 2], ["언제좋아", 5], ["몇번", 3], ["몇회", 3]],
      a: function (n) {
        var DUR = {
          acne: "여드름은 보통 몇 주가 지나야 좋아지는 것이 보여요. 좋아졌다고 스스로 중단하지 말고 경과를 확인하며 조절하는 것이 중요해요.",
          atopy: "아토피는 만성 질환이라 완치보다 조절과 관리가 목표예요. 염증은 며칠에서 몇 주 안에 가라앉는 경우가 많지만, 재발을 줄이는 관리가 이어져야 해요.",
          pigment: "기미는 좋아져도 재발이 잦아 관리 기간이 길어요. 치료의 목표와 기간은 진단 뒤에 함께 정해요.",
          hair: "탈모는 3~6개월 이상 꾸준히 쓰면서 경과를 비교해야 효과를 판단할 수 있어요.",
          aging: "시술마다 효과가 나타나는 시기와 유지 기간이 달라요. 진찰 후에 설명드려요.",
          wart: "사마귀는 여러 번의 치료가 필요한 경우가 많아요. 병변의 크기와 위치에 따라 달라져요.",
          mole: "점 검진은 진료 한 번에 확인하는 경우가 많고, 필요하면 조직검사 결과를 보고 다음 계획을 정해요."
        };
        var t = findTx(n) || ctx.topic;
        return R(DUR[t] || "치료 기간은 증상과 진단에 따라 달라서 진찰 뒤에 말씀드릴 수 있어요. 여드름은 몇 주, 탈모는 3~6개월 이상 경과를 보는 것처럼 질환마다 달라요.", ["예약하고 싶어요"], t && txA(t) ? [txA(t)] : []);
      } },
    { id: "avail", k: [["예약할수있", 8], ["예약가능", 6], ["빈시간", 6], ["남은시간", 6], ["자리있", 6], ["가장빠른", 6], ["언제예약", 6]],
      a: function () {
        var k = GB.today(), found = [], i;
        function firstFree(day) {
          var s = GB.slotsOf(day), j;
          for (j = 0; j < s.length; j++) { if (!GB.isFull(day, s[j]) && !GB.isPast(day, s[j])) return s[j]; }
          return "";
        }
        for (i = 0; i <= 21 && found.length < 3; i++) {
          var t = firstFree(k);
          if (t) found.push([k, t]);
          k = GB.addDays(k, 1);
        }
        if (!found.length) return R("가까운 날짜에는 예약이 모두 찼어요. 예약 화면에서 다른 날짜를 확인해 주세요.", [], [A("예약 화면 열기", "reserve", "")]);
        return R("가장 빨리 예약할 수 있는 시간이에요.\n" + found.map(function (f) { return "· " + GB.longDate(f[0]) + " " + f[1]; }).join("\n") + "\n\n누르면 그 시간으로 예약 화면을 열어 드려요.", [],
          found.map(function (f) { return A(GB.longDate(f[0]) + " " + f[1], "reserve", "|" + f[0] + "|" + f[1]); }));
      } },
    { id: "reserve", k: [["예약", 4], ["접수", 2], ["진료받고싶", 4], ["가고싶", 3], ["방문하고싶", 4]],
      a: function (n) {
        var tx = findTx(n) || ctx.topic, nm = tx ? txName(tx) : "";
        if (nm) return R(nm + " 진료로 예약하시겠어요? 예약 화면을 그 항목으로 열어 드릴게요. 날짜와 시간만 고르시면 돼요.", ["가장 빠른 예약 시간은요?", "진료시간 알려 주세요"], [A(nm + " 예약 화면 열기", "reserve", tx)]);
        return R("온라인 예약은 진료 분야와 날짜, 시간을 고르면 바로 접수돼요. 어떤 진료를 받으실지 알려 주시면 그 항목으로 예약 화면을 열어 드릴게요.", ["가장 빠른 예약 시간은요?", "여드름 진료 예약하고 싶어요", "탈모 진료 예약하고 싶어요"], [A("예약 화면 열기", "reserve", "")]);
      } },
    { id: "hours", k: [["진료시간", 4], ["몇시", 3], ["언제까지", 3], ["오늘진료", 4], ["진료하나요", 3], ["진료중", 3], ["문열", 3], ["영업", 3], ["운영", 2], ["휴진", 3], ["쉬는날", 3], ["휴무", 3], ["공휴일", 2], ["일요일", 3], ["토요일", 3], ["주말", 3], ["야간", 3], ["점심", 2], ["열었", 3]],
      a: function () { return R(todayText() + "\n\n평일은 09:30 – 18:30, 수요일은 야간진료로 20:30까지예요. 토요일은 09:30 – 14:00이고 일요일과 공휴일은 휴진이에요. 점심시간은 평일 13:00 – 14:00이에요.", ["가장 빠른 예약 시간은요?", "위치가 어디예요?"], [A("진료시간표 보기", "go", "visit"), A("온라인 예약하기", "reserve", "")]); } },
    { id: "where", k: [["위치", 4], ["어디", 2], ["주소", 4], ["찾아가", 3], ["오시는길", 4], ["지하철", 3], ["교통", 3], ["약도", 3], ["지도", 3], ["길찾기", 3]],
      a: function () { return R("서울특별시 강남구 샘플로 123, 4층이에요. (가상 주소예요.) 지하철 샘플역 3번 출구에서 도보 3분 거리예요.", ["주차는 되나요?", "진료시간 알려 주세요"], [A("오시는 길 보기", "go", "visit")]); } },
    { id: "parking", k: [["주차", 5], ["차가져", 3], ["차로", 2]],
      a: function () { return R("건물 지하 주차장을 이용하실 수 있고, 진료 시간 동안 주차를 지원해요. 주차 공간이 부족할 수 있으니 대중교통을 권해 드려요.", ["위치가 어디예요?"]); } },
    { id: "phone", k: [["전화번호", 4], ["연락처", 3], ["통화", 3], ["전화", 2], ["대표번호", 4], ["카톡", 2], ["카카오", 2]],
      a: function () { return R("대표전화는 02-000-0000이에요. 이 번호는 샘플용 가상 번호예요. 전화가 어렵다면 온라인 예약이나 상담 코너를 이용해 주세요.", [], [A("온라인 예약하기", "reserve", ""), A("상담 코너로 이동", "go", "consult")]); } },
    { id: "doctor", k: [["원장", 4], ["의사", 3], ["선생님", 3], ["전문의", 4], ["약력", 3], ["경력", 3]],
      a: function () { return R("윤하진 대표원장은 피부과 전문의로, 초진부터 경과 확인까지 직접 진료해요. 자세한 내용은 원장님 소개에서 볼 수 있어요.", [], [A("원장님 소개 보기", "go", "doctor")]); } },
    { id: "columns", k: [["칼럼", 5], ["읽을", 2], ["블로그", 3], ["정보글", 3]],
      a: function () { return R("원장님 칼럼이 6편 있어요. 자외선차단제, 여드름, 아토피, 점, 기미, 탈모에 대한 글이에요. 궁금한 주제를 골라 읽어 보세요.", [], [A("자외선차단제 칼럼", "col", "sunscreen"), A("여드름 칼럼", "col", "acne"), A("칼럼 전체 보기", "go", "columns")]); } },
    { id: "consult", k: [["상담", 3], ["질문", 2], ["물어보", 2], ["문의", 3], ["답변", 2], ["원장님께", 3], ["남기", 3]],
      a: function () { return R("궁금한 내용은 상담 코너에 남겨 주세요. 원장님이 확인한 뒤 답변을 올려드려요. 비공개로 남기실 수도 있어요. 증상이 급하거나 심해지면 기다리지 말고 내원해 주세요.", [], [A("상담 코너로 이동", "go", "consult")]); } },
    { id: "site", k: [["홈페이지제작", 5], ["제작문의", 5], ["이홈페이지", 4], ["이사이트", 4], ["이챗봇", 4], ["만들어", 3], ["큰길브리지", 5], ["제작비", 4], ["샘플", 3], ["우리병원", 4], ["도입", 3], ["제작", 2]],
      a: function () { return R("이 화면은 큰길브리지가 만든 피부과 홈페이지 샘플이에요. 우리 병원도 이런 홈페이지를 만들고 싶으시면 문의해 주세요. 전화 상담은 1533-7295예요.", [], [A("제작 문의하기", "href", "https://www.ai-make.co.kr/#contact"), A("요금 · 견적 보기", "href", "https://www.ai-make.co.kr/#price")]); } },
    { id: "human", k: [["상담원", 5], ["사람이", 3], ["전화연결", 5], ["통화연결", 5], ["직원", 3]],
      a: function () { return R("상담원 연결은 병원 운영 시간에 전화로 가능해요. 이 샘플의 번호는 가상이지만, 실제 제작에서는 병원 대표번호로 바로 연결돼요. 온라인으로는 상담 코너에 글을 남겨 주세요.", [], [A("상담 코너로 이동", "go", "consult")]); } },
    { id: "thanks", k: [["감사", 4], ["고마", 4], ["땡큐", 3], ["고맙", 4], ["안녕히", 3], ["수고", 2]],
      a: function () { return R("도움이 되었다니 다행이에요. 더 궁금한 점이 있으면 언제든 물어보세요."); } },
    { id: "hello", k: [["안녕", 3], ["hello", 2], ["하이", 2], ["반가", 2]],
      a: function () { return R("안녕하세요, 결빛 피부과 AI 상담이에요. 진료시간, 예약, 준비물, 피부 고민에 대한 일반 안내를 도와드려요.", CHIPS_HOME); } }
  ];
  function txName(id) { var t = GB.treatments.filter(function (x) { return x.id === id; })[0]; return t ? t.name.split(" · ")[0] : ""; }

  /* ── 답변 고르기 ── */
  function byId(id) { return INTENTS.filter(function (i) { return i.id === id; })[0]; }
  function fb() {
    var r = R("질문을 정확히 이해하지 못했어요. 아래에서 골라 주시거나, 상담 코너에 남겨 주시면 원장님이 확인한 뒤 답변드려요. 증상이 급하거나 심하면 기다리지 말고 내원해 주세요.",
      ["오늘 진료하나요?", "예약하고 싶어요", "위치가 어디예요?", "여드름 짜도 되나요?"], [A("상담 코너에 남기기", "go", "consult")]);
    r.fallback = true;
    return r;
  }
  function answer(text, silent) {
    var n = norm(text), best = null, bs = 0;
    if (!n) return fb();
    INTENTS.forEach(function (it) {
      var s = count(n, it.k);
      if (s > bs) { bs = s; best = it; }
    });
    if (best && best.topic && n.indexOf("예약") >= 0) { best = byId("reserve"); bs = 9; }
    if (!best || bs < 3) return fb();
    var r = best.a(n);
    if (best.topic && !silent) ctx.topic = best.topic;
    if (best.topic && count(n, COST) > 0) r.text += "\n\n비용은 건강보험 적용 여부와 진료 종류에 따라 달라서 진찰 후 항목별로 안내드려요.";
    r.intent = best.id;
    return r;
  }
  GB.reply = function (text) { return answer(text, true); };

  /* ── 대화창 ── */
  var chat = $("#chat"), log = $("#chatLog"), chipsEl = $("#chatChips"), form = $("#chatForm"), input = $("#chatInput"), fab = $("#chatFab"), closeBtn = $("#chatClose");
  var isOpen = false, busy = false, started = false;
  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function addMsg(role, text, acts, src) {
    var el = D.createElement("div"), t = D.createElement("span");
    el.className = "msg " + role;
    t.textContent = text;
    el.appendChild(t);
    if (acts && acts.length) {
      var box = D.createElement("div");
      box.className = "msg-acts";
      acts.forEach(function (a) {
        var b = D.createElement("button");
        b.type = "button"; b.textContent = a.label;
        b.setAttribute("data-act", a.type); b.setAttribute("data-arg", a.arg);
        box.appendChild(b);
      });
      el.appendChild(box);
    }
    if (src) { var s = D.createElement("span"); s.className = "msg-src"; s.textContent = src; el.appendChild(s); }
    log.appendChild(el);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    scrollDown();
    return el;
  }
  function setChips(list) {
    chipsEl.innerHTML = "";
    (list && list.length ? list : CHIPS_HOME).slice(0, 6).forEach(function (q) {
      var b = D.createElement("button");
      b.type = "button"; b.textContent = q; b.setAttribute("data-q", q);
      chipsEl.appendChild(b);
    });
    chipsEl.scrollLeft = 0;
  }
  function typing(on) {
    var t = D.getElementById("chatTyping");
    if (on && !t) {
      t = D.createElement("div");
      t.className = "typing"; t.id = "chatTyping"; t.innerHTML = "<i></i><i></i><i></i>";
      log.appendChild(t); scrollDown();
    } else if (!on && t) { t.parentNode.removeChild(t); }
  }
  function send(text) {
    text = String(text || "").trim();
    if (!text || busy) return;
    addMsg("me", text);
    busy = true; typing(true);
    var r = answer(text, false), delay = Math.min(1500, 420 + r.text.length * 5);
    setTimeout(function () {
      typing(false);
      addMsg("bot", r.text, r.acts, (r.fallback || r.intent === "emergency") ? "" : "일반 안내입니다 · 진단이 아닙니다");
      setChips(r.chips);
      busy = false;
    }, delay);
  }
  function openChat() {
    if (isOpen) return;
    isOpen = true;
    chat.hidden = false;
    D.body.classList.add("chat-open");
    fab.setAttribute("aria-expanded", "true");
    if (!started) {
      started = true;
      addMsg("bot", "안녕하세요, 결빛 피부과 AI 상담이에요. 진료시간, 예약, 준비물, 피부 고민에 대한 일반 안내를 도와드려요.\n진단이나 처방은 할 수 없어서, 증상이 있으면 진료를 권해 드려요.");
      addMsg("bot", todayText());
      setChips(CHIPS_HOME);
    }
    setTimeout(function () { input.focus({ preventScroll: true }); }, 80);
    scrollDown();
  }
  function closeChat() {
    if (!isOpen) return;
    isOpen = false;
    chat.hidden = true;
    D.body.classList.remove("chat-open");
    fab.setAttribute("aria-expanded", "false");
    fab.focus({ preventScroll: true });
  }
  log.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var type = b.getAttribute("data-act"), arg = b.getAttribute("data-arg"), narrow = window.innerWidth <= 720, p;
    if (type === "reserve") { p = arg.split("|"); GB.openReserve({ tx: p[0], date: p[1] || "", time: p[2] || "" }); if (narrow) closeChat(); }
    else if (type === "go") { GB.go(arg); if (narrow) closeChat(); }
    else if (type === "col") { GB.openReader(arg); }
    else if (type === "modal") { GB.openModal(arg); }
    else if (type === "href") { window.open(arg, "_blank", "noopener"); }
  });
  chipsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-q]");
    if (b) send(b.getAttribute("data-q"));
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    send(v);
  });
  fab.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);
  GB.chat = {
    open: openChat, close: closeChat, isOpen: function () { return isOpen; },
    ask: function (q) { var first = !started; openChat(); setTimeout(function () { send(q); }, first ? 700 : 350); }
  };
})();
