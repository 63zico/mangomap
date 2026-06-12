import { NextResponse } from "next/server";

import { authorizeCollectorRequest, createCollectorError } from "@/lib/place-collector-server";
import { supabaseAdminFetch } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeoPageRow = {
  slug: string;
  title: string;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  subcategory?: string | null;
  landmark_slug?: string | null;
  intent?: string | null;
  primary_keyword?: string | null;
  meta_description?: string | null;
  summary?: string | null;
  body_sections?: unknown;
  faq_json?: unknown;
  noindex?: boolean | null;
};

type PageRestaurantRow = {
  page_slug: string;
  restaurant_slug: string;
  rank?: number | null;
  reason?: string | null;
};

type RestaurantRow = {
  slug: string;
  name: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  description?: string | null;
  seo_description?: string | null;
};

type InternalLinkRow = {
  source_slug: string;
  target_slug: string;
  anchor_text: string;
  reason?: string | null;
};

type RestaurantMetrics = {
  qualityScore: number;
  rating: number;
  reviewCount: number;
};

type EnhancedSection = {
  heading: string;
  body: string;
  items?: string[];
};

type EnhancedFaq = {
  question: string;
  answer: string;
};

const PAGE_SELECT = [
  "slug",
  "title",
  "city",
  "district",
  "category",
  "subcategory",
  "landmark_slug",
  "intent",
  "primary_keyword",
  "meta_description",
  "summary",
  "body_sections",
  "faq_json",
  "noindex",
].join(",");

const RESTAURANT_SELECT = [
  "slug",
  "name",
  "city",
  "district",
  "address",
  "category",
  "rating",
  "review_count",
  "description",
  "seo_description",
].join(",");

const bannedPhrases = [
  "추천합니다",
  "유명한 맛집",
  "방문해보세요",
];

