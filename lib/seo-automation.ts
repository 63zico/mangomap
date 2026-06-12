export type SeoRestaurantRecord = {
  slug: string;
  name: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  google_maps_url?: string | null;
  category?: string | null;
  subcategory?: string | null;
  rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  featured_image?: string | null;
  opening_hours?: string | null;
  price_level?: string | null;
  review_summary?: string | null;
  review_positive_signals?: unknown;
  review_caution_signals?: unknown;
  mentioned_menus?: unknown;
  recommended_for?: unknown;
  editorial_body?: string | null;
  faq_json?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  distance_from_landmark_meters?: number | null;
  photos?: unknown;
  menu_items?: unknown;
};

export type SeoLandmarkRecord = {
  slug: string;
  name: string;
  city: string;
  district?: string | null;
  type?: string | null;
  seo_keywords?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
};

export type SeoLandingPageRow = {
  slug: string;
  canonical_path: string;
  locale: string;
  city: string | null;
  district: string | null;
  category: string | null;
  subcategory: string | null;
  landmark_slug: string | null;
  intent: string;
  primary_keyword: string;
  secondary_keywords: string[];
  title: string;
  h1: string;
  meta_description: string;
  summary: string;
  body_sections: Array<{ heading: string; body: string; items?: string[] }>;
  faq_json: Array<{ question: string; answer: string }>;
  schema_json: Record<string, unknown>;
  internal_links: Array<{ label: string; href: string; reason: string }>;
  related_restaurants: Array<{ slug: string; name: string; reason: string; score: number }>;
  status: "draft" | "published";
  priority: number;
  source_hash: string;
  generated_from: string;
  published_at: string | null;
};

export type SeoLandingPageRestaurantRow = {
  page_slug: string;
  restaurant_slug: string;
  rank: number;
  reason: string;
  section: string;
  score: number;
};

export type SeoInternalLinkRow = {
  source_type: "seo_landing_page" | "restaurant";
  source_slug: string;
  target_type: "seo_landing_page" | "restaurant";
  target_slug: string;
  anchor_text: string;
  reason: string;
  weight: number;
  status: "active";
};

export type RestaurantRelatedRow = {
  restaurant_slug: string;
  related_restaurant_slug: string;
  relation_type: string;
  score: number;
  reasons: string[];
};

export type RestaurantSchemaCacheRow = {
  restaurant_slug: string;
  schema_json: Record<string, unknown>;
  faq_json: Array<{ question: string; answer: string }>;
};

export type SeoAutomationResult = {
  pages: SeoLandingPageRow[];
  pageRestaurants: SeoLandingPageRestaurantRow[];
  internalLinks: SeoInternalLinkRow[];
  relatedRestaurants: RestaurantRelatedRow[];
  restaurantSchemas: RestaurantSchemaCacheRow[];
};

type GenerateOptions = {
  siteUrl?: string;
  minRestaurantsPerPage?: number;
  maxRestaurantsPerPage?: number;
};

type PageCandidate = {
  slug: string;
  path: string;
  city: string | null;
  district?: string | null;
  category?: string | null;
  subcategory?: string | null;
  landmarkSlug?: string | null;
  landmarkName?: string | null;
  landmarkRadiusMeters?: number | null;
  intent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  h1: string;
  title: string;
  restaurants: SeoRestaurantRecord[];
  priority: number;
};

const CITY_LABELS: Record<string, { ko: string; slug: string }> = {
  "Ho Chi Minh City": { ko: "호치민", slug: "ho-chi-minh" },
  "Ho Chi Minh": { ko: "호치민", slug: "ho-chi-minh" },
  "Da Nang": { ko: "다낭", slug: "da-nang" },
  Hanoi: { ko: "하노이", slug: "hanoi" },
  "Nha Trang": { ko: "나트랑", slug: "nha-trang" },
  "Phu Quoc": { ko: "푸꾸옥", slug: "phu-quoc" },
  "Da Lat": { ko: "달랏", slug: "da-lat" },
};

