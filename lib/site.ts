export const SITE_URL = "https://mango-vietnam.com";
export const SITE_NAME = "Mango Vietnam";
export const CONTACT_EMAIL = "hello@mango-vietnam.com";

export type CityConfig = {
  name: string;
  slug: string;
  description: string;
  priority: number;
};

export const primaryCities: CityConfig[] = [
  {
    name: "호치민",
    slug: "ho-chi-minh",
    description: "한식, 병원, 구인구직, 중고거래 수요가 가장 빠르게 움직이는 생활권",
    priority: 1,
  },
  {
    name: "다낭",
    slug: "da-nang",
    description: "장기 거주자와 여행자가 함께 찾는 맛집, 마사지, 생활정보 중심 도시",
    priority: 0.95,
  },
  {
    name: "나트랑",
    slug: "nha-trang",
    description: "가족 여행과 장기 체류 수요가 겹치는 해안 생활권",
    priority: 0.9,
  },
  {
    name: "하노이",
    slug: "hanoi",
    description: "북부 생활권의 병원, 맛집, 카페, 행정 정보 수요가 큰 도시",
    priority: 0.88,
  },
  {
    name: "푸꾸옥",
    slug: "phu-quoc",
    description: "리조트, 맛집, 이동 정보 수요가 높은 섬 지역",
    priority: 0.85,
  },
  {
    name: "달랏",
    slug: "da-lat",
    description: "카페, 맛집, 현지 생활정보를 함께 찾는 고원 도시",
    priority: 0.82,
  },
];

export const additionalCities: CityConfig[] = [
  {
    name: "붕따우",
    slug: "vung-tau",
    description: "호치민 근교 거주자와 주말 이동 수요가 모이는 지역",
    priority: 0.75,
  },
];

export const allCities = [...primaryCities, ...additionalCities];

export type CategoryConfig = {
  label: string;
  slug: string;
  dataCategory?: string;
  description: string;
  searchIntent: string;
  homepage: boolean;
  supportedCitySlugs?: string[];
};

