import { allCities, SITE_URL } from "@/lib/site";

export type GuideSection = {
  heading: string;
  body: string;
  bullets: string[];
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  citySlug?: string;
  cityName?: string;
  keywords: string[];
  updatedAt: string;
  sections: GuideSection[];
  faq: Array<{ question: string; answer: string }>;
};

export const guides: Guide[] = [
  {
    slug: "vietnam-visa-extension-koreans",
    title: "베트남 비자 연장 전 한국인이 확인할 체크리스트",
    description: "베트남에서 체류 기간을 연장하기 전에 여권 만료일, 체류 자격, 대행 수수료, 접수 가능 일정을 확인하는 방법을 정리했습니다.",
    categorySlug: "life-info",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["베트남 비자 연장", "호치민 비자", "베트남 한국인 생활정보"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "먼저 확인할 기본 조건",
        body: "비자 연장은 케이스마다 조건이 다르기 때문에 온라인 후기만 보고 결정하면 위험합니다. Mango Vietnam에서는 공식 확인이 필요한 항목과 현지에서 자주 놓치는 항목을 분리해 봅니다.",
        bullets: ["여권 만료일까지 남은 기간", "현재 체류 자격과 입국일", "연장 가능 횟수와 예상 처리 기간", "공휴일과 접수 마감일"],
      },
      {
        heading: "대행사를 이용할 때 볼 것",
        body: "대행사를 쓰더라도 모든 책임이 사라지는 것은 아닙니다. 비용보다 중요한 것은 서류 안내가 명확한지, 처리 지연 시 연락이 되는지입니다.",
        bullets: ["총 비용과 추가 비용", "여권 보관 기간", "영수증 또는 접수 증빙", "지연·반려 시 대응 방식"],
      },
      {
        heading: "지역 정보와 함께 봐야 하는 이유",
        body: "비자 정보는 계속 바뀌기 때문에 단발성 글보다 지역별 생활정보 랜딩 페이지와 연결되어야 합니다. 그래야 사용자가 다음에도 같은 사이트를 다시 찾습니다.",
        bullets: ["지역별 대행사 제보", "최근 처리 후기", "필요 서류 사진", "주의해야 할 사례"],
      },
    ],
    faq: [
      { question: "베트남 비자 연장은 언제 준비해야 하나요?", answer: "가능하면 만료일 직전이 아니라 여유 기간을 두고 확인하는 것이 좋습니다. 공휴일과 접수 지연을 고려해야 합니다." },
      { question: "대행사를 쓰면 무조건 안전한가요?", answer: "아닙니다. 비용, 여권 보관 기간, 접수 증빙, 반려 시 대응을 반드시 확인해야 합니다." },
      { question: "호치민과 다낭 조건이 다른가요?", answer: "기본 제도는 같아도 접수 동선과 대행사 운영 방식은 지역별 차이가 있을 수 있습니다." },
    ],
  },
  {
    slug: "vietnam-bank-account-koreans",
    title: "베트남 은행 계좌 만들기 전에 필요한 서류",
    description: "한국인이 베트남에서 은행 계좌를 준비할 때 자주 확인하는 여권, 거주증, 근로계약, 현지 전화번호 조건을 정리했습니다.",
    categorySlug: "life-info",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["베트남 은행 계좌", "베트남 한국인 은행", "호치민 은행"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "방문 전 준비물",
        body: "은행마다 요구 서류와 심사 기준이 다를 수 있습니다. 계좌 개설 가능 여부는 지점 방문 전 미리 확인하는 것이 시간을 아낍니다.",
        bullets: ["여권 원본", "베트남 전화번호", "거주증 또는 비자 정보", "근로계약서 또는 재직 증빙"],
      },
      {
        heading: "계좌를 만든 뒤 확인할 것",
        body: "계좌 개설만큼 중요한 것은 실제 생활에서 쓸 수 있는지입니다. 모바일 뱅킹, 송금 한도, 카드 발급 여부를 같이 확인하세요.",
        bullets: ["앱 로그인과 언어 설정", "ATM 출금 수수료", "국제 송금 가능 여부", "카드 수령 일정"],
      },
      {
        heading: "생활 포털에 필요한 데이터",
        body: "은행 정보는 업체 목록보다 경험 데이터가 더 중요합니다. 어떤 지점에서 어떤 서류로 성공했는지가 재방문을 만듭니다.",
        bullets: ["지점명", "방문일", "필요 서류", "대기 시간과 응대 언어"],
      },
    ],
    faq: [
      { question: "관광비자로 은행 계좌를 만들 수 있나요?", answer: "은행과 시점에 따라 다를 수 있습니다. 방문 전 지점에 직접 확인하는 것이 가장 안전합니다." },
      { question: "현지 전화번호가 필요한가요?", answer: "대부분 모바일 인증과 앱 사용 때문에 현지 전화번호가 필요합니다." },
      { question: "한국어 가능한 은행 직원이 있나요?", answer: "지점마다 다릅니다. Mango Vietnam은 언어 응대 제보를 별도 데이터로 축적할 예정입니다." },
    ],
  },
  {
    slug: "ho-chi-minh-korean-hospital",
    title: "호치민 한국인 병원 찾을 때 보는 기준",
    description: "호치민에서 한국인이 병원을 찾을 때 진료과목, 언어 대응, 보험 서류, 야간 진료, 이동 동선을 확인하는 기준입니다.",
    categorySlug: "hospitals",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["호치민 한국인 병원", "호치민 병원", "베트남 병원 한국어"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "아플 때 가장 먼저 볼 정보",
        body: "병원 검색은 맛집 검색보다 실패 비용이 큽니다. 가까운 위치보다 진료과목과 응대 언어가 맞는지를 먼저 확인해야 합니다.",
        bullets: ["진료과목", "한국어 또는 영어 가능성", "야간·주말 운영", "보험 서류 발급 여부"],
      },
      {
        heading: "방문 전 연락이 필요한 경우",
        body: "소아과, 치과, 피부과, 응급 상황은 대기 시간과 예약 가능 여부가 중요합니다. 이동 전 전화 확인이 안전합니다.",
        bullets: ["예약 필요 여부", "예상 진료비", "검사 가능 여부", "결제 방식"],
      },
      {
        heading: "후기 데이터로 쌓아야 할 것",
        body: "병원 후기는 감정적 평가보다 구체적 경험이 중요합니다. 대기 시간과 설명 방식이 다음 사용자에게 큰 도움이 됩니다.",
        bullets: ["방문일", "진료과", "대기 시간", "언어 대응과 보험 서류"],
      },
    ],
    faq: [
      { question: "호치민에서 한국어 가능한 병원을 어떻게 찾나요?", answer: "병원 소개와 최신 후기를 함께 보고, 방문 전 전화로 한국어 또는 영어 응대 가능 여부를 확인하세요." },
      { question: "응급이면 어떻게 해야 하나요?", answer: "응급 상황에서는 가까운 응급실과 현지 긴급 연락처를 우선 이용해야 합니다." },
      { question: "보험 청구 서류도 받을 수 있나요?", answer: "병원마다 다르므로 진료 전 영문 진단서, 영수증, 세부 내역 발급 가능 여부를 확인하세요." },
    ],
  },
  {
    slug: "vietnam-used-motorbike-checklist",
    title: "베트남 중고 오토바이 구매 전 확인표",
    description: "베트남에서 중고 오토바이를 살 때 등록증, 차대번호, 정비 상태, 시운전, 거래 장소를 확인하는 체크리스트입니다.",
    categorySlug: "used-market",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["베트남 중고 오토바이", "호치민 오토바이 중고", "베트남 중고거래"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "서류 확인",
        body: "중고 오토바이는 가격보다 서류가 먼저입니다. 등록증과 차량 정보가 맞지 않으면 이후 판매나 단속에서 문제가 생길 수 있습니다.",
        bullets: ["등록증 원본", "차대번호와 엔진번호", "번호판 상태", "판매자 신분 확인"],
      },
      {
        heading: "상태 확인",
        body: "짧은 시운전만으로도 브레이크, 핸들 떨림, 엔진 소리, 타이어 상태를 어느 정도 확인할 수 있습니다.",
        bullets: ["시동과 공회전", "브레이크와 라이트", "타이어 마모", "오일 누유"],
      },
      {
        heading: "거래 안전",
        body: "선입금과 비공개 장소 거래는 피하고, 가능하면 정비소 점검 후 거래하는 편이 좋습니다.",
        bullets: ["공공장소 거래", "정비소 동행", "거래 내역 캡처", "현금 전달 전 서류 확인"],
      },
    ],
    faq: [
      { question: "중고 오토바이는 등록증이 꼭 필요한가요?", answer: "네. 등록증과 차량 정보가 맞는지 확인하는 것이 가장 중요합니다." },
      { question: "시운전은 꼭 해야 하나요?", answer: "가능하면 해야 합니다. 브레이크, 핸들, 엔진 상태를 직접 느껴볼 수 있습니다." },
      { question: "외국인도 오토바이를 살 수 있나요?", answer: "거주 조건과 서류 상황에 따라 다를 수 있어 구매 전 현지 규정과 보험 조건을 확인하세요." },
    ],
  },
  {
    slug: "vietnam-house-rent-checklist",
    title: "베트남 집 구하기 전에 보는 계약 체크리스트",
    description: "베트남에서 집을 구할 때 보증금, 관리비, 전기요금 단가, 침수 여부, 주차, 퇴실 조건을 확인하는 방법입니다.",
    categorySlug: "life-info",
    citySlug: "da-nang",
    cityName: "다낭",
    keywords: ["베트남 집 구하기", "다낭 집 렌트", "호치민 원룸"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "계약 전 비용 확인",
        body: "월세만 보고 계약하면 관리비와 전기요금에서 차이가 큽니다. 총 생활비 기준으로 비교해야 합니다.",
        bullets: ["보증금", "관리비", "전기요금 단가", "인터넷과 수도 포함 여부"],
      },
      {
        heading: "집 상태 확인",
        body: "베트남은 지역과 건물에 따라 습기, 소음, 침수, 벌레 문제가 다르게 나타납니다. 낮과 밤을 모두 확인하면 좋습니다.",
        bullets: ["창문과 환기", "침수 흔적", "오토바이 주차", "주변 공사와 소음"],
      },
      {
        heading: "퇴실 조건 확인",
        body: "입주보다 퇴실이 더 중요할 때가 많습니다. 보증금 반환 조건과 원상복구 범위를 계약 전에 확인하세요.",
        bullets: ["계약 기간", "중도 해지", "보증금 반환일", "가구 파손 기준"],
      },
    ],
    faq: [
      { question: "베트남 월세 계약에서 가장 중요한 것은 무엇인가요?", answer: "보증금, 전기요금 단가, 관리비, 퇴실 조건입니다." },
      { question: "다낭과 호치민 집 구하기 기준이 다른가요?", answer: "지역별 시세와 침수·교통 조건이 다르므로 도시별 체크리스트가 필요합니다." },
      { question: "중개인을 써도 되나요?", answer: "가능하지만 계약서, 비용, 수수료, 보증금 반환 조건은 직접 확인해야 합니다." },
    ],
  },
  {
    slug: "da-nang-massage-price",
    title: "다낭 마사지 가격 비교 전에 확인할 것",
    description: "다낭 마사지샵을 고를 때 프로그램 시간, 가격표, 팁 포함 여부, 예약, 후기 사진을 확인하는 기준입니다.",
    categorySlug: "massage",
    citySlug: "da-nang",
    cityName: "다낭",
    keywords: ["다낭 마사지", "다낭 마사지 가격", "베트남 마사지"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "가격표 보는 법",
        body: "마사지 가격은 시간, 프로그램, 위치, 팁 포함 여부에 따라 달라집니다. 최저가보다 총액을 기준으로 비교해야 합니다.",
        bullets: ["60분·90분·120분 구분", "팁 포함 여부", "샤워 가능 여부", "카드 결제 수수료"],
      },
      {
        heading: "후기에서 봐야 할 것",
        body: "마사지샵은 사진보다 최근 후기의 청결, 압 조절, 응대, 예약 정확도가 중요합니다.",
        bullets: ["청결 언급", "강도 조절", "커플룸 여부", "예약 시간 준수"],
      },
      {
        heading: "방문 전 체크",
        body: "인기 시간대에는 예약이 필요하고, 늦은 시간에는 귀가 동선을 먼저 확인해야 합니다.",
        bullets: ["예약 채널", "픽업 가능 여부", "위치와 귀가 동선", "추가 서비스 권유 여부"],
      },
    ],
    faq: [
      { question: "다낭 마사지는 예약이 필요한가요?", answer: "주말과 저녁 시간대는 예약하는 편이 좋습니다." },
      { question: "팁은 가격에 포함되나요?", answer: "매장마다 다르므로 예약 전 포함 여부를 확인하세요." },
      { question: "가족이나 커플이 가도 괜찮은 곳을 어떻게 찾나요?", answer: "후기에서 가족·커플 방문 언급과 매장 사진을 함께 확인하세요." },
    ],
  },
  {
    slug: "vietnam-korean-jobs",
    title: "베트남 한국인 구인구직 확인 기준",
    description: "베트남에서 한국인이 구직할 때 급여, 비자, 근무시간, 언어 요구, 계약 형태를 확인하는 방법입니다.",
    categorySlug: "jobs",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["베트남 구인구직", "호치민 한국인 채용", "베트남 알바"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "공고에서 먼저 볼 것",
        body: "해외 구직은 업무 내용보다 계약 조건이 더 중요합니다. 급여와 비자 조건이 명확하지 않으면 추가 확인이 필요합니다.",
        bullets: ["급여와 지급일", "비자 지원 여부", "근무시간과 휴무", "수습 기간"],
      },
      {
        heading: "언어와 업무 범위",
        body: "한국어 상담인지, 영어나 베트남어가 필요한지에 따라 난이도가 달라집니다. 공고 문구를 구체적으로 확인하세요.",
        bullets: ["한국어 응대", "영어 이메일", "베트남어 현장 소통", "카카오 상담 경험"],
      },
      {
        heading: "플랫폼에 쌓아야 할 데이터",
        body: "구인구직은 신뢰가 핵심입니다. 공고 이력과 후기, 신고가 쌓이면 재방문하는 게시판이 됩니다.",
        bullets: ["공고 등록일", "마감 여부", "지원 후기", "신고와 검수 이력"],
      },
    ],
    faq: [
      { question: "베트남에서 한국인이 파트타임을 구할 수 있나요?", answer: "가능한 공고는 있지만 체류 자격과 근로 가능 조건을 반드시 확인해야 합니다." },
      { question: "급여는 어떻게 확인해야 하나요?", answer: "월급, 시급, 건별 정산인지와 지급일, 수습 기간을 같이 확인하세요." },
      { question: "비자 지원 공고는 믿어도 되나요?", answer: "지원 범위와 비용 부담 주체를 명확히 확인해야 합니다." },
    ],
  },
  {
    slug: "vietnam-mobile-internet",
    title: "베트남 휴대폰·인터넷 개통 전 확인할 것",
    description: "베트남에서 유심, eSIM, 집 인터넷, 모바일 데이터 요금제를 고를 때 보는 체크리스트입니다.",
    categorySlug: "life-info",
    keywords: ["베트남 유심", "베트남 인터넷", "베트남 eSIM"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "유심과 eSIM 선택",
        body: "단기 체류와 장기 거주는 필요한 요금제가 다릅니다. 데이터 용량, 통화, 인증 문자 수신 여부를 함께 봐야 합니다.",
        bullets: ["데이터 용량", "현지 번호 필요 여부", "인증 문자 수신", "여권 등록 여부"],
      },
      {
        heading: "집 인터넷 설치",
        body: "집을 구한 뒤 인터넷 설치는 건물과 집주인 조건에 따라 달라질 수 있습니다. 계약 전 가능 통신사를 확인하세요.",
        bullets: ["설치 가능 통신사", "약정 기간", "설치비", "공유기 포함 여부"],
      },
      {
        heading: "생활 검색과 연결",
        body: "통신 정보는 은행 계좌, 배달 앱, 택시 앱, 병원 예약과 연결되기 때문에 초기 정착에서 중요도가 높습니다.",
        bullets: ["은행 앱 인증", "배달 앱 가입", "택시 앱 사용", "병원 예약 연락"],
      },
    ],
    faq: [
      { question: "베트남에서 현지 번호가 꼭 필요한가요?", answer: "은행, 배달, 택시, 인증 문자 때문에 장기 체류자는 현지 번호가 있으면 편합니다." },
      { question: "공항 유심을 써도 되나요?", answer: "단기 여행은 가능하지만 장기 거주자는 요금제와 인증 문자 수신 여부를 확인하는 것이 좋습니다." },
      { question: "집 인터넷은 누가 신청하나요?", answer: "건물주, 집주인, 임차인 조건이 다를 수 있어 계약 전 확인해야 합니다." },
    ],
  },
  {
    slug: "vietnam-hair-salon-korean-style",
    title: "베트남에서 한국식 미용실 찾는 기준",
    description: "베트남에서 한국식 커트, 염색, 펌, 네일을 찾을 때 사진, 가격표, 예약 방식, 상담 언어를 확인하는 방법입니다.",
    categorySlug: "hair-salons",
    keywords: ["베트남 미용실", "호치민 미용실", "다낭 미용실"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "사진과 스타일 확인",
        body: "미용실은 말로 설명하기 어려운 서비스입니다. 방문 전 시술 사진과 후기 사진을 확인하는 것이 가장 좋습니다.",
        bullets: ["커트 전후 사진", "염색 색감", "펌 유지 후기", "한국식 스타일 경험"],
      },
      {
        heading: "가격과 예약",
        body: "염색과 펌은 길이와 약제에 따라 비용이 달라질 수 있습니다. 예약 전 예상 금액과 소요 시간을 확인하세요.",
        bullets: ["기장 추가 비용", "소요 시간", "예약금 여부", "카카오톡 상담 가능성"],
      },
      {
        heading: "후기 데이터",
        body: "재방문 의사와 시술 사진이 쌓이면 지역별 미용실 페이지의 검색 품질이 크게 올라갑니다.",
        bullets: ["방문일", "시술명", "가격", "재방문 의사"],
      },
    ],
    faq: [
      { question: "한국식 커트가 가능한지 어떻게 확인하나요?", answer: "시술 사진과 한국인 후기를 먼저 보고, 예약 전 원하는 스타일 사진을 보내 상담하세요." },
      { question: "가격표가 없으면 어떻게 하나요?", answer: "기장, 약제, 디자이너에 따라 달라질 수 있으므로 예약 전 예상 금액을 확인해야 합니다." },
      { question: "네일이나 피부관리도 같은 기준인가요?", answer: "네. 사진, 가격표, 위생, 예약 방식을 함께 보는 것이 좋습니다." },
    ],
  },
  {
    slug: "vietnam-moving-sale-used-market",
    title: "베트남 귀국정리 중고거래 안전하게 하는 법",
    description: "베트남에서 귀국정리 가구와 가전을 사고팔 때 가격, 운송비, 작동 확인, 거래 장소를 확인하는 체크리스트입니다.",
    categorySlug: "used-market",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["베트남 귀국정리", "호치민 중고거래", "베트남 중고 가구"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "묶음 거래 가격 보기",
        body: "귀국정리 물건은 싸 보이지만 운송비와 설치비를 더하면 새 제품과 차이가 작을 수 있습니다.",
        bullets: ["개별 가격", "묶음 할인", "운송비", "설치 또는 분해 비용"],
      },
      {
        heading: "가전 작동 확인",
        body: "냉장고, 세탁기, 에어컨은 작동 영상만으로 부족할 수 있습니다. 가능하면 직접 확인하고 이전 설치 조건을 보세요.",
        bullets: ["작동 영상", "구매 시기", "수리 이력", "이전 설치 가능 여부"],
      },
      {
        heading: "거래 안전",
        body: "선입금은 피하고, 거래 내역과 제품 상태를 사진으로 남기는 것이 좋습니다.",
        bullets: ["공개된 장소", "제품 상태 사진", "대금 지급 시점", "배송 기사 연락처"],
      },
    ],
    faq: [
      { question: "귀국정리 물건은 언제 많이 나오나요?", answer: "월말, 학기 전후, 계약 종료 시기에 많이 나옵니다." },
      { question: "가전은 무엇을 확인해야 하나요?", answer: "작동 상태, 수리 이력, 운송비, 설치 가능 여부를 확인해야 합니다." },
      { question: "선입금 거래는 괜찮나요?", answer: "가능하면 피하고, 불가피하면 판매자 신원과 거래 기록을 충분히 남기세요." },
    ],
  },
  {
    slug: "ho-chi-minh-massage-price",
    title: "호치민 마사지 가격 비교 전에 확인할 것",
    description: "호치민 마사지샵을 고를 때 프로그램 시간, 가격표, 팁 포함 여부, 예약, 위치와 후기를 함께 확인하는 기준입니다.",
    categorySlug: "massage",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["호치민 마사지", "호치민 마사지 가격", "호치민 한인 마사지"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "가격표는 시간 기준으로 보기",
        body: "마사지 가격은 매장명보다 프로그램 시간과 포함 항목을 기준으로 비교해야 합니다. 60분, 90분, 120분 가격이 다르고 팁이나 샤워, 픽업 포함 여부도 매장마다 다릅니다.",
        bullets: ["60분, 90분, 120분 가격 구분", "팁 포함 여부", "샤워 가능 여부", "카드 결제와 수수료"],
      },
      {
        heading: "후기에서 확인할 키워드",
        body: "마사지샵은 사진만으로 판단하기 어렵습니다. 실제 선택에는 청결, 강도 조절, 응대, 예약 정확도 같은 후기 키워드가 더 중요합니다.",
        bullets: ["청결과 냄새", "강도 조절 가능 여부", "예약 시간 준수", "재방문 의사"],
      },
      {
        heading: "이동 동선까지 계산하기",
        body: "호치민은 교통 체증과 거리 차이가 커서 숙소, 식사, 귀가 동선까지 함께 봐야 합니다. 가격이 조금 낮아도 왕복 시간이 길면 실제 만족도가 떨어질 수 있습니다.",
        bullets: ["숙소와의 거리", "식사 전후 동선", "귀가 시간", "비 오는 날 이동성"],
      },
    ],
    faq: [
      { question: "호치민 마사지는 예약이 필요한가요?", answer: "주말과 저녁 시간대는 예약하는 편이 좋습니다. 인기 지역은 대기 시간이 생길 수 있습니다." },
      { question: "팁은 가격에 포함되나요?", answer: "매장마다 다르기 때문에 방문 전 가격표와 팁 포함 여부를 따로 확인해야 합니다." },
      { question: "한인 마사지는 어떻게 구분하나요?", answer: "운영 주체보다 한국인 후기, 예약 편의성, 위치, 가격 정보가 충분한지를 먼저 봅니다." },
    ],
  },
  {
    slug: "vietnam-spa-before-visit",
    title: "베트남 스파 방문 전 체크리스트",
    description: "베트남에서 스파를 예약하기 전 가격, 시설, 청결, 커플룸, 픽업 가능 여부를 확인하는 방법입니다.",
    categorySlug: "spas",
    keywords: ["베트남 스파", "다낭 스파", "베트남 마사지 스파"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "스파는 시설 후기가 중요합니다",
        body: "스파는 마사지 기술뿐 아니라 시설, 샤워 가능 여부, 룸 구성, 청결 상태가 만족도를 크게 좌우합니다. 사진과 후기에서 같은 키워드가 반복되는지 확인하세요.",
        bullets: ["룸과 샤워 시설", "청결 후기", "커플룸 여부", "가족 방문 후기"],
      },
      {
        heading: "예약 전에 물어볼 것",
        body: "프로그램 이름만 보고 예약하면 실제 포함 항목이 다를 수 있습니다. 시간, 가격, 팁, 픽업, 결제 방식을 분리해서 확인하는 것이 좋습니다.",
        bullets: ["프로그램 시간", "총액과 팁", "픽업 가능 여부", "카드 결제 가능 여부"],
      },
      {
        heading: "관광 동선과 함께 보기",
        body: "여행 중 스파는 식사, 쇼핑, 공항 이동 사이에 넣는 경우가 많습니다. 동선이 맞는 위치를 고르면 같은 가격이어도 체감 만족도가 높아집니다.",
        bullets: ["숙소 주변", "식사 후 이동", "공항 전 동선", "비 오는 날 대체 일정"],
      },
    ],
    faq: [
      { question: "스파와 마사지는 어떻게 다른가요?", answer: "마사지가 프로그램 중심이라면 스파는 시설, 룸 구성, 샤워, 휴식 경험까지 함께 보는 경우가 많습니다." },
      { question: "커플 스파는 미리 예약해야 하나요?", answer: "커플룸은 수가 제한될 수 있어 방문 전 예약과 룸 가능 여부를 확인하는 것이 좋습니다." },
      { question: "가격표가 없는 곳은 피해야 하나요?", answer: "무조건 피할 필요는 없지만 총액, 포함 항목, 팁 여부를 미리 확인해야 합니다." },
    ],
  },
  {
    slug: "ho-chi-minh-karaoke-price",
    title: "호치민 가라오케 가격과 예약 전에 확인할 것",
    description: "호치민 가라오케와 노래방을 찾을 때 룸 가격, 인원 기준, 예약, 추가 비용, 귀가 동선을 확인하는 기준입니다.",
    categorySlug: "karaoke",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["호치민 가라오케", "호치민 노래방", "호치민 가라오케 가격"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "가격 구조 먼저 확인",
        body: "가라오케는 시간당 룸 비용, 인원 기준, 음료와 안주 포함 여부에 따라 실제 총액이 달라집니다. 예약 전에 가격 구조를 나눠서 확인해야 합니다.",
        bullets: ["룸 비용", "최소 이용 시간", "인원 기준", "음료와 안주 포함 여부"],
      },
      {
        heading: "예약과 인원",
        body: "회식이나 단체 모임이면 룸 크기와 예약 시간을 먼저 확인해야 합니다. 방문 인원이 바뀌면 가격이나 룸 배정도 달라질 수 있습니다.",
        bullets: ["인원수", "룸 크기", "예약 시간", "늦은 시간 입장 가능 여부"],
      },
      {
        heading: "귀가 동선과 안전",
        body: "야간 방문은 위치와 귀가 동선이 중요합니다. 숙소까지의 거리, 택시 호출 가능 여부, 결제 방식을 미리 확인해두는 편이 좋습니다.",
        bullets: ["숙소와 거리", "택시 호출", "카드 결제 가능 여부", "후기에서 응대 확인"],
      },
    ],
    faq: [
      { question: "호치민 가라오케는 예약이 필요한가요?", answer: "단체나 주말 방문이면 예약하는 편이 좋습니다. 룸 크기와 이용 시간을 미리 확인하세요." },
      { question: "가격은 어떻게 비교하나요?", answer: "룸 비용, 최소 이용 시간, 인원 기준, 음료와 안주 포함 여부를 따로 확인해야 합니다." },
      { question: "노래방과 가라오케는 같이 봐도 되나요?", answer: "찾는 목적은 비슷하지만 운영 방식과 가격 구조가 다를 수 있어 상세 조건을 확인해야 합니다." },
    ],
  },
  {
    slug: "vietnam-karaoke-before-visit",
    title: "베트남 가라오케·노래방 방문 전 체크리스트",
    description: "베트남에서 가라오케나 노래방을 방문하기 전 가격, 예약, 한국 노래 지원, 위치, 결제 방식을 확인하는 체크리스트입니다.",
    categorySlug: "karaoke",
    keywords: ["베트남 가라오케", "베트남 노래방", "다낭 가라오케"],
    updatedAt: "2026-06-10",
    sections: [
      {
        heading: "한국 노래와 룸 조건",
        body: "한국 노래 지원 여부는 매장마다 다릅니다. 예약 전에 한국 노래 가능 여부와 룸 크기, 최소 이용 시간을 함께 확인하세요.",
        bullets: ["한국 노래 지원", "룸 크기", "최소 이용 시간", "마이크와 음향 상태"],
      },
      {
        heading: "추가 비용 확인",
        body: "룸 비용 외에 음료, 안주, 서비스 요금, 카드 수수료가 붙을 수 있습니다. 총액 기준으로 확인해야 방문 후 오해를 줄일 수 있습니다.",
        bullets: ["음료 포함 여부", "안주 주문 기준", "서비스 요금", "카드 수수료"],
      },
      {
        heading: "후기와 위치",
        body: "야간 장소는 위치와 후기가 중요합니다. 응대, 청결, 가격 설명, 귀가 동선에 대한 후기를 먼저 보고 후보를 좁히세요.",
        bullets: ["응대 후기", "청결 후기", "위치와 이동", "재방문 의사"],
      },
    ],
    faq: [
      { question: "베트남 가라오케에서 한국 노래가 가능한가요?", answer: "가능한 곳도 있지만 매장마다 다릅니다. 예약 전에 직접 확인하는 것이 안전합니다." },
      { question: "단체 모임으로 방문해도 되나요?", answer: "가능하지만 룸 크기, 최소 이용 시간, 인원 기준을 미리 확인해야 합니다." },
      { question: "방문 전에 가장 먼저 물어볼 것은 무엇인가요?", answer: "총액 기준 가격, 포함 항목, 예약 시간, 위치와 결제 방식을 먼저 확인하세요." },
    ],
  },
  {
    slug: "ho-chi-minh-1day-korean-food-massage",
    title: "호치민 하루 코스: 한식, 카페, 마사지까지",
    description: "호치민에서 하루만 움직일 때 점심, 카페, 마사지, 저녁 동선을 한국인 기준으로 묶어보는 코스입니다.",
    categorySlug: "life-info",
    citySlug: "ho-chi-minh",
    cityName: "호치민",
    keywords: ["호치민 하루 코스", "호치민 맛집 마사지", "호치민 한국인 여행"],
    updatedAt: "2026-06-11",
    sections: [
      {
        heading: "점심은 이동 쉬운 한식으로",
        body: "첫 방문이면 로컬 맛집만 고집하기보다 숙소와 가까운 한식, 중식, 고기집 후보를 먼저 잡는 편이 움직이기 쉽습니다.",
        bullets: ["숙소에서 택시 15분 이내", "사진이 있는 메뉴", "한국인 후기", "카페나 마사지와 가까운 위치"],
      },
      {
        heading: "오후는 카페와 마사지",
        body: "더운 시간대에는 이동을 줄이고 카페와 마사지를 같은 생활권 안에서 묶는 것이 만족도가 높습니다.",
        bullets: ["카페 체류 시간", "마사지 예약 가능 시간", "샤워 가능 여부", "팁 포함 여부"],
      },
      {
        heading: "저녁은 귀가 동선 기준",
        body: "저녁에는 유명한 곳보다 귀가가 쉬운 곳을 우선으로 보는 편이 좋습니다. 늦은 시간 택시 호출과 결제 방식도 확인하세요.",
        bullets: ["숙소와 거리", "영업 종료 시간", "택시 호출", "카드 결제 가능 여부"],
      },
    ],
    faq: [
      { question: "호치민 하루 코스는 어느 지역을 기준으로 보면 좋나요?", answer: "처음 방문이면 1군, 2군, 푸미흥처럼 숙소와 식사 후보가 많은 생활권부터 보는 것이 좋습니다." },
      { question: "마사지 예약은 꼭 해야 하나요?", answer: "주말이나 저녁 시간대는 예약하는 편이 안전합니다. 프로그램 시간과 총액 기준 가격을 함께 확인하세요." },
      { question: "로컬 맛집과 한식 중 무엇을 먼저 봐야 하나요?", answer: "여행 목적이면 로컬도 좋지만, 짧은 일정에서는 이동과 메뉴 이해가 쉬운 곳을 먼저 고르는 편이 실패 확률이 낮습니다." },
    ],
  },
  {
    slug: "da-nang-family-3days",
    title: "다낭 가족 여행 3박 4일: 맛집, 스파, 비 오는 날 대체 코스",
    description: "다낭 가족 여행자가 자주 찾는 식사, 마사지, 실내 일정, 비 오는 날 대체 동선을 한국인 기준으로 정리했습니다.",
    categorySlug: "life-info",
    citySlug: "da-nang",
    cityName: "다낭",
    keywords: ["다낭 가족 여행", "다낭 3박 4일 코스", "다낭 스파 맛집"],
    updatedAt: "2026-06-11",
    sections: [
      {
        heading: "가족 일정은 이동 피로가 핵심",
        body: "아이 또는 부모님과 함께라면 유명 장소를 많이 넣는 것보다 식사, 휴식, 이동 시간을 안정적으로 잡는 편이 좋습니다.",
        bullets: ["숙소 주변 식사 후보", "택시 이동 시간", "낮 휴식 시간", "비 오는 날 대체 일정"],
      },
      {
        heading: "스파와 마사지는 시설 먼저",
        body: "가족 방문에서는 가격보다 청결, 룸 구성, 샤워 가능 여부, 대기 공간이 더 중요할 수 있습니다.",
        bullets: ["가족 방문 후기", "커플룸 또는 단체룸", "샤워 시설", "예약 시간"],
      },
      {
        heading: "식사는 실패 확률 낮은 후보로",
        body: "다낭은 선택지가 많아 오히려 결정이 어렵습니다. 사진, 후기, 위치가 확인되는 곳을 일정별로 두세 곳씩 저장해두세요.",
        bullets: ["한식 후보", "로컬 식당 후보", "카페 후보", "배달 가능 여부"],
      },
    ],
    faq: [
      { question: "다낭 가족 여행에서 스파를 넣어도 괜찮나요?", answer: "후기에서 가족 방문과 시설 언급이 있는 곳을 고르면 일정 중간 휴식 코스로 좋습니다." },
      { question: "비 오는 날에는 무엇을 하면 좋나요?", answer: "카페, 스파, 실내 식사, 쇼핑처럼 이동 부담이 낮은 일정을 묶는 것이 좋습니다." },
      { question: "식당은 미리 예약해야 하나요?", answer: "인원이 많거나 주말 저녁이면 예약하는 편이 좋습니다. 메뉴 사진과 위치도 함께 확인하세요." },
    ],
  },
  {
    slug: "nha-trang-rainy-day-course",
    title: "나트랑 비 오는 날 코스: 카페, 식사, 마사지",
    description: "나트랑에서 비가 올 때 이동 부담을 줄이면서 갈 수 있는 카페, 식사, 마사지 동선을 정리했습니다.",
    categorySlug: "life-info",
    citySlug: "nha-trang",
    cityName: "나트랑",
    keywords: ["나트랑 비오는 날", "나트랑 실내 코스", "나트랑 마사지 카페"],
    updatedAt: "2026-06-11",
    sections: [
      {
        heading: "비 오는 날은 동선부터 줄이기",
        body: "비가 오면 해변 중심 일정이 흐트러지기 쉽습니다. 숙소와 가까운 카페, 식당, 마사지 후보를 먼저 묶어두세요.",
        bullets: ["숙소와 거리", "택시 승하차 편의", "실내 좌석", "대기 가능 여부"],
      },
      {
        heading: "카페와 식사는 사진으로 확인",
        body: "나트랑은 관광객용 매장과 로컬 매장이 섞여 있어 메뉴 사진, 좌석 사진, 최근 후기를 함께 보는 것이 좋습니다.",
        bullets: ["메뉴 사진", "좌석 사진", "최근 후기", "가족 방문 가능 여부"],
      },
      {
        heading: "마사지는 예약과 총액 확인",
        body: "비 오는 날에는 마사지 수요가 몰릴 수 있습니다. 예약 가능 시간, 프로그램 시간, 팁 포함 여부를 먼저 확인하세요.",
        bullets: ["예약 시간", "프로그램 시간", "팁 포함 여부", "샤워 가능 여부"],
      },
    ],
    faq: [
      { question: "나트랑 비 오는 날에도 마사지 예약이 필요한가요?", answer: "수요가 몰릴 수 있어 가능하면 예약하는 편이 좋습니다. 총액 기준 가격도 함께 확인하세요." },
      { question: "아이와 같이 갈 만한 실내 코스는 어떻게 고르나요?", answer: "좌석 사진, 가족 방문 후기, 숙소와의 거리를 먼저 보고 후보를 줄이세요." },
      { question: "로컬 식당은 비 오는 날에도 괜찮나요?", answer: "괜찮지만 이동과 대기 환경을 봐야 합니다. 비 오는 날에는 실내 좌석과 택시 승하차가 쉬운 곳이 좋습니다." },
    ],
  },
];