const CATEGORY_RULES = [
  {
    key: "korean-restaurants",
    canonicalCategory: "Korean restaurant",
    ko: "한식당",
    keywords: ["korean restaurant", "korean", "한식", "한국", "bbq", "고기", "삼겹살"],
  },
  {
    key: "cafes",
    canonicalCategory: "Cafe",
    ko: "카페",
    keywords: ["cafe", "coffee", "카페", "커피", "bakery"],
  },
  {
    key: "seafood-restaurants",
    canonicalCategory: "Seafood restaurant",
    ko: "해산물 맛집",
    keywords: ["seafood", "해산물", "hải sản", "hai san", "랍스터", "새우", "조개"],
  },
  {
    key: "chinese-restaurants",
    canonicalCategory: "Chinese restaurant",
    ko: "중식당",
    keywords: ["chinese", "중식", "중국", "짜장", "딤섬"],
  },
  {
    key: "japanese-restaurants",
    canonicalCategory: "Japanese restaurant",
    ko: "일식당",
    keywords: ["japanese", "일식", "스시", "라멘", "izakaya"],
  },
  {
    key: "vietnamese-restaurants",
    canonicalCategory: "Vietnamese restaurant",
    ko: "로컬 맛집",
    keywords: ["vietnamese", "베트남", "local", "pho", "banh", "분짜", "쌀국수"],
  },
  {
    key: "bbq-restaurants",
    canonicalCategory: "BBQ restaurant",
    ko: "고기집",
    keywords: ["bbq", "barbecue", "grill", "고기", "구이", "바비큐"],
  },
  {
    key: "massage",
    canonicalCategory: "Massage",
    ko: "마사지",
    keywords: ["massage", "spa", "마사지", "스파", "foot"],
  },
] as const;

const INTENT_RULES = [
  {
    intent: "solo-dining",
    ko: "혼밥 맛집",
    pathPart: "solo-dining",
    keywords: ["혼밥", "solo", "quick", "간단", "noodle", "rice", "쌀국수", "카페"],
  },
  {
    intent: "date-restaurants",
    ko: "데이트 맛집",
    pathPart: "date-restaurants",
    keywords: ["데이트", "date", "wine", "view", "rooftop", "cafe", "western", "japanese"],
  },
  {
    intent: "family-restaurants",
    ko: "가족식사 맛집",
    pathPart: "family-restaurants",
    keywords: ["family", "kids", "가족", "아이", "korean", "bbq", "seafood", "한식"],
  },
  {
    intent: "hangover-food",
    ko: "해장 맛집",
    pathPart: "hangover-food",
    keywords: ["해장", "국물", "soup", "noodle", "pho", "짬뽕", "jjambbong", "jjamppong"],
  },
  {
    intent: "jjamppong",
    ko: "짬뽕 맛집",
    pathPart: "jjamppong",
    keywords: ["짬뽕", "jjambbong", "jjamppong"],
  },
] as const;

