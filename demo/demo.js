/* 큰길브리지 데모 생성기 — index.html(주소 #d=) 과 짧은 주소 페이지(window.DEMO) 가 같이 쓴다 */
/* ══ 업종 뼈대 — 손님이 누구인지에 따라 첫 문장 · 하는 일 · 사진 자리 · 절차가 다르다 ══ */
var T = {
  rental:{ 이름:'행사용품 렌탈 · 대여', ac:'#1F7A8C', ac2:'#0B3A45', eye:'행사용품 렌탈 · 설치 · 회수',
    slogan:'행사 하루, 필요한 건 다 실어다 드립니다', sub:'천막 · 테이블 · 의자 · 무대 · 음향까지. 전화 한 통이면 배송 · 설치 · 회수까지 저희가 합니다. 행사 당일 아침, 현장에 먼저 가 있겠습니다.',
    cta:'견적 문의', 강점:[['10년+','현장 경험'],['당일','배송 · 설치'],['1,000회+','행사 지원']],
    서비스:[['천막 · 몽골텐트','3×3 · 3×6 · 대형 천막, 바람막이 · 조명 세트','tent'],['테이블 · 의자','행사용 접이식 테이블 · 의자, 테이블보 · 커버','users'],['무대 · 트러스','조립식 무대 · 계단 · 트러스, 안전 난간','stage'],['음향 · 조명','스피커 · 무선 마이크 · 무대 조명 세트','mic'],['에어아치 · 현수막','에어아치 · 배너 거치대 · 현수막 설치','flag'],['행사 소품','천막 웨이트 · 발전기 · 대형 선풍기 · 난로','gift']],
    갤러리:['천막 설치 현장','무대 · 트러스 세팅','테이블 · 의자 배치','음향 · 조명 세트','에어아치 · 현수막','회수 · 정리'],
    약속:[['견적은 그날 안에','품목 · 수량 · 날짜만 주시면 당일 견적을 드립니다'],['설치 · 회수 포함','물건만 두고 가지 않습니다. 세팅과 회수까지가 렌탈입니다'],['현장에 먼저 도착','행사 시작 전에 세팅이 끝나 있게 일정을 잡습니다']],
    절차:[['문의','품목 · 수량 · 날짜 · 장소를 알려주세요'],['견적 · 예약','당일 견적, 확정하면 날짜를 잡습니다'],['배송 · 설치','행사 전에 현장 세팅을 마칩니다'],['회수','행사가 끝나면 저희가 걷어 갑니다']],
    faq:[['며칠 전에 예약해야 하나요?','성수기(4~6월 · 9~10월)는 2주 전, 그 밖에는 3~5일 전이면 됩니다. 급한 행사도 재고가 있으면 맞춰 드립니다.'],['배송비는 따로 있나요?','기본 지역은 배송 · 설치 · 회수가 포함이고, 먼 지역은 거리에 따라 안내해 드립니다.'],['비가 오면 어떻게 하나요?','천막 · 바람막이 · 웨이트로 우천 대비를 함께 세팅합니다. 취소 규정은 견적서에 적어 드립니다.']] },
  event:{ 이름:'이벤트 · 행사 기획', ac:'#C22E7B', ac2:'#5A1238', eye:'행사 기획 · 무대 · 음향 · 진행',
    slogan:'당신의 행사, 오래 기억될 순간으로', sub:'기획부터 무대 · 음향 · 조명 · 진행까지 한 팀이 맡습니다. 담당자님은 행사 당일 손님만 맞으시면 됩니다.',
    cta:'견적 문의', 강점:[['15년','현장 경력'],['1,800회+','행사 진행'],['당일','세팅 가능']],
    서비스:[['행사 기획 · 운영','축제 · 기념식 · 체육대회 · 준공식 큐시트부터','calendar'],['무대 · 음향 · 조명','규모에 맞는 무대와 장비, 전문 오퍼레이터','stage'],['LED · 영상 중계','LED 전광판 · 촬영 · 실시간 중계','screen'],['사회 · 공연 섭외','MC · 가수 · 공연팀 섭외와 진행','mic'],['특수효과','불꽃 · 컨페티 · 포그 · 레이저','sparkle'],['행사 홍보물','현수막 · 배너 · 초대장 · 영상','flag']],
    갤러리:['축제 무대 전경','기념식 진행','체육대회 운영','LED · 조명 세팅','공연 · 사회','현장 팀'],
    약속:[['숫자로 말합니다','행사 수 · 연도 · 기관명으로 실적을 보여드립니다'],['예산 안에서','견적은 항목별로, 숨은 비용 없이'],['끝까지 현장에','세팅부터 철수까지 담당자가 곁에 있습니다']],
    절차:[['문의','행사 종류 · 날짜 · 장소 · 규모를 알려주세요'],['제안 · 견적','큐시트와 항목별 견적을 드립니다'],['준비 · 리허설','장비 · 인력 · 동선을 미리 점검합니다'],['진행 · 철수','당일 운영 후 깨끗하게 마무리합니다']],
    faq:[['소규모 행사도 하나요?','네. 50명 기념식부터 수천 명 축제까지, 규모에 맞게 구성합니다.'],['견적은 얼마나 걸리나요?','내용만 주시면 보통 하루 안에 항목별 견적을 드립니다.'],['다른 지역도 가나요?','기본 지역 밖도 출장으로 진행합니다. 거리에 따라 출장비를 안내해 드립니다.']] },
  singer:{ 이름:'가수 · MC · 공연자', ac:'#B8860B', ac2:'#4A3505', eye:'행사 섭외 · 공연 · 사회',
    slogan:'무대가 살아나는 순간을 만듭니다', sub:'축제 · 기념식 · 기업 행사 · 결혼식. 영상 한 편 보시고 섭외를 결정하세요.',
    cta:'섭외 문의', 강점:[['500회+','무대'],['전국','출장'],['당일','섭외 답변']],
    서비스:[['축제 · 지역 행사','메인 무대 · 오프닝 · 피날레','sparkle'],['기업 · 기관 행사','기념식 · 시상식 · 송년회 사회 · 공연','calendar'],['결혼식 · 가족 행사','축가 · 사회 · 이벤트 진행','gift'],['방송 · 촬영','방송 출연 · 영상 촬영 협업','screen'],['레슨 · 강의','노래 · 스피치 · 무대 매너','book'],['음원 · 앨범','발매곡 · 대표곡 · 무대 영상','mic']],
    갤러리:['메인 무대','축제 공연','기업 행사 사회','관객과 함께','방송 출연','프로필 컷'],
    약속:[['영상으로 보여드립니다','최근 무대 영상을 먼저 보내드립니다'],['시간 약속','리허설 · 무대 시간을 정확히 지킵니다'],['현장 맞춤','행사 성격에 맞춰 선곡 · 멘트를 준비합니다']],
    절차:[['문의','행사일 · 장소 · 성격 · 예산을 알려주세요'],['영상 · 답변','대표 무대 영상과 가능 여부를 당일 답합니다'],['확정','일정 · 출연료 · 요청곡을 확정합니다'],['무대','리허설 후 본 무대']],
    faq:[['출연료는 어떻게 되나요?','행사 성격 · 시간 · 지역에 따라 다릅니다. 내용 주시면 바로 안내합니다.'],['음향은 따로 준비해야 하나요?','기본 음향은 행사 측 준비가 원칙이고, 없으면 함께 안내해 드립니다.'],['급한 섭외도 되나요?','일정이 비어 있으면 전날도 가능합니다. 먼저 전화 주세요.']] },
  mc:{ 이름:'MC · 사회자 · 진행', ac:'#5B3FD3', ac2:'#22164F', eye:'국제행사 · 컨퍼런스 · 이중언어 MC',
    slogan:'두 언어로, 행사가 한 호흡으로 흐르게', sub:'국제회의 · 컨퍼런스 · 시상식 · 기업 행사. 한국어와 영어를 오가며 진행하고, 대본 검수와 리허설까지 함께합니다. 담당자님은 무대 뒤에서 안심하시면 됩니다.',
    cta:'섭외 문의', 강점:[['한 · 영','이중언어 진행'],['국제행사','컨퍼런스 · 포럼'],['당일','섭외 답변']],
    서비스:[['국제회의 · 컨퍼런스','개회식 · 세션 진행 · 패널 토론 사회, 한영 동시 진행','users'],['기업 행사 · 시상식','기념식 · 시상식 · 런칭 · 송년회 진행','calendar'],['축제 · 문화행사','지자체 축제 · 공연 · 개막식 사회','sparkle'],['온라인 · 하이브리드','스튜디오 생중계 · 화상 행사 진행','screen'],['대본 · 큐시트 검수','한영 대본 다듬기 · 큐시트 · 리허설','book'],['영상 · 내레이션','홍보 영상 · 안내 방송 · 내레이션 녹음','mic']],
    갤러리:['국제회의 진행','시상식 무대','컨퍼런스 세션','기업 행사','축제 개막식','프로필 컷'],
    약속:[['영상으로 먼저','최근 진행 영상을 보내드립니다. 보고 결정하세요'],['대본은 같이 봅니다','한영 대본과 큐시트를 미리 검수해 현장 사고를 줄입니다'],['시간을 지킵니다','리허설 · 무대 시간 · 진행 시간을 정확히']],
    절차:[['문의','행사일 · 장소 · 성격 · 언어 · 예산을 알려주세요'],['영상 · 답변','진행 영상과 가능 여부를 당일 답합니다'],['확정 · 대본','일정 · 진행료 확정, 대본 · 큐시트 검수'],['리허설 · 진행','현장 리허설 뒤 본 행사']],
    faq:[['진행료는 어떻게 되나요?','행사 성격 · 시간 · 언어 · 지역에 따라 다릅니다. 내용 주시면 바로 안내합니다.'],['영어 비중이 높은 행사도 되나요?','네. 영어 단독 진행, 한영 교차 진행 모두 합니다. 외국인 연사 소개 · 질의응답 통역 진행도 가능합니다.'],['해외 · 지방 행사도 가나요?','전국과 해외 모두 출장 진행합니다. 일정이 비어 있으면 급한 섭외도 맞춥니다.']] },
  daycare:{ 이름:'주간보호센터 · 요양', ac:'#2F9E6A', ac2:'#0F4A30', eye:'어르신 주간보호 · 재가요양',
    slogan:'낮 동안, 부모님께 좋은 하루를', sub:'송영 차량으로 모시고, 식사와 프로그램으로 하루를 채우고, 저녁에 안전하게 댁으로. 보호자님은 낮 시간을 안심하고 쓰세요.',
    cta:'상담 신청', 강점:[['30명','정원'],['1:4','선생님 비율'],['매일','사진 소식']],
    서비스:[['하루 일과','아침 체조 · 프로그램 · 점심 · 낮잠 · 간식 · 귀가','calendar'],['인지 · 신체 프로그램','미술 · 음악 · 요리 · 운동 · 웃음 치료','sparkle'],['송영 차량','집 앞에서 태우고 집 앞에 내려드립니다','truck'],['식사 · 간식','영양사 식단, 어르신 맞춤 식사','cup'],['간호 · 안전','간호사 상주, 투약 · 혈압 체크','shield'],['이용 안내 · 비용','장기요양등급별 본인부담금 안내','check']],
    갤러리:['프로그램실','식사 시간','송영 차량','선생님들','건물 · 입구','나들이'],
    약속:[['오늘 사진을 보내드립니다','매일 활동 사진으로 하루를 알려드립니다'],['비용은 표로','등급별 본인부담금을 숨기지 않습니다'],['상담은 언제든','밤에도 문의 남기시면 아침에 연락드립니다']],
    절차:[['상담','전화 · 방문 상담 (등급 · 상태 · 일정)'],['등급 · 서류','장기요양등급 신청 · 계약 서류 도움'],['적응 기간','1~2주 반나절부터 천천히'],['정기 이용','송영 · 일과 · 사진 소식']],
    faq:[['등급이 없어도 되나요?','등급 신청부터 도와드립니다. 상담 때 절차를 안내해 드립니다.'],['비용은 얼마인가요?','등급별 본인부담금 표를 이용 안내에 적어 두었습니다. 감경 대상은 따로 안내합니다.'],['차량은 어디까지 오나요?','기본 송영 지역 안이면 댁 앞까지 갑니다.']] },
  salon:{ 이름:'미용실 · 뷰티', ac:'#D9457F', ac2:'#5C1230', eye:'헤어 · 뷰티',
    slogan:'처음 오셔도, 오래 다니신 것처럼', sub:'컷 · 펌 · 염색 · 클리닉. 가격은 그대로 보여드리고, 예약은 폰에서 한 번에.',
    cta:'예약하기', 강점:[['12년','경력'],['4,000명+','단골'],['당일','예약 가능']],
    서비스:[['컷','여성 · 남성 · 학생 컷','cut'],['펌','디지털 · 셋팅 · 볼륨 · 매직','sparkle'],['염색','뿌리 · 전체 · 탈색 · 컬러 디자인','star'],['클리닉','두피 · 모발 케어','shield'],['스타일링','행사 · 웨딩 · 촬영 헤어 · 메이크업','gift'],['가격표','시술별 가격 그대로 공개','check']],
    갤러리:['매장 내부','시술 결과 1','시술 결과 2','디자이너','입구 · 간판','대기 공간'],
    약속:[['가격을 숨기지 않습니다','시술 전 금액을 먼저 말씀드립니다'],['상담이 먼저','머릿결 · 생활 패턴을 듣고 제안합니다'],['예약 시간을 지킵니다','기다리지 않게 예약제로 운영합니다']],
    절차:[['예약','네이버 예약 · 전화 · 카톡'],['상담','원하는 스타일 · 머릿결 확인'],['시술','정해진 시간 안에'],['홈케어 안내','오래 가는 관리법을 알려드립니다']],
    faq:[['예약 없이 가도 되나요?','가능하지만 예약 손님이 우선입니다. 전화 한 통이면 됩니다.'],['주차는 되나요?','매장 앞 · 인근 주차 안내를 오시는 길에 적어 두었습니다.'],['남성 컷도 하나요?','네. 남성 · 학생 컷 모두 합니다.']] },
  interior:{ 이름:'인테리어 · 시공', ac:'#3D5A80', ac2:'#16243B', eye:'주거 · 상업 인테리어',
    slogan:'전 · 후 사진이 우리를 설명합니다', sub:'집 · 매장 · 사무실. 실측부터 시공 · AS까지 한 팀이 맡고, 견적은 기준가부터 적어 드립니다.',
    cta:'상담 신청', 강점:[['300건+','시공'],['무료','실측 · 견적'],['1년','AS']],
    서비스:[['주거 인테리어','아파트 · 주택 전체 · 부분 리모델링','home'],['상업 인테리어','카페 · 매장 · 사무실 · 학원','cart'],['부분 시공','도배 · 장판 · 타일 · 욕실 · 주방','check'],['설계 · 3D','도면 · 3D 시안으로 미리 봅니다','screen'],['가구 · 조명','맞춤 가구 · 조명 계획','sparkle'],['AS · 관리','시공 후 1년 무상 AS','shield']],
    갤러리:['거실 전 · 후','주방 전 · 후','매장 시공','욕실','현장 작업','완성 공간'],
    약속:[['기준가를 적습니다','평형 · 범위별 기준가로 비교하실 수 있게'],['공정을 공유합니다','매일 현장 사진으로 진행을 알려드립니다'],['AS 1년','시공 후 문제는 저희 책임입니다']],
    절차:[['상담 · 실측','현장을 보고 범위와 예산을 잡습니다'],['견적 · 계약','항목별 견적 · 일정 · AS 조건'],['시공','공정별 사진 공유'],['준공 · AS','점검 후 인계, 1년 AS']],
    faq:[['견적은 무료인가요?','실측 · 견적은 무료입니다.'],['공사 기간은요?','부분 시공 3~7일, 전체 리모델링 3~5주가 보통입니다.'],['살면서 공사도 되나요?','부분 시공은 가능합니다. 순서를 조정해 드립니다.']] },
  pension:{ 이름:'펜션 · 숙박', ac:'#1F8A8A', ac2:'#0B3D3D', eye:'펜션 · 풀빌라 · 캠핑',
    slogan:'창을 열면, 오늘 하루가 바뀝니다', sub:'객실 · 경치 · 요금을 한 화면에. 예약은 실제 쓰시는 곳으로 바로 연결됩니다.',
    cta:'예약 문의', 강점:[['8개','객실'],['도보 5분','바다 · 계곡'],['바비큐','전 객실']],
    서비스:[['객실','2인 · 4인 · 단체 객실, 요금표','bed'],['부대시설','수영장 · 바비큐 · 카페 · 잔디마당','sparkle'],['주변 관광','차로 10분 안 명소 · 맛집','pin'],['예약','네이버 · 야놀자 · 전화 예약','calendar'],['이용 안내','입 · 퇴실 · 취사 · 애견 규정','check'],['오시는 길','내비 주소 · 대중교통','truck']],
    갤러리:['전경','객실 1','객실 2','수영장','바비큐장','저녁 풍경'],
    약속:[['요금은 시즌표로','비수기 · 성수기 · 주말 요금을 그대로'],['사진 그대로','실제 객실과 다른 사진은 쓰지 않습니다'],['체크인 안내 문자','예약 확정 · 입실 안내를 문자로']],
    절차:[['객실 고르기','인원 · 날짜에 맞는 객실'],['예약','예약 채널 또는 전화'],['입실 안내','전날 문자로 오시는 길 · 규정'],['이용 · 퇴실','편히 쉬다 가세요']],
    faq:[['애견 동반 되나요?','애견 객실을 따로 두고 있습니다. 예약 시 말씀해 주세요.'],['바비큐 준비물은?','숯 · 그릴은 저희가, 식재료는 가져오시면 됩니다.'],['취소 규정은요?','이용 안내에 날짜별 환불 규정을 적어 두었습니다.']] },
  academy:{ 이름:'학원 · 교육', ac:'#2D6CDF', ac2:'#0E2C6B', eye:'학원 · 교습 · 강의',
    slogan:'선생님이 누구인지가 전부입니다', sub:'선생님 · 시간표 · 수강료를 숨기지 않습니다. 상담 신청은 폰에서 한 번에.',
    cta:'상담 신청', 강점:[['10년','운영'],['1:6','소수 정원'],['매월','성적 상담']],
    서비스:[['과정 안내','학년 · 수준별 과정과 시간표','book'],['선생님','이력 · 담당 과목 · 교육 철학','users'],['수강료','과정별 수강료 · 등록 절차','check'],['시설','강의실 · 자습실 · 상담실','home'],['소식 · 후기','공지 · 학부모 후기','star'],['상담 신청','학년 · 과목 · 시간 상담','calendar']],
    갤러리:['수업 모습','선생님','강의실','자습실','입구','상담실'],
    약속:[['시간표 그대로','과정별 시간표를 폰에서도 보기 쉽게'],['수강료 공개','등록 전에 금액을 압니다'],['상담 답변 당일','신청하시면 그날 연락드립니다']],
    절차:[['상담 신청','학년 · 과목 · 원하는 시간'],['레벨 테스트','수준에 맞는 반 배정'],['등록','수강료 · 교재 안내'],['수업 · 상담','매월 학습 상담']],
    faq:[['체험 수업이 있나요?','네. 1회 체험 후 등록하셔도 됩니다.'],['셔틀은 있나요?','운행 지역을 오시는 길에 적어 두었습니다.'],['형제 할인은요?','상담 때 안내해 드립니다.']] },
  clinic:{ 이름:'병원 · 의원', ac:'#1B7F9E', ac2:'#0A3846', eye:'진료 안내',
    slogan:'진료 시간과 전화번호, 그것부터', sub:'증상으로 찾아오신 분이 진료 과목 · 시간 · 의료진을 확인하고 바로 전화하게 만듭니다.',
    cta:'전화 · 예약', 강점:[['평일','09~18시'],['토요일','09~13시'],['주차','가능']],
    서비스:[['진료 과목','과목별 진료 안내','shield'],['의료진','경력 · 전문 분야','users'],['진료 시간','요일별 시간 · 점심시간 · 휴진','calendar'],['시설 · 장비','검사 장비 · 진료실','home'],['오시는 길','주소 · 주차 · 대중교통','pin'],['예약 · 문의','전화 · 네이버 예약','phone']],
    갤러리:['외관 · 접수대','진료실','대기실','검사 장비','의료진','입구'],
    약속:[['시간 · 전화를 맨 위에','환자분이 제일 먼저 찾는 것'],['증상 단어로 안내','병명이 아니라 증상으로 찾게'],['광고 문구 없이','치료 효과 단정 · 전후 사진은 쓰지 않습니다']],
    절차:[['전화 · 예약','진료 시간 확인 후 예약'],['접수','신분증 · 보험 확인'],['진료','의료진 상담 · 검사'],['처방 · 안내','다음 진료 안내']],
    faq:[['예약 없이 가도 되나요?','네. 예약 환자 우선이지만 접수 순서대로 진료합니다.'],['주차는요?','건물 주차장 이용 안내를 오시는 길에 적어 두었습니다.'],['휴진일은요?','공지에 휴진 안내를 올립니다.']] },
  cafe:{ 이름:'카페 · 식당', ac:'#8B5A2B', ac2:'#3E2711', eye:'카페 · 식당 · 단체 예약',
    slogan:'분위기 · 메뉴 · 위치, 한 번에', sub:'근처에서 검색한 손님이 메뉴와 영업시간을 보고 오게, 단체 예약은 문의 한 번으로.',
    cta:'예약 문의', 강점:[['40석','좌석'],['단체','20명까지'],['주차','가능']],
    서비스:[['메뉴 · 가격','대표 메뉴 · 가격표 (검색에 걸리는 글자로)','cup'],['공간','매장 사진 · 좌석 · 분위기','home'],['단체 · 행사','모임 · 공간 대여 · 케이터링','users'],['영업시간 · 휴무','요일별 시간','calendar'],['오시는 길','주소 · 주차','pin'],['소식','신메뉴 · 이벤트','star']],
    갤러리:['대표 메뉴','매장 내부','외관 · 간판','단체석','디저트','저녁 분위기'],
    약속:[['메뉴판을 글자로','사진만 올리면 검색에 안 잡힙니다'],['영업시간 첫 화면에','헛걸음 없게'],['단체 문의 당일 답','인원 · 날짜만 주세요']],
    절차:[['메뉴 보기','폰에서 가격까지'],['예약 · 문의','전화 · 카톡 · 폼'],['방문','주차 안내'],['단체 · 행사','공간 대여 · 케이터링']],
    faq:[['예약이 필요한가요?','4인 이하는 바로 오셔도 되고, 단체는 예약을 권합니다.'],['포장 · 배달은요?','포장 가능, 배달은 앱을 이용해 주세요.'],['노키즈존인가요?','아이 동반 가능합니다.']] },
  etc:{ 이름:'기타 업종', ac:'#1E5EFF', ac2:'#0F2F80', eye:'서비스 안내',
    slogan:'누구에게 무엇을 하는지, 첫 화면에서', sub:'하는 일 · 실적 · 연락처를 한 화면에. 손님이 헤매지 않게 만듭니다.',
    cta:'문의하기', 강점:[['10년','경력'],['500건+','실적'],['당일','답변']],
    서비스:[['하는 일 1','서비스 설명','check'],['하는 일 2','서비스 설명','star'],['하는 일 3','서비스 설명','sparkle'],['실적 · 사례','갤러리 · 후기','camera'],['회사 소개','연혁 · 팀','users'],['문의','전화 · 폼','phone']],
    갤러리:['대표 사진','일하는 모습 1','일하는 모습 2','결과물','팀 · 대표','현장'],
    약속:[['실적은 숫자로','건수 · 연도 · 고객명'],['연락은 한 번에','전화 · 문자 · 카톡 단추가 항상 보입니다'],['답변 당일','문의하시면 그날 연락드립니다']],
    절차:[['문의','필요한 것을 알려주세요'],['상담 · 견적','내용에 맞춰 제안'],['진행','약속한 일정대로'],['마무리','확인 후 완료']],
    faq:[['상담은 무료인가요?','네.'],['지역 제한이 있나요?','기본 지역 밖도 상담 후 진행합니다.'],['결제는 어떻게 하나요?','계좌이체 · 카드 · 현금영수증 가능합니다.']] }
};
/* 아이콘 (선 아이콘, 24 기준) */
var I = {
  tent:'<path d="M3 20L12 4l9 16H3zM12 4v16"/>', users:'<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M15 14.5c3 0 6 2 6 5.5"/>',
  stage:'<path d="M3 10h18M5 10v10M19 10v10M3 20h18M8 10V6h8v4"/>', mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  flag:'<path d="M5 21V4h12l-2 4 2 4H5"/>', gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', screen:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  sparkle:'<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>', truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  cup:'<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 4h-2M6 3v2M10 3v2"/>', shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', cut:'<circle cx="7" cy="6" r="3"/><circle cx="7" cy="18" r="3"/><path d="M9.5 8L21 19M9.5 16L21 5"/>',
  star:'<path d="M12 3l2.8 6 6.2.8-4.6 4.3 1.2 6.3L12 17l-5.6 3.4 1.2-6.3L3 9.8 9.2 9z"/>', home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cart:'<path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>', bed:'<path d="M3 18V8h8v6h10v4M3 14h18M6 8V6h5v2"/>',
  pin:'<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>', book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  msg:'<path d="M4 5h16v11H9l-5 4z"/>', mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', kakao:'<path d="M12 4C7 4 3 7.2 3 11c0 2.4 1.6 4.5 4 5.7L6 21l4.5-2.6c.5.1 1 .1 1.5.1 5 0 9-3.2 9-7.5S17 4 12 4z"/>'
};
function ic(k){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (I[k] || I.check) + '</svg>'; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function b64u(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64(t){ t=t.replace(/-/g,'+').replace(/_/g,'/'); while(t.length%4) t+='='; return decodeURIComponent(escape(atob(t))); }
function 숫자(s){ return String(s||'').replace(/[^0-9+]/g,''); }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.className='toast on'; clearTimeout(toast.t); toast.t=setTimeout(function(){t.className='toast';},2600); }

/* ══ 자료 읽기 ══ */
var D = { biz:'etc', org:'', owner:'', slogan:'', sub:'', tel:'', email:'', addr:'', areas:'', services:[], about:'', stats:[], kakao:'', insta:'', web:'', hours:'', photos:[] };
(function(){
  var o = window.DEMO || null;
  if (!o) { var h = location.hash.indexOf('#d=')===0 ? location.hash.slice(3) : (new URLSearchParams(location.search).get('d') || ''); if (h) { try { o = JSON.parse(unb64(h)); } catch(e){} } }
  if (o) Object.keys(D).forEach(function(k){ if (o[k] !== undefined && o[k] !== null) D[k] = o[k]; });
  if (!T[D.biz]) D.biz = 'etc';
  if (!D.org) D.org = '○○업체';
})();
var B = T[D.biz];
var 서비스 = (D.services && D.services.length) ? D.services.map(function(s, i){ var b = B.서비스[i % B.서비스.length]; return typeof s === 'string' ? { n:s, d:'', i:b[2] } : { n:s.n || b[0], d:s.d || '', i:s.i || b[2] }; }) : B.서비스.map(function(s){ return { n:s[0], d:s[1], i:s[2] }; });
var 강점 = (D.stats && D.stats.length) ? D.stats.map(function(s){ return typeof s === 'string' ? [s, ''] : [s.n || s[0], s.l || s[1] || '']; }) : B.강점;
/* 지역 표기 — 「충북 청주」처럼 짧은 주소는 그대로, 긴 주소는 첫 낱말만 */
var 지역 = D.areas || (D.addr ? (D.addr.split(/[\s,]+/).length <= 2 ? D.addr : D.addr.split(/[\s,]+/)[0]) : '') || '인근 지역';
var 연락 = { tel: 숫자(D.tel), sms: 숫자(D.tel) };
var smsSep = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent) ? '&' : '?';
function 문자링크(글){ return 'sms:' + 연락.sms + smsSep + 'body=' + encodeURIComponent(글); }
function 지도링크(){ return D.addr ? 'https://map.kakao.com/link/search/' + encodeURIComponent(D.addr) : ''; }
/* 이 시안으로 진행 → 주문서에 채워서 */
function 주문링크(){
  var O = { v:1, org:D.org, biz:(D.biz in {daycare:1,event:1,singer:1,salon:1,interior:1,pension:1,academy:1,clinic:1,cafe:1,etc:1}) ? D.biz : 'etc', owner:D.owner, tel:D.tel, email:D.email, addr:D.addr, areas:D.areas, plan:'basic', slogan:D.slogan, services:서비스.map(function(s){ return s.n; }).join('\n'), intro:D.about, sns:[D.insta, D.web].filter(Boolean).join(', '), note:'무료 데모(' + location.href.slice(0, 60) + '…)를 보고 진행' };
  return (window.DEMO ? '../../' : '../') + 'order.html#o=' + b64u(JSON.stringify(O));
}

