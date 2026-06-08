import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PLACES_PATH = path.join(ROOT, "src", "data", "places.ts");
const DATA_DIR = path.join(ROOT, "data");
const CACHE_PATH = path.join(DATA_DIR, "place-operational-details-cache.json");
const SUMMARY_PATH = path.join(DATA_DIR, "place-operational-enrichment-summary.json");

const FIELD_MASK = [
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
].join(",");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const refresh = args.has("--refresh");

const getArgValue = (prefix, fallback = "") => {
  const hit = [...args].find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

const limitArg = getArgValue("--limit=");
const cityArg = getArgValue("--city=");
const concurrency = Math.max(1, Number(getArgValue("--concurrency=", "4")) || 4);
const limit = limitArg ? Math.max(1, Number(limitArg) || 1) : Infinity;

const today = new Date().toISOString().slice(0, 10);

const parseEnv = async () => {
  const envPath = path.join(ROOT, ".env");
  try {
    const text = await readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // The script can still run with shell-provided env vars.
  }
};

const readJsonFile = async (filePath, fallback) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const extractPlaces = async () => {
  const source = await readFile(PLACES_PATH, "utf8");
  const match = source.match(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/);
  if (!match) throw new Error("Could not find curatedPlacesJson in src/data/places.ts");
  const encodedJsonString = JSON.parse(match[1]);
  return { source, places: JSON.parse(encodedJsonString) };
};

const writePlaces = async (source, places) => {
  const encoded = JSON.stringify(JSON.stringify(places));
  const next = source.replace(/const curatedPlacesJson = ([\s\S]*?);\s*export const curatedPlaces/, `const curatedPlacesJson = ${encoded};\n\nexport const curatedPlaces`);
  await writeFile(PLACES_PATH, next, "utf8");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPlaceDetails = async (apiKey, googlePlaceId, attempt = 1) => {
  const resourceName = String(googlePlaceId).startsWith("places/") ? googlePlaceId : `places/${googlePlaceId}`;
  const url = new URL(`https://places.googleapis.com/v1/${resourceName}`);
  url.searchParams.set("languageCode", "ko");
  url.searchParams.set("regionCode", "VN");

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(700 * attempt * attempt);
    return fetchPlaceDetails(apiKey, googlePlaceId, attempt + 1);
  }

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${body.slice(0, 220)}`);
  }
  return JSON.parse(body);
};

const mapGooglePrice = (priceLevel) => {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":
      return "저렴";
    case "PRICE_LEVEL_MODERATE":
      return "보통";
    case "PRICE_LEVEL_EXPENSIVE":
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "프리미엄";
    default:
      return "";
  }
};

const uniq = (values) => [...new Set(values.filter(Boolean))];

const normalizePhotoNames = (details) => {
  const names = (details.photos || [])
    .map((photo) => photo?.name)
    .filter((name) => typeof name === "string" && name.startsWith("places/"));
  return uniq(names).slice(0, 10);
};

const getOpeningHours = (details) => {
  const current = details.currentOpeningHours?.weekdayDescriptions;
  const regular = details.regularOpeningHours?.weekdayDescriptions;
  const hours = Array.isArray(current) && current.length ? current : regular;
  return Array.isArray(hours) ? hours.filter(Boolean) : [];
};

const getOpenNow = (details) => {
  if (typeof details.currentOpeningHours?.openNow === "boolean") return details.currentOpeningHours.openNow;
  if (typeof details.regularOpeningHours?.openNow === "boolean") return details.regularOpeningHours.openNow;
  return undefined;
};

const hasOperationalGap = (place) => {
  const missingHours = !Array.isArray(place.openingHoursText) || place.openingHoursText.length === 0;
  const missingPhone = !place.nationalPhoneNumber && !place.internationalPhoneNumber;
  const missingWebsite = !place.websiteUri;
  const missingPrice = !place.googlePriceLevel && !place.priceDataSource;
  const missingPhotos = !Array.isArray(place.photoNames) || place.photoNames.length < 2;
  return missingHours || missingPhone || missingWebsite || missingPrice || missingPhotos;
};

const mergeDetails = (place, details) => {
  const next = { ...place };
  const changed = [];

  const setIfActual = (key, value) => {
    if (value === undefined || value === null || value === "") return;
    if (JSON.stringify(next[key]) !== JSON.stringify(value)) {
      next[key] = value;
      changed.push(key);
    }
  };

  setIfActual("address", details.formattedAddress);

  if (details.location && typeof details.location.latitude === "number" && typeof details.location.longitude === "number") {
    setIfActual("coordinates", {
      lat: details.location.latitude,
      lng: details.location.longitude,
    });
  }

  if (typeof details.rating === "number") setIfActual("rating", Number(details.rating.toFixed(1)));
  if (typeof details.userRatingCount === "number") setIfActual("reviewCount", details.userRatingCount);

  setIfActual("googleMapsUri", details.googleMapsUri);
  setIfActual("websiteUri", details.websiteUri);
  setIfActual("internationalPhoneNumber", details.internationalPhoneNumber);
  setIfActual("nationalPhoneNumber", details.nationalPhoneNumber);
  setIfActual("businessStatus", details.businessStatus);

  const openNow = getOpenNow(details);
  if (typeof openNow === "boolean") setIfActual("openNow", openNow);

  const openingHoursText = getOpeningHours(details);
  if (openingHoursText.length) setIfActual("openingHoursText", openingHoursText);

  const photoNames = normalizePhotoNames(details);
  if (photoNames.length) {
    setIfActual("photoNames", photoNames);
    setIfActual("photoName", photoNames[0]);
  }

  if (details.priceLevel && details.priceLevel !== "PRICE_LEVEL_UNSPECIFIED") {
    setIfActual("googlePriceLevel", details.priceLevel);
    const mapped = mapGooglePrice(details.priceLevel);
    if (mapped) {
      setIfActual("priceLevel", mapped);
      setIfActual("priceDataSource", "Google Places API");
    }
  }

  if (changed.length) {
    setIfActual("lastVerifiedAt", today);
    setIfActual("latestInfoSource", "Google Places API");
  }

  return { next, changed: uniq(changed) };
};

const countCoverage = (places) => ({
  total: places.length,
  hours: places.filter((place) => Array.isArray(place.openingHoursText) && place.openingHoursText.length).length,
  phone: places.filter((place) => place.nationalPhoneNumber || place.internationalPhoneNumber).length,
  website: places.filter((place) => place.websiteUri).length,
  price: places.filter((place) => place.googlePriceLevel || place.priceDataSource).length,
  photos2Plus: places.filter((place) => Array.isArray(place.photoNames) && place.photoNames.length >= 2).length,
  menus: places.filter((place) => Array.isArray(place.menuItems) && place.menuItems.length).length,
});

const runPool = async (items, worker) => {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
};

const main = async () => {
  await parseEnv();
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env");
  }

  await mkdir(DATA_DIR, { recursive: true });
  const { source, places } = await extractPlaces();
  const cache = await readJsonFile(CACHE_PATH, {});
  const before = countCoverage(places);

  const candidates = places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => place.googlePlaceId && !String(place.googlePlaceId).startsWith("manual-"))
    .filter(({ place }) => !cityArg || place.city === cityArg)
    .filter(({ place }) => refresh || hasOperationalGap(place))
    .slice(0, limit);

  const failures = [];
  const changedById = {};
  let requested = 0;
  let fetched = 0;
  let cached = 0;

  console.log(`Operational enrichment: ${candidates.length} target(s), apply=${apply}, concurrency=${concurrency}`);

  await runPool(candidates, async ({ place, index: placeIndex }, progressIndex) => {
    const cacheKey = place.googlePlaceId;
    try {
      let details = cache[cacheKey]?.details;
      if (!details || refresh) {
        requested += 1;
        details = await fetchPlaceDetails(apiKey, place.googlePlaceId);
        cache[cacheKey] = {
          fetchedAt: new Date().toISOString(),
          title: place.title,
          details,
        };
        fetched += 1;
      } else {
        cached += 1;
      }

      const { next, changed } = mergeDetails(place, details);
      places[placeIndex] = next;
      if (changed.length) changedById[place.id] = changed;

      const done = progressIndex + 1;
      if (done % 25 === 0 || done === candidates.length) {
        await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
        console.log(`  ${done}/${candidates.length} done, changed=${Object.keys(changedById).length}, fetched=${fetched}, cached=${cached}`);
      }
    } catch (error) {
      failures.push({
        id: place.id,
        title: place.title,
        googlePlaceId: place.googlePlaceId,
        error: error.message,
      });
    }
  });

  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");

  if (apply) {
    await writePlaces(source, places);
  }

  const after = countCoverage(places);
  const summary = {
    generatedAt: new Date().toISOString(),
    apply,
    refresh,
    limit: Number.isFinite(limit) ? limit : null,
    city: cityArg || null,
    concurrency,
    before,
    after,
    requested,
    fetched,
    cached,
    changedPlaces: Object.keys(changedById).length,
    changedFields: changedById,
    failures,
    menuPolicy:
      "Google Places Details does not provide verified per-menu item lists for most places. No menu items were generated or guessed.",
  };

  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
