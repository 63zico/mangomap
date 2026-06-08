import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const placesPath = path.join(rootDir, "src", "data", "places.ts");
const outputPath = path.join(rootDir, "data", "google-photo-refresh-summary.json");

const flags = new Set(process.argv.slice(2));
const apply = flags.has("--apply");
const allCategories = flags.has("--all");
const concurrency = 6;

const env = await loadEnv();
const apiKey = env.GOOGLE_MAPS_API_KEY || env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(".env must include GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.");
}

const { source, places } = await loadPlaces();
const targets = places
  .map((place, index) => ({ place, index }))
  .filter(({ place }) => place.googlePlaceId)
  .filter(({ place }) => allCategories || place.category === "맛집");

console.log(`Refreshing Google photos for ${targets.length} ${allCategories ? "places" : "restaurant places"} (${apply ? "apply" : "preview"})`);

const results = [];
let cursor = 0;
let done = 0;

await Promise.all(
  Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (cursor < targets.length) {
      const target = targets[cursor];
      cursor += 1;
      const result = await refreshOne(target);
      results.push(result);
      done += 1;
      if (done % 50 === 0 || done === targets.length) {
        console.log(`  ${done}/${targets.length} done`);
      }
    }
  })
);

results.sort((a, b) => a.index - b.index);

if (apply) {
  for (const result of results) {
    if (!result.ok || !result.photoNames.length) continue;
    const place = places[result.index];
    place.photoNames = result.photoNames;
    place.photoName = result.photoNames[0];
    if (result.googlePlaceId) {
      place.googlePlaceId = result.googlePlaceId;
    }
    place.latestInfoSource = place.latestInfoSource ?? "Google Places API";
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
      allCategories,
      requested: targets.length,
      ok: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      resolvedByDetails: results.filter((result) => result.ok && result.resolvedBy === "details").length,
      resolvedByDetailsTextSearch: results.filter((result) => result.ok && result.resolvedBy === "details_text_search").length,
      resolvedByTextSearch: results.filter((result) => result.ok && result.resolvedBy === "text_search").length,
      withPhotos: results.filter((result) => result.ok && result.photoNames.length).length,
      noPhotos: results.filter((result) => result.ok && !result.photoNames.length).length,
      failures: results.filter((result) => !result.ok).map(({ id, city, name, error }) => ({ id, city, name, error }))
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`${apply ? "Applied" : "Previewed"} photo refresh.`);
console.log(`Summary: ${path.relative(rootDir, outputPath)}`);

async function refreshOne({ place, index }) {
  try {
    let detailsError = null;
    let detailsPhotoNames = [];
    let detailsPlaceId = place.googlePlaceId;
    if (place.googlePlaceId && !String(place.googlePlaceId).startsWith("manual-")) {
      try {
        const details = await fetchPlaceDetails(place.googlePlaceId);
        detailsPhotoNames = getPhotoNames(details);
        detailsPlaceId = details.id ?? place.googlePlaceId;
        if (detailsPhotoNames.length >= 10) {
          return {
            ok: true,
            index,
            id: place.id,
            city: place.city,
            name: place.name,
            googlePlaceId: detailsPlaceId,
            photoNames: detailsPhotoNames,
            resolvedBy: "details"
          };
        }
      } catch (error) {
        detailsError = error;
      }
    }

    const searched = await searchPlacePhotos(place, detailsError);
    const searchedPhotoNames = getPhotoNames(searched);
    const photoNames = Array.from(new Set([...detailsPhotoNames, ...searchedPhotoNames])).slice(0, 10);

    return {
      ok: true,
      index,
      id: place.id,
      city: place.city,
      name: place.name,
      googlePlaceId: searched.id ?? detailsPlaceId,
      photoNames,
      resolvedBy: detailsPhotoNames.length ? "details_text_search" : "text_search"
    };
  } catch (error) {
    return {
      ok: false,
      index,
      id: place.id,
      city: place.city,
      name: place.name,
      photoNames: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function fetchPlaceDetails(placeId) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "ko");
  url.searchParams.set("regionCode", "VN");
  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,photos"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google photo fetch failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json();
}

async function searchPlacePhotos(place, detailsError = null) {
  const textQuery = buildTextQuery(place);
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.photos,places.displayName,places.formattedAddress"
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: 1
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const prefix = detailsError instanceof Error ? `${detailsError.message}; ` : "";
    throw new Error(`${prefix}Google text search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const [firstPlace] = data.places ?? [];
  if (!firstPlace) {
    const prefix = detailsError instanceof Error ? `${detailsError.message}; ` : "";
    throw new Error(`${prefix}Google text search returned no result for "${textQuery}".`);
  }
  return firstPlace;
}

function getPhotoNames(details) {
  return (details.photos ?? [])
    .map((photo) => photo.name)
    .filter((name) => typeof name === "string" && name.startsWith("places/"))
    .slice(0, 10);
}

function buildTextQuery(place) {
  return [place.name, place.address, place.city, "Vietnam"].filter(Boolean).join(" ");
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

async function loadPlaces() {
  const source = await readFile(placesPath, "utf8");
  const match = source.match(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/);
  if (!match) throw new Error("Could not find curatedPlacesJson in src/data/places.ts.");
  return { source, places: JSON.parse(JSON.parse(match[1])) };
}
