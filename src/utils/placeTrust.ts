import type { CuratedPlace } from "../types";
import { getMangoReviewCount } from "./placeCommunity";

export type StrictPlaceCategory = "food" | "cafe" | "massage" | "rooftop" | "korean" | "tour";

export const strictCategoryLabels: Record<StrictPlaceCategory, string> = {
  food: "맛집",
  cafe: "카페",
  massage: "마사지",
  rooftop: "루프탑",
  korean: "한식",
  tour: "관광"
};

export type TrustBadge = {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortLabel: string;
};

export type TrustedReviewSeed = {
  nickname: string;
  rating: number;
  visitStatus: string;
  tags: string[];
  content: string;
  source: "google_reference" | "mangomap_seed";
};

export function getStrictPlaceCategory(place: CuratedPlace): StrictPlaceCategory {
  const text = getSearchText(place);
  if (place.category === "카페" || hasAny(text, ["cafe", "coffee", "카페", "커피"])) return "cafe";
  if (place.category === "마사지" || hasAny(text, ["massage", "spa", "마사지", "스파"])) return "massage";
  if (place.category === "바/루프탑" || hasAny(text, ["rooftop", "sky bar", "cocktail", "루프탑", "칵테일", "bar"])) {
    return "rooftop";
  }
  if (place.category === "사진명소" || place.category === "투어/액티비티" || hasAny(text, ["museum", "market", "tour", "관광", "명소", "박물관"])) {
    return "tour";
  }
  if (isKoreanPlace(place)) return "korean";
  return "food";
}

export function matchesStrictCategory(place: CuratedPlace, categoryId: StrictPlaceCategory) {
  const strictCategory = getStrictPlaceCategory(place);
  if (categoryId === "food") return strictCategory === "food" || strictCategory === "korean";
  return strictCategory === categoryId;
}

export function getTrustBadge(place: CuratedPlace): TrustBadge {
  const mangoReviews = getMangoReviewCount(place);
  const text = getSearchText(place);
  if (hasAny(text, ["교민추천", "교민 추천"])) return { level: 5, title: "교민 추천", shortLabel: "LV.5 교민" };
  if (hasAny(text, ["운영진검증", "운영진 검증", "직접검증", "확인됨"])) {
    return { level: 4, title: "운영진 검증", shortLabel: "LV.4 검증" };
  }
  if (mangoReviews >= 20) return { level: 3, title: "한국인 후기 20개 이상", shortLabel: "LV.3 후기 20+" };
  if (mangoReviews >= 5) return { level: 2, title: "한국인 후기 5개 이상", shortLabel: "LV.2 후기 5+" };
  return { level: 1, title: "한국인 방문 기록", shortLabel: "LV.1 방문" };
}

export function getRecommendedMenu(place: CuratedPlace) {
  const menuItems = (place as CuratedPlace & { menuItems?: string[] }).menuItems;
  if (Array.isArray(menuItems) && menuItems.length > 0) return menuItems.slice(0, 3).join(" · ");
  const text = getSearchText(place);
  if (hasAny(text, ["짬뽕", "jjamppong"])) return "해물짬뽕";
  if (hasAny(text, ["짜장", "jajang"])) return "짜장면";
  if (hasAny(text, ["쌀국수", "pho", "phở"])) return "쌀국수";
  if (hasAny(text, ["분짜", "bun cha", "bún chả"])) return "분짜";
  if (hasAny(text, ["bbq", "고기", "갈비", "삼겹", "한식"])) return "고기류 · 한식 메뉴";
  if (getStrictPlaceCategory(place) === "cafe") return "시그니처 커피 · 디저트";
  if (getStrictPlaceCategory(place) === "massage") return "기본 마사지 코스";
  if (getStrictPlaceCategory(place) === "rooftop") return "칵테일 · 간단한 안주";
  return "대표 메뉴 업데이트 예정";
}

export function getRevisitIntent(place: CuratedPlace) {
  const rating = place.rating ?? 4.4;
  const mangoReviews = getMangoReviewCount(place);
  if (rating >= 4.8 && mangoReviews >= 3) return "재방문 의사 높음";
  if (getStrictPlaceCategory(place) === "massage") return "컨디션 맞으면 재방문";
  if (getStrictPlaceCategory(place) === "cafe") return "근처 일정이면 재방문";
  return "동선 맞으면 재방문";
}

export function getVisitTips(place: CuratedPlace) {
  const category = getStrictPlaceCategory(place);
  if (category === "massage") return ["방문 전 예약 가능 여부 확인", "피크 시간에는 대기 가능", "코스 시간과 가격을 먼저 확인"];
  if (category === "rooftop") return ["해질 무렵 방문 추천", "창가·야외석은 미리 확인", "주말 저녁은 예약 권장"];
  if (category === "cafe") return ["오후 더울 때 쉬어가기 좋음", "사진 목적이면 낮 시간 추천", "작업 목적이면 콘센트 좌석 확인"];
  if (category === "korean") return ["점심·저녁 피크에는 대기 가능", "여럿이면 예약 권장", "한국식 메뉴가 생각날 때 후보"];
  if (category === "tour") return ["낮 시간 방문 추천", "이동 시간까지 같이 계산", "날씨에 따라 만족도 차이 있음"];
  return ["점심 피크에는 대기 가능", "대표 메뉴 먼저 확인", "관광 동선 중간에 넣기 좋음"];
}

