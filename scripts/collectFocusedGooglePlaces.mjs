import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "data", "collected-google-places.json");

const city = {
  name: "호치민",
  regionCode: "VN",
  center: { latitude: 10.7769, longitude: 106.7009 },
  radius: 18000
};

const focusedSearches = [
  { category: "맛집", query: "BBQ restaurant Ho Chi Minh City District 1" },
  { category: "맛집", query: "Korean BBQ Ho Chi Minh City" },
  { category: "맛집", query: "vegetarian restaurant Ho Chi Minh City District 1" },
  { category: "맛집", query: "brunch restaurant Ho Chi Minh City District 1" },
  { category: "카페", query: "study cafe Ho Chi Minh City" },
  { category: "카페", query: "work friendly cafe Ho Chi Minh City" },
  { category: "카페", query: "quiet cafe laptop Ho Chi Minh City" },
  { category: "카페", query: "dessert cafe Ho Chi Minh City" },
  { category: "카페", query: "roastery specialty coffee Ho Chi Minh City" },
  { category: "바/루프탑", query: "nightclub Ho Chi Minh City" },
  { category: "바/루프탑", query: "dance club Ho Chi Minh City" },
  { category: "바/루프탑", query: "DJ club Ho Chi Minh City" }
];

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
}

const existing = existsSync(outputPath)
  ? JSON.parse(await readFile(outputPath, "utf8"))
  : { generatedAt: "", city: city.name, source: "Google Places API Text Search", total: 0, places: [] };

const collected = new Map((existing.places ?? []).map((place) => [place.googlePlaceId, place]));

for (const item of focusedSearches) {
  process.stdout.write(`Focused Google search: ${item.category} / ${item.query}\n`);
  const places = await searchText(apiKey, item.query);
  for (const place of places) {
    if (!place.id || !place.displayName?.text) continue;
    const previous = collected.get(place.id);
    collected.set(place.id, {
      ...(previous ?? {}),
      googlePlaceId: place.id,
      city: city.name,
      name: place.displayName.text,
      category: previous?.category ?? item.category,
      suggestedCategories: Array.from(new Set([...(previous?.suggestedCategories ?? []), item.category])),
      address: place.formattedAddress ?? previous?.address,
      location: place.location ?? previous?.location,
      googleMapsUri: place.googleMapsUri ?? previous?.googleMapsUri,
      rating: place.rating ?? previous?.rating,
      userRatingCount: place.userRatingCount ?? previous?.userRatingCount,
      priceLevel: place.priceLevel ?? previous?.priceLevel,
      photoName: place.photos?.[0]?.name ?? previous?.photoName,
      types: Array.from(new Set([...(previous?.types ?? []), ...(place.types ?? [])])),
      sourceQueries: Array.from(new Set([...(previous?.sourceQueries ?? []), item.query])),
      reviews: previous?.reviews ?? [],
      koreanReviewSignal: previous?.koreanReviewSignal ?? {
        score: 0,
        reviewCount: 0,
        positiveCount: 0,
        cautionCount: 0,
        summary: "Google Places 검색으로 추가한 후보",
        keywords: []
      },
      curation: {
        ...(previous?.curation ?? {}),
        tags: Array.from(new Set([...(previous?.curation?.tags ?? []), ...inferFocusedTags(item.category, item.query, place)])),
        hiddenGem: previous?.curation?.hiddenGem ?? item.query.toLowerCase().includes("quiet"),
        beginnerSafe: previous?.curation?.beginnerSafe ?? true,
        rainyDayOk: previous?.curation?.rainyDayOk ?? item.category === "카페",
        bestTime: previous?.curation?.bestTime ?? inferBestTime(item.category, item.query),
        priceLevel: previous?.curation?.priceLevel ?? normalizePriceLevel(place.priceLevel)
      }
    });
  }
}

const places = Array.from(collected.values()).sort((a, b) => {
  const categoryCompare = String(a.category).localeCompare(String(b.category), "ko");
  if (categoryCompare !== 0) return categoryCompare;
  return (b.rating ?? 0) - (a.rating ?? 0) || (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
});

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      ...existing,
      generatedAt: new Date().toISOString(),
      city: city.name,
      source: "Google Places API Text Search",
      note: "기존 Google Places 후보에 키워드별 부족분을 focused search로 보강했습니다.",
      total: places.length,
      places
    },
    null,
    2
  )}\n`,
  "utf8"
);

process.stdout.write(`Saved ${places.length} Google candidates to ${path.relative(rootDir, outputPath)}\n`);

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
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.types,places.photos"
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

function inferFocusedTags(category, query, place) {
  const text = `${query} ${place.displayName?.text ?? ""} ${(place.types ?? []).join(" ")}`.toLowerCase();
  const tags = new Set([category]);
  if (/korean/.test(text)) tags.add("한식당");
  if (/bbq|barbecue|grill/.test(text)) tags.add("고기");
  if (/vegetarian|vegan|chay/.test(text)) tags.add("채식가능");
  if (/brunch|breakfast/.test(text)) tags.add("브런치");
  if (/study|work|laptop|quiet/.test(text)) tags.add("작업카페");
  if (/study|laptop/.test(text)) tags.add("노트북가능");
  if (/dessert|cake|bakery|ice cream/.test(text)) tags.add("디저트");
  if (/roastery|specialty|coffee/.test(text)) tags.add("커피맛집");
  if (/nightclub|dance club|dj club|club/.test(text)) tags.add("클럽");
  if (/dj|dance/.test(text)) tags.add("DJ");
  return Array.from(tags);
}

function inferBestTime(category, query) {
  if (category === "맛집") return query.toLowerCase().includes("brunch") ? ["오전", "점심"] : ["점심", "저녁"];
  if (category === "카페") return ["오후", "저녁"];
  if (category === "바/루프탑") return ["저녁", "밤"];
  return ["오후"];
}

function normalizePriceLevel(priceLevel) {
  if (priceLevel === "PRICE_LEVEL_INEXPENSIVE") return "저렴";
  if (priceLevel === "PRICE_LEVEL_EXPENSIVE" || priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE") return "프리미엄";
  return "보통";
}