export function generateSeoAutomation(
  restaurants: SeoRestaurantRecord[],
  landmarks: SeoLandmarkRecord[] = [],
  options: GenerateOptions = {},
): SeoAutomationResult {
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const minRestaurantsPerPage = options.minRestaurantsPerPage ?? 3;
  const maxRestaurantsPerPage = options.maxRestaurantsPerPage ?? 20;
  const usableRestaurants = restaurants
    .filter((restaurant) => restaurant.slug && restaurant.name && restaurant.city)
    .map(normalizeRestaurant);

  const candidates: PageCandidate[] = [];
  const byCity = groupBy(usableRestaurants, (restaurant) => restaurant.city ?? "");

  for (const [city, cityRestaurants] of byCity) {
    if (!city || cityRestaurants.length < minRestaurantsPerPage) continue;

    const cityLabel = getCityLabel(city);
    const citySlug = getCitySlug(city);
    const cityRestaurantList = topRestaurants(cityRestaurants, maxRestaurantsPerPage);

    candidates.push({
      slug: `${citySlug}-best-restaurants`,
      path: `/${citySlug}/restaurants`,
      city,
      intent: "best-restaurants",
      category: "restaurants",
      primaryKeyword: `${cityLabel} 맛집`,
      secondaryKeywords: [`${cityLabel} 맛집 추천`, `${cityLabel} 한국인 맛집`, `${cityLabel} 여행 맛집`],
      h1: `${cityLabel} 맛집 추천`,
      title: `${cityLabel} 맛집 추천 | 한국인이 보기 좋은 베트남 식당 가이드`,
      restaurants: cityRestaurantList,
      priority: 0.95,
    });

    for (const rule of CATEGORY_RULES) {
      const categoryRestaurants = cityRestaurants.filter((restaurant) => restaurantMatchesCategory(restaurant, rule.key));
      if (categoryRestaurants.length < minRestaurantsPerPage) continue;

      candidates.push({
        slug: `${citySlug}-${rule.key}`,
        path: `/${citySlug}/${rule.key}`,
        city,
        intent: rule.key,
        category: rule.canonicalCategory,
        primaryKeyword: `${cityLabel} ${rule.ko}`,
        secondaryKeywords: [`${cityLabel} ${rule.ko} 추천`, `${cityLabel} 한국인 추천 ${rule.ko}`, `${cityLabel} ${rule.ko} 리스트`],
        h1: `${cityLabel} ${rule.ko} 추천`,
        title: `${cityLabel} ${rule.ko} 추천 | Mango Vietnam`,
        restaurants: topRestaurants(categoryRestaurants, maxRestaurantsPerPage),
        priority: rule.key === "korean-restaurants" ? 0.9 : 0.82,
      });
    }

    const byDistrict = groupBy(cityRestaurants, (restaurant) => restaurant.district ?? "");
    for (const [district, districtRestaurants] of byDistrict) {
      if (!district || districtRestaurants.length < minRestaurantsPerPage) continue;
      const districtSlug = slugify(district);
      const districtLabel = getDistrictLabel(district);

      candidates.push({
        slug: `${citySlug}-${districtSlug}-restaurants`,
        path: `/${citySlug}/${districtSlug}-restaurants`,
        city,
        district,
        intent: "district-restaurants",
        category: "restaurants",
        primaryKeyword: `${cityLabel} ${districtLabel} 맛집`,
        secondaryKeywords: [`${districtLabel} 식당`, `${cityLabel} ${districtLabel} 한식당`, `${cityLabel} ${districtLabel} 카페`],
        h1: `${cityLabel} ${districtLabel} 맛집 추천`,
        title: `${cityLabel} ${districtLabel} 맛집 추천 | Mango Vietnam`,
        restaurants: topRestaurants(districtRestaurants, maxRestaurantsPerPage),
        priority: 0.78,
      });

      for (const rule of CATEGORY_RULES) {
        const categoryRestaurants = districtRestaurants.filter((restaurant) => restaurantMatchesCategory(restaurant, rule.key));
        if (categoryRestaurants.length < minRestaurantsPerPage) continue;

        candidates.push({
          slug: `${citySlug}-${districtSlug}-${rule.key}`,
          path: `/${citySlug}/${districtSlug}/${rule.key}`,
          city,
          district,
          intent: `district-${rule.key}`,
          category: rule.canonicalCategory,
          primaryKeyword: `${cityLabel} ${districtLabel} ${rule.ko}`,
          secondaryKeywords: [`${districtLabel} ${rule.ko}`, `${cityLabel} ${districtLabel} ${rule.ko} 추천`],
          h1: `${cityLabel} ${districtLabel} ${rule.ko} 추천`,
          title: `${cityLabel} ${districtLabel} ${rule.ko} 추천 | Mango Vietnam`,
          restaurants: topRestaurants(categoryRestaurants, maxRestaurantsPerPage),
          priority: 0.72,
        });
      }
    }

    for (const intentRule of INTENT_RULES) {
      const intentRestaurants = cityRestaurants.filter((restaurant) => restaurantMatchesIntent(restaurant, intentRule.intent));
      if (intentRestaurants.length < minRestaurantsPerPage) continue;

      candidates.push({
        slug: `${citySlug}-${intentRule.pathPart}`,
        path: `/${citySlug}/${intentRule.pathPart}`,
        city,
        intent: intentRule.intent,
        category: "restaurants",
        primaryKeyword: `${cityLabel} ${intentRule.ko}`,
        secondaryKeywords: [`${cityLabel} ${intentRule.ko} 추천`, `${cityLabel} 한국인 ${intentRule.ko}`],
        h1: `${cityLabel} ${intentRule.ko} 추천`,
        title: `${cityLabel} ${intentRule.ko} 추천 | Mango Vietnam`,
        restaurants: topRestaurants(intentRestaurants, maxRestaurantsPerPage),
        priority: intentRule.intent === "jjamppong" ? 0.86 : 0.76,
      });
    }
  }

  for (const landmark of landmarks) {
    if (typeof landmark.latitude !== "number" || typeof landmark.longitude !== "number") continue;

    const radiusMeters = getLandmarkRadiusMeters(landmark);
    const cityRestaurants = usableRestaurants.filter((restaurant) => restaurant.city === landmark.city);
    const candidatesForLandmark = cityRestaurants
      .map((restaurant) => ({
        restaurant,
        distance: getRestaurantDistanceFromLandmark(restaurant, landmark),
      }))
      .filter((candidate): candidate is { restaurant: SeoRestaurantRecord; distance: number } =>
        typeof candidate.distance === "number" && candidate.distance <= radiusMeters,
      )
      .sort((a, b) => a.distance - b.distance)
      .map((candidate) => ({
        ...candidate.restaurant,
        distance_from_landmark_meters: candidate.distance,
      } as SeoRestaurantRecord));
    if (candidatesForLandmark.length < minRestaurantsPerPage) continue;

    const cityLabel = getCityLabel(landmark.city);
    candidates.push({
      slug: `${landmark.slug}-restaurants`,
      path: `/landmarks/${landmark.slug}/restaurants`,
      city: landmark.city,
      district: landmark.district ?? null,
      landmarkSlug: landmark.slug,
      landmarkName: landmark.name,
      landmarkRadiusMeters: radiusMeters,
      intent: "landmark-restaurants",
      category: "restaurants",
      primaryKeyword: `${landmark.name} 맛집`,
      secondaryKeywords: [`${cityLabel} ${landmark.name} 근처 맛집`, `${landmark.name} 한식당`, `${landmark.name} 카페`],
      h1: `${landmark.name} 근처 맛집 추천`,
      title: `${landmark.name} 근처 맛집 추천 | Mango Vietnam`,
      restaurants: topRestaurants(candidatesForLandmark, maxRestaurantsPerPage),
      priority: 0.74,
    });
  }

  const uniqueCandidates = dedupeCandidates(candidates);
  const preliminaryPages = uniqueCandidates.map((candidate) => createLandingPage(candidate, siteUrl));
  const pages = attachInternalPageLinks(preliminaryPages);
  const pageRestaurants = createPageRestaurantRows(uniqueCandidates);
  const internalLinks = createInternalLinkRows(pages);
  const relatedRestaurants = createRelatedRestaurantRows(usableRestaurants);
  const restaurantSchemas = usableRestaurants.map((restaurant) => ({
    restaurant_slug: restaurant.slug,
    schema_json: buildRestaurantSchema(restaurant, siteUrl),
    faq_json: generateRestaurantFaq(restaurant),
  }));

  return { pages, pageRestaurants, internalLinks, relatedRestaurants, restaurantSchemas };
}

