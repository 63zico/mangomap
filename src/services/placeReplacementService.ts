import { curatedPlaces } from "../data/places";
import { defaultAccommodationAreaByDestination } from "../constants/options";
import type { CuratedPlace, CuratedPlaceCategory, PlacePlan, PlannerInput, Preference } from "../types";

const categoryMap: Partial<Record<PlacePlan["category"], CuratedPlaceCategory[]>> = {
  맛집: ["맛집"],
  먹방: ["맛집"],
  카페: ["카페"],
  "인스타 감성": ["카페", "사진명소"],
  "로컬 감성": ["맛집", "카페", "사진명소"],
  마사지: ["마사지"],
  "술/힙한바": ["바/루프탑"],
  가라오케: ["바/루프탑"],
  "힐링/휴식": ["카페", "마사지"],
  액티비티: ["투어/액티비티"],
  쇼핑: ["쇼핑"],
  로컬: ["맛집", "사진명소"],
  야경: ["바/루프탑", "사진명소"],
  "클럽/바": ["바/루프탑"],
  관광지: ["사진명소", "투어/액티비티"]
};

export function getReplacementCandidates(place: PlacePlan, input: PlannerInput, limit = 8): CuratedPlace[] {
  const categories: CuratedPlaceCategory[] = categoryMap[place.category] ?? categoriesFromPreferences(input.preferences);
  const fallbackCategories = getFallbackCategories(categories);
  const avoid = input.avoid.trim();
  const usedName = normalize(place.placeName);

  const strictCandidates = scoreCandidates({
    categories,
    input,
    original: place,
    avoid,
    usedName
  });
  const broadCandidates = scoreCandidates({
    categories: fallbackCategories,
    input,
    original: place,
    avoid,
    usedName
  });

  const strictSorted = strictCandidates.sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, "ko-KR"));
  const broadSorted = broadCandidates.sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, "ko-KR"));

  return dedupeCandidates([...strictSorted, ...broadSorted])
    .slice(0, limit)
    .map((item) => item.candidate);
}

function scoreCandidates({
  categories,
  input,
  original,
  avoid,
  usedName
}: {
  categories: CuratedPlaceCategory[];
  input: PlannerInput;
  original: PlacePlan;
  avoid: string;
  usedName: string;
}) {
  return curatedPlaces
    .filter((candidate) => candidate.city === input.destination)
    .filter((candidate) => categories.includes(candidate.category))
    .filter((candidate) => normalize(candidate.name) !== usedName)
    .filter((candidate) => !avoid || !normalize(candidate.name).includes(normalize(avoid)))
    .filter((candidate) => isReliableCandidate(candidate))
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, input, original)
    }));
}

function dedupeCandidates(items: Array<{ candidate: CuratedPlace; score: number }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.candidate.id)) return false;
    seen.add(item.candidate.id);
    return true;
  });
}

function getFallbackCategories(categories: CuratedPlaceCategory[]) {
  const fallback = new Set<CuratedPlaceCategory>(categories);
  if (categories.includes("맛집")) {
    fallback.add("카페");
    fallback.add("사진명소");
  }
  if (categories.includes("카페")) {
    fallback.add("맛집");
    fallback.add("사진명소");
  }
  if (categories.includes("마사지")) {
    fallback.add("카페");
    fallback.add("쇼핑");
  }
  if (categories.includes("바/루프탑")) {
    fallback.add("카페");
    fallback.add("사진명소");
  }
  if (categories.includes("투어/액티비티")) {
    fallback.add("사진명소");
    fallback.add("쇼핑");
  }
  return Array.from(fallback);
}