type CoreCityProfile = {
  areas: string;
  audience: string;
  caution: string;
};

type RepresentativeGuideTemplate = {
  slugPart: string;
  categorySlug: string;
  label: string;
  title: (cityName: string) => string;
  description: (cityName: string, profile: CoreCityProfile) => string;
  keywords: (cityName: string) => string[];
  sections: (cityName: string, profile: CoreCityProfile) => GuideSection[];
  faq: (cityName: string, profile: CoreCityProfile) => Array<{ question: string; answer: string }>;
};

const coreCityProfiles: Record<string, CoreCityProfile> = {
  "ho-chi-minh": {
    areas: "1군, 2군, 7군 푸미흥, 빈탄",
    audience: "장기 거주자와 출장자, 교민 가족",
    caution: "교통 체증과 생활권 차이가 커서 이동 시간을 함께 봐야 합니다.",
  },
  "da-nang": {
    areas: "미케비치, 한시장, 안트엉, 선짜",
    audience: "가족 여행자와 장기 체류자",
    caution: "관광지 가격과 거주자 생활권 가격이 섞여 있어 총액 기준 비교가 필요합니다.",
  },
  "nha-trang": {
    areas: "쩐푸 해변, 시내 중심, 빈펄 선착장 주변",
    audience: "가족 여행자와 리조트 체류자",
    caution: "해변 일정과 실내 대체 일정이 달라서 날씨와 이동 동선을 같이 봐야 합니다.",
  },
  hanoi: {
    areas: "호안끼엠, 서호, 미딩, 꺼우저이",
    audience: "북부 거주자와 출장자",
    caution: "생활권별 분위기와 이동 시간이 달라 약속 장소와 거주지를 함께 비교해야 합니다.",
  },
  "phu-quoc": {
    areas: "즈엉동, 안터이, 롱비치, 그랜드월드",
    audience: "리조트 여행자와 단기 체류자",
    caution: "섬 지역은 이동비와 운영 시간이 만족도에 크게 영향을 줍니다.",
  },
  "da-lat": {
    areas: "달랏 시장, 쑤언흐엉 호수, 로컬 카페 거리, 외곽 정원 카페",
    audience: "카페 여행자와 장기 휴식 체류자",
    caution: "언덕 지형과 날씨 변화가 커서 이동 수단과 운영 시간을 먼저 확인해야 합니다.",
  },
};