export const categories: CategoryConfig[] = [
  {
    label: "맛집",
    slug: "restaurants",
    dataCategory: "맛집",
    description: "한국인이 실제로 찾기 쉬운 베트남 맛집과 한식 선택지를 모았습니다.",
    searchIntent: "식사 장소, 한식, 로컬 맛집",
    homepage: true,
  },
  {
    label: "한식 맛집",
    slug: "korean-restaurants",
    dataCategory: "맛집",
    description: "현지 음식이 물릴 때 바로 찾을 수 있는 한식, 중식, 고기집 후보입니다.",
    searchIntent: "한식, 짬뽕, 고기, 한국 식당",
    homepage: false,
  },
  {
    label: "맛집 추천",
    slug: "best-restaurants",
    dataCategory: "맛집",
    description: "한국인이 실패 없이 고르기 좋은 도시별 대표 맛집을 사진, 후기, 가격대 기준으로 정리했습니다.",
    searchIntent: "맛집 추천, 대표 맛집, 여행자 맛집",
    homepage: false,
    supportedCitySlugs: ["ho-chi-minh", "da-nang", "nha-trang", "phu-quoc"],
  },
  {
    label: "1군 맛집",
    slug: "district-1-restaurants",
    dataCategory: "맛집",
    description: "호치민 1군, 벤탄, 동코이, 레탄톤 주변에서 동선 좋은 맛집을 비교합니다.",
    searchIntent: "호치민 1군 맛집, 벤탄 맛집, 레탄톤 맛집",
    homepage: false,
    supportedCitySlugs: ["ho-chi-minh"],
  },
  {
    label: "2군 맛집",
    slug: "district-2-restaurants",
    dataCategory: "맛집",
    description: "호치민 2군 타오디엔과 안푸 주변의 한식, 카페, 로컬 맛집을 비교합니다.",
    searchIntent: "호치민 2군 맛집, 타오디엔 맛집, 안푸 맛집",
    homepage: false,
    supportedCitySlugs: ["ho-chi-minh"],
  },
  {
    label: "푸미흥 맛집",
    slug: "phu-my-hung-restaurants",
    dataCategory: "맛집",
    description: "호치민 7군 푸미흥에서 한식, 가족식사, 회식 후보를 고르기 쉽게 정리했습니다.",
    searchIntent: "호치민 푸미흥 맛집, 7군 한식당, 푸미흥 한식",
    homepage: false,
    supportedCitySlugs: ["ho-chi-minh"],
  },
  {
    label: "해산물 맛집",
    slug: "seafood-restaurants",
    dataCategory: "맛집",
    description: "다낭에서 여행자와 거주자가 함께 찾는 해산물 맛집을 사진, 후기, 위치 기준으로 비교합니다.",
    searchIntent: "다낭 해산물 맛집, 미케비치 해산물, 베트남 해산물",
    homepage: false,
    supportedCitySlugs: ["da-nang"],
  },
  {
    label: "카페",
    slug: "cafes",
    dataCategory: "카페",
    description: "일하기 좋고 쉬어가기 좋은 카페를 지역별로 정리했습니다.",
    searchIntent: "카페, 작업, 휴식",
    homepage: true,
  },
  {
    label: "병원",
    slug: "hospitals",
    description: "한국어 대응, 야간 진료, 응급 상황에 필요한 병원 정보를 모으는 중입니다.",
    searchIntent: "한국인 병원, 치과, 소아과, 응급실",
    homepage: true,
  },
  {
    label: "미용실",
    slug: "hair-salons",
    description: "커트, 염색, 네일, 피부관리처럼 생활 반복 수요가 있는 매장을 정리합니다.",
    searchIntent: "미용실, 네일, 피부관리",
    homepage: true,
  },
  {
    label: "마사지",
    slug: "massage",
    dataCategory: "마사지",
    description: "가격, 위치, 재방문 후기를 기준으로 마사지샵을 비교합니다.",
    searchIntent: "건전 마사지, 스파, 가격, 예약, 피로회복",
    homepage: true,
  },
  {
    label: "스파",
    slug: "spas",
    dataCategory: "마사지",
    description: "마사지와 함께 가격, 청결, 예약, 커플 방문 가능성을 비교하는 스파 정보를 정리합니다.",
    searchIntent: "스파, 마사지, 커플 스파, 가격 비교",
    homepage: false,
  },
  {
    label: "한인 마사지",
    slug: "korean-massage",
    dataCategory: "마사지",
    description: "한국인이 찾기 쉬운 마사지와 스파 후보를 가격, 후기, 위치 기준으로 정리합니다.",
    searchIntent: "한인 마사지, 한국인 후기, 마사지 가격",
    homepage: false,
  },
  {
    label: "술집",
    slug: "bars",
    dataCategory: "바/루프탑",
    description: "루프탑바, 펍, 맥주거리처럼 여행 동선에 넣기 좋은 술집 정보를 가격과 위치 기준으로 정리합니다.",
    searchIntent: "술집, 루프탑바, 펍, 맥주, 칵테일",
    homepage: false,
  },
  {
    label: "가라오케",
    slug: "karaoke",
    dataCategory: "가라오케",
    description: "노래방, 회식, 단체 모임 장소를 가격, 예약, 영업시간 기준으로 정보성 정리합니다.",
    searchIntent: "가라오케, 노래방, 회식, 단체 모임, 예약",
    homepage: false,
  },
  {
    label: "한인 가라오케",
    slug: "korean-karaoke",
    dataCategory: "가라오케",
    description: "한국인이 찾는 가라오케와 노래방 후보를 지역, 예약, 가격, 후기 기준으로 비교합니다.",
    searchIntent: "한인 가라오케, 한국 노래방, 룸 karaoke",
    homepage: false,
  },
  {
    label: "구인구직",
    slug: "jobs",
    description: "한인 매장 채용, 통역, 파트타임, 원격 업무 기회를 지역별로 모읍니다.",
    searchIntent: "베트남 구인, 알바, 채용",
    homepage: true,
  },
  {
    label: "중고거래",
    slug: "used-market",
    description: "오토바이, 가전, 가구, 생활용품처럼 현지 생활에 필요한 거래를 모읍니다.",
    searchIntent: "중고 오토바이, 가전, 가구",
    homepage: true,
  },
  {
    label: "부동산",
    slug: "real-estate",
    description: "월세, 단기 임대, 원룸, 아파트, 사무실, 가게 양도 정보를 지역별로 모읍니다.",
    searchIntent: "베트남 부동산, 월세, 집 구하기, 가게 양도",
    homepage: true,
  },
  {
    label: "생활정보",
    slug: "life-info",
    description: "비자, 은행, 집 구하기, 통신, 배달처럼 자주 다시 찾는 정보를 정리합니다.",
    searchIntent: "비자 연장, 은행, 집 구하기",
    homepage: true,
  },
  {
    label: "커뮤니티",
    slug: "community",
    description: "질문, 후기, 동네 소식, 현지 제보를 모으는 한국인 생활 게시판입니다.",
    searchIntent: "질문, 후기, 동네정보",
    homepage: true,
  },
];