export function getCautions(place: CuratedPlace) {
  const category = getStrictPlaceCategory(place);
  const cautions: string[] = [];
  if (category === "food" || category === "korean") cautions.push("피크 시간에는 웨이팅 가능");
  if (category === "rooftop") cautions.push("날씨와 좌석 위치에 따라 만족도 차이 있음");
  if (category === "massage") cautions.push("코스와 추가 비용을 먼저 확인");
  if (hasAny(getSearchText(place), ["시장", "벤탄", "bui vien", "부이비엔"])) cautions.push("주변이 혼잡할 수 있음");
  if (cautions.length === 0) cautions.push("방문 전 최신 운영 정보 확인 권장");
  return cautions.slice(0, 3);
}

export function getSavedBucketLabel(place: CuratedPlace, visited = false) {
  if (visited) return "가본 곳";
  const category = getStrictPlaceCategory(place);
  if (category === "food" || category === "korean" || category === "rooftop") return "찜한 맛집";
  if (category === "massage") return "찜한 마사지";
  if (category === "cafe") return "찜한 카페";
  return "가고 싶은 곳";
}

export function getRealisticPlaceReviews(place: CuratedPlace, limit = 5): TrustedReviewSeed[] {
  const pool = rotateReviewPool(getCategoryReviewPool(place), place.id);
  const sourceReviews = (place.reviews ?? [])
    .map((review, index) => ({
      nickname: sanitizeNickname(review.nickname, index),
      rating: normalizeRating(review.rating ?? place.rating ?? 4.6),
      visitStatus: review.visitStatus || "방문 완료",
      tags: normalizeTags(review.tags ?? [], place),
      content: sanitizeReviewContent(review.content, place, index, pool),
      source: "google_reference" as const
    }))
    .filter((review) => review.content.length > 0);

  const generated = pool.map((content, index) => ({
    nickname: fallbackNicknames[(stableHash(`${place.id}:${index}`) + index) % fallbackNicknames.length],
    rating: normalizeRating((place.rating ?? 4.6) - (index % 3 === 0 ? 0.4 : 0)),
    visitStatus: index % 4 === 0 ? "가볼 예정" : "방문 완료",
    tags: normalizeTags([], place),
    content: personalizeReview(content, place, index),
    source: "mangomap_seed" as const
  }));

  const unique = new Map<string, TrustedReviewSeed>();
  [...sourceReviews, ...generated].forEach((review) => {
    const key = review.content.replace(/\s+/g, " ").trim();
    if (!unique.has(key)) unique.set(key, review);
  });

  return Array.from(unique.values()).slice(0, Math.max(3, limit));
}

function sanitizeReviewContent(content: string | undefined, place: CuratedPlace, index: number, fallbackPool: string[]) {
  const normalized = String(content ?? "").replace(/\s+/g, " ").trim();
  if (!normalized || isGenericReview(normalized, place)) return personalizeReview(fallbackPool[index % fallbackPool.length], place, index);
  return normalized.length > 92 ? `${normalized.slice(0, 89).trim()}...` : normalized;
}

function isGenericReview(content: string, place?: CuratedPlace) {
  const normalized = content.replace(/\s+/g, " ").trim();
  const placeName = place?.name?.replace(/\s+/g, " ").trim();
  if (placeName && normalized.includes(placeName)) return true;
  return /맛있어요|친절해요|분위기 좋아요|전반적으로 만족|Google|구글|리뷰 기준|실제 주소 기준|영업시간 기준|평점이 높아|리뷰 수가 많아|한국인 여행객에게 좋음|다음에도 비교해볼|경험 하나 만들기|픽업 시간을 미리 확인|정신없었습니다/i.test(normalized);
}