const representativeGuideTemplates: RepresentativeGuideTemplate[] = [
  {
    slugPart: "restaurants",
    categorySlug: "restaurants",
    label: "맛집",
    title: (cityName) => `${cityName} 맛집 찾기: 한식, 로컬, 가족 식사 체크리스트`,
    description: (cityName, profile) =>
      `${cityName}에서 한국인이 맛집을 찾을 때 ${profile.areas} 생활권, 한식 필요 상황, 가족 식사, 이동 시간을 함께 보는 기준입니다.`,
    keywords: (cityName) => [`${cityName} 맛집`, `${cityName} 한식`, `${cityName} 가족 식사`, `${cityName} 로컬 맛집`],
    sections: (cityName, profile) => [
      {
        heading: "먼저 생활권을 정하기",
        body: `${cityName} 맛집은 평점보다 위치가 먼저입니다. ${profile.areas}처럼 자주 움직이는 생활권을 기준으로 후보를 줄이면 실패 비용이 줄어듭니다.`,
        bullets: ["숙소나 집에서 이동 시간", "점심·저녁 피크 시간", "택시 승하차 편의", "식사 후 카페나 마사지 동선"],
      },
      {
        heading: "한국인 기준으로 볼 것",
        body: "처음 방문이면 분위기보다 메뉴 사진, 최근 후기, 위생, 결제 방식을 먼저 확인하는 편이 좋습니다. 해장, 혼밥, 가족 식사처럼 상황도 같이 봐야 합니다.",
        bullets: ["메뉴판과 가격 사진", "한국어 또는 영어 응대", "아이 동반 가능 여부", "최근 방문 후기"],
      },
      {
        heading: "저장할 만한 데이터",
        body: "맛집 대표글은 추천 목록보다 다시 확인할 기준이 중요합니다. 실제 방문 후기는 메뉴, 방문일, 재방문 의사를 함께 쌓아야 검색 자산이 됩니다.",
        bullets: ["추천 메뉴", "방문일과 대기 시간", "가격대", "재방문 의사"],
      },
    ],
    faq: (cityName, profile) => [
      { question: `${cityName} 맛집은 어느 지역부터 보면 좋나요?`, answer: `${profile.areas}처럼 이동이 쉬운 생활권부터 보면 좋습니다. 처음이면 숙소나 집에서 가까운 곳을 우선 비교하세요.` },
      { question: `${cityName}에서 한식이 필요할 때는 어떻게 찾나요?`, answer: "짬뽕, 고기, 국밥, 분식처럼 목적 메뉴를 먼저 정하고 최근 사진과 후기 유무를 확인하는 편이 좋습니다." },
      { question: "평점만 보고 가도 괜찮나요?", answer: "평점만으로는 부족합니다. 메뉴 사진, 가격, 최근 후기, 이동 시간을 함께 확인해야 만족도가 올라갑니다." },
    ],
  },
  {
    slugPart: "massage-price",
    categorySlug: "massage",
    label: "마사지",
    title: (cityName) => `${cityName} 마사지 가격 비교 전에 확인할 것`,
    description: (cityName, profile) =>
      `${cityName}에서 마사지를 고를 때 가격표, 팁 포함 여부, 예약, 위치, 귀가 동선을 한국인 기준으로 확인하는 체크리스트입니다.`,
    keywords: (cityName) => [`${cityName} 마사지`, `${cityName} 마사지 가격`, `${cityName} 스파`, `${cityName} 마사지 추천`],
    sections: (cityName, profile) => [
      {
        heading: "총액 기준으로 비교하기",
        body: `${cityName} 마사지는 시간과 프로그램 이름이 비슷해 보여도 팁, 샤워, 픽업, 카드 수수료에 따라 실제 비용이 달라질 수 있습니다.`,
        bullets: ["60분·90분·120분 가격", "팁 포함 여부", "샤워와 대기 공간", "카드 결제와 추가 수수료"],
      },
      {
        heading: "위치와 예약 확인",
        body: `${profile.caution} 특히 저녁 시간대는 예약 가능 시간과 귀가 동선을 먼저 확인하는 편이 안전합니다.`,
        bullets: ["예약 채널", "숙소에서 이동 시간", "늦은 시간 귀가 동선", "커플룸·가족 방문 가능 여부"],
      },
      {
        heading: "후기에서 볼 신호",
        body: "사진보다 중요한 것은 최근 후기의 구체성입니다. 압 조절, 청결, 응대, 시간 준수 같은 표현이 있는지 확인하세요.",
        bullets: ["청결 언급", "마사지 강도 조절", "시간 준수", "추가 권유 여부"],
      },
    ],
    faq: (cityName) => [
      { question: `${cityName} 마사지는 예약해야 하나요?`, answer: "주말, 저녁, 가족 단위 방문이면 예약하는 편이 좋습니다. 인기 시간대는 대기가 생길 수 있습니다." },
      { question: "팁은 가격에 포함되나요?", answer: "매장마다 다릅니다. 예약 전 가격표에서 팁 포함 여부와 총액을 확인하세요." },
      { question: "처음 방문이면 어떤 곳이 안전한가요?", answer: "가격표, 위치, 최근 후기, 운영시간이 명확한 곳부터 보는 편이 좋습니다." },
    ],
  },
  {
    slugPart: "real-estate-rent",
    categorySlug: "real-estate",
    label: "부동산",
    title: (cityName) => `${cityName} 부동산 월세·단기임대 계약 전 체크리스트`,
    description: (cityName, profile) =>
      `${cityName}에서 집을 구할 때 월세, 보증금, 관리비, 전기요금, 계약 기간, 퇴실 조건을 먼저 확인하는 기준입니다.`,
    keywords: (cityName) => [`${cityName} 부동산`, `${cityName} 월세`, `${cityName} 단기임대`, `${cityName} 원룸`],
    sections: (cityName, profile) => [
      {
        heading: "월세보다 총 생활비 보기",
        body: `${cityName} 집 구하기는 월세 숫자만 보면 위험합니다. 관리비, 전기요금, 인터넷, 청소비까지 합친 총액으로 비교해야 합니다.`,
        bullets: ["보증금과 월세", "관리비 포함 항목", "전기요금 단가", "인터넷·수도·청소비"],
      },
      {
        heading: "생활권과 건물 상태 확인",
        body: `${profile.areas}처럼 생활권별 장단점이 다릅니다. 집 자체뿐 아니라 출퇴근, 장보기, 소음, 침수 가능성도 함께 봐야 합니다.`,
        bullets: ["출퇴근 이동 시간", "주차와 엘리베이터", "습기·누수·침수 흔적", "밤 시간 소음"],
      },
      {
        heading: "계약과 퇴실 조건",
        body: "입주보다 퇴실 조건이 더 중요할 수 있습니다. 보증금 반환일과 중도 해지 조건은 계약 전에 문자나 계약서로 남겨야 합니다.",
        bullets: ["계약 기간", "중도 해지 조건", "보증금 반환 방식", "가구 파손 기준"],
      },
    ],
    faq: (cityName) => [
      { question: `${cityName} 월세 계약에서 가장 먼저 볼 것은 무엇인가요?`, answer: "월세, 보증금, 관리비, 전기요금 단가, 퇴실 조건을 먼저 확인해야 합니다." },
      { question: "단기임대는 어떤 점이 다른가요?", answer: "월세가 높거나 보증금 조건이 다를 수 있습니다. 청소비, 전기요금, 체크아웃 조건을 따로 확인하세요." },
      { question: "사진만 보고 계약해도 되나요?", answer: "가능하면 직접 보거나 영상 통화로 확인해야 합니다. 습기, 소음, 주차, 주변 환경은 사진만으로 알기 어렵습니다." },
    ],
  },
  {
    slugPart: "jobs",
    categorySlug: "jobs",
    label: "구인구직",
    title: (cityName) => `${cityName} 구인구직 볼 때 급여·비자·근무조건 확인하기`,
    description: (cityName, profile) =>
      `${cityName}에서 한국인이 구직할 때 급여, 비자, 근무시간, 언어 조건, 계약 형태를 확인하는 방법입니다.`,
    keywords: (cityName) => [`${cityName} 구인구직`, `${cityName} 한국인 채용`, `${cityName} 알바`, `${cityName} 취업`],
    sections: (cityName) => [
      {
        heading: "공고에서 먼저 볼 조건",
        body: `${cityName} 구인구직은 업무명보다 조건의 명확성이 중요합니다. 급여, 지급일, 비자, 휴무가 흐리면 지원 전에 반드시 확인하세요.`,
        bullets: ["급여와 지급일", "수습 기간", "비자 지원 여부", "근무시간과 휴무"],
      },
      {
        heading: "언어와 실제 업무 범위",
        body: "한국어 상담인지, 영어 이메일이 필요한지, 베트남어 현장 소통이 필요한지에 따라 난이도가 달라집니다.",
        bullets: ["한국어 고객 응대", "영어 또는 베트남어 요구", "카카오 상담 경험", "현장 이동 여부"],
      },
      {
        heading: "사기와 분쟁 방지",
        body: "해외 구직은 연락처만 있는 공고보다 회사명, 위치, 계약 조건이 확인되는 공고가 안전합니다.",
        bullets: ["회사명과 위치", "계약서 작성 여부", "선입금 요구 여부", "마감일과 공고 등록일"],
      },
    ],
    faq: (cityName) => [
      { question: `${cityName}에서 한국인이 알바를 구할 수 있나요?`, answer: "공고는 있을 수 있지만 체류 자격과 근로 가능 조건을 반드시 확인해야 합니다." },
      { question: "비자 지원 공고는 믿어도 되나요?", answer: "지원 범위, 비용 부담, 계약 기간을 문서로 확인해야 합니다." },
      { question: "급여 협의라고 쓰인 공고는 어떻게 봐야 하나요?", answer: "면접 전에 급여 범위, 지급일, 수습 기간을 먼저 물어보는 것이 좋습니다." },
    ],
  },
  {
    slugPart: "used-market",
    categorySlug: "used-market",
    label: "중고거래",
    title: (cityName) => `${cityName} 중고거래 안전하게 하는 법`,
    description: (cityName, profile) =>
      `${cityName}에서 오토바이, 가전, 가구, 귀국정리 물품을 거래할 때 상태, 서류, 거래 장소, 사기 방지를 확인하는 체크리스트입니다.`,
    keywords: (cityName) => [`${cityName} 중고거래`, `${cityName} 중고 오토바이`, `${cityName} 귀국정리`, `${cityName} 중고 가전`],
    sections: (cityName) => [
      {
        heading: "상태와 사진 먼저 확인",
        body: `${cityName} 중고거래는 가격보다 상태 확인이 먼저입니다. 사용 기간, 고장 여부, 실사진, 거래 가능 위치를 확인해야 합니다.`,
        bullets: ["실사진과 사용 기간", "고장·수리 이력", "구성품", "거래 가능 위치"],
      },
      {
        heading: "오토바이와 고가 물품",
        body: "오토바이, 노트북, 냉장고처럼 금액이 큰 물건은 서류와 작동 확인이 필수입니다. 선입금만 요구하는 거래는 피하세요.",
        bullets: ["등록증 또는 보증서", "현장 작동 확인", "정비·수리 내역", "선입금 요구 여부"],
      },
      {
        heading: "안전한 거래 방식",
        body: "처음 거래하는 사람이라면 공개된 장소와 낮 시간대를 선택하는 편이 좋습니다. 대화 내용과 입금 내역은 남겨두세요.",
        bullets: ["공개 장소 거래", "낮 시간대 약속", "대화 캡처 보관", "거래 완료 표시"],
      },
    ],
    faq: (cityName) => [
      { question: `${cityName} 중고거래에서 가장 조심할 점은 무엇인가요?`, answer: "선입금 요구, 실사진 없는 판매글, 위치가 계속 바뀌는 거래는 주의해야 합니다." },
      { question: "오토바이는 무엇을 확인해야 하나요?", answer: "등록증, 차대번호, 시운전, 브레이크, 타이어, 누유 여부를 확인하세요." },
      { question: "귀국정리 물품은 언제 사는 게 좋나요?", answer: "이사 날짜가 가까울수록 가격 조정 여지가 있지만, 상태 확인과 운반 방법을 먼저 봐야 합니다." },
    ],
  },
  {
    slugPart: "life-info",
    categorySlug: "life-info",
    label: "생활정보",
    title: (cityName) => `${cityName} 생활정보: 비자, 병원, 은행, 통신 한 번에 보기`,
    description: (cityName, profile) =>
      `${cityName}에서 한국인이 자주 다시 찾는 비자, 병원, 은행, 통신, 교통, 집 구하기 정보를 저장용 체크리스트로 정리했습니다.`,
    keywords: (cityName) => [`${cityName} 생활정보`, `${cityName} 한국인`, `${cityName} 병원`, `${cityName} 비자`],
    sections: (cityName, profile) => [
      {
        heading: "처음 정착할 때 필요한 정보",
        body: `${cityName} 생활정보는 한 번 보고 끝나는 글이 아니라 저장해두고 다시 보는 문서가 되어야 합니다. ${profile.audience}에게 필요한 항목을 먼저 정리하세요.`,
        bullets: ["비자와 체류 기간", "현지 전화번호", "은행과 결제", "집 주소와 교통"],
      },
      {
        heading: "문제가 생겼을 때 찾는 정보",
        body: "병원, 약국, 통역, 대사관, 보험 서류처럼 급할 때 필요한 정보는 평소에 저장해두는 편이 좋습니다.",
        bullets: ["가까운 병원", "보험 청구 서류", "응급 연락처", "한국어 또는 영어 응대"],
      },
      {
        heading: "지역별로 계속 업데이트할 것",
        body: `${profile.caution} 생활정보는 시간이 지나면 바뀌므로 방문일과 확인일을 함께 남기는 구조가 필요합니다.`,
        bullets: ["최근 확인일", "운영시간 변경", "가격 또는 수수료", "사용자 제보"],
      },
    ],
    faq: (cityName) => [
      { question: `${cityName}에 처음 오면 무엇부터 준비해야 하나요?`, answer: "체류 기간, 현지 전화번호, 숙소 주소, 결제 수단, 응급 연락처를 먼저 정리하세요." },
      { question: "생활정보는 왜 도시별로 봐야 하나요?", answer: "병원, 부동산, 교통, 행정 동선은 도시와 생활권에 따라 차이가 크기 때문입니다." },
      { question: "정보가 바뀌면 어떻게 확인하나요?", answer: "업데이트 날짜와 사용자 제보를 함께 보고, 중요한 내용은 방문 전 직접 확인하는 것이 좋습니다." },
    ],
  },
];

