import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const placesPath = path.join(rootDir, "src", "data", "places.ts");
const outputPath = path.join(rootDir, "data", "place-details-preview.json");

const args = new Set(process.argv.slice(2));
const limitArg = getArgValue("--limit");
const cityArg = getArgValue("--city");
const apply = args.has("--apply");
const limit = Math.min(Math.max(Number(limitArg ?? 10), 1), 30);

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
}

const places = await loadCuratedPlaces();
const targets = places
  .filter((place) => place.googlePlaceId)
  .filter((place) => !cityArg || place.city === cityArg)
  .slice(0, limit);

if (!targets.length) {
  throw new Error("보강할 장소가 없습니다. --city 값을 확인하세요.");
}

process.stdout.write(
  `Google Places 실제정보 보강: ${targets.length}곳 (${apply ? "apply mode" : "preview mode"})\n`
);

const enriched = [];

for (const place of targets) {
  process.stdout.write(`- ${place.city} / ${place.name}\n`);
  const details = await getPlaceDetails(place.googlePlaceId);
  enriched.push({
    id: place.id,
    city: place.city,
    name: place.name,
    googlePlaceId: place.googlePlaceId,
    previous: {
      address: place.address,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      photoName: place.photoName,
      googleMapsUri: place.googleMapsUri
    },
    latest: normalizeDetails(details),
    checkedAt: new Date().toISOString()
  });
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "Google Places API Place Details",
      mode: apply ? "apply" : "preview",
      note:
        "리뷰 원문과 Google 사진 파일은 앱에 복사 저장하지 말고, 구조화 정보와 photo resource name만 저장하세요.",
      total: enriched.length,
      places: enriched
    },
    null,
    2
  )}\n`,
  "utf8"
);

process.stdout.write(`\nSaved preview to ${path.relative(rootDir, outputPath)}\n`);

if (apply) {
  process.stdout.write(
    "주의: --apply는 아직 places.ts 자동 반영을 하지 않습니다. 먼저 preview를 검수한 뒤 승인된 필드만 반영하세요.\n"
  );
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

async function loadCuratedPlaces() {
  const source = await readFile(placesPath, "utf8");
  const match = source.match(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/);
  if (!match) throw new Error("src/data/places.ts에서 curatedPlacesJson을 찾지 못했습니다.");
  return JSON.parse(JSON.parse(match[1]));
}

async function getPlaceDetails(placeId) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "ko");
  url.searchParams.set("regionCode", "VN");

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
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
        "photos"
      ].join(",")
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Place Details failed (${response.status}): ${body}`);
  }

  return response.json();
}

function normalizeDetails(details) {
  return {
    name: details.displayName?.text,
    address: details.formattedAddress,
    coordinates: details.location
      ? {
          latitude: details.location.latitude,
          longitude: details.location.longitude
        }
      : undefined,
    rating: details.rating,
    userRatingCount: details.userRatingCount,
    priceLevel: details.priceLevel,
    googleMapsUri: details.googleMapsUri,
    websiteUri: details.websiteUri,
    internationalPhoneNumber: details.internationalPhoneNumber,
    nationalPhoneNumber: details.nationalPhoneNumber,
    businessStatus: details.businessStatus,
    openingHoursText:
      details.currentOpeningHours?.weekdayDescriptions ??
      details.regularOpeningHours?.weekdayDescriptions ??
      [],
    openNow: details.currentOpeningHours?.openNow,
    photoNames: (details.photos ?? []).slice(0, 8).map((photo) => photo.name).filter(Boolean)
  };
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}