export const homepageCategories = categories.filter((category) => category.homepage);

export const popularSearches = [
  "호치민 짬뽕",
  "한국인 병원",
  "중고 오토바이",
  "베트남 부동산",
  "다낭 마사지",
  "호치민 술집",
  "호치민 루프탑바",
  "호치민 가라오케",
  "다낭 가라오케",
  "호치민 마사지 가격",
  "다낭 스파",
  "비자 연장",
  "푸꾸옥 한식",
  "나트랑 카페",
  "나트랑 마사지",
  "하노이 맛집",
  "하노이 구인구직",
  "푸꾸옥 마사지",
  "달랏 카페",
  "달랏 여행",
  "호치민 구인구직",
];

export const contentSilos = [
  {
    label: "Food",
    title: "맛집",
    description: "한식, 로컬 맛집, 카페, 가족 식사 후보를 도시별로 비교합니다.",
    href: "/ho-chi-minh/restaurants",
  },
  {
    label: "Jobs",
    title: "구인구직",
    description: "한인 매장 채용, 통역, 파트타임, 근무 조건을 확인합니다.",
    href: "/ho-chi-minh/jobs",
  },
  {
    label: "Housing",
    title: "부동산",
    description: "월세, 단기 임대, 원룸, 아파트, 가게 양도 정보를 모읍니다.",
    href: "/ho-chi-minh/real-estate",
  },
  {
    label: "Travel",
    title: "여행",
    description: "도시별 코스, 마사지, 카페, 비 오는 날 대체 일정을 봅니다.",
    href: "/guide/ho-chi-minh-1day-korean-food-massage",
  },
  {
    label: "Marketplace",
    title: "중고거래",
    description: "오토바이, 전자제품, 가구, 귀국정리 물품을 확인합니다.",
    href: "/ho-chi-minh/used-market",
  },
  {
    label: "Community",
    title: "커뮤니티",
    description: "질문, 후기, 현지 제보, 생활 업데이트를 모읍니다.",
    href: "/ho-chi-minh/community",
  },
];

export const lifeInfoPosts = [
  {
    title: "베트남 비자 연장 전에 확인할 것",
    city: "호치민",
    category: "비자",
    date: "2026-06-11",
    status: "업데이트",
    excerpt: "체류 기간, 여권 만료일, 대행 수수료, 접수 가능 일정을 먼저 확인해야 합니다.",
    href: "/guide/vietnam-visa-extension-koreans",
  },
  {
    title: "한국인이 자주 쓰는 현지 은행 계좌 준비",
    city: "호치민",
    category: "은행",
    date: "2026-06-11",
    status: "체크리스트",
    excerpt: "거주증, 근로계약, 여권 정보가 필요한 경우가 많아 방문 전 조건 확인이 중요합니다.",
    href: "/guide/vietnam-bank-account-koreans",
  },
  {
    title: "다낭에서 집 구할 때 보는 체크리스트",
    city: "다낭",
    category: "주거",
    date: "2026-06-11",
    status: "저장 추천",
    excerpt: "보증금, 관리비, 전기요금 단가, 침수 여부, 오토바이 주차를 함께 봐야 합니다.",
    href: "/guide/vietnam-house-rent-checklist",
  },
];

