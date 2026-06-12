import type { CategoryConfig, CityConfig } from "@/lib/site";
import type { Listing } from "@/lib/places";
import { getListingCopy } from "@/lib/listing-copy";

export type FaqItem = {
  question: string;
  answer: string;
};

type CategoryStats = {
  total: number;
  restaurants: number;
  cafes: number;
  massage: number;
};

type CategoryPlaybook = {
  searcher: string;
  focus: string;
  checklist: string[];
  faq: Array<(cityName: string) => FaqItem>;
  relatedGuideSlugs: string[];
};

const categoryPlaybooks: Record<string, CategoryPlaybook> = {
  restaurants: {
    searcher: "식사 장소를 고르는 한국인",
    focus: "한식, 로컬 맛집, 가족 식사, 혼밥, 배달 가능성, 사진과 후기",
    checklist: ["한국인 후기가 있는지 확인", "사진으로 매장 분위기와 메뉴 확인", "점심/저녁 피크타임 전 예약 가능 여부 확인", "위치가 숙소나 회사 동선과 맞는지 확인"],
    relatedGuideSlugs: ["ho-chi-minh-korean-hospital", "vietnam-used-motorbike-checklist"],
    faq: [
      (city) => ({
        question: `${city} 맛집은 어떤 기준으로 보면 좋나요?`,
        answer: "평점 하나만 보기보다 최근 후기, 사진 수, 한국인이 남긴 메뉴 언급, 이동 동선, 가격대를 함께 보는 편이 안전합니다.",
      }),
      (city) => ({
        question: `${city}에서 한식이 먹고 싶을 때도 이 페이지를 보면 되나요?`,
        answer: "네. 맛집 전체 목록에서 한식, 고기집, 짬뽕, 분식처럼 한국인이 자주 찾는 키워드를 함께 비교할 수 있습니다.",
      }),
      () => ({
        question: "사진이 없는 업체는 어떻게 판단하나요?",
        answer: "사진이 부족한 곳은 주소, 후기 내용, 메뉴 키워드를 먼저 확인하고 방문 후 사진 제보가 쌓이면 우선순위를 다시 조정합니다.",
      }),
      () => ({
        question: "예약 정보도 확인할 수 있나요?",
        answer: "현재는 전화번호, 지도 링크, 영업시간을 우선 정리하고 있으며 후기 데이터가 쌓이면 예약 팁을 상세 페이지에 추가합니다.",
      }),
    ],
  },
  "korean-restaurants": {
    searcher: "한식과 익숙한 맛을 찾는 한국인",
    focus: "한식당, 짬뽕, 고기집, 분식, 국물 메뉴, 단체 식사",
    checklist: ["김치/국물/고기 메뉴 키워드 확인", "한국인 리뷰가 실제 메뉴를 언급하는지 확인", "단체석과 주차 가능성 확인", "배달 또는 포장 가능 여부 확인"],
    relatedGuideSlugs: ["vietnam-korean-jobs", "vietnam-hair-salon-korean-style"],
    faq: [
      (city) => ({
        question: `${city} 한식 맛집은 어떻게 골랐나요?`,
        answer: "업체명, 태그, 후기에서 한식·한국·고기·짬뽕·김치 같은 키워드가 확인되는 곳을 우선 묶었습니다.",
      }),
      () => ({
        question: "현지화된 한식과 한국식 한식을 구분하나요?",
        answer: "후기와 메뉴 데이터가 쌓이면 국물, 반찬, 고기, 분식처럼 한국인이 체감하는 기준으로 더 세분화할 예정입니다.",
      }),
      () => ({
        question: "가족 식사나 회식 장소도 찾을 수 있나요?",
        answer: "사진, 가격대, 후기 수, 지도 위치를 함께 보여줘 가족 식사나 회식 후보를 비교하기 쉽게 구성했습니다.",
      }),
      () => ({
        question: "업체 상세 페이지에는 무엇이 있나요?",
        answer: "소개, 주소, 영업시간, 가격대, 사진, 추천 메뉴, 한국인 후기, 지도 링크를 한 페이지에서 볼 수 있습니다.",
      }),
    ],
  },
  cafes: {
    searcher: "작업하거나 쉬어갈 카페를 찾는 한국인",
    focus: "조용한 좌석, 커피, 디저트, 와이파이, 비 오는 날 이동성",
    checklist: ["사진으로 좌석과 분위기 확인", "후기에서 작업·휴식 키워드 확인", "숙소나 회사에서 이동하기 쉬운지 확인", "비 오는 날 택시 승하차가 편한지 확인"],
    relatedGuideSlugs: ["vietnam-mobile-internet", "vietnam-house-rent-checklist"],
    faq: [
      (city) => ({
        question: `${city} 카페는 작업하기 좋은 곳도 포함되나요?`,
        answer: "네. 좌석 분위기, 후기 키워드, 위치 정보를 기준으로 작업과 휴식 모두 고려할 수 있게 정리합니다.",
      }),
      () => ({
        question: "카페 사진은 왜 중요한가요?",
        answer: "베트남 카페는 분위기와 좌석 밀도가 선택에 큰 영향을 주기 때문에 사진이 검색 만족도를 크게 높입니다.",
      }),
      () => ({
        question: "와이파이 정보도 있나요?",
        answer: "현재는 후기 기반으로 확인하며, 재방문 후기와 제보가 쌓이면 와이파이와 콘센트 정보를 분리할 예정입니다.",
      }),
      () => ({
        question: "여행자도 사용할 수 있나요?",
        answer: "장기 거주자 기준으로 만들지만 여행자도 동선, 사진, 후기, 지도 링크를 이용해 빠르게 선택할 수 있습니다.",
      }),
    ],
  },
  hospitals: {
    searcher: "아플 때 바로 확인할 병원을 찾는 한국인",
    focus: "한국어 가능성, 진료과목, 응급 대응, 보험 서류, 위치",
    checklist: ["한국어 또는 영어 응대 가능성 확인", "진료과목과 야간/주말 운영 확인", "보험 청구 서류 발급 가능 여부 확인", "응급 상황이면 가까운 대형 병원부터 확인"],
    relatedGuideSlugs: ["ho-chi-minh-korean-hospital", "vietnam-mobile-internet"],
    faq: [
      (city) => ({
        question: `${city} 한국인 병원은 어떤 정보를 먼저 봐야 하나요?`,
        answer: "진료과목, 언어 대응, 운영시간, 보험 서류, 위치를 먼저 확인해야 실제 방문 때 시행착오를 줄일 수 있습니다.",
      }),
      () => ({
        question: "응급 상황에서도 이 페이지를 쓰면 되나요?",
        answer: "응급 상황에서는 가까운 응급실이나 현지 긴급 연락처를 우선 이용하고, 이 페이지는 병원 후보를 비교하는 용도로 쓰는 것이 좋습니다.",
      }),
      () => ({
        question: "치과나 소아과도 포함되나요?",
        answer: "한국인이 자주 찾는 치과, 소아과, 피부과, 내과 정보를 별도 키워드로 확장할 예정입니다.",
      }),
      () => ({
        question: "병원 후기는 어떻게 쌓이나요?",
        answer: "진료 경험, 대기 시간, 언어 대응, 비용, 재방문 의사를 정리해 다음 방문자가 참고할 수 있게 만듭니다.",
      }),
    ],
  },
  "hair-salons": {
    searcher: "한국식 커트와 염색을 찾는 한국인",
    focus: "커트, 염색, 네일, 피부관리, 예약 방식, 가격표",
    checklist: ["시술 사진과 가격대 확인", "한국식 스타일 상담 경험 확인", "카카오톡/전화 예약 가능 여부 확인", "염색·펌은 소요 시간과 추가 비용 확인"],
    relatedGuideSlugs: ["vietnam-hair-salon-korean-style", "vietnam-mobile-internet"],
    faq: [
      (city) => ({
        question: `${city} 미용실은 한국식 스타일도 가능한가요?`,
        answer: "후기와 업체 소개에서 한국식 커트, 염색, 펌 상담 경험을 확인할 수 있는 곳부터 우선 정리합니다.",
      }),
      () => ({
        question: "가격표가 없으면 어떻게 비교하나요?",
        answer: "가격표가 없는 업체는 후기, 사진, 위치, 예약 방식부터 표시하고 제보가 들어오면 시술별 가격대를 추가합니다.",
      }),
      () => ({
        question: "네일이나 피부관리도 포함되나요?",
        answer: "미용 반복 수요가 있는 네일, 피부관리, 두피관리까지 같은 생활 카테고리에서 확장합니다.",
      }),
      () => ({
        question: "예약 없이 방문해도 되나요?",
        answer: "인기 매장은 대기 시간이 길 수 있어 전화나 메시지 예약 가능 여부를 먼저 확인하는 편이 좋습니다.",
      }),
    ],
  },
  massage: {
    searcher: "가격과 후기를 비교해 마사지샵을 고르는 한국인",
    focus: "마사지, 스파, 위치, 가격, 예약, 재방문 후기",
    checklist: ["마사지 시간과 가격표 확인", "후기에서 청결과 응대 언급 확인", "팁 포함 여부와 추가 비용 확인", "늦은 시간 방문이면 귀가 동선 확인"],
    relatedGuideSlugs: ["da-nang-massage-price", "vietnam-mobile-internet"],
    faq: [
      (city) => ({
        question: `${city} 마사지샵은 가격이 어느 정도인가요?`,
        answer: "지역과 프로그램에 따라 차이가 커서 상세 페이지의 가격대, 후기, 사진을 함께 보고 비교하는 것이 좋습니다.",
      }),
      () => ({
        question: "예약이 꼭 필요한가요?",
        answer: "주말, 저녁, 관광지 인근은 예약이 유리합니다. 상세 페이지에서 전화번호와 지도 링크를 먼저 확인하세요.",
      }),
      () => ({
        question: "건전 마사지인지 어떻게 확인하나요?",
        answer: "가족·커플 방문 후기, 매장 사진, 가격표, 지도 리뷰를 함께 보고 불명확한 곳은 피하는 기준을 세웁니다.",
      }),
      () => ({
        question: "한국어 응대 여부도 나오나요?",
        answer: "현재는 후기와 소개에서 확인되는 언어 정보를 반영하고, 제보가 쌓이면 별도 필터로 분리할 예정입니다.",
      }),
    ],
  },
  spas: {
    searcher: "청결한 스파와 마사지샵을 비교하는 한국인",
    focus: "스파, 커플 스파, 마사지 프로그램, 가격표, 예약, 청결 후기",
    checklist: ["프로그램별 시간과 총액 확인", "후기에서 청결, 응대, 샤워 가능 여부 확인", "커플룸 또는 가족 방문 가능 여부 확인", "예약 시간과 픽업 가능 여부 확인"],
    relatedGuideSlugs: ["vietnam-spa-before-visit", "da-nang-massage-price"],
    faq: [
      (city) => ({
        question: `${city} 스파와 마사지 페이지는 어떻게 다르게 보나요?`,
        answer: "스파 페이지는 마사지뿐 아니라 시설, 청결, 커플 방문, 예약 편의성처럼 공간 경험까지 함께 비교하도록 구성합니다.",
      }),
      () => ({
        question: "가격표가 없는 스파는 어떻게 판단하나요?",
        answer: "방문 전 프로그램 시간, 포함 서비스, 팁 포함 여부, 카드 결제 수수료를 먼저 확인하는 것이 좋습니다.",
      }),
      () => ({
        question: "커플이나 가족이 가기 좋은 곳도 찾을 수 있나요?",
        answer: "후기와 사진에서 룸 구성, 청결, 응대 키워드를 확인하고 가족 방문 후기가 있는 곳을 우선 비교합니다.",
      }),
      () => ({
        question: "스파 정보는 계속 업데이트되나요?",
        answer: "가격표, 사진, 후기, 예약 가능 여부 제보가 쌓이면 같은 URL에서 계속 보강하는 구조입니다.",
      }),
    ],
  },
  "korean-massage": {
    searcher: "한국인 후기를 먼저 보고 마사지샵을 고르는 사람",
    focus: "한인 마사지, 한국인 후기, 마사지 가격, 예약, 위치, 재방문 의사",
    checklist: ["한국인 방문 후기가 있는지 확인", "가격표와 프로그램 시간을 함께 확인", "숙소 또는 식사 동선과 가까운지 확인", "불명확한 추가 비용은 방문 전 확인"],
    relatedGuideSlugs: ["ho-chi-minh-massage-price", "da-nang-massage-price"],
    faq: [
      (city) => ({
        question: `${city} 한인 마사지는 한국인이 운영하는 곳만 뜻하나요?`,
        answer: "초기에는 운영 주체보다 한국인이 찾기 쉬운 위치, 후기, 예약 편의성, 가격 정보를 기준으로 분류합니다.",
      }),
      () => ({
        question: "한국어 응대가 가능한지 알 수 있나요?",
        answer: "후기와 업체 소개에서 확인되는 언어 정보를 반영하고, 제보가 쌓이면 별도 필터로 분리할 예정입니다.",
      }),
      () => ({
        question: "마사지 가격은 어느 기준으로 비교하나요?",
        answer: "60분, 90분, 120분처럼 시간 단위와 팁 포함 여부, 픽업 여부를 함께 확인해야 실제 총액을 비교할 수 있습니다.",
      }),
      () => ({
        question: "방문 후기는 왜 중요한가요?",
        answer: "마사지샵은 사진만으로 판단하기 어려워 청결, 강도 조절, 응대, 재방문 의사 같은 후기 데이터가 선택 기준이 됩니다.",
      }),
    ],
  },
  bars: {
    searcher: "저녁에 갈 술집과 루프탑바를 찾는 한국인",
    focus: "술집, 루프탑바, 펍, 맥주, 칵테일, 영업시간, 귀가 동선",
    checklist: ["영업시간과 라스트오더 확인", "가격대와 서비스 차지 확인", "숙소까지의 귀가 동선 확인", "사진으로 분위기와 좌석 확인"],
    relatedGuideSlugs: ["ho-chi-minh-1day-korean-food-massage", "vietnam-mobile-internet"],
    faq: [
      (city) => ({
        question: `${city} 술집은 어떤 기준으로 비교해야 하나요?`,
        answer: "루프탑바, 펍, 맥주거리처럼 목적을 먼저 나누고 위치, 가격대, 사진, 영업시간, 귀가 동선을 함께 보는 것이 좋습니다.",
      }),
      () => ({
        question: "루프탑바와 일반 펍은 어떻게 다르게 보나요?",
        answer: "루프탑바는 전망과 예약 여부, 일반 펍은 가격대와 접근성, 음악 분위기, 혼잡도를 먼저 확인하는 편이 좋습니다.",
      }),
      () => ({
        question: "밤 늦게 방문해도 괜찮나요?",
        answer: "영업시간만 보지 말고 라스트오더, 귀가 동선, 택시 이용 가능성을 함께 확인하세요.",
      }),
      () => ({
        question: "술집 페이지는 어떤 톤으로 운영되나요?",
        answer: "과장 광고나 선정적 표현 없이 저녁 동선을 정하는 데 필요한 가격, 위치, 분위기, 영업시간 중심으로 운영합니다.",
      }),
    ],
  },
  karaoke: {
    searcher: "노래방과 가라오케를 가격과 예약 기준으로 찾는 한국인",
    focus: "가라오케, 노래방, 룸 karaoke, 회식, 단체 모임, 예약, 가격",
    checklist: ["룸 이용 기준과 시간당 가격 확인", "음료, 안주, 추가 비용 포함 여부 확인", "인원수와 예약 가능 시간 확인", "귀가 동선과 결제 방식을 방문 전 확인"],
    relatedGuideSlugs: ["ho-chi-minh-karaoke-price", "vietnam-karaoke-before-visit"],
    faq: [
      (city) => ({
        question: `${city} 가라오케는 어떤 기준으로 비교해야 하나요?`,
        answer: "룸 가격, 인원 기준, 예약 가능 여부, 위치, 후기에서 확인되는 응대와 청결을 함께 보는 것이 좋습니다.",
      }),
      () => ({
        question: "가라오케와 노래방은 같은가요?",
        answer: "비슷하게 찾는 경우가 많지만 매장마다 룸 운영 방식, 가격 구조, 예약 방식이 달라 방문 전에 조건을 확인해야 합니다.",
      }),
      () => ({
        question: "가격은 어떻게 확인하나요?",
        answer: "시간당 룸 비용, 인원 기준, 음료와 안주 포함 여부, 카드 결제 가능 여부를 분리해서 확인하는 편이 안전합니다.",
      }),
      () => ({
        question: "단체 모임으로 가도 되나요?",
        answer: "인원수, 룸 크기, 예약 시간, 이동 동선을 먼저 확인하고 후기에서 단체 방문 경험을 참고하세요.",
      }),
    ],
  },
  "korean-karaoke": {
    searcher: "한국 노래와 한국인 후기를 기준으로 가라오케를 찾는 사람",
    focus: "한인 가라오케, 한국 노래방, 룸 karaoke, 한국어 예약, 단체 모임",
    checklist: ["한국 노래 지원 여부 확인", "한국인 방문 후기와 위치 확인", "룸 가격과 인원 기준 확인", "예약 전 추가 비용과 결제 방식을 확인"],
    relatedGuideSlugs: ["ho-chi-minh-karaoke-price", "vietnam-karaoke-before-visit"],
    faq: [
      (city) => ({
        question: `${city} 한인 가라오케는 어떻게 찾나요?`,
        answer: "한국어 키워드, 한국인 후기, 한국 노래 지원 여부, 예약 편의성을 기준으로 후보를 먼저 좁히는 방식이 좋습니다.",
      }),
      () => ({
        question: "한국 노래가 있는지 미리 알 수 있나요?",
        answer: "확정 정보가 부족한 경우가 많아 예약 전 직접 확인하는 것이 안전하며, 제보가 쌓이면 상세 페이지에 반영합니다.",
      }),
      () => ({
        question: "예약 전에 무엇을 물어봐야 하나요?",
        answer: "룸 가격, 최소 이용 시간, 인원 기준, 음료와 안주 포함 여부, 결제 방식, 위치를 먼저 확인하세요.",
      }),
      () => ({
        question: "후기 데이터는 어떤 식으로 쌓이나요?",
        answer: "방문일, 인원수, 가격, 재방문 의사, 사진 제보가 쌓이면 다음 사람이 더 믿고 비교할 수 있습니다.",
      }),
    ],
  },
  jobs: {
    searcher: "베트남에서 일자리를 찾는 한국인",
    focus: "한인 매장 채용, 통역, 파트타임, 비자, 급여, 근무지역",
    checklist: ["급여와 지급 방식 확인", "비자와 근로 가능 조건 확인", "근무지와 출퇴근 동선 확인", "한국어/영어/베트남어 요구 수준 확인"],
    relatedGuideSlugs: ["vietnam-korean-jobs", "vietnam-bank-account-koreans"],
    faq: [
      (city) => ({
        question: `${city} 구인구직 정보는 어떤 기준으로 봐야 하나요?`,
        answer: "급여, 근무시간, 비자 조건, 언어 요구, 업무 범위를 먼저 확인해야 분쟁 가능성을 줄일 수 있습니다.",
      }),
      () => ({
        question: "파트타임도 올라오나요?",
        answer: "한인 매장, 통역, 예약 상담, 단기 행사처럼 한국인이 자주 찾는 파트타임 수요를 우선 모읍니다.",
      }),
      () => ({
        question: "채용 공고는 검증되나요?",
        answer: "초기에는 제보와 공개 정보를 기반으로 정리하고, 신고와 후기 데이터가 쌓이면 신뢰 점수를 분리합니다.",
      }),
      () => ({
        question: "지원 전에 무엇을 물어봐야 하나요?",
        answer: "계약 형태, 급여 지급일, 비자 지원 여부, 수습 기간, 휴무, 업무 범위를 반드시 확인하는 것이 좋습니다.",
      }),
    ],
  },
  "used-market": {
    searcher: "중고 오토바이와 생활용품을 찾는 한국인",
    focus: "중고 오토바이, 가전, 가구, 귀국정리, 거래 안전",
    checklist: ["오토바이는 등록증과 차대번호 확인", "가전은 작동 영상과 이전 설치비 확인", "현금 거래는 공공장소 이용", "귀국정리 묶음은 운송비까지 계산"],
    relatedGuideSlugs: ["vietnam-used-motorbike-checklist", "vietnam-moving-sale-used-market"],
    faq: [
      (city) => ({
        question: `${city} 중고거래에서 가장 조심할 점은 무엇인가요?`,
        answer: "오토바이 서류, 선입금, 파손 여부, 배송비, 거래 장소를 먼저 확인해야 합니다.",
      }),
      () => ({
        question: "오토바이는 어떤 서류를 봐야 하나요?",
        answer: "등록증, 차대번호, 번호판 상태, 정비 이력, 판매자 신분 확인이 핵심입니다.",
      }),
      () => ({
        question: "귀국정리 물건은 언제 많이 나오나요?",
        answer: "학기 전후, 근무 계약 종료 시기, 월말 이사철에 묶음 거래가 자주 나옵니다.",
      }),
      () => ({
        question: "거래 후기는 왜 필요한가요?",
        answer: "판매자 응대, 실제 상태, 가격 협상, 배송 경험이 쌓이면 중고거래 안전성이 올라갑니다.",
      }),
    ],
  },
  "real-estate": {
    searcher: "베트남에서 집, 원룸, 사무실, 가게 양도를 찾는 한국인",
    focus: "월세, 단기 임대, 아파트, 원룸, 보증금, 관리비, 가게 양도",
    checklist: ["보증금과 계약 기간 확인", "관리비와 전기요금 단가 확인", "침수와 소음, 주차 조건 확인", "가게 양도는 권리금과 임대인 동의 여부 확인"],
    relatedGuideSlugs: ["vietnam-house-rent-checklist", "vietnam-bank-account-koreans"],
    faq: [
      (city) => ({
        question: `${city} 부동산 정보는 어떤 기준으로 봐야 하나요?`,
        answer: "월세, 보증금, 계약 기간, 관리비, 전기요금 단가, 위치, 퇴실 조건을 먼저 확인해야 합니다.",
      }),
      () => ({
        question: "단기 임대도 찾을 수 있나요?",
        answer: "단기 임대, 원룸, 아파트, 사무실, 가게 양도처럼 한국인이 자주 찾는 부동산 수요를 함께 모읍니다.",
      }),
      () => ({
        question: "가게 양도는 무엇을 확인해야 하나요?",
        answer: "권리금, 남은 임대 기간, 임대인 동의, 장비 포함 여부, 매출 자료, 인허가 조건을 따로 확인해야 합니다.",
      }),
      () => ({
        question: "부동산 글은 바로 공개되나요?",
        answer: "허위 매물과 중복 글을 줄이기 위해 등록 신청 후 운영자 검수를 거쳐 공개하는 구조를 권장합니다.",
      }),
    ],
  },
  "life-info": {
    searcher: "비자·은행·집·통신 정보를 찾는 한국인",
    focus: "비자 연장, 은행 계좌, 집 구하기, 휴대폰, 인터넷, 생활 체크리스트",
    checklist: ["체류 자격과 여권 만료일 확인", "은행·통신은 필요 서류 먼저 확인", "집 계약은 보증금과 전기요금 단가 확인", "최신 제도 변경 가능성 확인"],
    relatedGuideSlugs: ["vietnam-visa-extension-koreans", "vietnam-bank-account-koreans", "vietnam-house-rent-checklist", "vietnam-mobile-internet"],
    faq: [
      (city) => ({
        question: `${city} 생활정보는 어떤 주제부터 보면 좋나요?`,
        answer: "비자, 은행, 집, 휴대폰, 병원, 교통처럼 도착 직후 막히는 주제부터 보는 것이 좋습니다.",
      }),
      () => ({
        question: "비자 정보는 항상 최신인가요?",
        answer: "제도는 바뀔 수 있어 공식 기관과 대행사 확인이 필요합니다. Mango Vietnam은 체크리스트와 경험 기반 정보를 정리합니다.",
      }),
      () => ({
        question: "집 구할 때 가장 중요한 조건은 무엇인가요?",
        answer: "보증금, 계약 기간, 관리비, 전기요금 단가, 침수 여부, 오토바이 주차, 퇴실 조건을 반드시 확인하세요.",
      }),
      () => ({
        question: "생활정보는 왜 재방문이 중요한가요?",
        answer: "비자, 은행, 집, 통신은 한 번 보고 끝나는 정보가 아니라 상황이 바뀔 때 계속 다시 확인하는 정보입니다.",
      }),
    ],
  },
  community: {
    searcher: "동네 질문과 현지 후기를 찾는 한국인",
    focus: "질문, 후기, 동네 소식, 제보, 업체 업데이트",
    checklist: ["지역과 상황을 구체적으로 적기", "가격·날짜·사진을 함께 남기기", "업체 후기는 상세 페이지와 연결", "분쟁성 글은 사실 중심으로 정리"],
    relatedGuideSlugs: ["vietnam-mobile-internet", "vietnam-house-rent-checklist"],
    faq: [
      (city) => ({
        question: `${city} 커뮤니티는 어떤 질문에 적합한가요?`,
        answer: "병원 추천, 집 구하기, 배달, 통신, 가격 변화, 업체 후기처럼 현지 생활 질문에 적합합니다.",
      }),
      () => ({
        question: "업체 후기도 커뮤니티에 남길 수 있나요?",
        answer: "네. 후기 데이터는 업체 상세 페이지와 연결해 검색되는 자산으로 쌓는 방향입니다.",
      }),
      () => ({
        question: "사진 제보도 도움이 되나요?",
        answer: "매장 외관, 메뉴판, 가격표, 영업시간 사진은 검색 품질을 높이는 핵심 데이터입니다.",
      }),
      () => ({
        question: "잘못된 정보는 어떻게 처리하나요?",
        answer: "신고, 최신 방문 제보, 업체 확인 정보를 기반으로 수정 이력을 남기는 구조로 확장합니다.",
      }),
    ],
  },
};