export function convertCuratedPlaceToPlanPlace(original: PlacePlan, replacement: CuratedPlace): PlacePlan {
  return {
    ...original,
    id: `${original.id}-curated-${replacement.id}-${Date.now()}`,
    placeName: replacement.name,
    category: mapCuratedCategoryToPlanCategory(replacement.category),
    description: replacement.oneLine,
    estimatedCost: estimateCost(replacement.priceLevel),
    costMin: estimateCostRange(replacement.priceLevel)[0],
    costMax: estimateCostRange(replacement.priceLevel)[1],
    fitReason: `${replacement.tags.slice(0, 3).join(" · ")} 기준으로 고른 대체 후보예요.`,
    localTip: replacement.koreanTip,
    matchTags: mapTagsToPreferences(replacement.tags),
    alternativePlaces: getReplacementCandidates(original, {
      destination: replacement.city,
      duration: "2박3일",
      companion: "커플",
      budget: "보통",
      preferences: mapTagsToPreferences(replacement.tags),
      style: "반반",
      accommodationArea: defaultAccommodationAreaByDestination[replacement.city],
      arrivalTime: "오후 도착",
      departureTime: "밤 출국",
      mustVisit: "",
      avoid: replacement.name
    }, 6).map((place) => place.name),
    rainyAlternative: replacement.rainyDayOk ? "비 오는 날에도 진행하기 좋은 실내/근거리 후보예요." : original.rainyAlternative,
    rating: replacement.rating,
    reviewCount: replacement.userRatingCount,
    koreanFitScore: Math.max(replacement.koreanReviewSignal?.score ?? 0, replacement.beginnerSafe ? 88 : 78),
    reliabilityBadge:
      (replacement.koreanReviewSignal?.reviewCount ?? 0) > 0
        ? `한국어 후기 ${replacement.koreanReviewSignal?.reviewCount}개 확인`
        : replacement.beginnerSafe
          ? "후기 많은 검증 후보"
          : "숨은 후보라 후기 확인 추천",
    openingHint: "방문 전 Google Maps 영업시간 확인",
    warning: replacement.category === "바/루프탑" || replacement.category === "쇼핑" ? "늦은 이동과 소지품 관리에 신경 쓰세요." : undefined,
    reservationTip: replacement.category === "마사지" || replacement.category === "바/루프탑" ? "인기 시간대는 예약을 추천해요." : undefined,
    mapQuery: replacement.name,
    googleMapsUri: replacement.googleMapsUri
  };
}