export const jobPosts = [
  {
    title: "호치민 7군 한식당 주말 홀 파트타임",
    city: "호치민",
    pay: "시급 6만동 협의",
    tag: "금토일 저녁 · 한국어 응대",
    date: "2026-06-11",
    status: "샘플",
    views: 24,
    href: "/ho-chi-minh/jobs#sample-district-7-restaurant-parttime",
    excerpt: "푸미흥 인근 한식당에서 금·토·일 저녁 시간대 홀 파트타임을 찾는 예시 공고입니다. 근무시간, 급여 지급일, 식사 제공 여부를 먼저 확인하도록 구성했습니다.",
  },
  {
    title: "호치민 2군 카페 오전 바리스타 제보 요청",
    city: "호치민",
    pay: "시급 또는 월급 협의",
    tag: "오전 근무 · 영어 가능 우대",
    date: "2026-06-11",
    status: "제보 요청",
    views: 21,
    href: "/ho-chi-minh/jobs#seed-district-2-cafe-barista",
    excerpt: "2군 타오디엔 카페 구인 공고를 받기 위한 운영팀 예시입니다. 근무 요일, 팁 배분, 식사 제공, 언어 조건을 먼저 확인하게 구성했습니다.",
  },
  {
    title: "다낭 미케비치 투어 상담 직원",
    city: "다낭",
    pay: "월 1,200만동부터",
    tag: "카카오 상담 · 영어 가능 우대",
    date: "2026-06-11",
    status: "샘플",
    views: 31,
    href: "/da-nang/jobs#sample-my-khe-tour-support",
    excerpt: "다낭 여행객 문의를 카카오톡으로 응대하는 예시 공고입니다. 근무시간, 성수기 업무량, 비자 지원 여부를 본문에서 확인하게 만드는 형태입니다.",
  },
  {
    title: "하노이 미딩 한인식당 주방 보조 제보 요청",
    city: "하노이",
    pay: "월 1,000만동 협의",
    tag: "근무시간 확인 필요",
    date: "2026-06-11",
    status: "제보 요청",
    views: 18,
    href: "/hanoi/jobs#seed-mydinh-korean-kitchen",
    excerpt: "하노이 미딩 일대 한인식당 채용 공고를 받기 위한 운영팀 예시입니다. 급여, 휴무, 비자 지원 여부를 먼저 확인하는 양식으로 만들었습니다.",
  },
  {
    title: "나트랑 호텔 프런트 한국어 상담 예시",
    city: "나트랑",
    pay: "월급제 협의",
    tag: "교대근무 · 영어 가능 우대",
    date: "2026-06-10",
    status: "운영팀 예시",
    views: 22,
    href: "/nha-trang/jobs#seed-hotel-korean-front",
    excerpt: "나트랑 호텔·투어 업종에서 한국어 응대 수요가 있는지 확인하기 위한 예시 공고입니다. 교대근무, 숙소 지원, 언어 조건을 확인하게 구성했습니다.",
  },
  {
    title: "푸꾸옥 리조트 픽업 예약 상담 제보 요청",
    city: "푸꾸옥",
    pay: "건별 또는 월급 협의",
    tag: "카카오 상담 · 공항 픽업",
    date: "2026-06-09",
    status: "제보 요청",
    views: 16,
    href: "/phu-quoc/jobs#seed-resort-pickup-support",
    excerpt: "푸꾸옥 여행객 픽업·예약 상담 공고를 받을 때 필요한 예시입니다. 업무 범위, 성수기 근무량, 연락 채널을 먼저 확인합니다.",
  },
];

