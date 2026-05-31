import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "data", "collected-google-places.json");

const city = {
  name: "호치민",
  englishName: "Ho Chi Minh City",
  regionCode: "VN",
  center: { latitude: 10.7769, longitude: 106.7009 },
  radius: 14000
};

const searchPlan = [
  {
    category: "맛집",
    queries: [
      "best banh mi in Ho Chi Minh City",
      "best pho in Ho Chi Minh City",
      "best Vietnamese restaurant District 1 Ho Chi Minh City",
      "local restaurant Ho Chi Minh City District 1",
      "Michelin Bib Gourmand Ho Chi Minh City Vietnamese restaurant",
      "Korean restaurant District 1 Ho Chi Minh City",
      "Chinese restaurant District 1 Ho Chi Minh City",
      "Japanese restaurant District 1 Ho Chi Minh City",
      "seafood restaurant Ho Chi Minh City District 1",
      "brunch restaurant Ho Chi Minh City District 1",
      "street food restaurant Ho Chi Minh City"
    ]
  },
  {
    category: "카페",
    queries: [
      "instagram cafe Ho Chi Minh City",
      "hidden cafe Ho Chi Minh City",
      "specialty coffee Ho Chi Minh City District 1",
      "best cafe Nguyen Hue Ho Chi Minh City",
      "rooftop cafe Ho Chi Minh City"
    ]
  },
  {
    category: "바/루프탑",
    queries: [
      "rooftop bar Ho Chi Minh City",
      "cocktail bar District 1 Ho Chi Minh City",
      "speakeasy bar Ho Chi Minh City",
      "night view bar Ho Chi Minh City"
    ]
  },
  {
    category: "마사지",
    queries: [
      "best massage spa District 1 Ho Chi Minh City",
      "foot massage Ho Chi Minh City District 1",
      "Korean traveler spa Ho Chi Minh City",
      "luxury spa Ho Chi Minh City"
    ]
  },
  {
    category: "사진명소",
    queries: [
      "photo spot Ho Chi Minh City",
      "landmark Ho Chi Minh City District 1",
      "instagram spot Ho Chi Minh City",
      "things to do Ho Chi Minh City"
    ]
  },
  {
    category: "쇼핑",
    queries: [
      "market Ho Chi Minh City District 1",
      "shopping mall Ho Chi Minh City",
      "souvenir shop Ho Chi Minh City",
      "night market Ho Chi Minh City"
    ]
  },
  {
    category: "투어/액티비티",
    queries: [
      "Cu Chi Tunnel tour Ho Chi Minh City",
      "Mekong Delta tour Ho Chi Minh City",
      "motorbike food tour Ho Chi Minh City",
      "cooking class Ho Chi Minh City"
    ]
  }
];

async function main() {
  const env = await loadEnv();
  const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
  }

  const collected = new Map();

  for (const group of searchPlan) {
    for (const query of group.queries) {
      process.stdout.write(`Collecting: ${group.category} / ${query}\n`);
      const places = await searchText(apiKey, query);
      for (const place of places) {
        if (!place.id || !place.displayName?.text) continue;
        const previous = collected.get(place.id);
        const reviews = mergeReviews(previous?.reviews ?? [], normalizeReviews(place.reviews ?? []));
        const sourceQueries = Array.from(new Set([...(previous?.sourceQueries ?? []), query]));
        collected.set(place.id, {
          googlePlaceId: place.id,
          city: city.name,
          name: place.displayName.text,
          category: previous?.category ?? group.category,
          suggestedCategories: Array.from(new Set([...(previous?.suggestedCategories ?? []), group.category])),
          address: place.formattedAddress,
          location: place.location,
          googleMapsUri: place.googleMapsUri,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          priceLevel: place.priceLevel,
          photoName: place.photos?.[0]?.name,
          types: place.types ?? [],
          sourceQueries,
          reviews,
          koreanReviewSignal: analyzeKoreanReviews(reviews, sourceQueries, place.displayName.text),
          curation: {
            oneLine: "",
            koreanTip: "",
            tags: inferTags(group.category, place.types ?? [], query),
            hiddenGem: inferHiddenGem(query),
            beginnerSafe: inferBeginnerSafe(place.userRatingCount),
            rainyDayOk: inferRainyDayOk(group.category),
            bestTime: inferBestTime(group.category),
            priceLevel: normalizePriceLevel(place.priceLevel)
          }
        });
      }
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    city: city.name,
    source: "Google Places API Text Search",
    note: "Google Places 콘텐츠는 정책에 맞게 최신 조회용으로 사용하세요. 앱 영구 큐레이션 문구는 curation 필드에 직접 작성하세요.",
    total: collected.size,
    places: Array.from(collected.values()).sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
    })
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`\nSaved ${result.total} places to ${path.relative(rootDir, outputPath)}\n`);
}

