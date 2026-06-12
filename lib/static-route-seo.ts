import { getEditorialSeoPageBySlug, type EditorialSeoPage } from "@/lib/editorial-seo";

export const staticSeoRoutePaths = ["/ho-chi-minh/date-restaurants", "/ho-chi-minh/solo-dining", "/phu-quoc/seafood-restaurants"];

export function getStaticRouteSeoPage(path: string): EditorialSeoPage | undefined {
  if (path === "/ho-chi-minh/solo-dining") {
    const base = getEditorialSeoPageBySlug("ho-chi-minh-solo-dining");
    return base
      ? {
          ...base,
          slug: "ho-chi-minh/solo-dining",
          title: "호치민 혼밥 맛집 BEST 15 | 혼자 가기 편한 식당",
          metaDescription: "호치민에서 혼자 밥 먹기 편한 맛집을 한국인 기준으로 정리했습니다. 메뉴 선택, 위치, 사진, 후기 신호를 함께 확인하세요.",
          eyebrow: "호치민 혼밥 맛집",
        }
      : undefined;
  }

  if (path === "/ho-chi-minh/date-restaurants") {
    return {
      slug: "ho-chi-minh/date-restaurants",
      title: "호치민 데이트 맛집 추천 | 분위기 좋은 저녁 식사 후보",
      metaDescription: "호치민에서 데이트나 기념일 저녁에 가기 좋은 맛집을 한국인 기준으로 큐레이션했습니다. 분위기, 위치, 사진, 후기 신호를 함께 비교하세요.",
      eyebrow: "호치민 데이트 맛집",
      summary: "호치민 데이트 맛집은 단순 평점보다 분위기, 좌석, 이동 동선, 메뉴 선택 난이도를 같이 봐야 합니다. Mango Vietnam은 한국인이 실패 확률을 줄일 수 있는 후보를 에디터 관점으로 정리합니다.",
      citySlug: "ho-chi-minh",
      categorySlug: "restaurants",
      keywordAny: ["date", "romantic", "분위기", "데이트", "wine", "bar", "dining", "restaurant"],
      editorAngles: ["분위기가 중요한 저녁", "대화하기 좋은 좌석", "여행 동선에 넣기 쉬운 곳", "사진 보고 고르기 쉬운 곳"],
      relatedSlugs: ["ho-chi-minh-best-restaurants", "ho-chi-minh-solo-dining", "bui-vien-restaurants", "ben-thanh-restaurants", "ho-chi-minh-jjamppong"],
      relatedGuides: ["vietnam-restaurant-korean-food-guide", "ho-chi-minh-1day-korean-food-massage"],
      faq: [
        {
          question: "호치민 데이트 맛집은 어느 지역을 먼저 보면 좋나요?",
          answer: "첫 방문이면 1군, 벤탄시장 주변, 타오디엔, 푸미흥처럼 이동 동선이 쉬운 지역부터 보는 것이 좋습니다.",
        },
        {
          question: "데이트 맛집을 고를 때 평점만 보면 되나요?",
          answer: "평점만으로는 부족합니다. 사진, 좌석 분위기, 메뉴 선택 난이도, 이동 거리, 영업시간을 함께 확인해야 실패 확률이 줄어듭니다.",
        },
        {
          question: "한국인 여행자에게 중요한 기준은 무엇인가요?",
          answer: "메뉴 이해가 쉬운지, 위치가 안전하고 찾기 쉬운지, 사진으로 분위기를 미리 판단할 수 있는지가 중요합니다.",
        },
      ],
    };
  }

  if (path === "/phu-quoc/seafood-restaurants") {
    return {
      slug: "phu-quoc/seafood-restaurants",
      title: "푸꾸옥 해산물 맛집 BEST 10 | 리조트 여행자를 위한 추천",
      metaDescription: "푸꾸옥에서 해산물 맛집을 찾는 한국인을 위한 가이드입니다. 리조트 동선, 사진, 가격대, 후기 신호를 기준으로 후보를 비교하세요.",
      eyebrow: "푸꾸옥 해산물 맛집",
      summary: "푸꾸옥 해산물 맛집은 리조트 위치와 이동 동선, 가격대, 사진으로 보는 신선도와 분위기가 중요합니다. Mango Vietnam은 한국인 여행자가 먼저 비교할 만한 후보를 정리합니다.",
      citySlug: "phu-quoc",
      categorySlug: "restaurants",
      keywordAny: ["seafood", "hai san", "crab", "shrimp", "해산물", "씨푸드", "랍스터", "새우"],
      editorAngles: ["리조트 동선에 넣기 좋은 곳", "해산물 메뉴를 고르기 쉬운 곳", "가족식사 후보", "사진으로 분위기 확인 가능한 곳"],
      relatedSlugs: ["da-nang-best-restaurants", "ho-chi-minh-best-restaurants", "vietnam-hospitals", "vietnam-visa-extension", "vietnam-used-market"],
      relatedGuides: ["vietnam-restaurant-korean-food-guide", "da-nang-family-3days"],
      faq: [
        {
          question: "푸꾸옥 해산물 맛집은 어디를 기준으로 고르면 좋나요?",
          answer: "숙소 위치, 이동 시간, 메뉴 사진, 가격대, 최근 후기 신호를 함께 보는 것이 좋습니다.",
        },
        {
          question: "관광객용 식당과 로컬 식당은 어떻게 구분하나요?",
          answer: "가격표가 명확한지, 메뉴 사진이 충분한지, 위치가 리조트 동선과 맞는지 먼저 확인하세요.",
        },
        {
          question: "가족 여행자도 보기 좋은 페이지인가요?",
          answer: "네. 이동 동선, 메뉴 선택 난이도, 좌석 분위기를 함께 볼 수 있도록 구성했습니다.",
        },
      ],
    };
  }

  return undefined;
}