export const usedMarketPosts = [
  {
    title: "호치민 2군 혼다 비전 2022 판매",
    city: "호치민",
    price: "1,850만동",
    tag: "등록증 보유 · 시운전 가능",
    date: "2026-06-11",
    status: "샘플",
    views: 42,
    href: "/ho-chi-minh/used-market#sample-honda-vision-2022",
    excerpt: "2군 타오디엔 근처에서 거래 가능한 중고 오토바이 예시 글입니다. 등록증, 주행거리, 정비 이력, 시운전 가능 여부를 먼저 보이게 구성했습니다.",
  },
  {
    title: "다낭 미케비치 원룸 입주 가전 세트",
    city: "다낭",
    price: "320만동",
    tag: "냉장고·전자레인지·선풍기",
    date: "2026-06-11",
    status: "샘플",
    views: 28,
    href: "/da-nang/used-market#sample-my-khe-home-appliances",
    excerpt: "원룸 입주자가 바로 쓸 수 있는 생활가전 묶음 예시 글입니다. 제품 사진, 사용 기간, 픽업 위치, 개별 구매 가능 여부를 확인하게 만드는 구조입니다.",
  },
  {
    title: "하노이 미딩 책상·의자 세트 거래 예시",
    city: "하노이",
    price: "120만동 이하",
    tag: "직거래 · 사진 확인",
    date: "2026-06-11",
    status: "운영팀 예시",
    views: 19,
    href: "/hanoi/used-market#seed-mydinh-desk-chair",
    excerpt: "하노이 미딩 거주자가 책상과 의자를 거래할 때 필요한 예시 글입니다. 실사진, 사용 기간, 픽업 가능 시간을 먼저 보이게 구성했습니다.",
  },
  {
    title: "나트랑 가족여행 유모차·카시트 거래 예시",
    city: "나트랑",
    price: "250만동 협의",
    tag: "상태 확인 · 숙소 직거래",
    date: "2026-06-10",
    status: "운영팀 예시",
    views: 21,
    href: "/nha-trang/used-market#seed-stroller-car-seat",
    excerpt: "가족 여행자가 짧게 쓰고 넘길 수 있는 유모차·카시트 예시 글입니다. 사용 기간, 세탁 여부, 숙소 직거래 가능 여부를 확인하게 구성했습니다.",
  },
  {
    title: "푸꾸옥 장기체류 생활용품 나눔 제보 요청",
    city: "푸꾸옥",
    price: "무료 또는 소액",
    tag: "픽업 위치 확인",
    date: "2026-06-09",
    status: "제보 요청",
    views: 14,
    href: "/phu-quoc/used-market#seed-longstay-household-items",
    excerpt: "푸꾸옥 장기체류자가 남기는 생활용품 제보를 받기 위한 예시입니다. 픽업 위치, 물품 상태, 거래 가능 날짜를 먼저 확인합니다.",
  },
];