const representativeGuides: Guide[] = allCities
  .filter((city) => city.slug in coreCityProfiles)
  .flatMap((city) => {
    const profile = coreCityProfiles[city.slug];

    return representativeGuideTemplates.map((template) => ({
      slug: `${city.slug}-${template.slugPart}-guide`,
      title: template.title(city.name),
      description: template.description(city.name, profile),
      categorySlug: template.categorySlug,
      citySlug: city.slug,
      cityName: city.name,
      keywords: template.keywords(city.name),
      updatedAt: "2026-06-11",
      sections: template.sections(city.name, profile),
      faq: template.faq(city.name, profile),
    }));
  });

const allGuides = [...guides, ...representativeGuides].filter(
  (guide, index, collection) => collection.findIndex((candidate) => candidate.slug === guide.slug) === index,
);

export function getAllGuides() {
  return allGuides;
}

export function getGuideBySlug(slug: string) {
  return allGuides.find((guide) => guide.slug === slug);
}

export function getGuidesBySlugs(slugs: string[]) {
  const order = new Map(slugs.map((slug, index) => [slug, index]));
  return allGuides.filter((guide) => order.has(guide.slug)).sort((left, right) => order.get(left.slug)! - order.get(right.slug)!);
}

export function getGuideUrl(guide: Pick<Guide, "slug">) {
  return `${SITE_URL}/guide/${guide.slug}`;
}