export function formatPlaceDisplayName(name: string) {
  return name
    .replace(/\s*-\s*(Vietnamese cuisine|Vietnamese Cuisine|vegetarian Food|Vegetarian Food|Vegan food|Cafe & Croissant).*$/i, "")
    .replace(/\s*\([^)]{18,}\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function scoreCandidate(candidate: CuratedPlace, input: PlannerInput, original: PlacePlan) {
  let score = 0;
  score += (candidate.rating ?? 0) * 10;
  score += Math.min(candidate.userRatingCount ?? 0, 5000) / 500;
  score += (candidate.koreanReviewSignal?.score ?? 0) / 4;
  if (candidate.beginnerSafe) score += 8;
  if (candidate.hiddenGem && (input.preferences.includes("로컬") || input.preferences.includes("로컬 감성"))) score += 10;
  if (candidate.rainyDayOk && ["카페", "마사지", "쇼핑"].includes(String(original.category))) score += 4;
  if (candidate.priceLevel === mapBudgetToPriceLevel(input.budget)) score += 9;
  if (candidate.area && input.accommodationArea.includes(candidate.area.split("/")[0])) score += 10;
  if ((candidate.koreanReviewSignal?.reviewCount ?? 0) > 0) score += 8;
  if ((candidate.userRatingCount ?? 0) >= 1000) score += 5;
  for (const preference of input.preferences) {
    if (candidate.tags.includes(preference)) score += 5;
  }
  score += getTravelerTypeScore(candidate, input);
  if (input.budget === "가성비" && candidate.priceLevel === "저렴") score += 8;
  if (input.budget === "프리미엄" && candidate.priceLevel === "프리미엄") score += 8;
  return score;
}

function isReliableCandidate(candidate: CuratedPlace) {
  if ((candidate.userRatingCount ?? 0) < 500) return false;
  if (candidate.category === "맛집" && (candidate.koreanReviewSignal?.reviewCount ?? 0) <= 0) return false;
  return true;
}

function mapBudgetToPriceLevel(budget: PlannerInput["budget"]): CuratedPlace["priceLevel"] {
  if (budget === "가성비") return "저렴";
  if (budget === "프리미엄") return "프리미엄";
  return "보통";
}

function getTravelerTypeScore(candidate: CuratedPlace, input: PlannerInput) {
  let score = 0;

  if (input.companion === "혼자" || input.preferences.includes("혼자 여행")) {
    if (["카페", "마사지", "쇼핑", "사진명소"].includes(candidate.category)) score += 8;
    if (candidate.beginnerSafe) score += 8;
    if (candidate.category === "바/루프탑") score -= 12;
  }

  if (input.companion === "커플" || input.preferences.includes("커플 여행")) {
    if (["카페", "바/루프탑", "사진명소", "마사지"].includes(candidate.category)) score += 10;
    if (candidate.tags.includes("사진맛집") || candidate.tags.includes("야경")) score += 6;
  }

  if (input.companion === "가족" || input.preferences.includes("가족 여행")) {
    if (["쇼핑", "사진명소", "맛집"].includes(candidate.category)) score += 9;
    if (candidate.beginnerSafe) score += 10;
    if (candidate.category === "바/루프탑") score -= 18;
  }

  if (input.preferences.includes("여자끼리")) {
    if (["카페", "마사지", "쇼핑", "바/루프탑"].includes(candidate.category)) score += 10;
    if (candidate.beginnerSafe) score += 8;
    if (candidate.rainyDayOk) score += 4;
  }

  if (input.preferences.includes("럭셔리") || input.budget === "프리미엄") {
    if (["바/루프탑", "마사지", "쇼핑"].includes(candidate.category)) score += 12;
    if (candidate.priceLevel === "프리미엄") score += 10;
  }

  if (input.preferences.includes("가라오케")) {
    if (candidate.tags.includes("가라오케") || /karaoke|가라오케|노래방/i.test(candidate.name)) score += 18;
    if (candidate.category === "바/루프탑") score += 6;
  }

  return score;
}

function categoriesFromPreferences(preferences: Preference[]): CuratedPlaceCategory[] {
  const categories = new Set<CuratedPlaceCategory>();
  for (const preference of preferences) {
    (categoryMap[preference] ?? []).forEach((category) => categories.add(category));
  }
  return categories.size > 0 ? Array.from(categories) : ["맛집", "카페", "사진명소"];
}

function mapCuratedCategoryToPlanCategory(category: CuratedPlaceCategory): PlacePlan["category"] {
  if (category === "바/루프탑") return "야경";
  if (category === "사진명소") return "관광지";
  if (category === "투어/액티비티") return "액티비티";
  if (category === "환전") return "쇼핑";
  return category;
}

function mapTagsToPreferences(tags: string[]): Preference[] {
  const validTags = tags.filter((tag): tag is Preference =>
    ["맛집", "카페", "마사지", "쇼핑", "야경", "관광지", "액티비티", "로컬", "인스타 감성", "가라오케"].includes(tag)
  );
  return validTags.length > 0 ? validTags.slice(0, 3) : ["맛집"];
}

function estimateCost(priceLevel: CuratedPlace["priceLevel"]) {
  if (priceLevel === "저렴") return "90,000~270,000 VND";
  if (priceLevel === "프리미엄") return "720,000~2.2M VND";
  return "270,000~720,000 VND";
}

function estimateCostRange(priceLevel: CuratedPlace["priceLevel"]): [number, number] {
  if (priceLevel === "저렴") return [5000, 15000];
  if (priceLevel === "프리미엄") return [40000, 120000];
  return [15000, 40000];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}