export function getCategorySeoContent(city: CityConfig, category: CategoryConfig, stats: CategoryStats, listingCount: number) {
  const restaurantSeo = getRestaurantCategorySeoContent(city, category, listingCount);
  if (restaurantSeo) return restaurantSeo;

  const playbook = categoryPlaybooks[category.slug] ?? categoryPlaybooks.restaurants;
  const countText = listingCount > 0 ? `현재 ${listingCount}개 후보를 비교할 수 있고` : "아직 후보가 많지는 않지만";

  return {
    metaTitle: `${city.name} ${category.label}`,
    h1: `${city.name} ${category.label}`,
    aiSummary: [
      `${city.name} ${category.label} 페이지는 ${playbook.focus}를 한국인 생활 기준으로 비교합니다.`,
      "사진, 후기, 위치, 영업시간, 가격대처럼 방문 전 판단에 필요한 정보를 우선 보여줍니다.",
      "제보와 후기 데이터가 쌓이면 같은 URL에서 계속 업데이트됩니다.",
    ],
    metaDescription: `${city.name} ${category.label} 정보. ${playbook.focus}를 한국인 생활 기준으로 비교하고 후기, 사진, 위치, 체크리스트를 확인하세요.`,
    intro: `${city.name}에서 ${category.label}${objectParticle(category.label)} 고를 때는 이름만 보는 것보다 위치, 가격대, 사진, 최근 후기를 함께 확인하는 편이 좋습니다. Mango Vietnam은 ${playbook.searcher}이 필요한 ${playbook.focus} 정보를 한 페이지에서 비교할 수 있게 정리합니다. ${countText}, 방문 전에 놓치기 쉬운 체크포인트까지 함께 볼 수 있습니다.`,
    paragraphs: [
      `${city.name} 생활권은 지역마다 이동 시간, 언어 대응, 가격 차이가 큽니다. 그래서 ${category.label} 페이지는 광고성 문구보다 실제 선택에 필요한 기준을 먼저 보여줍니다.`,
      `처음 보는 곳이라면 업체명보다 사진, 후기 내용, 영업시간, 지도 위치를 먼저 확인하세요. 같은 ${category.label}이라도 동선과 가격 조건에 따라 만족도가 크게 달라집니다.`,
      `후기, 사진, 추천 포인트, 방문일, 재방문 의사가 쌓일수록 같은 페이지에서 더 정확한 판단을 할 수 있습니다. Mango Vietnam은 이 정보를 계속 보강해 베트남 생활 중 다시 찾기 쉬운 기준표로 만듭니다.`,
    ],
    checklist: playbook.checklist,
    faq: playbook.faq.map((factory) => factory(city.name)),
    relatedGuideSlugs: playbook.relatedGuideSlugs,
  };
}

