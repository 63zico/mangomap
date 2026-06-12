import { getAllGuides } from "@/lib/guides";
import { getAllListings, getListingsForRoute, type Listing } from "@/lib/places";
import { lifeInfoPosts, SITE_URL } from "@/lib/site";

export type EditorialSeoPage = {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  summary: string;
  citySlug?: string;
  categorySlug?: string;
  keywordAny?: string[];
  strictKeywordMatch?: boolean;
  editorAngles: string[];
  faq: Array<{ question: string; answer: string }>;
  relatedSlugs: string[];
  relatedGuides?: string[];
};

export const editorialSeoPages: EditorialSeoPage[] = [
  {
    slug: "ho-chi-minh-best-restaurants",
    title: "호치민 맛집 추천 | 한국인이 실패 줄이고 고르는 곳",
    metaDescription: "호치민 맛집을 한국인 기준으로 정리했습니다. 한식, 로컬 맛집, 가족식사, 혼밥 후보를 사진과 후기 신호로 비교하세요.",
    eyebrow: "호치민 맛집",
    summary: "처음 호치민에서 식당을 고를 때는 평점보다 동선, 메뉴 난이도, 사진, 한국인 입맛 적합도를 함께 봐야 합니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "restaurants",
    editorAngles: ["처음 호치민이면 여기", "한국인 입맛에 무난한 곳", "사진 보고 고르기 쉬운 곳", "점심·저녁 모두 무난한 곳"],
    relatedSlugs: ["ho-chi-minh-jjamppong", "ho-chi-minh-hangover-food", "ho-chi-minh-solo-dining", "bui-vien-restaurants", "ben-thanh-restaurants"],
    relatedGuides: ["ho-chi-minh-1day-korean-food-massage", "vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "호치민 맛집은 어느 지역부터 보면 좋나요?", answer: "첫 방문이면 1군, 벤탄시장, 레탄톤, 부이비엔 주변부터 보고 거주자는 2군과 푸미흥까지 넓히는 편이 좋습니다." },
      { question: "블로그 맛집과 Mango Vietnam은 무엇이 다른가요?", answer: "단일 후기보다 사진, 위치, 가격대, 영업시간, 한국인 추천 상황을 한 페이지에서 비교합니다." },
      { question: "호치민 한식당도 같이 볼 수 있나요?", answer: "네. 짬뽕, 고기집, 한식, 분식처럼 한국인이 자주 찾는 목적형 페이지와 연결합니다." },
    ],
  },
  {
    slug: "ho-chi-minh-jjamppong",
    title: "호치민 짬뽕 맛집 | 매운 국물과 한국식 중화요리",
    metaDescription: "호치민에서 짬뽕, 짜장, 볶음요리, 한국식 중화요리가 필요할 때 볼 만한 식당을 정리했습니다.",
    eyebrow: "호치민 짬뽕",
    summary: "베트남 음식이 이어지는 일정 중 매운 국물이나 익숙한 중식이 필요할 때 보는 목적형 맛집 페이지입니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "korean-restaurants",
    keywordAny: ["짬뽕", "짜장", "도야", "doya", "jjambbong", "jjamppong"],
    strictKeywordMatch: true,
    editorAngles: ["해장이 필요하면 여기", "짬뽕이 당기면 먼저 볼 곳", "한국식 중화요리가 필요할 때", "비 오는 날 국물이 생각나면"],
    relatedSlugs: ["ho-chi-minh-hangover-food", "ho-chi-minh-solo-dining", "ho-chi-minh-best-restaurants", "ben-thanh-restaurants", "bui-vien-restaurants"],
    relatedGuides: ["vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "호치민에서 짬뽕 맛집을 찾을 때 무엇을 봐야 하나요?", answer: "위치, 영업시간, 매운맛, 사진, 한국인 후기 신호를 같이 보는 것이 좋습니다." },
      { question: "1군에서 짬뽕을 찾을 수 있나요?", answer: "네. 1군 Bui Thi Xuan 주변 후보처럼 여행 동선과 가까운 곳부터 확인할 수 있습니다." },
      { question: "짬뽕 페이지와 한식당 페이지는 다른가요?", answer: "짬뽕 페이지는 매운 국물과 한국식 중화요리 목적에 맞춰 후보를 더 좁힌 페이지입니다." },
    ],
  },
  {
    slug: "ho-chi-minh-hangover-food",
    title: "호치민 해장 맛집 | 국물·짬뽕·쌀국수 후보",
    metaDescription: "호치민에서 해장할 만한 짬뽕, 국물, 쌀국수, 따뜻한 한 끼 후보를 한국인 기준으로 정리했습니다.",
    eyebrow: "호치민 해장",
    summary: "술자리 다음 날이나 더운 날 입맛이 없을 때, 매운 국물·쌀국수·익숙한 한 끼를 빠르게 고를 수 있게 묶었습니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "restaurants",
    keywordAny: ["짬뽕", "쌀국수", "국물", "pho", "noodle", "soup", "분식"],
    editorAngles: ["아침 해장이 필요하면", "매운 국물이 당기면", "쌀국수로 가볍게 풀고 싶으면", "숙소 근처에서 빠르게 먹을 곳"],
    relatedSlugs: ["ho-chi-minh-jjamppong", "ho-chi-minh-solo-dining", "ho-chi-minh-best-restaurants", "bui-vien-restaurants", "ben-thanh-restaurants"],
    relatedGuides: ["ho-chi-minh-1day-korean-food-massage"],
    faq: [
      { question: "호치민 해장 맛집은 어떤 메뉴가 좋나요?", answer: "짬뽕, 쌀국수, 국물 있는 한식, 매운 볶음류처럼 입맛을 바꿔주는 메뉴를 먼저 봅니다." },
      { question: "새벽이나 늦은 시간에도 가능한가요?", answer: "영업시간은 자주 바뀌므로 방문 전 지도 링크와 전화로 재확인해야 합니다." },
      { question: "여행자도 보기 좋은 페이지인가요?", answer: "네. 1군과 관광 동선 주변 후보를 우선 보여주는 구조입니다." },
    ],
  },
  {
    slug: "ho-chi-minh-solo-dining",
    title: "호치민 혼밥 맛집 | 혼자 가기 편한 식당",
    metaDescription: "호치민에서 혼자 밥 먹기 편한 맛집, 쌀국수, 한식, 카페형 식당을 한국인 기준으로 정리했습니다.",
    eyebrow: "호치민 혼밥",
    summary: "혼자 움직이는 여행자와 거주자를 위해 주문 난이도가 낮고 사진으로 메뉴를 고르기 쉬운 후보를 모았습니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "restaurants",
    keywordAny: ["혼밥", "쌀국수", "반미", "분식", "점심", "카페"],
    editorAngles: ["혼자 들어가기 편한 곳", "메뉴 고르기 쉬운 곳", "점심 한 끼로 무난한 곳", "처음 방문해도 부담 적은 곳"],
    relatedSlugs: ["ho-chi-minh-jjamppong", "ho-chi-minh-hangover-food", "ho-chi-minh-best-restaurants", "ben-thanh-restaurants", "bui-vien-restaurants"],
    relatedGuides: ["vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "호치민에서 혼밥하기 좋은 지역은 어디인가요?", answer: "1군, 벤탄시장 주변, 레탄톤, 타오디엔처럼 식당 선택지가 많은 지역부터 보기 좋습니다." },
      { question: "혼밥 맛집은 어떤 기준으로 골랐나요?", answer: "메뉴 사진, 주문 난이도, 점심 이용 가능성, 위치, 후기 신호를 기준으로 묶었습니다." },
      { question: "한식 혼밥도 가능한가요?", answer: "네. 한식당과 짬뽕 페이지로 연결해 익숙한 식사 후보를 함께 볼 수 있습니다." },
    ],
  },
  {
    slug: "bui-vien-restaurants",
    title: "부이비엔 맛집 | 여행자 거리 주변 식사 후보",
    metaDescription: "호치민 부이비엔 거리 근처에서 식사할 만한 맛집과 해장, 혼밥, 저녁 후보를 정리했습니다.",
    eyebrow: "부이비엔 맛집",
    summary: "부이비엔 주변은 선택지가 많지만 실패도 쉽습니다. 술자리 전후, 늦은 저녁, 간단한 식사 후보를 동선 기준으로 봅니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "restaurants",
    keywordAny: ["부이비엔", "bui vien", "pham ngu lao", "de tham", "1군"],
    editorAngles: ["술자리 전후에 보기 좋은 곳", "부이비엔 근처에서 빠르게 먹을 곳", "늦은 저녁 후보", "여행자 동선에 넣기 쉬운 곳"],
    relatedSlugs: ["ben-thanh-restaurants", "ho-chi-minh-hangover-food", "ho-chi-minh-solo-dining", "ho-chi-minh-jjamppong", "ho-chi-minh-best-restaurants"],
    relatedGuides: ["ho-chi-minh-1day-korean-food-massage"],
    faq: [
      { question: "부이비엔 근처 맛집은 어떤 점을 조심해야 하나요?", answer: "관광지 가격, 혼잡도, 늦은 시간 영업 여부, 이동 안전을 함께 확인하는 것이 좋습니다." },
      { question: "해장 맛집과 연결되나요?", answer: "네. 부이비엔은 술자리 후 해장 수요가 많아 해장 맛집 페이지와 함께 보는 것이 좋습니다." },
      { question: "혼자 여행자도 보기 좋나요?", answer: "네. 혼밥 후보와 가까운 식당을 함께 연결합니다." },
    ],
  },
  {
    slug: "ben-thanh-restaurants",
    title: "벤탄시장 맛집 | 1군 시장 주변 식사 후보",
    metaDescription: "호치민 벤탄시장 근처에서 볼 만한 맛집, 쌀국수, 한식, 카페 후보를 한국인 기준으로 정리했습니다.",
    eyebrow: "벤탄시장 맛집",
    summary: "벤탄시장 주변은 관광 동선의 중심입니다. 시장 구경 전후에 빠르게 먹기 좋은 후보를 사진과 후기 신호로 비교합니다.",
    citySlug: "ho-chi-minh",
    categorySlug: "restaurants",
    keywordAny: ["벤탄", "ben thanh", "bến thành", "thu khoa huan", "1군"],
    editorAngles: ["시장 구경 전후에 가기 좋은 곳", "1군 동선에 넣기 쉬운 곳", "메뉴 사진 보고 고르기 쉬운 곳", "처음 방문자가 보기 좋은 곳"],
    relatedSlugs: ["bui-vien-restaurants", "ho-chi-minh-solo-dining", "ho-chi-minh-hangover-food", "ho-chi-minh-jjamppong", "ho-chi-minh-best-restaurants"],
    relatedGuides: ["vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "벤탄시장 근처 맛집은 관광객에게 괜찮나요?", answer: "동선은 좋지만 가격과 혼잡도를 확인해야 합니다. 사진과 후기 신호를 함께 보는 편이 안전합니다." },
      { question: "시장 근처에서 혼밥도 가능한가요?", answer: "가능합니다. 쌀국수, 간단한 로컬 음식, 한식 후보를 함께 보면 좋습니다." },
      { question: "벤탄시장 맛집은 1군 맛집과 다른가요?", answer: "1군 맛집 중에서도 벤탄시장과 도보 동선에 가까운 후보를 따로 좁힌 페이지입니다." },
    ],
  },
  {
    slug: "da-nang-best-restaurants",
    title: "다낭 맛집 추천 | 해산물·한식·가족식사 후보",
    metaDescription: "다낭 맛집을 해산물, 한식, 가족식사, 미케비치 주변 동선 기준으로 정리했습니다.",
    eyebrow: "다낭 맛집",
    summary: "다낭은 여행자 동선과 가족식사 수요가 강합니다. 미케비치, 시내, 한시장 주변에서 먼저 볼 후보를 묶었습니다.",
    citySlug: "da-nang",
    categorySlug: "restaurants",
    editorAngles: ["가족 여행이면 먼저 볼 곳", "해산물이 먹고 싶으면", "미케비치 동선에 넣기 좋은 곳", "처음 다낭이면 무난한 곳"],
    relatedSlugs: ["ho-chi-minh-best-restaurants", "ho-chi-minh-solo-dining", "vietnam-hospitals", "vietnam-visa-extension", "vietnam-used-market"],
    relatedGuides: ["da-nang-family-3days", "vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "다낭 맛집은 어느 지역부터 보면 좋나요?", answer: "미케비치, 한시장, 안트엉, 시내 동선을 먼저 나눠 보는 것이 좋습니다." },
      { question: "해산물 맛집도 볼 수 있나요?", answer: "네. 다낭은 해산물 수요가 높아 별도 해산물 맛집 페이지와 함께 확장합니다." },
      { question: "가족 여행자는 무엇을 확인해야 하나요?", answer: "좌석, 메뉴 사진, 이동거리, 피크 시간대 대기를 확인하세요." },
    ],
  },
  {
    slug: "hanoi-best-restaurants",
    title: "하노이 맛집 추천 | 한국인이 보기 좋은 식사 후보",
    metaDescription: "하노이 맛집, 한식, 로컬 음식, 카페 후보를 한국인 생활 기준으로 정리했습니다.",
    eyebrow: "하노이 맛집",
    summary: "하노이는 구시가지와 생활권 동선이 다릅니다. 여행자와 거주자가 각각 보기 좋은 식사 후보를 연결합니다.",
    citySlug: "hanoi",
    categorySlug: "restaurants",
    editorAngles: ["처음 하노이면 보기 좋은 곳", "구시가지 동선 후보", "한식이 필요하면", "사진 보고 고르기 쉬운 곳"],
    relatedSlugs: ["ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "vietnam-hospitals", "vietnam-visa-extension", "vietnam-used-market"],
    relatedGuides: ["vietnam-restaurant-korean-food-guide"],
    faq: [
      { question: "하노이 맛집 데이터도 계속 늘릴 수 있나요?", answer: "네. 같은 SEO 템플릿으로 지역, 메뉴, 상황별 페이지를 확장할 수 있습니다." },
      { question: "하노이 한식당도 따로 볼 수 있나요?", answer: "한식당 데이터가 쌓이면 하노이 한식당 랜딩으로 분리할 수 있습니다." },
      { question: "여행자와 거주자 기준이 다른가요?", answer: "여행자는 구시가지와 관광 동선, 거주자는 생활권과 반복 방문 가능성을 더 봅니다." },
    ],
  },
  {
    slug: "vietnam-hospitals",
    title: "베트남 병원 추천 | 한국인이 방문 전 확인할 것",
    metaDescription: "베트남 병원, 한국어 가능 여부, 진료과목, 보험, 예약, 위치를 방문 전 확인하는 생활정보 페이지입니다.",
    eyebrow: "베트남 병원",
    summary: "병원은 추천보다 확인이 중요합니다. 진료과목, 언어 응대, 보험 가능 여부, 예약 필요 여부를 먼저 확인해야 합니다.",
    categorySlug: "hospitals",
    editorAngles: ["한국어 응대가 필요하면", "진료과목 먼저 확인", "보험 서류가 필요하면", "방문 전 전화가 필요한 곳"],
    relatedSlugs: ["vietnam-visa-extension", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "vietnam-used-market", "ho-chi-minh-solo-dining"],
    relatedGuides: ["ho-chi-minh-korean-hospital", "vietnam-bank-account-koreans"],
    faq: [
      { question: "베트남 병원은 어떻게 골라야 하나요?", answer: "진료과목, 언어 응대, 보험 서류, 위치, 예약 필요 여부를 먼저 확인해야 합니다." },
      { question: "한국어 가능한 병원 정보도 있나요?", answer: "한국어 응대 여부는 바뀔 수 있어 상세 페이지와 전화 확인을 함께 권장합니다." },
      { question: "응급 상황에는 이 페이지가 충분한가요?", answer: "응급 상황에는 즉시 현지 응급번호나 가까운 병원에 연락해야 하며, 이 페이지는 사전 확인용입니다." },
    ],
  },
  {
    slug: "vietnam-visa-extension",
    title: "베트남 비자 연장 | 한국인이 먼저 확인할 조건",
    metaDescription: "베트남 비자 연장 전 여권 만료일, 체류 자격, 접수 일정, 대행 수수료, 지역별 확인 포인트를 정리했습니다.",
    eyebrow: "베트남 비자",
    summary: "비자 정보는 자주 바뀌므로 후기만 믿기보다 여권 만료일, 체류 자격, 접수 가능 일정, 대행 조건을 분리해 확인해야 합니다.",
    categorySlug: "life-info",
    editorAngles: ["만료일이 가까우면 먼저 확인", "대행사를 쓰기 전 체크", "호치민·다낭 생활자용", "서류 누락을 막는 체크리스트"],
    relatedSlugs: ["vietnam-hospitals", "vietnam-used-market", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "hanoi-best-restaurants"],
    relatedGuides: ["vietnam-visa-extension-koreans", "vietnam-bank-account-koreans"],
    faq: [
      { question: "베트남 비자 연장은 언제 준비해야 하나요?", answer: "만료 직전보다 여유를 두고 확인하는 것이 좋습니다. 공휴일과 접수 지연을 고려해야 합니다." },
      { question: "대행사를 쓰면 안전한가요?", answer: "대행사를 쓰더라도 비용, 여권 보관 기간, 접수 증빙, 반려 시 대응을 확인해야 합니다." },
      { question: "지역별로 차이가 있나요?", answer: "제도는 같아도 접수 동선과 대행사 운영 방식은 지역별로 다를 수 있습니다." },
    ],
  },
  {
    slug: "vietnam-used-market",
    title: "베트남 중고거래 | 오토바이·가전·가구 거래 체크",
    metaDescription: "베트남 중고거래에서 오토바이, 가전, 가구, 귀국정리 물품을 거래하기 전 가격, 상태, 서류, 거래 장소를 확인하세요.",
    eyebrow: "베트남 중고거래",
    summary: "중고거래는 가격보다 상태와 거래 안전이 중요합니다. 오토바이 서류, 가전 작동, 운송비, 거래 장소를 먼저 확인해야 합니다.",
    categorySlug: "used-market",
    editorAngles: ["귀국정리 물품을 찾으면", "오토바이 거래 전 체크", "가전·가구 상태 확인", "사기 방지 기준"],
    relatedSlugs: ["vietnam-visa-extension", "vietnam-hospitals", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "ho-chi-minh-solo-dining"],
    relatedGuides: ["vietnam-used-motorbike-checklist", "vietnam-moving-sale-furniture-appliances"],
    faq: [
      { question: "베트남 중고거래에서 가장 중요한 것은 무엇인가요?", answer: "가격보다 물건 상태, 서류, 거래 장소, 운송비, 결제 방식을 먼저 확인해야 합니다." },
      { question: "오토바이 중고거래는 무엇을 확인해야 하나요?", answer: "등록증, 차대번호, 정비 이력, 시운전, 명의 이전 가능 여부를 확인해야 합니다." },
      { question: "Mango Vietnam에 중고글을 바로 올릴 수 있나요?", answer: "신뢰를 위해 제보 후 검수하는 구조를 기본으로 합니다." },
    ],
  },
];

export function getEditorialSeoPageBySlug(slug: string) {
  return editorialSeoPages.find((page) => page.slug === slug);
}

export function getEditorialSeoPageSlugs() {
  return editorialSeoPages.map((page) => page.slug);
}

export function getEditorialSeoListings(page: EditorialSeoPage, limit = 8) {
  const base =
    page.citySlug && page.categorySlug
      ? getListingsForRoute(page.citySlug, page.categorySlug)
      : page.categorySlug
        ? getAllListings().filter((listing) => listing.primaryCategorySlug === page.categorySlug)
        : getAllListings();

  const filtered = page.keywordAny?.length
    ? base.filter((listing) => {
        const haystack = page.strictKeywordMatch ? getStrictKeywordText(listing) : listing.searchText;
        return page.keywordAny!.some((keyword) => haystack.includes(keyword.toLowerCase()));
      })
    : base;

  const listings = page.keywordAny?.length && page.strictKeywordMatch ? filtered : filtered.length >= 2 ? filtered : base;
  return listings.slice(0, limit);
}

export function getEditorialSeoRelatedPages(page: EditorialSeoPage) {
  return page.relatedSlugs
    .map((slug) => getEditorialSeoPageBySlug(slug))
    .filter((item): item is EditorialSeoPage => Boolean(item))
    .slice(0, 6);
}

export function getEditorialSeoGuides(page: EditorialSeoPage) {
  const guides = getAllGuides();
  const guideMap = new Map(guides.map((guide) => [guide.slug, guide]));
  const explicit = (page.relatedGuides ?? [])
    .map((slug) => guideMap.get(slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  const keywordMatches = guides.filter((guide) =>
    [page.title, page.summary, page.eyebrow].some((text) => guide.keywords.some((keyword) => text.includes(keyword.split(" ")[0]))),
  );

  return Array.from(new Map([...explicit, ...keywordMatches].map((guide) => [guide.slug, guide])).values()).slice(0, 4);
}

export function getEditorialSeoLifePosts(page: EditorialSeoPage) {
  if (page.categorySlug !== "life-info" && page.categorySlug !== "used-market") return [];
  return lifeInfoPosts.slice(0, 3).map((post) => ({
    title: post.title,
    description: post.excerpt,
    href: post.href,
    label: post.category,
  }));
}

export function editorialSeoUrl(slug: string) {
  return `${SITE_URL}/${slug}`;
}

function getStrictKeywordText(listing: Listing) {
  return [listing.name, listing.city, listing.area, listing.address, listing.category, ...(listing.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .normalize("NFC")
    .toLowerCase();
}
