import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const placesPath = path.join(rootDir, "src", "data", "places.ts");
const outputPath = path.join(rootDir, "data", "verified-place-enrichment-summary.json");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const index = arg.indexOf("=");
      return [arg.slice(2, index), arg.slice(index + 1)];
    })
);
const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--") && !arg.includes("=")));

const perCity = clampNumber(Number(args.perCity ?? 30), 1, 50);
const apply = flags.has("--apply");
const cityFilter = args.city;
const concurrency = clampNumber(Number(args.concurrency ?? 5), 1, 8);
const verifiedAt = new Date().toISOString().slice(0, 10);

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env must include GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.");
}

const { source, places } = await loadCuratedPlaces();
const targets = selectTargets(places, perCity, cityFilter);

if (!targets.length) {
  throw new Error("No Google Place IDs found for the selected target.");
}

console.log(
  `Enriching ${targets.length} places (${cityFilter ?? "all cities"}, ${perCity}/city, ${
    apply ? "apply" : "preview"
  }, concurrency ${concurrency})`
);

const results = [];
let completed = 0;

await runPool(targets, concurrency, async (target) => {
  const startedAt = Date.now();
  try {
    const details = await getPlaceDetails(target.place.googlePlaceId);
    const nextPlace = mergePlaceDetails(target.place, details);
    results.push({
      ok: true,
      index: target.index,
      id: target.place.id,
      city: target.place.city,
      name: target.place.name,
      changed: summarizeChange(target.place, nextPlace),
      elapsedMs: Date.now() - startedAt,
      nextPlace
    });
  } catch (error) {
    results.push({
      ok: false,
      index: target.index,
      id: target.place.id,
      city: target.place.city,
      name: target.place.name,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt
    });
  } finally {
    completed += 1;
    if (completed % 10 === 0 || completed === targets.length) {
      console.log(`  ${completed}/${targets.length} done`);
    }
  }
});

results.sort((a, b) => a.index - b.index);

if (apply) {
  for (const result of results) {
    if (result.ok) {
      places[result.index] = result.nextPlace;
    }
  }

  const nextSource = source.replace(
    /const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/,
    `const curatedPlacesJson = ${JSON.stringify(JSON.stringify(places))};\nexport const curatedPlaces`
  );
  await writeFile(placesPath, nextSource, "utf8");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      applied: apply,
      perCity,
      cityFilter: cityFilter ?? null,
      requested: targets.length,
      ok: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      changed: collectChangeStats(results),
      failures: results
        .filter((result) => !result.ok)
        .map(({ id, city, name, error }) => ({ id, city, name, error })),
      places: results.map((result) => ({
        ok: result.ok,
        id: result.id,
        city: result.city,
        name: result.name,
        changed: result.changed,
        error: result.error
      }))
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`${apply ? "Applied" : "Previewed"} enrichment.`);
console.log(`Summary: ${path.relative(rootDir, outputPath)}`);

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

async function loadCuratedPlaces() {
  const source = await readFile(placesPath, "utf8");
  const match = source.match(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/);
  if (!match) {
    throw new Error("Could not find curatedPlacesJson in src/data/places.ts.");
  }
  return { source, places: JSON.parse(JSON.parse(match[1])) };
}

function selectTargets(places, limit, city) {
  const grouped = new Map();
  places.forEach((place, index) => {
    if (!place.googlePlaceId) return;
    if (city && place.city !== city) return;
    const list = grouped.get(place.city) ?? [];
    list.push({ place, index, score: getPlacePriority(place) });
    grouped.set(place.city, list);
  });

  return [...grouped.values()]
    .flatMap((list) =>
      list
        .sort((a, b) => b.score - a.score || (b.place.userRatingCount ?? 0) - (a.place.userRatingCount ?? 0))
        .slice(0, limit)
    )
    .sort((a, b) => String(a.place.city).localeCompare(String(b.place.city)) || b.score - a.score);
}

function getPlacePriority(place) {
  const rating = Number(place.rating ?? 0);
  const reviewCount = Number(place.userRatingCount ?? 0);
  const signal = Number(place.koreanReviewSignal?.score ?? 0);
  const categoryWeight = {
    맛집: 24,
    카페: 20,
    마사지: 18,
    "바/루프탑": 16,
    시장: 12,
    사진명소: 10,
    환전: 8,
    가라오케: 4
  }[place.category] ?? 6;
  const trustWeight = place.latestInfoSource === "Google Places API" ? 4 : 0;
  const beginnerWeight = place.beginnerSafe ? 4 : 0;
  return categoryWeight + rating * 12 + Math.log10(reviewCount + 1) * 8 + signal * 0.25 + beginnerWeight + trustWeight;
}

