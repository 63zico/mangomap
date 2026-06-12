import { editorialSeoPages } from "@/lib/editorial-seo";
import { getAllGuides } from "@/lib/guides";
import { categories, type CategoryConfig } from "@/lib/site";

export type CategoryHubPage = {
  slug: string;
  categorySlug: string;
  label: string;
  title: string;
  metaDescription: string;
  summary: string;
  searchExamples: string[];
  editorAngles: string[];
  relatedSeoSlugs: string[];
  guideSlugs: string[];
  cityLinks?: Array<{ label: string; href: string; description: string }>;
};

export const categoryHubPages: CategoryHubPage[] = [
  {
    slug: "restaurants",
    categorySlug: "restaurants",
    label: "맛집",
    title: "베트남 맛집 검색 | 한국인이 실패 줄이고 고르는 식당",
    metaDescription: "호치민, 다낭, 하노이, 나트랑 맛집을 한국인 기준으로 찾는 Mango Vietnam 맛집 허브입니다.",
    summary: "맛집 허브는 식당 이름을 나열하는 페이지가 아니라 한국인이 실제로 검색하는 상황별 맛집 페이지로 이어지는 입구입니다.",
    searchExamples: ["호치민 맛집", "호치민 짬뽕 맛집", "다낭 해산물 맛집", "하노이 맛집"],
    editorAngles: ["도시별 대표 맛집", "해장·혼밥·가족식사", "사진 보고 고르기 쉬운 곳", "한국인 입맛 기준"],
    relatedSeoSlugs: ["ho-chi-minh-best-restaurants", "ho-chi-minh-jjamppong", "ho-chi-minh-hangover-food", "da-nang-best-restaurants", "hanoi-best-restaurants"],
    guideSlugs: ["vietnam-restaurant-korean-food-guide", "ho-chi-minh-1day-korean-food-massage"],
    cityLinks: [
      { label: "호치민 맛집", href: "/ho-chi-minh-best-restaurants", description: "1군, 부이비엔, 벤탄, 짬뽕, 혼밥 후보" },
      { label: "다낭 맛집", href: "/da-nang-best-restaurants", description: "미케비치, 해산물, 가족식사 후보" },
      { label: "하노이 맛집", href: "/hanoi-best-restaurants", description: "구시가지, 한식, 로컬 음식 후보" },
      { label: "나트랑 맛집", href: "/nha-trang/restaurants", description: "해변가, 야시장, 가족여행 식사 후보" },
    ],
  },
  {
    slug: "massage",
    categorySlug: "massage",
    label: "마사지",
    title: "베트남 마사지 찾기 | 가격·예약·팁 포함 여부 체크",
    metaDescription: "호치민, 다낭, 나트랑 마사지와 스파를 가격, 예약, 팁 포함 여부, 위치 기준으로 비교하는 마사지 정보 허브입니다.",
    summary: "마사지 검색은 수요가 크지만 정보가 섞이기 쉽습니다. Mango Vietnam은 건전 마사지와 스파를 가격, 위치, 예약, 팁 포함 여부 중심으로 정리합니다.",
    searchExamples: ["호치민 마사지", "다낭 마사지 가격", "나트랑 마사지", "베트남 스파"],
    editorAngles: ["가격표 확인", "팁 포함 여부", "예약 가능 시간", "가족·커플 방문"],
    relatedSeoSlugs: ["da-nang-best-restaurants", "ho-chi-minh-best-restaurants", "vietnam-hospitals", "vietnam-visa-extension", "vietnam-used-market"],
    guideSlugs: ["da-nang-massage-price", "ho-chi-minh-1day-korean-food-massage"],
    cityLinks: [
      { label: "호치민 마사지", href: "/ho-chi-minh/massage", description: "1군, 타오디엔, 푸미흥 마사지 후보" },
      { label: "다낭 마사지", href: "/da-nang/massage", description: "미케비치와 시내 마사지 가격 비교" },
      { label: "나트랑 마사지", href: "/nha-trang/massage", description: "해변가와 시내 마사지 후보" },
      { label: "푸꾸옥 마사지", href: "/phu-quoc/massage", description: "리조트 동선과 함께 보는 스파 후보" },
    ],
  },
  {
    slug: "nightlife",
    categorySlug: "nightlife",
    label: "나이트라이프",
    title: "베트남 나이트라이프 | 술집·루프탑바·가라오케 정보",
    metaDescription: "베트남 나이트라이프를 술집, 루프탑바, 가라오케, 노래방, 예약, 가격, 귀가 동선 기준으로 정보성 정리합니다.",
    summary: "나이트라이프는 메인 생활 카테고리보다 낮은 톤으로 운영합니다. 술집과 가라오케를 선정적으로 다루지 않고 위치, 가격, 예약, 귀가 동선 같은 확인 정보 중심으로 정리합니다.",
    searchExamples: ["호치민 술집", "호치민 루프탑바", "호치민 가라오케", "다낭 가라오케"],
    editorAngles: ["정보성 운영", "가격과 예약 확인", "귀가 동선", "선정적 표현 배제"],
    relatedSeoSlugs: ["ho-chi-minh-best-restaurants", "bui-vien-restaurants", "ben-thanh-restaurants", "vietnam-hospitals", "vietnam-visa-extension"],
    guideSlugs: ["ho-chi-minh-1day-korean-food-massage"],
    cityLinks: [
      { label: "술집", href: "/category/bars", description: "루프탑바, 펍, 맥주거리 정보" },
      { label: "가라오케", href: "/category/karaoke", description: "노래방과 단체 모임 장소 정보" },
      { label: "호치민 술집", href: "/ho-chi-minh/bars", description: "1군과 부이비엔 주변 저녁 동선" },
      { label: "호치민 가라오케", href: "/ho-chi-minh/karaoke", description: "예약, 가격, 위치 확인" },
    ],
  },
  {
    slug: "bars",
    categorySlug: "bars",
    label: "술집",
    title: "베트남 술집 찾기 | 루프탑바·펍·맥주거리 정보",
    metaDescription: "호치민, 다낭, 하노이 술집과 루프탑바를 위치, 분위기, 가격, 영업시간, 귀가 동선 기준으로 비교합니다.",
    summary: "술집 페이지는 과장 광고가 아니라 저녁 동선을 정하기 위한 정보 페이지입니다. 루프탑바, 펍, 맥주거리 후보를 위치와 분위기 중심으로 비교합니다.",
    searchExamples: ["호치민 술집", "호치민 루프탑바", "다낭 술집", "베트남 펍"],
    editorAngles: ["루프탑바", "펍과 맥주", "영업시간", "귀가 동선"],
    relatedSeoSlugs: ["bui-vien-restaurants", "ben-thanh-restaurants", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "vietnam-hospitals"],
    guideSlugs: ["ho-chi-minh-1day-korean-food-massage"],
    cityLinks: [
      { label: "호치민 술집", href: "/ho-chi-minh/bars", description: "1군, 부이비엔, 루프탑바 후보" },
      { label: "다낭 술집", href: "/da-nang/bars", description: "미케비치와 시내 저녁 동선" },
      { label: "하노이 술집", href: "/hanoi/bars", description: "구시가지와 맥주거리 후보" },
      { label: "나이트라이프", href: "/category/nightlife", description: "술집과 가라오케를 함께 보기" },
    ],
  },
  {
    slug: "karaoke",
    categorySlug: "karaoke",
    label: "가라오케",
    title: "베트남 가라오케 정보 | 노래방·회식·단체 모임 체크",
    metaDescription: "베트남 가라오케와 노래방 정보를 예약, 가격, 인원 기준, 영업시간, 위치, 귀가 동선 중심으로 정리합니다.",
    summary: "가라오케는 검색 수요가 있지만 브랜드 리스크가 있는 카테고리입니다. 그래서 선정적 표현 없이 노래방, 회식, 단체 모임 장소를 확인하는 정보성 페이지로 운영합니다.",
    searchExamples: ["호치민 가라오케", "다낭 가라오케", "베트남 노래방", "호치민 노래방"],
    editorAngles: ["예약 조건", "인원 기준", "한국 노래 지원", "귀가 동선"],
    relatedSeoSlugs: ["ho-chi-minh-best-restaurants", "bui-vien-restaurants", "vietnam-hospitals", "vietnam-visa-extension", "vietnam-used-market"],
    guideSlugs: [],
    cityLinks: [
      { label: "호치민 가라오케", href: "/ho-chi-minh/karaoke", description: "예약, 가격, 위치 확인" },
      { label: "다낭 가라오케", href: "/da-nang/karaoke", description: "단체 모임과 노래방 후보" },
      { label: "한인 가라오케", href: "/ho-chi-minh/korean-karaoke", description: "한국 노래 지원 여부 확인" },
      { label: "나이트라이프", href: "/category/nightlife", description: "술집과 함께 저녁 동선 보기" },
    ],
  },
  {
    slug: "hospital",
    categorySlug: "hospitals",
    label: "병원",
    title: "베트남 병원 추천 | 한국인이 방문 전 확인할 기준",
    metaDescription: "베트남 병원, 호치민 한국인 병원, 보험 서류, 진료과목, 언어 대응을 확인하는 병원 정보 허브입니다.",
    summary: "병원 검색은 추천보다 확인이 먼저입니다. 진료과목, 언어, 보험 서류, 야간 진료 가능성을 빠르게 확인하도록 설계합니다.",
    searchExamples: ["베트남 병원 추천", "호치민 한국인 병원", "베트남 치과", "한국어 가능한 병원"],
    editorAngles: ["아플 때 먼저 확인", "한국어·영어 대응", "보험 서류", "야간·주말 진료"],
    relatedSeoSlugs: ["vietnam-hospitals", "vietnam-visa-extension", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "vietnam-used-market"],
    guideSlugs: ["ho-chi-minh-korean-hospital", "vietnam-bank-account-koreans"],
  },
  {
    slug: "beauty",
    categorySlug: "hair-salons",
    label: "미용실",
    title: "베트남 미용실 찾기 | 커트·염색·네일 방문 전 체크",
    metaDescription: "베트남 미용실, 네일, 피부관리, 한국 스타일 가능 여부와 예약 방법을 확인하는 생활정보 허브입니다.",
    summary: "미용실은 가격보다 결과물과 소통이 중요합니다. 한국 스타일 경험, 사진, 가격표, 예약 채널을 먼저 쌓아야 합니다.",
    searchExamples: ["호치민 미용실", "다낭 네일", "베트남 한국 스타일 미용실", "호치민 피부관리"],
    editorAngles: ["한국 스타일 상담", "가격표 확인", "사진 후기", "예약 채널"],
    relatedSeoSlugs: ["vietnam-hospitals", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants", "vietnam-visa-extension", "vietnam-used-market"],
    guideSlugs: ["ho-chi-minh-life-info-guide", "da-nang-life-info-guide"],
  },
  {
    slug: "visa",
    categorySlug: "life-info",
    label: "비자",
    title: "베트남 비자 연장 | 한국인이 먼저 확인할 조건",
    metaDescription: "베트남 비자 연장, 체류 자격, 여권 만료일, 대행 수수료, 접수 일정을 확인하는 비자 정보 허브입니다.",
    summary: "비자 정보는 바뀌기 때문에 단발성 후기보다 체크리스트와 업데이트 날짜가 중요합니다. 대행사를 쓰더라도 조건을 먼저 확인해야 합니다.",
    searchExamples: ["베트남 비자 연장", "호치민 비자 연장", "베트남 체류 연장", "비자 대행 수수료"],
    editorAngles: ["만료일 먼저 확인", "대행 수수료", "접수 가능 일정", "반려 리스크"],
    relatedSeoSlugs: ["vietnam-visa-extension", "vietnam-hospitals", "vietnam-used-market", "ho-chi-minh-best-restaurants", "da-nang-best-restaurants"],
    guideSlugs: ["vietnam-visa-extension-koreans", "vietnam-bank-account-koreans"],
  },
  {
    slug: "life",
    categorySlug: "life-info",
    label: "생활정보",
    title: "베트남 생활정보 | 비자·은행·통신·집 구하기 체크",
    metaDescription: "베트남 거주 한국인이 자주 찾는 비자, 은행, 통신, 집 구하기, 병원, 중고거래 정보를 모은 생활정보 허브입니다.",
    summary: "생활정보는 한 번 보고 끝나는 콘텐츠가 아니라 저장하고 다시 보는 콘텐츠입니다. 도시별 정보와 실제 제보를 연결해 재방문을 만듭니다.",
    searchExamples: ["베트남 생활 정보", "베트남 은행 계좌", "베트남 집 구하기", "베트남 인터넷 개통"],
    editorAngles: ["저장용 체크리스트", "지역별 업데이트", "실제 제보 연결", "초기 정착 순서"],
    relatedSeoSlugs: ["vietnam-visa-extension", "vietnam-hospitals", "vietnam-used-market", "ho-chi-minh-solo-dining", "da-nang-best-restaurants"],
    guideSlugs: ["vietnam-visa-extension-koreans", "vietnam-bank-account-koreans", "vietnam-house-rent-checklist", "vietnam-mobile-internet"],
  },
];

export function getCategoryHubBySlug(slug: string) {
  return categoryHubPages.find((page) => page.slug === slug);
}

export function getCategoryHubSlugs() {
  return categoryHubPages.map((page) => page.slug);
}

export function getHubCategory(page: CategoryHubPage): CategoryConfig | undefined {
  return categories.find((category) => category.slug === page.categorySlug);
}

export function getCategoryHubRelatedSeoPages(page: CategoryHubPage) {
  return page.relatedSeoSlugs
    .map((slug) => editorialSeoPages.find((seoPage) => seoPage.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 6);
}

export function getCategoryHubGuides(page: CategoryHubPage) {
  const guides = getAllGuides();
  const guideMap = new Map(guides.map((guide) => [guide.slug, guide]));
  const explicit = page.guideSlugs
    .map((slug) => guideMap.get(slug))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide));
  const categoryMatches = guides.filter((guide) => guide.categorySlug === page.categorySlug);

  return Array.from(new Map([...explicit, ...categoryMatches].map((guide) => [guide.slug, guide])).values()).slice(0, 6);
}