async function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return {};

  const raw = await readFile(envPath, "utf8");
  return raw.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return acc;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    acc[key] = value;
    return acc;
  }, {});
}

async function searchText(apiKey, textQuery) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.types,places.photos,places.reviews"
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "ko",
      regionCode: city.regionCode,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: city.center,
          radius: city.radius
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.places ?? [];
}

function inferTags(category, types, query) {
  const tags = new Set([category]);
  if (query.includes("hidden") || query.includes("local")) tags.add("숨은핫플");
  if (query.includes("instagram") || query.includes("photo")) tags.add("사진맛집");
  if (query.includes("rooftop") || query.includes("night")) tags.add("야경");
  if (types.includes("cafe")) tags.add("카페");
  if (types.includes("restaurant")) tags.add("맛집");
  if (types.includes("spa")) tags.add("마사지");
  if (types.includes("tourist_attraction")) tags.add("관광지");
  return Array.from(tags);
}

function inferHiddenGem(query) {
  return query.includes("hidden") || query.includes("local") || query.includes("speakeasy");
}

function inferBeginnerSafe(userRatingCount) {
  return (userRatingCount ?? 0) >= 500;
}

function inferRainyDayOk(category) {
  return ["맛집", "카페", "마사지", "쇼핑", "바/루프탑"].includes(category);
}

function inferBestTime(category) {
  if (category === "카페") return ["오후"];
  if (category === "바/루프탑") return ["저녁", "밤"];
  if (category === "마사지") return ["오후", "저녁"];
  if (category === "사진명소") return ["오전", "오후"];
  return ["점심", "저녁"];
}

function normalizePriceLevel(priceLevel) {
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return "프리미엄";
  if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  return "보통";
}

function normalizeReviews(reviews) {
  return reviews
    .map((review) => ({
      name: review.name,
      rating: review.rating,
      languageCode: review.originalText?.languageCode ?? review.text?.languageCode,
      text: review.originalText?.text ?? review.text?.text ?? "",
      relativePublishTimeDescription: review.relativePublishTimeDescription,
      publishTime: review.publishTime
    }))
    .filter((review) => review.text || review.rating);
}

function mergeReviews(previous, incoming) {
  const merged = new Map();
  for (const review of [...previous, ...incoming]) {
    const key = review.name || `${review.rating}-${review.text?.slice(0, 80)}`;
    merged.set(key, review);
  }
  return Array.from(merged.values()).slice(0, 12);
}

function analyzeKoreanReviews(reviews, sourceQueries, placeName) {
  const koreanReviews = reviews.filter((review) => isKoreanReview(review));
  const queryText = `${sourceQueries.join(" ")} ${placeName}`.toLowerCase();
  const searchHint = /korean|korea|한국|한식|kimchi|bbq|samgyeopsal|seoul/.test(queryText) ? 18 : 0;
  const positiveKeywords = ["맛있", "친절", "깨끗", "깔끔", "추천", "만족", "가성비", "재방문", "한국인", "위생", "분위기", "마사지", "예약", "편했", "좋았"];
  const cautionKeywords = ["불친절", "바가지", "비싸", "별로", "실망", "위생 별로", "더러", "짜다", "늦", "기대 이하", "냄새", "시끄"];
  const text = koreanReviews.map((review) => review.text).join(" ");
  const positiveCount = countKeywordHits(text, positiveKeywords);
  const cautionCount = countKeywordHits(text, cautionKeywords);
  const averageRating = koreanReviews.length
    ? koreanReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / koreanReviews.length
    : 0;
  const score = clamp(
    Math.round(searchHint + koreanReviews.length * 7 + averageRating * 6 + positiveCount * 4 - cautionCount * 12),
    0,
    100
  );
  const keywords = [...positiveKeywords, ...cautionKeywords].filter((keyword) => text.includes(keyword)).slice(0, 6);

  return {
    score,
    reviewCount: koreanReviews.length,
    positiveCount,
    cautionCount,
    summary: summarizeKoreanSignal(koreanReviews.length, positiveCount, cautionCount, searchHint),
    keywords
  };
}

function isKoreanReview(review) {
  return review.languageCode === "ko" || /[가-힣]/.test(review.text ?? "");
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function summarizeKoreanSignal(reviewCount, positiveCount, cautionCount, searchHint) {
  if (reviewCount > 0 && cautionCount > 0) return "한국어 후기에 장단점이 함께 보여 방문 전 확인 추천";
  if (reviewCount > 0 && positiveCount >= 2) return "한국어 후기에서 긍정 반응이 확인된 후보";
  if (reviewCount > 0) return "한국어 후기가 있어 초행자가 참고하기 쉬운 후보";
  if (searchHint > 0) return "한국인 관련 검색어로 잡힌 후보";
  return "한국어 후기 신호는 아직 약한 후보";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