/* ══ 그리기 ══ */
document.documentElement.style.setProperty('--ac', D.ac || B.ac);
document.documentElement.style.setProperty('--ac2', D.ac2 || B.ac2);
document.documentElement.style.setProperty('--ac3', (D.ac || B.ac) + '1F');
document.title = D.org + ' — ' + B.이름 + ' 홈페이지 시안 · 큰길브리지';   /* 짧은 주소 페이지엔 id="t" 가 없으므로 title 을 직접 */
var h = '';
h += '<nav class="nav"><div class="wrap"><a class="brand" href="#top"><i>' + esc(D.org.slice(0,1)) + '</i>' + esc(D.org) + '</a>';
h += '<div class="menu"><a href="#work">하는 일</a><a href="#gal">사진</a><a href="#about">소개</a><a href="#how">진행</a><a href="#faq">자주 묻는 질문</a><a href="#contact">문의</a></div>';
h += '<a class="tel" href="tel:' + 연락.tel + '">📞 ' + esc(D.tel || '전화') + '</a></div></nav>';

h += '<header class="hero" id="top"><div class="wrap"><div>';
h += '<div class="eyebrow">' + esc(B.eye) + (지역 ? ' · ' + esc(지역) : '') + '</div>';
h += '<h1>' + esc(D.slogan || B.slogan) + '</h1><p>' + esc(D.sub || B.sub) + '</p>';
h += '<div class="acts"><a class="btn fill" href="#contact">' + esc(B.cta) + '</a><a class="btn" href="tel:' + 연락.tel + '">전화 ' + esc(D.tel || '') + '</a></div>';
h += '<div class="stats">' + 강점.map(function(s){ return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>';
h += '</div><div class="art">';
h += '<svg viewBox="0 0 400 440" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="g1" cx="30%" cy="25%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="440" fill="url(#g1)"/><g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"><circle cx="300" cy="120" r="70"/><circle cx="300" cy="120" r="110"/><circle cx="300" cy="120" r="150"/></g><g fill="#fff" fill-opacity=".14"><circle cx="90" cy="330" r="90"/><circle cx="330" cy="380" r="60"/></g><g transform="translate(140 150) scale(5)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".95">' + (I[서비스[0].i] || I.check) + '</g></svg>';
h += '<span class="ph">📷 대표 사진 자리 — 사장님 사진으로 바뀝니다</span></div></div></header>';

h += '<section class="sec" id="work"><div class="wrap"><div class="h"><div class="k">SERVICE</div><h2>하는 일</h2><p>' + esc(D.org) + '가 맡는 일입니다. 필요한 것만 골라 문의하세요.</p></div><div class="grid3">';
h += 서비스.map(function(s){ return '<div class="card"><div class="ic">' + ic(s.i) + '</div><b>' + esc(s.n) + '</b><p>' + esc(s.d) + '</p></div>'; }).join('');
h += '</div></div></section>';

h += '<section class="sec alt" id="gal"><div class="wrap"><div class="h"><div class="k">GALLERY</div><h2>현장 사진</h2><p>실제 사진이 들어갈 자리입니다. 휴대폰으로 찍은 사진이면 됩니다 — 밝기와 크기는 저희가 맞춥니다.</p></div><div class="gal">';
h += B.갤러리.map(function(c, i){ var p = D.photos && D.photos[i]; return '<div class="tile">' + (p ? '<img src="' + esc(p) + '" alt="">' : '<span class="cam">' + ic('camera') + '</span>') + '<span class="cap">' + esc(c) + '</span></div>'; }).join('');
h += '</div><p class="galnote">📷 사진 자리 6칸 — 「천막 설치 현장」처럼 어떤 사진이 좋은지 이름을 붙여 두었습니다.</p></div></section>';

h += '<section class="sec" id="about"><div class="wrap"><div class="h"><div class="k">ABOUT</div><h2>' + esc(D.org) + ' 소개</h2></div><div class="about"><div class="txt">';
h += (D.about ? esc(D.about).split(/\n+/).map(function(p){ return '<p>' + p + '</p>'; }).join('') : '<p>' + esc(D.org) + '는 ' + esc(지역) + '에서 ' + esc(B.이름) + ' 일을 하고 있습니다. 이 자리에 사장님이 늘 하시는 말씀을 그대로 적습니다 — 언제 시작했고, 무엇을 잘하고, 어떤 손님이 많은지.</p><p>홈페이지는 손님이 첫 화면에서 「무엇을 · 어디서 · 어떻게 연락」을 3초 안에 알게 만드는 것이 목표입니다.</p>');
h += '<div class="areas"><b>AREA</b>일을 받는 지역: ' + esc(D.areas || 지역) + (D.areas ? '' : ' · 인근') + '</div></div>';
h += '<ul class="promise">' + B.약속.map(function(p, i){ return '<li><i>' + (i+1) + '</i><div><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + '</span></div></li>'; }).join('') + '</ul></div></div></section>';

h += '<section class="sec alt" id="how"><div class="wrap"><div class="h"><div class="k">HOW</div><h2>진행 순서</h2></div><div class="steps">' + B.절차.map(function(s){ return '<div class="step"><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></div>'; }).join('') + '</div></div></section>';

h += '<section class="sec" id="faq"><div class="wrap"><div class="h"><div class="k">FAQ</div><h2>자주 묻는 질문</h2></div><div class="faq">' + B.faq.map(function(f){ return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div></div></section>';

h += '<section class="sec alt" id="contact"><div class="wrap"><div class="h"><div class="k">CONTACT</div><h2>' + esc(B.cta) + '</h2><p>전화가 제일 빠릅니다. 통화가 어려우시면 문자나 아래 폼으로 남겨 주세요.</p></div><div class="contact"><div>';
h += '<div class="cbtns"><a class="cbtn" href="tel:' + 연락.tel + '"><i>' + ic('phone') + '</i><div>전화<small>' + esc(D.tel || '') + '</small></div></a>';
h += '<a class="cbtn" href="' + 문자링크('[' + D.org + '] 문의드립니다. ') + '"><i>' + ic('msg') + '</i><div>문자<small>내용 · 날짜 · 장소</small></div></a>';
if (D.kakao) h += '<a class="cbtn" href="' + esc(D.kakao) + '" target="_blank" rel="noopener"><i>' + ic('kakao') + '</i><div>카톡 채널<small>채팅으로 문의</small></div></a>';
if (D.email) h += '<a class="cbtn" href="mailto:' + esc(D.email) + '"><i>' + ic('mail') + '</i><div>이메일<small>' + esc(D.email) + '</small></div></a>';
h += '</div><dl class="info">';
if (D.addr) h += '<dt>주소</dt><dd>' + esc(D.addr) + ' · <a href="' + 지도링크() + '" target="_blank" rel="noopener" style="color:var(--ac);font-weight:700">지도 보기</a></dd>';
h += '<dt>지역</dt><dd>' + esc(D.areas || 지역) + '</dd>';
h += '<dt>시간</dt><dd>' + esc(D.hours || '평일 09:00 ~ 18:00 · 행사 일정에 따라 주말 가능') + '</dd>';
if (D.insta) h += '<dt>인스타</dt><dd><a href="' + esc(D.insta) + '" target="_blank" rel="noopener">' + esc(D.insta) + '</a></dd>';
h += '</dl></div>';
h += '<form class="form" id="f"><h3>문의 남기기</h3><p>보내기를 누르면 문자 앱이 열립니다. 내용이 채워진 채로 전송만 하시면 됩니다.</p><label>성함 · 소속</label><input id="f-n" placeholder="예: 김담당 · ○○구청"><label>연락처</label><input id="f-t" placeholder="010-0000-0000" inputmode="tel"><label>내용</label><textarea id="f-m" placeholder="날짜 · 장소 · 필요한 것"></textarea><button type="submit">문자로 보내기</button></form>';
h += '</div></div></section>';

h += '<section class="go" id="go"><div class="wrap"><div><div class="eyebrow" style="color:var(--gold)">큰길브리지 제안</div><h2>이 시안이 마음에 드시면, 이대로 만들어 드립니다.</h2><p>사진과 글만 사장님 것으로 바꾸면 이 모양 그대로 오픈됩니다. 베이직 10만원부터 · 5영업일 · 월 관리 1만원. 마음에 안 들면 비용 없이 그냥 지웁니다.</p></div>';
h += '<div style="display:grid;gap:10px"><a class="btn gold" href="' + 주문링크() + '">이 시안으로 진행하기 →</a><a class="btn" href="tel:15337295">큰길브리지 1533-7295</a></div></div></section>';

h += '<footer><div class="wrap"><b>' + esc(D.org) + '</b>' + (D.addr ? '<span>' + esc(D.addr) + '</span>' : '') + (D.tel ? '<span>' + esc(D.tel) + '</span>' : '') + (D.email ? '<span>' + esc(D.email) + '</span>' : '') + '<span class="kb">제안용 시안 · <a href="https://www.ai-make.co.kr/" target="_blank" rel="noopener">큰길브리지 www.ai-make.co.kr</a></span></div></footer>';
h += '<div class="bar"><a href="tel:' + 연락.tel + '">📞 전화</a><a href="' + 문자링크('[' + D.org + '] 문의드립니다. ') + '">💬 문자</a><a class="fill" href="#contact">' + esc(B.cta) + '</a></div>';
document.getElementById('app').innerHTML = h;

document.getElementById('f').addEventListener('submit', function(e){
  e.preventDefault();
  var n = document.getElementById('f-n').value.trim(), t = document.getElementById('f-t').value.trim(), m = document.getElementById('f-m').value.trim();
  if (!m && !n) { toast('내용을 적어 주세요'); return; }
  location.href = 문자링크('[' + D.org + ' 홈페이지 문의] ' + n + (t ? ' / ' + t : '') + '\n' + m);
});