function getCategoryReviewPool(place: CuratedPlace) {
  const category = getStrictPlaceCategory(place);
  if (category === "massage") {
    return [
      "예약하고 가면 대기 시간이 줄어듭니다.",
      "강도는 처음에 분명히 말하는 게 좋습니다.",
      "시설은 깔끔한 편이고 여행 중 쉬어가기 좋았어요.",
      "가격표를 먼저 확인하고 들어가는 걸 추천합니다.",
      "밤 시간대보다 오후 방문이 더 여유로웠어요.",
      "끝나고 물 챙겨주는 흐름이 괜찮았습니다."
    ];
  }
  if (category === "cafe") {
    return [
      "더운 날 잠깐 쉬어가기 좋았습니다.",
      "사진 찍기에는 낮 시간이 더 괜찮아요.",
      "커피보다 공간 분위기 보고 가면 만족도가 높아요.",
      "혼자 앉아도 크게 어색하지 않았어요.",
      "작업 목적이면 좌석 위치를 먼저 보는 게 좋습니다.",
      "디저트는 늦게 가면 선택지가 줄 수 있어요."
    ];
  }
  if (category === "rooftop") {
    return [
      "해질 무렵 가면 사진이 잘 나옵니다.",
      "음료 가격은 있는 편이지만 야경값으로 납득됩니다.",
      "주말 저녁은 자리 잡기가 쉽지 않았어요.",
      "대화하기 좋은 자리와 시끄러운 자리가 나뉩니다.",
      "2차로 들르기 좋은 분위기였습니다.",
      "창가 쪽은 미리 요청하는 게 좋습니다."
    ];
  }
  if (category === "korean") {
    return [
      "베트남 음식이 물릴 때 넣기 좋은 후보입니다.",
      "가격은 로컬 식당보다 있지만 익숙한 맛이 필요할 때 좋아요.",
      "여럿이 가면 메뉴 고르기가 편합니다.",
      "점심시간에는 한국 손님이 꽤 보였습니다.",
      "매운 메뉴는 생각보다 강할 수 있어요.",
      "반찬 구성이 무난해서 한 끼 해결하기 좋았습니다."
    ];
  }
  if (category === "tour") {
    return [
      "동선 중간에 넣으면 부담이 적었습니다.",
      "사진 목적이면 낮 시간대가 낫습니다.",
      "주변 이동까지 같이 잡아야 일정이 덜 꼬입니다.",
      "처음 방문이면 위치를 미리 저장해두는 게 좋아요.",
      "날씨가 좋을 때 만족도가 확실히 올라갑니다.",
      "짧게 들르기 좋은 장소였습니다.",
      "예약형 코스라면 집합 위치를 전날 확인하는 게 안전합니다.",
      "아이와 같이 움직이기에도 크게 무리 없는 일정이었어요.",
      "설명이 길지 않아서 처음 온 사람도 따라가기 쉬웠습니다.",
      "반나절 일정으로 묶으면 이동 시간이 덜 아깝습니다."
    ];
  }
  return [
    "점심시간에는 조금 붐빌 수 있습니다.",
    "처음엔 기대 안 했는데 한 끼로 괜찮았습니다.",
    "혼자 가도 주문하기 어렵지 않았어요.",
    "관광지 근처치고 가격이 나쁘지 않았습니다.",
    "음식이 비교적 빨리 나오는 편입니다.",
    "피크만 피하면 동선에 넣기 좋습니다.",
    "국물이나 소스 맛이 꽤 진한 편이었습니다.",
    "재방문까지는 동선에 따라 결정할 것 같아요."
  ];
}

function personalizeReview(content: string, place: CuratedPlace, index: number) {
  const area = place.area || place.city;
  if (index % 5 === 1 && area) return `${area} 일정에 넣기 괜찮았어요. ${content}`;
  if (index % 5 === 2) return `${content} 다음에는 피크 시간은 피하려고요.`;
  return content;
}

function normalizeTags(tags: string[], place: CuratedPlace) {
  const category = getStrictPlaceCategory(place);
  const base =
    category === "massage"
      ? ["휴식", "예약"]
      : category === "cafe"
        ? ["카페", "사진"]
        : category === "rooftop"
          ? ["야경", "데이트"]
          : category === "korean"
            ? ["한식", "한국인 추천"]
            : category === "tour"
              ? ["관광", "동선"]
              : ["혼밥", "가성비"];
  return Array.from(new Set([...tags, ...base])).slice(0, 3);
}

function sanitizeNickname(nickname: string | undefined, index: number) {
  const clean = String(nickname ?? "").replace(/\s+/g, "").trim();
  if (clean && clean.length <= 8) return clean;
  return fallbackNicknames[index % fallbackNicknames.length];
}

function normalizeRating(rating: number) {
  if (!Number.isFinite(rating)) return 4;
  return Math.max(3, Math.min(5, Math.round(rating)));
}

function isKoreanPlace(place: CuratedPlace) {
  return hasAny(getSearchText(place), ["korea", "korean", "한식", "한국", "김치", "짜장", "짬뽕", "bbq", "삼겹", "갈비", "doya", "bornga", "saemaeul"]);
}

function getSearchText(place: CuratedPlace) {
  return [
    place.name,
    place.category,
    place.area,
    place.city,
    place.oneLine,
    place.koreanTip,
    place.address,
    place.tags?.join(" "),
    (place as CuratedPlace & { menuItems?: string[] }).menuItems?.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(textOrPlace: string | CuratedPlace, needles: string[]) {
  const text = typeof textOrPlace === "string" ? textOrPlace : getSearchText(textOrPlace);
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function rotateReviewPool(pool: string[], seed: string) {
  if (pool.length === 0) return pool;
  const offset = stableHash(seed) % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

function stableHash(value: string) {
  return Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

const fallbackNicknames = ["민", "준", "안", "케이", "여행자", "호치민러", "밥친구", "직장인", "하루", "지니"];