function objectParticle(word: string) {
  const normalized = word.normalize("NFC");
  const last = normalized.charCodeAt(normalized.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}

function getRestaurantCategorySeoContent(city: CityConfig, category: CategoryConfig, listingCount: number) {
  const count = listingCount > 0 ? `${listingCount}곳` : "대표 후보";
  const baseFaq = [
    {
      question: `${city.name} 맛집은 어떤 기준으로 고르면 좋나요?`,
      answer: "평점 하나만 보지 말고 사진 수, 최근 후기, 가격대, 위치, 영업시간, 한국인이 남긴 메뉴 언급을 함께 보는 것이 좋습니다.",
    },
    {
      question: `${city.name} 맛집 페이지는 트립어드바이저와 무엇이 다른가요?`,
      answer: "Mango Vietnam은 한국인이 실제로 궁금해하는 한식 필요 여부, 로컬 입문 난이도, 가족식사, 혼밥, 이동 동선 같은 판단 기준을 더 앞에 둡니다.",
    },
    {
      question: "사진과 영업시간은 믿을 수 있나요?",
      answer: "Google Places 사진과 운영 정보를 우선 반영하고, 방문자 제보와 최신 확인일이 쌓이면 상세 페이지에서 계속 보강합니다.",
    },
    {
      question: "한국인 후기는 어떻게 봐야 하나요?",
      answer: "추천 메뉴, 방문 상황, 재방문 의사, 불편 요소를 함께 보면 여행자와 거주자 모두 실패 확률을 줄일 수 있습니다.",
    },
  ] satisfies FaqItem[];

  const profiles: Record<
    string,
    {
      metaTitle: string;
      h1: string;
      metaDescription: string;
      intro: string;
      focus: string;
      checklist: string[];
      aiSummary: string[];
      faq?: FaqItem[];
    }
  > = {
    restaurants: {
      metaTitle: `${city.name} 맛집 ${count} | 한식·로컬·가족식사 추천`,
      h1: `${city.name} 맛집 ${count} | 한식·로컬·가족식사 추천`,
      metaDescription: `${city.name} 맛집을 사진, 평점, 후기, 가격대, 영업시간, 한국인 추천 태그로 비교하세요. 한식, 로컬 맛집, 가족식사 후보를 한 번에 확인합니다.`,
      intro: `${city.name} 맛집을 찾을 때는 블로그 한두 개보다 사진, 후기 수, 가격대, 위치, 영업시간을 함께 보는 편이 안전합니다. Mango Vietnam은 한국인이 실패 없이 고를 수 있도록 한식, 로컬 맛집, 가족식사, 혼밥, 데이트 후보를 한 화면에서 비교합니다.`,
      focus: "한식, 로컬 맛집, 가족식사, 혼밥, 데이트, 아이동반",
      checklist: ["사진으로 매장 분위기와 메뉴 확인", "한국인 후기와 추천 메뉴 확인", "숙소·회사·관광지와 이동 동선 확인", "영업시간과 예약 필요 여부 확인"],
      aiSummary: [
        `${city.name} 맛집 페이지는 한국인이 베트남에서 실패 없이 식당을 고르기 위한 비교 페이지입니다.`,
        "사진, 평점, 후기 수, 가격대, 영업시간, 지역, 한국인 추천 태그를 함께 보여줍니다.",
        "한식, 로컬맛집, 가족식사, 혼밥, 데이트처럼 상황별로 후보를 좁힐 수 있습니다.",
      ],
    },
    "best-restaurants": {
      metaTitle: `${city.name} 맛집 추천 ${count} | 한국인이 고르기 좋은 곳`,
      h1: `${city.name} 맛집 추천 ${count} | 한국인이 고르기 좋은 곳`,
      metaDescription: `${city.name} 맛집 추천 목록을 사진, 후기, 평점, 위치, 가격대 기준으로 정리했습니다. 한국인 여행자와 거주자가 보기 좋은 대표 식당 후보입니다.`,
      intro: `${city.name}에서 처음 식당을 고른다면 너무 많은 후보보다 실패 확률이 낮은 대표 맛집을 먼저 보는 편이 좋습니다. 이 페이지는 사진, 후기 신호, 위치, 가격대, 한국인 적합도를 기준으로 ${city.name} 맛집 추천 후보를 정리합니다.`,
      focus: "대표 맛집, 첫 방문, 여행 동선, 한국인 적합도",
      checklist: ["처음 방문이면 사진과 후기 수가 많은 곳부터 확인", "여행 동선과 가까운 지역 후보 우선 비교", "가격대와 영업시간을 같이 확인", "상세 페이지에서 추천 메뉴와 방문 팁 확인"],
      aiSummary: [
        `${city.name} 맛집 추천 페이지는 첫 방문자가 빠르게 후보를 좁히기 위한 대표 리스트입니다.`,
        "Tripadvisor식 평점 정보에 한국인 기준의 메뉴, 상황, 이동 동선을 더해 보여줍니다.",
        "상세 페이지에서 주소, 사진, 후기, 영업시간, Google Maps 링크를 확인할 수 있습니다.",
      ],
    },
    "korean-restaurants": {
      metaTitle: `${city.name} 한식당 ${count} | 한식·짬뽕·고기집 추천`,
      h1: `${city.name} 한식당 ${count} | 한식·짬뽕·고기집 추천`,
      metaDescription: `${city.name} 한식당, 짬뽕, 고기집, 분식, 국물 메뉴를 한국인 후기와 사진 기준으로 비교하세요. 현지 음식이 물릴 때 볼 수 있는 목록입니다.`,
      intro: `${city.name}에서 한식이 필요할 때는 메뉴 이름만으로 고르기 어렵습니다. 반찬, 국물, 고기, 짬뽕, 분식처럼 한국인이 체감하는 기준을 사진과 후기 신호로 함께 비교할 수 있게 정리했습니다.`,
      focus: "한식당, 짬뽕, 고기집, 분식, 국물 메뉴",
      checklist: ["업체명과 후기에서 한식 메뉴 키워드 확인", "단체석과 가족식사 가능성 확인", "영업시간과 배달·포장 가능성 확인", "사진으로 반찬과 메뉴 분위기 확인"],
      aiSummary: [
        `${city.name} 한식당 페이지는 베트남에서 익숙한 맛이 필요할 때 보는 한국인 기준 맛집 목록입니다.`,
        "짬뽕, 고기집, 분식, 국물 메뉴, 한식 키워드를 가진 식당을 우선 비교합니다.",
        "사진, 후기, 가격대, 위치를 함께 보여줘 회식, 가족식사, 혼밥 후보를 빠르게 고를 수 있습니다.",
      ],
    },
    "district-1-restaurants": {
      metaTitle: `호치민 1군 맛집 ${count} | 벤탄·동코이·레탄톤 식당`,
      h1: `호치민 1군 맛집 ${count} | 벤탄·동코이·레탄톤 식당`,
      metaDescription: "호치민 1군 맛집을 벤탄시장, 동코이, 응우옌후에, 레탄톤 동선 기준으로 비교하세요. 사진, 후기, 가격대, 영업시간을 함께 확인합니다.",
      intro: "호치민 1군은 여행자 숙소, 사무실, 관광지가 몰려 있어 식당 선택지가 많지만 동선 실패도 자주 생깁니다. 벤탄, 동코이, 응우옌후에, 레탄톤 주변에서 사진과 후기 신호가 있는 맛집을 먼저 비교합니다.",
      focus: "벤탄, 동코이, 응우옌후에, 레탄톤, 여행 동선",
      checklist: ["숙소나 미팅 장소에서 도보·Grab 이동 시간 확인", "점심·저녁 피크타임 대기 가능성 확인", "관광지 근처 가격대와 후기 비교", "상세 페이지에서 Google Maps 링크 확인"],
      aiSummary: ["호치민 1군 맛집 페이지는 벤탄, 동코이, 레탄톤 주변 식당을 동선 중심으로 비교합니다.", "여행자와 출장자가 빠르게 고를 수 있도록 사진, 후기, 가격대, 영업시간을 함께 보여줍니다.", "한식, 로컬, 가족식사, 혼밥 후보를 같은 페이지에서 확인할 수 있습니다."],
    },
    "district-2-restaurants": {
      metaTitle: `호치민 2군 맛집 ${count} | 타오디엔·안푸 식당`,
      h1: `호치민 2군 맛집 ${count} | 타오디엔·안푸 식당`,
      metaDescription: "호치민 2군 타오디엔과 안푸 주변 맛집을 사진, 후기, 가격대, 지역 기준으로 비교하세요. 거주자와 장기체류자에게 맞는 식당 후보입니다.",
      intro: "호치민 2군은 타오디엔과 안푸를 중심으로 외국인 거주자, 가족, 카페와 레스토랑 수요가 큽니다. 가족식사, 데이트, 한식, 로컬 입문 후보를 한국인 기준으로 비교할 수 있게 정리했습니다.",
      focus: "타오디엔, 안푸, 가족식사, 거주자 동선",
      checklist: ["타오디엔·안푸 안에서도 이동 거리 확인", "가족식사와 아이 동반 가능성 확인", "사진으로 실내 좌석과 분위기 확인", "저녁 시간 예약 필요 여부 확인"],
      aiSummary: ["호치민 2군 맛집 페이지는 타오디엔과 안푸 주변 식당을 거주자·장기체류자 기준으로 비교합니다.", "가족식사, 데이트, 카페 동선, 한식 필요 여부를 빠르게 확인할 수 있습니다.", "상세 페이지에서 사진, 후기, 주소, Google Maps 링크를 확인할 수 있습니다."],
    },
    "phu-my-hung-restaurants": {
      metaTitle: `호치민 푸미흥 맛집 ${count} | 7군 한식·가족식사`,
      h1: `호치민 푸미흥 맛집 ${count} | 7군 한식·가족식사`,
      metaDescription: "호치민 푸미흥 맛집과 7군 한식당을 가족식사, 회식, 한식 필요 상황 기준으로 비교하세요. 사진, 후기, 가격대, 위치를 확인합니다.",
      intro: "푸미흥과 호치민 7군은 한식, 가족식사, 회식 수요가 강한 생활권입니다. 현지 음식이 물릴 때, 아이와 함께 갈 곳이 필요할 때, 단체 식사를 잡을 때 볼 수 있는 후보를 정리했습니다.",
      focus: "푸미흥, 7군, 한식, 가족식사, 회식",
      checklist: ["한식 메뉴와 단체석 가능성 확인", "가족 동반 후기와 사진 확인", "주말 저녁 예약 필요 여부 확인", "집·학교·회사 동선과 가까운지 확인"],
      aiSummary: ["호치민 푸미흥 맛집 페이지는 7군 생활권의 한식, 가족식사, 회식 후보를 비교합니다.", "한국인이 자주 찾는 메뉴와 후기 신호를 중심으로 식당을 고를 수 있습니다.", "사진, 가격대, 영업시간, 지도 링크를 상세 페이지에서 확인합니다."],
    },
    "seafood-restaurants": {
      metaTitle: `다낭 해산물 맛집 ${count} | 미케비치·시내 seafood 추천`,
      h1: `다낭 해산물 맛집 ${count} | 미케비치·시내 seafood 추천`,
      metaDescription: "다낭 해산물 맛집을 미케비치와 시내 동선 기준으로 비교하세요. 사진, 후기, 가격대, 영업시간, Google Maps 링크를 한 번에 확인합니다.",
      intro: "다낭 해산물 맛집은 관광객용 대형 식당부터 로컬 식당까지 선택지가 넓어 가격과 분위기 차이가 큽니다. 미케비치와 시내 동선을 기준으로 사진, 후기, 가격대, 영업시간을 함께 비교합니다.",
      focus: "다낭 해산물, 미케비치, 시내, 가족식사, 단체 식사",
      checklist: ["해산물 시가와 주문 방식 확인", "미케비치·시내 이동 거리 확인", "사진으로 메뉴와 좌석 분위기 확인", "계산 전 가격표와 추가 비용 확인"],
      aiSummary: ["다낭 해산물 맛집 페이지는 미케비치와 시내 주변 seafood 식당을 비교합니다.", "가격대, 사진, 후기, 위치를 함께 보여줘 가족여행과 단체 식사 후보를 빠르게 고를 수 있습니다.", "상세 페이지에서 주소, 영업시간, Google Maps 링크를 확인할 수 있습니다."],
      faq: [
        {
          question: "다낭 해산물 맛집은 미케비치 근처가 좋은가요?",
          answer: "미케비치 근처는 여행 동선이 편하고 후보가 많지만 가격과 혼잡도가 다를 수 있어 사진, 후기, 가격대를 함께 비교하는 것이 좋습니다.",
        },
        ...baseFaq.slice(1),
      ],
    },
  };

  const profile = profiles[category.slug];
  if (!profile) return undefined;

  return {
    metaTitle: profile.metaTitle,
    h1: profile.h1,
    aiSummary: profile.aiSummary,
    metaDescription: profile.metaDescription,
    intro: profile.intro,
    paragraphs: [
      `${city.name} 맛집 검색은 단순 순위보다 실제 방문 상황이 중요합니다. Mango Vietnam은 한국인이 자주 묻는 메뉴, 가격대, 위치, 사진, 후기 신호를 먼저 보여줍니다.`,
      `트립어드바이저처럼 평점만 모으는 방식이 아니라 한식 필요 여부, 로컬 입문 난이도, 가족식사, 혼밥, 데이트처럼 한국인이 식당을 고르는 맥락을 함께 정리합니다.`,
      `후기, 메뉴판, 가격표, 사진 제보가 쌓일수록 같은 페이지가 더 강한 맛집 DB가 됩니다. 최신 정보는 상세 페이지의 업데이트 날짜와 지도 링크로 재확인하세요.`,
    ],
    checklist: profile.checklist,
    faq: profile.faq ?? baseFaq,
    relatedGuideSlugs: ["ho-chi-minh-1day-korean-food-massage", "vietnam-restaurant-korean-food-guide"],
  };
}

export function getListingSeoContent(listing: Listing, categoryLabel: string) {
  const city = listing.city;
  const location = listing.area || listing.address || city;
  const hasPhotos = listing.photoTotal > 0;
  const listingCopy = getListingCopy(listing, categoryLabel);

  return {
    description: listingCopy.seoDescription,
    reasons: listingCopy.reasons,
    visitTips: listingCopy.visitChecklist,
    faq: [
      {
        question: `${listing.name} 위치는 어디인가요?`,
        answer: listing.address || `${city} ${listing.area ?? ""} 인근으로 정리되어 있습니다. 정확한 이동은 지도 링크를 함께 확인하세요.`,
      },
      {
        question: `${listing.name} 사진을 볼 수 있나요?`,
        answer: hasPhotos ? "네. Google Places와 업체·사용자 제공 이미지를 기반으로 방문 전 분위기를 확인할 수 있습니다." : "현재 사진 제보를 기다리는 중이며, 확보되는 즉시 상세 페이지에 반영합니다.",
      },
      {
        question: `${listing.name} 후기는 어떻게 참고하나요?`,
        answer: "별점만 보지 말고 추천 메뉴, 방문일, 사진, 재방문 의사, 한국인 관점의 불편 요소를 함께 확인하는 것이 좋습니다.",
      },
      {
        question: `${listing.name} 정보가 바뀌면 어떻게 하나요?`,
        answer: "영업시간, 가격, 메뉴, 폐업 여부는 변동될 수 있어 최신 제보와 업체 확인 정보를 계속 반영하는 구조로 운영합니다.",
      },
    ] satisfies FaqItem[],
  };
}
