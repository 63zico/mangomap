import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const placesPath = path.join(rootDir, "src", "data", "places.ts");
const googlePath = path.join(rootDir, "data", "collected-google-places.json");
const requireFromScript = createRequire(import.meta.url);

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env에 GOOGLE_MAPS_API_KEY 또는 EXPO_PUBLIC_GOOGLE_MAPS_API_KEY가 없습니다.");
}

const places = await loadCuratedPlaces();
const googleData = existsSync(googlePath)
  ? JSON.parse(await readFile(googlePath, "utf8"))
  : { places: [] };
const googleById = new Map((googleData.places ?? []).map((place) => [place.googlePlaceId, place]));
const missingPlaceIds = Array.from(
  new Set(
    places
      .filter((place) => place.googlePlaceId && isGooglePlaceId(place.googlePlaceId) && !place.coordinates)
      .map((place) => place.googlePlaceId)
  )
);

let fetched = 0;
let failed = 0;
const detailsById = new Map();

for (const placeId of missingPlaceIds) {
  const cached = googleById.get(placeId);
  if (cached?.location?.latitude && cached?.location?.longitude) {
    detailsById.set(placeId, {
      formattedAddress: cached.address,
      location: cached.location,
      googleMapsUri: cached.googleMapsUri,
      displayName: cached.name
    });
    continue;
  }

  try {
    const detail = await getPlaceDetail(placeId);
    detailsById.set(placeId, detail);
    fetched += 1;
    process.stdout.write(`Backfilled ${fetched}/${missingPlaceIds.length}: ${detail.displayName ?? placeId}\n`);
  } catch (error) {
    failed += 1;
    process.stderr.write(`Failed ${placeId}: ${error.message}\n`);
  }

  await sleep(45);
}

const updatedPlaces = places.map((place) => {
  if (!place.googlePlaceId || place.coordinates) return place;
  const detail = detailsById.get(place.googlePlaceId);
  if (!detail?.location) return place;

  return {
    ...place,
    address: normalizeAddress(detail.formattedAddress, place.address),
    googleMapsUri: detail.googleMapsUri ?? place.googleMapsUri,
    coordinates: {
      latitude: Number(detail.location.latitude),
      longitude: Number(detail.location.longitude)
    }
  };
});

const updatedGooglePlaces = (googleData.places ?? []).map((place) => {
  if (!place.googlePlaceId) return place;
  const detail = detailsById.get(place.googlePlaceId);
  if (!detail?.location) return place;

  return {
    ...place,
    address: normalizeAddress(detail.formattedAddress, place.address),
    googleMapsUri: detail.googleMapsUri ?? place.googleMapsUri,
    location: {
      latitude: Number(detail.location.latitude),
      longitude: Number(detail.location.longitude)
    }
  };
});

await writeFile(
  placesPath,
  `import type { CuratedPlace } from "../types";

// Google Places API 정보를 기반으로 만든 MVP용 큐레이션 시드입니다.
// 프로덕션에서는 googlePlaceId를 저장하고 평점/영업시간은 최신 조회로 보강하는 구조를 권장합니다.
export const curatedPlaces: CuratedPlace[] = ${JSON.stringify(updatedPlaces, null, 2)};
`,
  "utf8"
);

await writeFile(
  googlePath,
  `${JSON.stringify(
    {
      ...googleData,
      generatedAt: new Date().toISOString(),
      places: updatedGooglePlaces
    },
    null,
    2
  )}\n`,
  "utf8"
);

const unresolved = updatedPlaces.filter((place) => place.googlePlaceId && !place.coordinates).length;
process.stdout.write(
  `${JSON.stringify(
    {
      totalPlaces: updatedPlaces.length,
      missingBefore: missingPlaceIds.length,
      fetched,
      failed,
      unresolved,
      withCoordinates: updatedPlaces.filter((place) => place.coordinates).length
    },
    null,
    2
  )}\n`
);

async function loadCuratedPlaces() {
  const source = await readFile(placesPath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  new Function("exports", "require", "module", "__filename", "__dirname", js)(
    mod.exports,
    (specifier) => {
      if (specifier === "../types") return {};
      return requireFromScript(specifier);
    },
    mod,
    placesPath,
    path.dirname(placesPath)
  );
  return mod.exports.curatedPlaces ?? [];
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

async function getPlaceDetail(placeId) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ko`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,googleMapsUri"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return {
    formattedAddress: data.formattedAddress,
    location: data.location,
    googleMapsUri: data.googleMapsUri,
    displayName: data.displayName?.text
  };
}

function normalizeAddress(nextAddress, fallbackAddress) {
  if (!nextAddress) return fallbackAddress;
  return nextAddress.replace(/\s*베트남\s*$/, "").trim();
}

function isGooglePlaceId(placeId) {
  return /^(ChI|E[A-Za-z0-9_-]|GhI|Ek)/.test(placeId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