export async function POST(request: Request) {
  try {
    authorizeCollectorRequest(request);
    const body = (await request.json().catch(() => ({}))) as { limit?: number; dryRun?: boolean };
    const limit = clamp(Number(body.limit ?? 20), 1, 20);
    const dryRun = body.dryRun === true;

    const pages = await fetchSeoPages(300);
    const relations = await fetchPageRestaurants(pages.map((page) => page.slug));
    const restaurants = await fetchRestaurants([...new Set(relations.map((row) => row.restaurant_slug))]);
    const internalLinks = await fetchInternalLinks(pages.map((page) => page.slug));
    const restaurantsBySlug = new Map(restaurants.map((restaurant) => [restaurant.slug, restaurant]));
    const metricsBySlug = new Map(restaurants.map((restaurant) => [restaurant.slug, getRestaurantMetrics(restaurant)]));
    const relationsByPage = groupBy(relations, (row) => row.page_slug);
    const linksByPage = groupBy(internalLinks, (row) => row.source_slug);

    const topPages = pages
      .map((page) => {
        const pageRelations = relationsByPage.get(page.slug) ?? [];
        const metrics = pageRelations
          .map((relation) => metricsBySlug.get(relation.restaurant_slug))
          .filter((metric): metric is RestaurantMetrics => Boolean(metric));
        const priorityScore = calculatePriorityScore({
          page,
          restaurantsCount: pageRelations.length,
          averageRating: average(metrics.map((metric) => metric.rating).filter((rating) => rating > 0)),
          totalReviewCount: metrics.reduce((sum, metric) => sum + metric.reviewCount, 0),
          averageScore: average(metrics.map((metric) => metric.qualityScore)),
          contentLength: getContentLength(page),
        });

        return { page, pageRelations, priorityScore };
      })
      .filter((item) => !item.page.noindex && item.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore || b.pageRelations.length - a.pageRelations.length)
      .slice(0, limit);

    const results = [];

    for (const item of topPages) {
      const beforeLength = getContentLength(item.page);
      const pageRestaurants = item.pageRelations
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        .flatMap((relation) => {
          const restaurant = restaurantsBySlug.get(relation.restaurant_slug);
          return restaurant ? [{ ...restaurant, reason: relation.reason ?? null }] : [];
        })
        .slice(0, 12);
      const relatedLinks = (linksByPage.get(item.page.slug) ?? []).slice(0, 8);
      const enhanced = buildEnhancedContent(item.page, pageRestaurants, relatedLinks);
      const afterPage = {
        ...item.page,
        summary: enhanced.summary,
        body_sections: enhanced.body_sections,
        faq_json: enhanced.faq_json,
      };
      const afterLength = getContentLength(afterPage);

      if (!dryRun) {
        const response = await supabaseAdminFetch(`seo_landing_pages?slug=eq.${encodeURIComponent(item.page.slug)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            summary: enhanced.summary,
            body_sections: enhanced.body_sections,
            faq_json: enhanced.faq_json,
            updated_at: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw createCollectorError(`Failed to enrich ${item.page.slug}: ${detail || response.statusText}`, response.status);
        }
      }

      results.push({
        slug: item.page.slug,
        title: item.page.title,
        priority_score: item.priorityScore,
        before_length: beforeLength,
        after_length: afterLength,
        faq_count: enhanced.faq_json.length,
      });
    }

    return NextResponse.json({
      ok: true,
      result: {
        dryRun,
        updated: results.length,
        pages: results,
      },
    });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500;
    const message = error instanceof Error ? error.message : "SEO page enrichment failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function fetchSeoPages(limit: number) {
  const response = await supabaseAdminFetch(
    `seo_landing_pages?select=${PAGE_SELECT}&order=priority.desc,updated_at.desc&limit=${limit}`,
    { method: "GET" },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw createCollectorError(`Failed to read seo_landing_pages: ${detail || response.statusText}`, response.status);
  }
  return (await response.json()) as SeoPageRow[];
}

async function fetchPageRestaurants(pageSlugs: string[]) {
  if (!pageSlugs.length) return [];
  const response = await supabaseAdminFetch(
    `seo_landing_page_restaurants?select=page_slug,restaurant_slug,rank,reason&page_slug=in.(${pageSlugs.map(encodeURIComponent).join(",")})&limit=8000`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as PageRestaurantRow[];
}

async function fetchRestaurants(slugs: string[]) {
  if (!slugs.length) return [];
  const response = await supabaseAdminFetch(
    `restaurants?select=${RESTAURANT_SELECT}&slug=in.(${slugs.map(encodeURIComponent).join(",")})&limit=8000`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as RestaurantRow[];
}

async function fetchInternalLinks(sourceSlugs: string[]) {
  if (!sourceSlugs.length) return [];
  const response = await supabaseAdminFetch(
    `seo_internal_links?select=source_slug,target_slug,anchor_text,reason&source_type=eq.seo_landing_page&source_slug=in.(${sourceSlugs.map(encodeURIComponent).join(",")})&target_type=eq.seo_landing_page&status=eq.active&order=weight.desc&limit=3000`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as InternalLinkRow[];
}

function buildEnhancedContent(
  page: SeoPageRow,
  restaurants: Array<RestaurantRow & { reason?: string | null }>,
  relatedLinks: InternalLinkRow[],
) {
  const keyword = page.primary_keyword || page.title;
  const city = getCityLabel(page.city);
  const district = page.district || getDistrictFromSlug(page.slug);
  const districtText = district ? ` ${district}` : "";
  const category = getCategoryLabel(page);
  const intent = getIntentLabel(page);
  const topNames = restaurants.slice(0, 5).map((restaurant) => restaurant.name);
  const reviewCount = restaurants.reduce((sum, restaurant) => sum + (restaurant.review_count ?? 0), 0);
  const averageRating = average(restaurants.map((restaurant) => restaurant.rating ?? 0).filter((rating) => rating > 0));
  const areaContext = getAreaContext(city, district, page.landmark_slug);
  const categoryContext = getCategoryContext(category, keyword);
  const touristIntent = getTouristIntent(city, category, intent);
  const restaurantSignals = getRestaurantSignals(restaurants);
  const relatedItems = relatedLinks.length
    ? relatedLinks.map((link) => `${link.anchor_text}: /guides/${link.target_slug}`)
    : [
        `${city} 전체 맛집 흐름도 함께 확인`,
        `${category} 외에 카페, 마사지, 생활정보까지 같은 동선에서 비교`,
        "랜드마크 근처 페이지와 도시별 페이지를 함께 열어 이동 시간을 줄이기",
      ];

  const summary = sanitizeText(dedupeSentences([
    `${keyword}를 찾는 사람은 단순히 이름이 많이 보이는 장소보다 이동 동선, 가격대, 후기에서 반복되는 장점, 혼잡 가능성을 함께 확인해야 합니다.`,
    `이 가이드는 ${city}${districtText}에서 ${category} 후보를 좁힐 때 필요한 기준을 한 번에 볼 수 있도록 구성했습니다.`,
    restaurants.length
      ? `현재 연결된 장소는 ${restaurants.length}곳이며, 등록된 평점 평균은 ${averageRating ? averageRating.toFixed(1) : "확인 중"}점, 누적 후기 수는 약 ${formatNumber(reviewCount)}개입니다.`
      : "현재 연결된 장소가 적은 편이라, 운영자가 실제 후보를 추가로 검수하면 페이지 품질이 더 좋아집니다.",
    "직접 방문 후기처럼 단정하지 않고, 방문자 후기와 장소 데이터에서 반복되는 정보를 중심으로 정리했습니다.",
  ].join(" ")));

  const bodySections: EnhancedSection[] = [
    {
      heading: `${city}${districtText}에서 먼저 봐야 할 기준`,
      body: sanitizeText(dedupeSentences(`${areaContext} ${keyword} 검색자는 보통 숙소나 관광지에서 가까운지, 식사 후 다음 일정으로 이동하기 쉬운지, 한국어 메뉴나 익숙한 메뉴가 있는지부터 확인합니다. 특히 짧은 여행 일정에서는 한 번의 식사 실패가 일정 전체의 만족도를 낮출 수 있어 위치와 대기 가능성을 함께 보는 편이 좋습니다. 이 페이지는 지도만 보고 고르는 방식보다, 지역 맥락과 방문자 후기에서 반복되는 단서를 함께 읽도록 구성했습니다.`)),
      items: uniqueStrings([
        `${city}${districtText} 안에서 이동 시간이 과도하지 않은지 확인`,
        "식사 시간대에는 대기, 배달 주문, 단체 손님 여부를 함께 고려",
        "사진이 오래되었거나 메뉴 정보가 부족한 곳은 최근 후기 흐름 확인",
        "관광 동선과 거주자 생활권이 겹치는 장소를 우선 비교",
      ]),
    },
    {
      heading: `${category}를 고를 때 보는 포인트`,
      body: sanitizeText(dedupeSentences(`${categoryContext} ${category} 페이지에서는 음식 이름만 보기보다 어떤 상황에 맞는지 확인하는 것이 중요합니다. 혼밥, 가족 식사, 해장, 데이트, 단체 모임은 같은 식당이라도 만족 포인트가 달라집니다. 메뉴 폭, 좌석 간격, 소음, 아이 동반 가능성, 결제 편의성, 영업시간이 실제 선택에 영향을 줍니다. 여러 후기에서 반복되는 표현은 맛보다 더 실용적인 신호가 될 때가 많습니다.`)),
      items: uniqueStrings([
        "대표 메뉴가 한두 개에 집중되는지, 여러 명이 나눠 먹기 좋은지 확인",
        "가격대가 관광지 평균보다 높은지 낮은지 비교",
        "한국인에게 익숙한 맛인지, 현지식 입문용인지 구분",
        "사진과 실제 메뉴 구성이 크게 다르지 않은지 확인",
      ]),
    },
    {
      heading: "관광객이 이 키워드를 검색하는 이유",
      body: sanitizeText(dedupeSentences(`${touristIntent} 여행자는 보통 검색 결과에서 가장 위에 보이는 장소를 바로 고르기보다, 숙소 위치와 다음 목적지 사이에 있는 후보를 찾습니다. ${keyword}는 식사 자체뿐 아니라 휴식, 이동, 가족 일정, 밤 시간대 일정과도 연결됩니다. 그래서 이 가이드는 이름이 익숙한 곳만 나열하지 않고, 주소와 지역, 평점, 후기 수, 설명을 함께 확인하도록 구성했습니다.`)),
      items: uniqueStrings([
        "공항, 시장, 해변, 호텔 밀집 지역과의 거리 확인",
        "점심과 저녁 중 어느 시간대에 더 편한지 비교",
        "비 오는 날이나 더운 시간대에 이동 부담이 적은지 확인",
        "처음 가는 사람도 메뉴 선택이 어렵지 않은지 확인",
      ]),
    },
    {
      heading: "방문자 후기에서 반복되는 점",
      body: sanitizeText(dedupeSentences(`${restaurantSignals} 후기 수가 많은 장소는 장점과 단점이 동시에 드러나는 편입니다. 평점만 높다고 바로 결정하기보다, 어떤 메뉴가 반복해서 언급되는지, 서비스 속도나 청결에 대한 표현이 일관되는지, 관광객과 거주자의 평가가 갈리는지 확인하는 것이 좋습니다. 이 페이지의 목록은 그런 반복 신호를 읽기 쉽게 묶어 검수할 수 있게 만든 초안입니다.`)),
      items: uniqueStrings([
        restaurants[0]?.reason || restaurants[0]?.seo_description || restaurants[0]?.description || "대표 메뉴와 위치 장점이 반복적으로 언급되는지 확인",
        restaurants[1]?.reason || restaurants[1]?.seo_description || restaurants[1]?.description || "대기 시간, 소음, 좌석 환경에 대한 표현 확인",
        restaurants[2]?.reason || restaurants[2]?.seo_description || restaurants[2]?.description || "가족, 혼밥, 단체 등 상황별 적합성 확인",
        "후기가 많은 곳일수록 최근 평가 흐름을 따로 보는 편이 안전",
      ]),
    },
    {
      heading: "방문 전 참고할 점",
      body: sanitizeText(dedupeSentences(`${city}의 상권은 관광지, 주거지, 오피스 지역에 따라 분위기가 크게 달라집니다. 같은 ${category}라도 점심에는 직장인 중심, 저녁에는 여행자 중심, 주말에는 가족 단위 손님이 많아질 수 있습니다. 운영시간, 마지막 주문 시간, 카드 결제, 예약 가능 여부는 변동될 수 있으므로 이동 전에 한 번 더 확인하는 편이 좋습니다. 특히 인기 지역은 차량 호출 대기 시간까지 함께 계산해야 합니다.`)),
      items: uniqueStrings([
        "운영시간과 휴무일은 이동 직전에 확인",
        "가격대와 메뉴판 사진이 최신인지 확인",
        "현금만 받는지, 카드 결제가 가능한지 확인",
        "아이 동반, 단체 좌석, 주차 여부는 사전에 확인",
      ]),
    },
    {
      heading: "이 목록을 읽는 방법",
      body: sanitizeText(dedupeSentences(`아래 식당 목록은 절대적인 순위표라기보다, ${keyword} 검색자가 빠르게 비교할 수 있는 후보군입니다. 이름, 지역, 카테고리, 평점, 후기 수, 주소, 짧은 설명을 함께 보면서 자신의 일정에 맞는 곳을 좁히는 용도로 쓰는 것이 좋습니다. ${topNames.length ? `${topNames.join(", ")} 같은 장소는 먼저 상세 페이지에서 사진과 주소를 확인하면 판단이 쉬워집니다.` : "연결 식당이 늘어날수록 이 문단의 비교 품질도 함께 좋아집니다."}`)),
      items: uniqueStrings([
        "평점보다 후기 수와 최근성까지 함께 보기",
        "주소가 숙소나 다음 일정과 맞는지 먼저 확인",
        "상세 페이지에서 사진, 지도, 연락처를 다시 확인",
        "비슷한 후보가 많으면 관련 가이드까지 함께 열어 비교",
      ]),
    },
    {
      heading: "관련 가이드로 함께 확인하기",
      body: sanitizeText(dedupeSentences(`${keyword} 하나만으로 결정하기 어렵다면 가까운 지역, 비슷한 음식 카테고리, 방문 목적이 겹치는 가이드를 함께 보는 것이 좋습니다. 내부 링크는 검색 의도가 이어지는 페이지끼리 연결해 두었기 때문에, 한 페이지에서 끝내기보다 두세 개의 가이드를 비교하면 더 안정적으로 후보를 줄일 수 있습니다.`)),
      items: uniqueStrings(relatedItems).slice(0, 6),
    },
  ];

  const faq = buildFaq(page, city, district, category, keyword, restaurants, relatedLinks);
  const fitted = fitEnhancedContent(summary, bodySections, faq);

  return {
    summary,
    body_sections: fitted.sections,
    faq_json: fitted.faq,
  };
}

function buildFaq(
  page: SeoPageRow,
  city: string,
  district: string,
  category: string,
  keyword: string,
  restaurants: RestaurantRow[],
  relatedLinks: InternalLinkRow[],
): EnhancedFaq[] {
  const districtText = district ? `${district} ` : "";
  const firstRestaurant = restaurants[0]?.name;
  const related = relatedLinks[0]?.anchor_text;
  return [
    {
      question: `${keyword} 페이지는 어떤 기준으로 보면 되나요?`,
      answer: `${city} ${districtText}${category} 후보를 볼 때는 평점 하나보다 위치, 후기 수, 최근 사진, 영업시간, 가격대, 이동 동선을 함께 보는 것이 좋습니다. 이 페이지는 그런 비교 기준을 한 화면에서 확인하도록 구성했습니다.`,
    },
    {
      question: `관광객은 ${city}에서 어떤 점을 먼저 확인해야 하나요?`,
      answer: `관광객은 숙소와 다음 일정 사이의 이동 시간, 식사 시간대 혼잡도, 카드 결제 가능성, 메뉴 선택 난이도를 먼저 보는 편이 좋습니다. 특히 시장, 해변, 중심가 근처는 시간대에 따라 체감 편의성이 달라집니다.`,
    },
    {
      question: `${category}를 고를 때 방문자 후기에서 무엇을 봐야 하나요?`,
      answer: `여러 후기에서 반복되는 메뉴명, 대기 시간, 서비스 속도, 청결, 좌석 분위기를 확인하세요. 한두 개의 강한 평가보다 반복되는 표현이 실제 선택에 더 도움이 됩니다.`,
    },
    {
      question: `이 페이지의 식당 순서는 절대적인 순위인가요?`,
      answer: `아닙니다. 연결된 장소 데이터와 후기 신호를 바탕으로 비교하기 쉽게 정리한 목록입니다. 일정, 인원, 이동 동선에 따라 더 맞는 후보가 달라질 수 있습니다.`,
    },
    {
      question: `방문 전에 꼭 확인해야 할 정보는 무엇인가요?`,
      answer: `운영시간, 휴무일, 마지막 주문 시간, 주소, 전화번호, 최근 사진을 확인하는 것이 좋습니다. 현지 사정에 따라 영업 정보가 바뀔 수 있어 이동 직전 확인이 필요합니다.`,
    },
    {
      question: firstRestaurant ? `${firstRestaurant} 같은 장소는 왜 함께 표시되나요?` : `${city}의 장소가 함께 표시되는 이유는 무엇인가요?`,
      answer: `같은 도시나 지역, 음식 카테고리, 검색 의도와 연결되어 비교 후보로 볼 수 있기 때문입니다. 상세 페이지에서 사진, 주소, 후기 수를 다시 확인하면 판단이 더 쉬워집니다.`,
    },
    {
      question: related ? `${related}도 같이 보면 좋은가요?` : "관련 가이드는 왜 함께 봐야 하나요?",
      answer: `검색 의도가 이어지는 페이지를 함께 보면 선택 폭이 넓어집니다. 예를 들어 지역 맛집, 특정 음식, 랜드마크 근처 장소를 같이 비교하면 이동 시간과 실패 가능성을 줄일 수 있습니다.`,
    },
    {
      question: `${keyword} 정보는 얼마나 자주 손봐야 하나요?`,
      answer: `핵심 SEO 페이지는 사진, 영업시간, 후기 수, 새로 추가된 장소를 기준으로 주기적으로 검수하는 것이 좋습니다. 자동 생성 후에도 운영자가 문장과 후보 식당을 보강해야 검색 품질이 안정됩니다.`,
    },
  ].slice(0, 8).map((item) => ({
    question: sanitizeText(item.question),
    answer: sanitizeText(item.answer),
  }));
}

function fitEnhancedContent(summary: string, sections: EnhancedSection[], faq: EnhancedFaq[]) {
  const variants = [
    {
      sections: compactSections(sections, 7, 300, 4),
      faq: compactFaq(faq, 8, 170),
    },
    {
      sections: compactSections(sections, 7, 245, 3),
      faq: compactFaq(faq, 7, 135),
    },
    {
      sections: compactSections(sections, 6, 215, 3),
      faq: compactFaq(faq, 6, 115),
    },
    {
      sections: compactSections(sections, 6, 165, 2),
      faq: compactFaq(faq, 6, 82),
    },
    {
      sections: compactSections(sections, 5, 138, 1),
      faq: compactFaq(faq, 5, 72),
    },
  ];

  const firstInRange = variants.find((variant) => {
    const length = getOutputLength(summary, variant.sections, variant.faq);
    return length >= 1900 && length <= 3200;
  });
  if (firstInRange) return firstInRange;

  const underLimit = variants.find((variant) => getOutputLength(summary, variant.sections, variant.faq) <= 3200);
  if (underLimit && getOutputLength(summary, underLimit.sections, underLimit.faq) >= 1800) return underLimit;

  return variants[variants.length - 1];
}

function compactSections(sections: EnhancedSection[], maxSections: number, bodyLength: number, maxItems: number) {
  return sections.slice(0, maxSections).map((section) => ({
    heading: section.heading,
    body: trimText(section.body, bodyLength),
    items: section.items?.slice(0, maxItems).map((item) => trimText(item, 95)),
  }));
}

function compactFaq(faq: EnhancedFaq[], maxFaq: number, answerLength: number) {
  return faq.slice(0, maxFaq).map((item) => ({
    question: item.question,
    answer: trimText(item.answer, answerLength),
  }));
}

function getOutputLength(summary: string, sections: EnhancedSection[], faq: EnhancedFaq[]) {
  return [summary, JSON.stringify(sections), JSON.stringify(faq)].join(" ").length;
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  return `${trimmed}.`;
}

function getRestaurantSignals(restaurants: RestaurantRow[]) {
  if (!restaurants.length) {
    return "연결된 장소가 아직 많지 않을 때는 운영자가 후보 식당을 늘리고, 각 장소의 사진과 설명을 먼저 보강해야 합니다.";
  }

  const top = restaurants.slice(0, 4).map((restaurant) => {
    const rating = typeof restaurant.rating === "number" ? `${restaurant.rating.toFixed(1)}점` : "평점 확인 중";
    const count = typeof restaurant.review_count === "number" ? `후기 ${formatNumber(restaurant.review_count)}개` : "후기 수 확인 중";
    return `${restaurant.name}(${rating}, ${count})`;
  });
  return `${top.join(", ")}처럼 평점과 후기 수가 함께 있는 장소는 비교 출발점으로 쓰기 좋습니다.`;
}

function getAreaContext(city: string, district: string, landmarkSlug?: string | null) {
  const landmarkText = landmarkSlug ? "랜드마크 근처 검색 의도가 포함된 페이지라 도보 이동과 차량 호출 시간을 함께 봐야 합니다." : "";
  if (city.includes("호치민")) return `호치민은 1군, 2군, 7군, 푸미흥, 타오디엔처럼 생활권 성격이 뚜렷하게 갈립니다. ${landmarkText}`;
  if (city.includes("다낭")) return `다낭은 미케비치, 한시장, 안트엉, 시내권의 이동 목적이 달라 해변 동선과 식사 시간을 함께 봐야 합니다. ${landmarkText}`;
  if (city.includes("나트랑")) return `나트랑은 해변가와 시내, 야시장 근처의 체류 목적이 달라 숙소 위치를 먼저 확인하는 것이 좋습니다. ${landmarkText}`;
  if (city.includes("하노이")) return `하노이는 호안끼엠, 떠이호, 바딘처럼 관광지와 거주자 생활권이 나뉘어 이동 시간이 선택에 큰 영향을 줍니다. ${landmarkText}`;
  if (city.includes("푸꾸옥")) return `푸꾸옥은 리조트 권역과 즈엉동, 안터이의 이동 거리가 길어 식사 후보를 동선 안에서 좁히는 것이 중요합니다. ${landmarkText}`;
  if (city.includes("달랏")) return `달랏은 중심가, 쑤언흐엉 호수, 언덕길 동선이 달라 도보 이동 가능성을 함께 봐야 합니다. ${landmarkText}`;
  return `${city}${district ? ` ${district}` : ""}의 상권은 관광 동선과 생활권이 섞여 있어 위치 확인이 먼저 필요합니다. ${landmarkText}`;
}

function getCategoryContext(category: string, keyword: string) {
  if (category.includes("카페")) return `${keyword} 검색자는 커피 맛뿐 아니라 좌석, 콘센트, 조용함, 사진 분위기, 더운 시간대 쉬기 좋은지를 함께 봅니다.`;
  if (category.includes("마사지")) return `${keyword} 검색자는 가격표, 예약 가능성, 시설 청결, 위치, 늦은 시간 운영 여부를 중요하게 봅니다.`;
  if (category.includes("한식")) return `${keyword} 검색자는 한국식 맛의 안정감, 반찬 구성, 국물 메뉴, 단체 식사 가능성을 많이 확인합니다.`;
  if (category.includes("해산물")) return `${keyword} 검색자는 신선도, 가격 표시, 조리 방식, 관광지 프리미엄 여부를 함께 확인합니다.`;
  if (keyword.includes("짬뽕") || keyword.toLowerCase().includes("jjamppong")) return `${keyword} 검색자는 국물 맛, 해산물 양, 맵기, 면 상태, 배달 가능성을 함께 봅니다.`;
  if (keyword.includes("해장")) return `${keyword} 검색자는 국물 메뉴, 아침 영업, 숙소와의 거리, 부담 없는 가격대를 함께 확인합니다.`;
  return `${keyword} 검색자는 음식 종류뿐 아니라 상황별 적합성과 이동 편의성을 함께 확인합니다.`;
}

function getTouristIntent(city: string, category: string, intent: string) {
  if (intent.includes("landmark")) return `${city}에서 랜드마크 근처 장소를 찾는 사람은 식사보다 동선 효율을 먼저 봅니다.`;
  if (category.includes("카페")) return `${city} 카페 검색자는 더운 시간대 휴식, 사진, 노트북 사용, 해변이나 시장 근처 이동을 함께 고려합니다.`;
  if (category.includes("마사지")) return `${city} 마사지 검색자는 여행 피로를 줄이기 위한 접근성, 예약, 가격, 시설 정보를 함께 찾습니다.`;
  return `${city} 맛집 검색자는 식사 만족도뿐 아니라 일정 흐름, 택시 이동, 함께 간 사람의 취향까지 고려합니다.`;
}

function getCategoryLabel(page: SeoPageRow) {
  const text = `${page.category ?? ""} ${page.subcategory ?? ""} ${page.intent ?? ""} ${page.primary_keyword ?? ""}`.toLowerCase();
  if (text.includes("cafe") || text.includes("카페")) return "카페";
  if (text.includes("massage") || text.includes("마사지")) return "마사지";
  if (text.includes("korean") || text.includes("한식")) return "한식";
  if (text.includes("seafood") || text.includes("해산물")) return "해산물";
  if (text.includes("jjamppong") || text.includes("jjambbong") || text.includes("짬뽕")) return "짬뽕";
  if (text.includes("hangover") || text.includes("해장")) return "해장 음식";
  return "맛집";
}

function getIntentLabel(page: SeoPageRow) {
  return `${page.intent ?? ""} ${page.slug}`.toLowerCase();
}

function getCityLabel(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("ho chi minh") || normalized.includes("hcm")) return "호치민";
  if (normalized.includes("da nang")) return "다낭";
  if (normalized.includes("nha trang")) return "나트랑";
  if (normalized.includes("hanoi") || normalized.includes("ha noi")) return "하노이";
  if (normalized.includes("phu quoc")) return "푸꾸옥";
  if (normalized.includes("da lat")) return "달랏";
  return value || "베트남";
}

function getDistrictFromSlug(slug: string) {
  if (slug.includes("district-1")) return "1군";
  if (slug.includes("district-2")) return "2군";
  if (slug.includes("district-7")) return "7군";
  if (slug.includes("phu-my-hung")) return "푸미흥";
  if (slug.includes("thao-dien")) return "타오디엔";
  if (slug.includes("my-khe")) return "미케비치";
  if (slug.includes("han-market")) return "한시장";
  if (slug.includes("ben-thanh")) return "벤탄시장";
  if (slug.includes("bui-vien")) return "부이비엔";
  return "";
}

function getRestaurantMetrics(restaurant: RestaurantRow): RestaurantMetrics {
  let qualityScore = 0;
  if (restaurant.address) qualityScore += 14;
  if (restaurant.description || restaurant.seo_description) qualityScore += 18;
  if (typeof restaurant.rating === "number" && restaurant.rating >= 4) qualityScore += 18;
  if (typeof restaurant.review_count === "number") {
    if (restaurant.review_count >= 100) qualityScore += 18;
    else if (restaurant.review_count >= 20) qualityScore += 12;
    else if (restaurant.review_count >= 5) qualityScore += 6;
  }
  return {
    qualityScore: Math.min(100, qualityScore),
    rating: typeof restaurant.rating === "number" ? restaurant.rating : 0,
    reviewCount: typeof restaurant.review_count === "number" ? restaurant.review_count : 0,
  };
}

function calculatePriorityScore(input: {
  page: SeoPageRow;
  restaurantsCount: number;
  averageRating: number;
  totalReviewCount: number;
  averageScore: number;
  contentLength: number;
}) {
  if (input.page.noindex) return 0;

  const searchText = normalizeSearchText([
    input.page.slug,
    input.page.title,
    input.page.city,
    input.page.category,
    input.page.intent,
    input.page.primary_keyword,
  ].filter(Boolean).join(" "));

  let score = 0;
  score += Math.min(36, [
    { keywords: ["맛집", "restaurant", "restaurants", "best restaurants"], points: 18 },
    { keywords: ["카페", "cafe", "cafes"], points: 14 },
    { keywords: ["마사지", "massage"], points: 12 },
    { keywords: ["한식", "korean"], points: 16 },
    { keywords: ["해산물", "seafood"], points: 14 },
    { keywords: ["짬뽕", "jjamppong", "jjambbong"], points: 16 },
    { keywords: ["해장", "hangover"], points: 13 },
  ].reduce((sum, group) => sum + (group.keywords.some((keyword) => searchText.includes(keyword)) ? group.points : 0), 0));

  const cityText = normalizeSearchText(input.page.city ?? "");
  if (cityText.includes("ho chi minh") || cityText.includes("호치민")) score += 18;
  else if (cityText.includes("da nang") || cityText.includes("다낭")) score += 14;
  else if (cityText.includes("nha trang") || cityText.includes("나트랑")) score += 11;
  else if (cityText.includes("hanoi") || cityText.includes("하노이")) score += 10;

  score += Math.min(18, input.restaurantsCount * 1.35);

  if (input.averageRating >= 4.5) score += 14;
  else if (input.averageRating >= 4.2) score += 10;
  else if (input.averageRating >= 4) score += 6;

  score += Math.min(14, Math.log10(input.totalReviewCount + 1) * 5.5);
  if (input.page.landmark_slug || searchText.includes("near") || searchText.includes("근처")) score += 10;
  if (input.averageScore >= 70) score += 8;
  else if (input.averageScore >= 55) score += 5;
  if (input.contentLength < 1200 && score >= 45) score += 4;

  return round(Math.min(100, score));
}

function getContentLength(page: Pick<SeoPageRow, "title" | "meta_description" | "summary" | "body_sections" | "faq_json">) {
  const sectionText = JSON.stringify(normalizeJson(page.body_sections, []));
  const faqText = JSON.stringify(normalizeJson(page.faq_json, []));
  return [page.title, page.meta_description, page.summary, sectionText, faqText].filter(Boolean).join(" ").length;
}

function sanitizeText(value: string) {
  let output = value.replace(/\s+/g, " ").trim();
  for (const phrase of bannedPhrases) {
    output = output.replaceAll(phrase, phrase === "유명한 맛집" ? "인지도가 높은 식당" : "선택 전 확인할 만한 정보");
  }
  return output;
}

function dedupeSentences(value: string) {
  const seen = new Set<string>();
  return value
    .split(/(?<=[.!?。]|다\.|요\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => {
      const key = sentence.replace(/\s+/g, " ");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => sanitizeText(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function normalizeJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value === null || value === undefined) return fallback;
  return value as T;
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

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[-_/]+/g, " ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
