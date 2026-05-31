import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const placesPath = path.join(rootDir, "src", "data", "places.ts");

const cityConfig = {
  호치민: { queryName: "Ho Chi Minh City", center: { latitude: 10.7769, longitude: 106.7009 }, radius: 24000, lat: [10.25, 11.15], lng: [106.15, 107.25] },
  다낭: { queryName: "Da Nang", center: { latitude: 16.0544, longitude: 108.2022 }, radius: 24000, lat: [15.75, 16.35], lng: [107.75, 108.55] },
  나트랑: { queryName: "Nha Trang", center: { latitude: 12.2388, longitude: 109.1967 }, radius: 24000, lat: [11.85, 12.55], lng: [108.85, 109.45] },
  하노이: { queryName: "Hanoi", center: { latitude: 21.0278, longitude: 105.8342 }, radius: 24000, lat: [20.65, 21.45], lng: [105.35, 106.15] },
  달랏: { queryName: "Da Lat", center: { latitude: 11.9404, longitude: 108.4583 }, radius: 22000, lat: [11.75, 12.15], lng: [108.25, 108.65] },
  푸꾸옥: { queryName: "Phu Quoc", center: { latitude: 10.2899, longitude: 103.984 }, radius: 36000, lat: [9.9, 10.55], lng: [103.75, 104.15] }
};

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, value = "true"] = arg.slice(2).split("=");
      return [key, value];
    })
);
const dryRun = args.get("dry-run") === "true";
const limitPerCity = Number(args.get("limit-per-city") ?? 16);
const maxTotal = Number(args.get("max-total") ?? 90);

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
}

const source = await readFile(placesPath, "utf8");
const places = parseCuratedPlaces(source);
const missing = places.filter((place) => !hasCoordinates(place) && cityConfig[place.city]);
const targets = pickTargets(missing, limitPerCity, maxTotal);

const updates = new Map();
const failures = [];

for (const place of targets) {
  try {
    const result = await findBestPlace(place);
    if (!result) {
      failures.push({ name: place.name, city: place.city, reason: "no safe match" });
      continue;
    }
    updates.set(place.id, result);
    process.stdout.write(`OK ${place.city} / ${place.name} -> ${result.displayName} (${result.location.latitude}, ${result.location.longitude})\n`);
  } catch (error) {
    failures.push({ name: place.name, city: place.city, reason: error.message });
    process.stderr.write(`FAIL ${place.city} / ${place.name}: ${error.message}\n`);
  }
  await sleep(90);
}

if (!dryRun && updates.size > 0) {
  const updatedPlaces = places.map((place) => {
    const update = updates.get(place.id);
    if (!update) return place;
    return {
      ...place,
      googlePlaceId: update.id ?? place.googlePlaceId,
      googleMapsUri: update.googleMapsUri ?? place.googleMapsUri,
      address: update.formattedAddress ?? place.address,
      coordinates: {
        latitude: Number(update.location.latitude),
        longitude: Number(update.location.longitude)
      },
      photoName: update.photoName ?? place.photoName,
      rating: typeof update.rating === "number" ? update.rating : place.rating,
      userRatingCount: typeof update.userRatingCount === "number" ? update.userRatingCount : place.userRatingCount
    };
  });

  const serializedPlaces = JSON.stringify(JSON.stringify(updatedPlaces));
  const nextSource = source.replace(
    /const curatedPlacesJson = "([\s\S]*)";\n\nexport const curatedPlaces/,
    `const curatedPlacesJson = ${serializedPlaces};\n\nexport const curatedPlaces`
  );
  await writeFile(placesPath, nextSource, "utf8");
}

const unresolvedAfter = places.filter((place) => !hasCoordinates(place)).length - updates.size;
process.stdout.write(
  `${JSON.stringify(
    {
      dryRun,
      targetCount: targets.length,
      updated: updates.size,
      failed: failures.length,
      unresolvedAfter,
      failures: failures.slice(0, 20)
    },
    null,
    2
  )}\n`
);

function parseCuratedPlaces(sourceText) {
  const match = sourceText.match(/const curatedPlacesJson = "([\s\S]*)";\n\nexport const curatedPlaces/);
  if (!match) throw new Error("curatedPlacesJson을 찾지 못했습니다.");
  return JSON.parse(JSON.parse(`"${match[1]}"`));
}

function pickTargets(items, perCity, totalLimit) {
  const targets = [];
  for (const city of Object.keys(cityConfig)) {
    const cityItems = items
      .filter((place) => place.city === city)
      .sort((left, right) => scoreMissingPlace(right) - scoreMissingPlace(left));
    targets.push(...cityItems.slice(0, perCity));
  }
  return targets.slice(0, totalLimit);
}

function scoreMissingPlace(place) {
  let score = 0;
  if (place.category === "맛집") score += 30;
  if (place.category === "카페") score += 20;
  if (place.category === "마사지") score += 16;
  if (place.category === "바/루프탑") score += 14;
  if (place.tags?.includes("지역대표")) score += 18;
  if (place.tags?.includes("지도추천")) score += 18;
  if (place.tags?.includes("한국인취향")) score += 12;
  if (place.beginnerSafe) score += 8;
  score += Math.min(Number(place.userRatingCount ?? 0) / 100, 20);
  score += Number(place.rating ?? 0);
  return score;
}

async function findBestPlace(place) {
  const config = cityConfig[place.city];
  const textQuery = `${stripDecorativeText(place.name)} ${config.queryName} Vietnam`;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.photos,places.types"
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: 5,
      locationBias: {
        circle: {
          center: config.center,
          radius: config.radius
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places request failed (${response.status}): ${body.slice(0, 220)}`);
  }

  const data = await response.json();
  const candidates = (data.places ?? [])
    .filter((item) => item.location && isInsideCity(place.city, item.location.latitude, item.location.longitude))
    .map((item) => ({
      ...item,
      score: scoreSearchResult(place, item)
    }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best || best.score < 20) return undefined;

  return {
    id: best.id,
    displayName: best.displayName?.text,
    formattedAddress: best.formattedAddress,
    location: best.location,
    googleMapsUri: best.googleMapsUri,
    rating: best.rating,
    userRatingCount: best.userRatingCount,
    photoName: best.photos?.[0]?.name
  };
}

function scoreSearchResult(place, result) {
  const source = normalizeForMatch(place.name);
  const target = normalizeForMatch(result.displayName?.text ?? "");
  let score = 0;
  if (source && target) {
    if (source === target) score += 80;
    if (target.includes(source) || source.includes(target)) score += 46;
    const sourceTokens = new Set(source.split(" ").filter((token) => token.length >= 2));
    const targetTokens = new Set(target.split(" ").filter((token) => token.length >= 2));
    for (const token of sourceTokens) {
      if (targetTokens.has(token)) score += 8;
    }
  }
  if (result.rating) score += Math.min(result.rating, 5);
  if (result.userRatingCount) score += Math.min(result.userRatingCount / 300, 18);
  return score;
}

function hasCoordinates(place) {
  return typeof place.coordinates?.latitude === "number" && typeof place.coordinates?.longitude === "number";
}

function isInsideCity(city, latitude, longitude) {
  const config = cityConfig[city];
  return latitude >= config.lat[0] && latitude <= config.lat[1] && longitude >= config.lng[0] && longitude <= config.lng[1];
}

function stripDecorativeText(value) {
  return String(value)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[|·•].*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForMatch(value) {
  return stripDecorativeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