export function buildFaqSchema(faqItems: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildRestaurantSchema(restaurant: SeoRestaurantRecord, siteUrl = "https://mango-vietnam.com") {
  const normalized = normalizeRestaurant(restaurant);
  const url = `${normalizeSiteUrl(siteUrl)}/listing/${normalized.slug}`;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": normalized.category?.toLowerCase().includes("cafe") ? "CafeOrCoffeeShop" : "Restaurant",
    name: normalized.name,
    url,
    mainEntityOfPage: url,
    description: normalized.seo_description || normalized.description || `${normalized.name} 정보와 방문 전 확인할 내용을 정리한 Mango Vietnam 페이지입니다.`,
    address: normalized.address || undefined,
    telephone: normalized.phone || undefined,
    image: absoluteImageUrl(normalized.featured_image, siteUrl),
    servesCuisine: inferCuisine(normalized),
    priceRange: normalized.price_level || undefined,
    hasMap: normalized.google_maps_url || undefined,
    sameAs: [normalized.google_maps_url, normalized.website].filter(Boolean),
  };

  if (typeof normalized.rating === "number" && typeof normalized.review_count === "number" && normalized.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: normalized.rating,
      reviewCount: normalized.review_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (typeof normalized.latitude === "number" && typeof normalized.longitude === "number") {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: normalized.latitude,
      longitude: normalized.longitude,
    };
  }

  if (normalized.opening_hours) {
    schema.openingHours = normalized.opening_hours
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return compactObject(schema);
}

export function generateRestaurantFaq(restaurant: SeoRestaurantRecord) {
  const normalized = normalizeRestaurant(restaurant);
  const cityLabel = getCityLabel(normalized.city ?? "");
  const districtLabel = normalized.district ? getDistrictLabel(normalized.district) : cityLabel;
  const categoryLabel = getCategoryLabel(normalized);
  const bestFor = safeStringArray(normalized.recommended_for).slice(0, 3).join(", ") || `${cityLabel}에서 ${categoryLabel}을 찾는 사람`;

  return [
    {
      question: `${normalized.name}은 어떤 사람에게 잘 맞나요?`,
      answer: `${normalized.name}은 ${bestFor}에게 먼저 검토해볼 만한 ${districtLabel}의 ${categoryLabel}입니다.`,
    },
    {
      question: `${normalized.name} 방문 전 무엇을 확인해야 하나요?`,
      answer: `방문 전 운영시간, 최근 사진, 메뉴 가격, 예약 가능 여부를 확인하는 것이 좋습니다. Mango Vietnam은 한국인 사용자가 빠르게 판단할 수 있도록 핵심 정보를 정리합니다.`,
    },
    {
      question: `${normalized.name}은 어디에 있나요?`,
      answer: normalized.address
        ? `${normalized.name} 주소는 ${normalized.address}입니다.`
        : `${normalized.name}은 ${cityLabel}${normalized.district ? ` ${districtLabel}` : ""} 지역에 있습니다.`,
    },
  ];
}

export function findRelatedRestaurants(
  restaurant: SeoRestaurantRecord,
  allRestaurants: SeoRestaurantRecord[],
  limit = 8,
): RestaurantRelatedRow[] {
  const base = normalizeRestaurant(restaurant);

  return allRestaurants
    .filter((candidate) => candidate.slug && candidate.slug !== base.slug)
    .map((candidate) => scoreRelatedRestaurant(base, normalizeRestaurant(candidate)))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function createLandingPage(candidate: PageCandidate, siteUrl: string): SeoLandingPageRow {
  const cityLabel = candidate.city ? getCityLabel(candidate.city) : "베트남";
  const districtLabel = candidate.district ? getDistrictLabel(candidate.district) : "";
  const categoryLabel = candidate.category ? getCategoryLabelFromText(candidate.category) : "맛집";
  const restaurantNames = candidate.restaurants.slice(0, 5).map((restaurant) => restaurant.name);
  const summary = [
    `${candidate.primaryKeyword}을 찾는 한국인을 위해 위치, 카테고리, 평점, 후기 수, 이동 동선을 기준으로 정리했습니다.`,
    restaurantNames.length ? `대표 후보는 ${joinKoreanList(restaurantNames)} 등입니다.` : "",
    "광고성 표현보다 방문 전 판단에 필요한 정보를 우선합니다.",
  ].filter(Boolean).join(" ");
  const faq = buildLandingPageFaq(candidate);
  const relatedRestaurants = candidate.restaurants.slice(0, 8).map((restaurant, index) => ({
    slug: restaurant.slug,
    name: restaurant.name,
    reason: buildRestaurantReason(restaurant, candidate),
    score: Math.max(1, 100 - index * 5),
  }));
  const bodySections = [
    {
      heading: `${candidate.primaryKeyword} 한눈에 보기`,
      body: `${cityLabel}${districtLabel ? ` ${districtLabel}` : ""}에서 ${categoryLabel}을 고를 때는 위치, 가격대, 사진, 운영시간, 후기 수를 함께 보는 것이 좋습니다.`,
      items: candidate.restaurants.slice(0, 5).map((restaurant) => buildRestaurantReason(restaurant, candidate)),
    },
    {
      heading: "한국인 기준으로 확인할 포인트",
      body: "여행자는 이동 동선과 실패 확률을, 거주자는 재방문 가능성과 가격 대비 만족도를 더 중요하게 봅니다. 이 페이지는 두 기준을 함께 반영합니다.",
      items: ["위치가 여행 동선에 맞는지", "대표 메뉴와 가격대가 분명한지", "사진과 운영시간이 최신인지", "한국인에게 익숙한 맛과 서비스인지"],
    },
  ];

  return {
    slug: candidate.slug,
    canonical_path: candidate.path,
    locale: "ko-KR",
    city: candidate.city,
    district: candidate.district ?? null,
    category: candidate.category ?? null,
    subcategory: candidate.subcategory ?? null,
    landmark_slug: candidate.landmarkSlug ?? null,
    intent: candidate.intent,
    primary_keyword: candidate.primaryKeyword,
    secondary_keywords: candidate.secondaryKeywords,
    title: candidate.title,
    h1: candidate.h1,
    meta_description: trimDescription(`${summary} Mango Vietnam에서 ${candidate.primaryKeyword} 후보를 빠르게 비교하세요.`),
    summary,
    body_sections: bodySections,
    faq_json: faq,
    schema_json: buildLandingPageSchema(candidate, faq, siteUrl),
    internal_links: [],
    related_restaurants: relatedRestaurants,
    status: "published",
    priority: candidate.priority,
    source_hash: stableHash(JSON.stringify({
      slug: candidate.slug,
      restaurants: candidate.restaurants.map((restaurant) => restaurant.slug),
      keyword: candidate.primaryKeyword,
    })),
    generated_from: "seo-automation-v1",
    published_at: new Date().toISOString(),
  };
}

function buildLandingPageSchema(candidate: PageCandidate, faq: Array<{ question: string; answer: string }>, siteUrl: string) {
  const pageUrl = `${siteUrl}${candidate.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: candidate.title,
        headline: candidate.h1,
        url: pageUrl,
        inLanguage: "ko-KR",
        description: trimDescription(candidate.secondaryKeywords.join(", ")),
        isPartOf: {
          "@type": "WebSite",
          name: "Mango Vietnam",
          url: siteUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Mango Vietnam", item: siteUrl },
          candidate.city ? { "@type": "ListItem", position: 2, name: getCityLabel(candidate.city), item: `${siteUrl}/${getCitySlug(candidate.city)}` } : null,
          { "@type": "ListItem", position: candidate.city ? 3 : 2, name: candidate.primaryKeyword, item: pageUrl },
        ].filter(Boolean),
      },
      {
        "@type": "ItemList",
        name: candidate.primaryKeyword,
        numberOfItems: candidate.restaurants.length,
        itemListElement: candidate.restaurants.slice(0, 20).map((restaurant, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Restaurant",
            name: restaurant.name,
            url: `${siteUrl}/listing/${restaurant.slug}`,
          },
        })),
      },
      buildFaqSchema(faq),
    ],
  };
}

function buildLandingPageFaq(candidate: PageCandidate) {
  const cityLabel = candidate.city ? getCityLabel(candidate.city) : "베트남";
  const restaurantCount = candidate.restaurants.length;

  return [
    {
      question: `${candidate.primaryKeyword}은 어떻게 고르면 좋나요?`,
      answer: `${cityLabel}에서는 이동 동선, 지역, 대표 메뉴, 평점과 후기 수, 운영시간을 함께 확인하는 것이 좋습니다. 이 페이지는 ${restaurantCount}개 후보를 한국인 관점에서 비교할 수 있게 정리합니다.`,
    },
    {
      question: `이 페이지의 추천 순서는 어떤 기준인가요?`,
      answer: "평점, 후기 수, 카테고리 적합도, 지역성, 한국인에게 필요한 정보의 명확성을 함께 반영합니다. 실제 방문 전에는 최신 운영시간과 가격을 다시 확인하는 것을 권장합니다.",
    },
    {
      question: `${candidate.primaryKeyword} 페이지는 계속 업데이트되나요?`,
      answer: "Mango Vietnam은 새로 수집되는 식당 정보와 사용자의 제보, 운영시간, 사진, 메뉴 정보를 반영해 SEO 랜딩페이지를 계속 개선할 수 있는 구조로 운영합니다.",
    },
  ];
}

function attachInternalPageLinks(pages: SeoLandingPageRow[]) {
  return pages.map((page) => {
    const related = pages
      .filter((candidate) => candidate.slug !== page.slug)
      .map((candidate) => ({
        page: candidate,
        score: scoreRelatedPage(page, candidate),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ page: target }) => ({
        label: target.primary_keyword,
        href: target.canonical_path,
        reason: target.city === page.city ? "같은 도시의 관련 검색 의도" : "베트남 주요 도시 비교 검색",
      }));

    return {
      ...page,
      internal_links: related,
    };
  });
}

function createInternalLinkRows(pages: SeoLandingPageRow[]): SeoInternalLinkRow[] {
  const rows: SeoInternalLinkRow[] = [];

  for (const page of pages) {
    for (const link of page.internal_links) {
      const target = pages.find((candidate) => candidate.canonical_path === link.href);
      if (!target) continue;
      rows.push({
        source_type: "seo_landing_page",
        source_slug: page.slug,
        target_type: "seo_landing_page",
        target_slug: target.slug,
        anchor_text: link.label,
        reason: link.reason,
        weight: page.city === target.city ? 0.82 : 0.54,
        status: "active",
      });
    }

    for (const restaurant of page.related_restaurants.slice(0, 8)) {
      rows.push({
        source_type: "seo_landing_page",
        source_slug: page.slug,
        target_type: "restaurant",
        target_slug: restaurant.slug,
        anchor_text: restaurant.name,
        reason: restaurant.reason,
        weight: 0.86,
        status: "active",
      });
    }
  }

  return dedupeInternalLinks(rows);
}

function createPageRestaurantRows(candidates: PageCandidate[]): SeoLandingPageRestaurantRow[] {
  return candidates.flatMap((candidate) =>
    candidate.restaurants.map((restaurant, index) => ({
      page_slug: candidate.slug,
      restaurant_slug: restaurant.slug,
      rank: index + 1,
      reason: buildRestaurantReason(restaurant, candidate),
      section: "recommended",
      score: Math.max(1, 100 - index * 3),
    })),
  );
}

function createRelatedRestaurantRows(restaurants: SeoRestaurantRecord[]) {
  return restaurants.flatMap((restaurant) => findRelatedRestaurants(restaurant, restaurants, 8));
}

function normalizeRestaurant(restaurant: SeoRestaurantRecord): SeoRestaurantRecord {
  return {
    ...restaurant,
    city: restaurant.city?.trim() || null,
    district: restaurant.district?.trim() || null,
    category: restaurant.category?.trim() || null,
    subcategory: restaurant.subcategory?.trim() || null,
  };
}

function topRestaurants(restaurants: SeoRestaurantRecord[], limit: number) {
  return [...restaurants]
    .sort((a, b) => restaurantQualityScore(b) - restaurantQualityScore(a))
    .slice(0, limit);
}

function restaurantQualityScore(restaurant: SeoRestaurantRecord) {
  const rating = typeof restaurant.rating === "number" ? restaurant.rating : 0;
  const reviewCount = typeof restaurant.review_count === "number" ? restaurant.review_count : 0;
  const hasImage = restaurant.featured_image ? 8 : 0;
  const hasDescription = restaurant.description || restaurant.review_summary ? 6 : 0;
  return rating * 20 + Math.log10(reviewCount + 1) * 12 + hasImage + hasDescription;
}

function restaurantMatchesCategory(restaurant: SeoRestaurantRecord, categoryKey: string) {
  const rule = CATEGORY_RULES.find((candidate) => candidate.key === categoryKey);
  if (!rule) return false;
  const text = restaurantSearchText(restaurant);
  return rule.keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function restaurantMatchesIntent(restaurant: SeoRestaurantRecord, intent: string) {
  const rule = INTENT_RULES.find((candidate) => candidate.intent === intent);
  if (!rule) return false;
  const text = restaurantSearchText(restaurant);

  if (intent === "jjamppong") {
    return ["짬뽕", "jjambbong", "jjamppong"].some((keyword) => text.includes(normalizeText(keyword)));
  }

  return rule.keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function restaurantSearchText(restaurant: SeoRestaurantRecord) {
  return normalizeText([
    restaurant.name,
    restaurant.category,
    restaurant.subcategory,
    restaurant.description,
    restaurant.seo_title,
    restaurant.seo_description,
    restaurant.review_summary,
    restaurant.editorial_body,
    restaurant.opening_hours,
    ...safeStringArray(restaurant.mentioned_menus),
    ...safeStringArray(restaurant.recommended_for),
  ].filter(Boolean).join(" "));
}

function scoreRelatedRestaurant(base: SeoRestaurantRecord, candidate: SeoRestaurantRecord): RestaurantRelatedRow {
  const reasons: string[] = [];
  let score = 0;

  if (base.city && candidate.city && base.city === candidate.city) {
    score += 35;
    reasons.push("same-city");
  }
  if (base.district && candidate.district && base.district === candidate.district) {
    score += 25;
    reasons.push("same-district");
  }
  if (base.category && candidate.category && normalizeText(base.category) === normalizeText(candidate.category)) {
    score += 24;
    reasons.push("same-category");
  }

  const baseMenus = safeStringArray(base.mentioned_menus).map(normalizeText);
  const candidateMenus = safeStringArray(candidate.mentioned_menus).map(normalizeText);
  const menuOverlap = baseMenus.filter((menu) => candidateMenus.includes(menu)).length;
  if (menuOverlap) {
    score += Math.min(12, menuOverlap * 4);
    reasons.push("menu-overlap");
  }

  score += Math.min(8, Math.max(0, (candidate.rating ?? 0) - 3.8) * 5);
  score += Math.min(8, Math.log10((candidate.review_count ?? 0) + 1) * 2);

  return {
    restaurant_slug: base.slug,
    related_restaurant_slug: candidate.slug,
    relation_type: reasons[0] ?? "similar",
    score: Math.round(score * 100) / 100,
    reasons,
  };
}

function scoreRelatedPage(base: SeoLandingPageRow, target: SeoLandingPageRow) {
  let score = 0;
  if (base.city && target.city && base.city === target.city) score += 40;
  if (base.district && target.district && base.district === target.district) score += 20;
  if (base.category && target.category && base.category === target.category) score += 18;
  if (base.intent === target.intent) score += 12;
  if (base.primary_keyword.includes("맛집") && target.primary_keyword.includes("맛집")) score += 8;
  return score;
}

function buildRestaurantReason(restaurant: SeoRestaurantRecord, candidate: PageCandidate) {
  if (candidate.landmarkName && typeof restaurant.distance_from_landmark_meters === "number") {
    const distanceText = restaurant.distance_from_landmark_meters < 1000
      ? `약 ${Math.round(restaurant.distance_from_landmark_meters / 50) * 50}m`
      : `약 ${(restaurant.distance_from_landmark_meters / 1000).toFixed(1)}km`;
    return `${candidate.landmarkName}에서 ${distanceText} 거리라 근처 식사 후보로 비교하기 좋습니다.`;
  }

  const district = restaurant.district ? `${getDistrictLabel(restaurant.district)}에서 ` : "";
  const category = getCategoryLabel(restaurant);
  const ratingText = typeof restaurant.rating === "number" ? `평점 ${restaurant.rating.toFixed(1)} 기준으로 ` : "";
  return `${district}${ratingText}${candidate.primaryKeyword} 후보로 비교하기 좋은 ${category}입니다.`;
}

function getLandmarkRadiusMeters(landmark: SeoLandmarkRecord) {
  if (typeof landmark.radius_meters === "number" && landmark.radius_meters > 0) return landmark.radius_meters;

  const type = normalizeText(landmark.type ?? "");
  if (["market", "walking_street", "street", "night_market", "cathedral"].includes(type)) return 800;
  return 1500;
}

function getRestaurantDistanceFromLandmark(restaurant: SeoRestaurantRecord, landmark: SeoLandmarkRecord) {
  if (
    typeof restaurant.latitude !== "number" ||
    typeof restaurant.longitude !== "number" ||
    typeof landmark.latitude !== "number" ||
    typeof landmark.longitude !== "number"
  ) {
    return null;
  }

  return getDistanceMeters(restaurant.latitude, restaurant.longitude, landmark.latitude, landmark.longitude);
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function dedupeCandidates(candidates: PageCandidate[]) {
  const bySlug = new Map<string, PageCandidate>();
  for (const candidate of candidates) {
    const current = bySlug.get(candidate.slug);
    if (!current || candidate.restaurants.length > current.restaurants.length || candidate.priority > current.priority) {
      bySlug.set(candidate.slug, candidate);
    }
  }
  return [...bySlug.values()].sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug));
}

function dedupeInternalLinks(rows: SeoInternalLinkRow[]) {
  const map = new Map<string, SeoInternalLinkRow>();
  for (const row of rows) {
    const key = `${row.source_type}:${row.source_slug}:${row.target_type}:${row.target_slug}`;
    const current = map.get(key);
    if (!current || row.weight > current.weight) map.set(key, row);
  }
  return [...map.values()];
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(item);
  }
  return groups;
}

function getCityLabel(city: string) {
  return CITY_LABELS[city]?.ko ?? city;
}

function getCitySlug(city: string) {
  return CITY_LABELS[city]?.slug ?? slugify(city);
}

function getDistrictLabel(district: string) {
  return district
    .replace(/^District\s+/i, "")
    .replace(/^Ward\s+/i, "Ward ")
    .replace("Phu My Hung", "푸미흥")
    .replace("Thao Dien", "타오디엔")
    .replace("My Khe", "미케비치")
    .replace("An Thuong", "안트엉")
    .replace("Hoan Kiem", "호안끼엠")
    .replace("Tay Ho", "떠이호")
    .replace("Duong Dong", "즈엉동");
}

function getCategoryLabel(restaurant: SeoRestaurantRecord) {
  return getCategoryLabelFromText(restaurant.category ?? restaurant.subcategory ?? "");
}

function getCategoryLabelFromText(value: string) {
  const text = normalizeText(value);
  if (text.includes("cafe") || text.includes("coffee")) return "카페";
  if (text.includes("massage") || text.includes("spa")) return "마사지";
  if (text.includes("korean")) return "한식당";
  if (text.includes("seafood")) return "해산물 맛집";
  if (text.includes("chinese")) return "중식당";
  if (text.includes("japanese")) return "일식당";
  if (text.includes("vietnamese")) return "로컬 맛집";
  if (text.includes("bbq")) return "고기집";
  return "맛집";
}

function inferCuisine(restaurant: SeoRestaurantRecord) {
  const label = getCategoryLabel(restaurant);
  if (label === "한식당") return "Korean";
  if (label === "중식당") return "Chinese";
  if (label === "일식당") return "Japanese";
  if (label === "로컬 맛집") return "Vietnamese";
  if (label === "해산물 맛집") return "Seafood";
  return label;
}

function safeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function absoluteImageUrl(image: string | null | undefined, siteUrl: string) {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  return `${normalizeSiteUrl(siteUrl)}${image.startsWith("/") ? image : `/${image}`}`;
}

function normalizeSiteUrl(siteUrl: string | undefined) {
  return (siteUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://mango-vietnam.com").replace(/\/$/, "");
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function joinKoreanList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")}와 ${items[items.length - 1]}`;
}

function trimDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 155 ? `${normalized.slice(0, 152).trim()}...` : normalized;
}

function stableHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")) as T;
}