export const realEstatePosts = [
  {
    title: "호치민 1군 단기 임대 체크리스트",
    city: "호치민",
    price: "월세 확인 필요",
    tag: "단기임대",
    date: "2026-06-11",
    status: "제보 요청",
    views: 92,
    href: "/ho-chi-minh/real-estate#district-1-short-rent",
    excerpt: "호치민 1군 단기 임대 제보를 받을 때 보증금, 전기요금, 퇴실 조건을 먼저 확인하도록 만든 운영팀 시드입니다.",
  },
  {
    title: "다낭 미케비치 원룸 계약 전 확인",
    city: "다낭",
    price: "보증금 확인",
    tag: "원룸",
    date: "2026-06-10",
    status: "운영팀 예시",
    views: 64,
    href: "/da-nang/real-estate#my-khe-studio",
    excerpt: "다낭 미케비치 주변 원룸을 볼 때 관리비, 전기요금, 오토바이 주차, 해변 접근성을 확인하게 만드는 예시 글입니다.",
  },
  {
    title: "하노이 미딩 원룸 월세 시세 제보 요청",
    city: "하노이",
    price: "월세 제보 대기",
    tag: "보증금 · 관리비 확인",
    date: "2026-06-09",
    status: "제보 요청",
    views: 27,
    href: "/hanoi/real-estate#seed-mydinh-studio-rent",
    excerpt: "하노이 미딩 원룸 시세를 모으기 위한 제보 요청입니다. 월세, 보증금, 관리비, 전기요금 단가를 분리해 받는 구조입니다.",
  },
  {
    title: "나트랑 한달살기 숙소 계약 전 확인",
    city: "나트랑",
    price: "월세 협의",
    tag: "해변 거리 · 청소비",
    date: "2026-06-08",
    status: "운영팀 예시",
    views: 20,
    href: "/nha-trang/real-estate#seed-monthly-stay-room",
    excerpt: "나트랑 한달살기 숙소를 볼 때 해변 거리, 전기요금, 청소비, 보증금 반환 조건을 확인하게 만드는 예시 글입니다.",
  },
];

export const communityPosts = [
  {
    title: "호치민에서 집 구할 때 제일 조심할 점은?",
    city: "호치민",
    category: "생활질문",
    date: "2026-06-11",
    status: "운영팀 질문",
    views: 33,
    href: "/ho-chi-minh/community#seed-housing-caution",
    excerpt: "월세보다 전기요금, 보증금 반환, 침수, 소음이 더 중요했다는 제보를 모으기 위한 운영팀 질문입니다.",
  },
  {
    title: "다낭에서 가족이 가기 좋은 마사지 기준은?",
    city: "다낭",
    category: "생활질문",
    date: "2026-06-11",
    status: "운영팀 질문",
    views: 26,
    href: "/da-nang/community#seed-family-massage",
    excerpt: "아이 동반, 대기 공간, 샤워 가능 여부, 팁 포함 여부처럼 가족 방문자가 먼저 보는 기준을 모으는 질문입니다.",
  },
  {
    title: "하노이 미딩에서 한국 식재료 어디서 사나요?",
    city: "하노이",
    category: "생활질문",
    date: "2026-06-10",
    status: "제보 요청",
    views: 19,
    href: "/hanoi/community#seed-korean-grocery",
    excerpt: "하노이 미딩 주변 한식 재료, 반찬, 김치, 고기 구매처를 실제 생활 동선 기준으로 모으기 위한 제보 요청입니다.",
  },
  {
    title: "나트랑 비 오는 날 실내 코스 추천 받습니다",
    city: "나트랑",
    category: "여행질문",
    date: "2026-06-10",
    status: "제보 요청",
    views: 17,
    href: "/nha-trang/community#seed-rainy-day-course",
    excerpt: "비 오는 날 카페, 실내 식사, 마사지, 아이 동반 가능한 장소를 모으기 위한 운영팀 질문입니다.",
  },
];

export const priceReportPosts = [
  {
    title: "호치민 마사지 90분 실제 결제 가격 제보",
    city: "호치민",
    category: "가격제보",
    date: "2026-06-11",
    status: "제보 요청",
    views: 29,
    href: "/ho-chi-minh/community#seed-massage-price-report",
    excerpt: "가격표, 팁 포함 여부, 카드 수수료, 방문 시간대를 함께 남기는 마사지 가격 제보 양식입니다.",
  },
  {
    title: "다낭 공항 픽업·렌터카 실제 가격 제보",
    city: "다낭",
    category: "가격제보",
    date: "2026-06-11",
    status: "제보 요청",
    views: 23,
    href: "/da-nang/community#seed-pickup-rental-price",
    excerpt: "공항 픽업, 렌터카, 기사 포함 차량 가격을 날짜와 인원 기준으로 모으기 위한 가격 제보 글입니다.",
  },
];

export function getCityBySlug(slug: string) {
  return allCities.find((city) => city.slug === slug);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}