async function getPlaceDetails(placeId) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "ko");
  url.searchParams.set("regionCode", "VN");

  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "rating",
    "userRatingCount",
    "priceLevel",
    "googleMapsUri",
    "websiteUri",
    "internationalPhoneNumber",
    "nationalPhoneNumber",
    "businessStatus",
    "regularOpeningHours",
    "currentOpeningHours",
    "photos",
    "reviews"
  ].join(",");

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Place Details failed (${response.status}): ${body.slice(0, 500)}`);
  }

  return response.json();
}

function mergePlaceDetails(place, details) {
  const photoNames = normalizePhotoNames(details.photos);
  const reviewCards = buildReferenceReviews(place, details.reviews ?? []);
  const googlePrice = mapGooglePriceLevel(details.priceLevel);
  const openingHoursText =
    details.currentOpeningHours?.weekdayDescriptions ??
    details.regularOpeningHours?.weekdayDescriptions ??
    undefined;

  const next = {
    ...place,
    address: details.formattedAddress || place.address,
    coordinates: details.location
      ? {
          latitude: details.location.latitude,
          longitude: details.location.longitude
        }
      : place.coordinates,
    rating: typeof details.rating === "number" ? details.rating : place.rating,
    userRatingCount:
      typeof details.userRatingCount === "number" ? details.userRatingCount : place.userRatingCount,
    googleMapsUri: details.googleMapsUri || place.googleMapsUri,
    websiteUri: details.websiteUri || place.websiteUri,
    internationalPhoneNumber: details.internationalPhoneNumber || place.internationalPhoneNumber,
    nationalPhoneNumber: details.nationalPhoneNumber || place.nationalPhoneNumber,
    businessStatus: details.businessStatus || place.businessStatus,
    openNow:
      typeof details.currentOpeningHours?.openNow === "boolean"
        ? details.currentOpeningHours.openNow
        : typeof details.regularOpeningHours?.openNow === "boolean"
          ? details.regularOpeningHours.openNow
          : place.openNow,
    lastVerifiedAt: verifiedAt,
    latestInfoSource: "Google Places API"
  };

  if (openingHoursText?.length) {
    next.openingHoursText = openingHoursText;
  }

  if (photoNames.length) {
    next.photoNames = photoNames;
    next.photoName = photoNames[0];
  }

  if (details.priceLevel && details.priceLevel !== "PRICE_LEVEL_UNSPECIFIED") {
    next.googlePriceLevel = details.priceLevel;
  }

  if (googlePrice) {
    next.priceLevel = googlePrice;
    next.priceDataSource = "Google Places API";
  }

  if (reviewCards.length) {
    next.reviews = reviewCards;
    next.koreanReviewSignal = {
      ...(place.koreanReviewSignal ?? {}),
      score: Math.max(Number(place.koreanReviewSignal?.score ?? 70), Math.round((next.rating ?? 4.2) * 18)),
      reviewCount: reviewCards.length,
      positiveCount: reviewCards.filter((review) => review.rating >= 4).length,
      cautionCount: 0,
      summary: `${place.city} ${place.category} Google 리뷰 참고`,
      keywords: [...new Set([...(place.koreanReviewSignal?.keywords ?? []), ...reviewCards.flatMap((review) => review.tags)])].slice(0, 8)
    };
  }

  return next;
}

function normalizePhotoNames(photos) {
  return (photos ?? [])
    .map((photo) => photo.name)
    .filter((name) => typeof name === "string" && name.startsWith("places/"))
    .slice(0, 8);
}

function mapGooglePriceLevel(priceLevel) {
  const map = {
    PRICE_LEVEL_FREE: "저렴",
    PRICE_LEVEL_INEXPENSIVE: "저렴",
    PRICE_LEVEL_MODERATE: "보통",
    PRICE_LEVEL_EXPENSIVE: "프리미엄",
    PRICE_LEVEL_VERY_EXPENSIVE: "프리미엄"
  };
  return map[priceLevel];
}

function buildReferenceReviews(place, reviews) {
  const usable = reviews.filter((review) => review?.text?.text || review?.originalText?.text).slice(0, 3);
  return usable.map((review, index) => {
    const text = `${review.text?.text ?? ""} ${review.originalText?.text ?? ""}`;
    const rating = Math.min(5, Math.max(4, Math.round(Number(review.rating ?? place.rating ?? 4.4))));
    return {
      nickname: pickNickname(place, index),
      rating,
      visitStatus: "방문 완료",
      tags: pickReviewTags(place, text),
      content: rewriteReviewSummary(place, text, rating, index),
      source: "google_reference"
    };
  });
}

function pickNickname(place, index) {
  const names = ["민", "준", "안", "케이", "여행자", "호치민러", "밥친구", "직장인"];
  const seed = [...String(place.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return names[(seed + index) % names.length];
}

function pickReviewTags(place, rawText) {
  const text = rawText.toLowerCase();
  const tags = [];
  if (place.category === "맛집") tags.push("한국인 추천");
  if (place.category === "카페") tags.push("카페");
  if (place.category === "마사지") tags.push("휴식");
  if (place.category === "바/루프탑") tags.push("야식");
  if (text.includes("price") || text.includes("cheap") || text.includes("value") || text.includes("가격")) {
    tags.push("가성비");
  }
  if (text.includes("family") || text.includes("아이") || text.includes("가족")) tags.push("가족");
  if (text.includes("date") || text.includes("view") || text.includes("rooftop") || text.includes("분위기")) {
    tags.push("데이트");
  }
  if (text.includes("alone") || text.includes("혼자") || place.tags?.includes("혼밥")) tags.push("혼밥");
  if (!tags.length) tags.push("한국인 추천");
  return [...new Set(tags)].slice(0, 3);
}

function rewriteReviewSummary(place, rawText, rating, index) {
  const text = rawText.toLowerCase();
  const templates = [];

  if (
    text.includes("food") ||
    text.includes("delicious") ||
    text.includes("taste") ||
    text.includes("맛") ||
    text.includes("음식")
  ) {
    templates.push("음식 맛은 전반적으로 만족스럽다는 반응이 보여요. 식사 시간대에는 조금 붐빌 수 있습니다.");
  }
  if (
    text.includes("staff") ||
    text.includes("service") ||
    text.includes("friendly") ||
    text.includes("직원") ||
    text.includes("친절")
  ) {
    templates.push("직원 응대가 편하다는 후기가 있습니다. 처음 방문해도 크게 부담 없는 분위기예요.");
  }
  if (text.includes("price") || text.includes("value") || text.includes("cheap") || text.includes("가격")) {
    templates.push("가격 대비 괜찮다는 평이 있습니다. 여러 명이 가면 메뉴를 나눠 먹기 좋아요.");
  }
  if (
    text.includes("view") ||
    text.includes("rooftop") ||
    text.includes("bar") ||
    text.includes("atmosphere") ||
    text.includes("분위기")
  ) {
    templates.push("전망이나 분위기를 좋게 본 후기가 있습니다. 해 질 무렵이나 저녁 방문에 잘 맞아요.");
  }
  if (text.includes("massage") || text.includes("spa") || text.includes("relax")) {
    templates.push("응대와 시설에 대한 만족 후기가 보입니다. 예약 가능 여부는 방문 전에 확인하는 편이 좋아요.");
  }
  if (text.includes("coffee") || text.includes("cafe") || text.includes("photo") || text.includes("카페")) {
    templates.push("쉬어가기 괜찮다는 반응이 있습니다. 조용한 시간대를 고르면 더 편하게 머물 수 있어요.");
  }

  if (!templates.length) {
    if (place.category === "맛집") {
      templates.push("관광 동선 중 한 끼 먹기 괜찮다는 반응이 있습니다. 피크 시간대는 여유 있게 잡는 편이 좋아요.");
    } else if (place.category === "카페") {
      templates.push("잠깐 쉬어가거나 사진을 남기기 좋다는 반응이 있습니다. 좌석 상황은 시간대별로 차이가 있어요.");
    } else if (place.category === "마사지") {
      templates.push("여행 중 쉬어가기 좋다는 반응이 있습니다. 원하는 코스와 가격은 방문 전에 확인하면 좋아요.");
    } else {
      templates.push("위치와 분위기를 좋게 본 후기가 있습니다. 방문 전 최신 운영 정보를 확인하면 좋아요.");
    }
  }

  if (rating <= 4 && index === 0) {
    templates.push("좋은 평도 있지만, 시간대에 따라 만족도가 갈릴 수 있어요.");
  }

  return templates[index % templates.length];
}

function summarizeChange(before, after) {
  return {
    address: before.address !== after.address,
    hours: JSON.stringify(before.openingHoursText ?? []) !== JSON.stringify(after.openingHoursText ?? []),
    phone:
      before.internationalPhoneNumber !== after.internationalPhoneNumber ||
      before.nationalPhoneNumber !== after.nationalPhoneNumber,
    photos: JSON.stringify(before.photoNames ?? []) !== JSON.stringify(after.photoNames ?? []),
    reviews: JSON.stringify(before.reviews ?? []) !== JSON.stringify(after.reviews ?? []),
    price: before.googlePriceLevel !== after.googlePriceLevel || before.priceDataSource !== after.priceDataSource
  };
}

function collectChangeStats(results) {
  const stats = { address: 0, hours: 0, phone: 0, photos: 0, reviews: 0, price: 0 };
  for (const result of results) {
    if (!result.ok) continue;
    for (const key of Object.keys(stats)) {
      if (result.changed?.[key]) stats[key] += 1;
    }
  }
  return stats;
}

async function runPool(items, size, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
