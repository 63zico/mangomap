import { createHash } from "node:crypto";

import {
  buildCollectorPlan,
  collectorCategories,
  collectorCities,
  type CollectorCategory,
  type CollectorCity,
  type CollectorDistrict,
  type CollectorPlanStep,
  getCollectorCategory,
  getCollectorCity,
} from "@/lib/place-collector-config";
import { buildPlaceEditorial } from "@/lib/restaurant-editorial";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  types?: string[];
  photos?: { name?: string }[];
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  priceLevel?: string;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string; languageCode?: string };
    originalText?: { text?: string; languageCode?: string };
    relativePublishTimeDescription?: string;
  }>;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
  error?: { code?: number; message?: string; status?: string };
};

export type CollectorStepInput = {
  citySlug: string;
  districtName: string;
  categoryKey: string;
  maxResults?: number;
};

export type CollectorStepResult = {
  query: string;
  city: string;
  district: string;
  category: string;
  fetched: number;
  usable: number;
  saved: number;
  skipped: number;
  errors: string[];
  rows: Array<{
    name: string;
    slug: string;
    action: "saved" | "skipped" | "error";
    reason?: string;
  }>;
};

export type CollectorStatus = {
  configured: boolean;
  missing: string[];
  plan: {
    cities: number;
    districts: number;
    categories: number;
    steps: number;
    defaultTestTarget: number;
    defaultTestTotal: number;
  };
  totalRestaurants: number | null;
};

type RestaurantInsert = {
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url: string;
  category: string;
  rating: number | null;
  review_count: number | null;
  phone: string | null;
  website: string | null;
  description: string;
  seo_title: string;
  seo_description: string;
  featured_image: string | null;
  google_place_id?: string | null;
  opening_hours?: string | null;
  price_level?: string | null;
  review_summary?: string | null;
  review_positive_signals?: string[] | null;
  review_caution_signals?: string[] | null;
  mentioned_menus?: string[] | null;
  recommended_for?: string[] | null;
  editorial_body?: string | null;
  faq_json?: Array<{ question: string; answer: string }> | null;
  source_updated_at?: string | null;
};

const GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.types",
  "places.photos",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");

const GOOGLE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "types",
  "photos",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "priceLevel",
  "reviews",
].join(",");

const EDITORIAL_OPTIONAL_FIELDS = [
  "google_place_id",
  "latitude",
  "longitude",
  "opening_hours",
  "price_level",
  "review_summary",
  "review_positive_signals",
  "review_caution_signals",
  "mentioned_menus",
  "recommended_for",
  "editorial_body",
  "faq_json",
  "source_updated_at",
] as const;

export function authorizeCollectorRequest(request: Request) {
  const expectedToken = process.env.COLLECTOR_ADMIN_TOKEN?.trim();
  if (!expectedToken) {
    throw createCollectorError(
      "COLLECTOR_ADMIN_TOKEN is not configured. Add it to Vercel and .env before using the collector.",
      503,
    );
  }

  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const suppliedToken = bearerToken || request.headers.get("x-collector-token")?.trim() || url.searchParams.get("token")?.trim();

  if (!suppliedToken || suppliedToken !== expectedToken) {
    throw createCollectorError("Unauthorized collector request.", 401);
  }
}

export async function getCollectorStatus(): Promise<CollectorStatus> {
  const missing = getMissingEnv();
  const plan = buildCollectorPlan();

  return {
    configured: missing.length === 0,
    missing,
    plan: {
      cities: collectorCities.length,
      districts: collectorCities.reduce((sum, city) => sum + city.districts.length, 0),
      categories: collectorCategories.length,
      steps: plan.length,
      defaultTestTarget: 20,
      defaultTestTotal: collectorCities.length * 20,
    },
    totalRestaurants: missing.some((key) => key.startsWith("SUPABASE"))
      ? null
      : await getRestaurantTotalCount(),
  };
}

export async function collectPlacesStep(input: CollectorStepInput): Promise<CollectorStepResult> {
  assertCollectorEnv();

  const city = getCollectorCity(input.citySlug);
  if (!city) throw createCollectorError(`Unknown collector city: ${input.citySlug}`, 400);

  const district = city.districts.find((candidate) => candidate.name === input.districtName);
  if (!district) throw createCollectorError(`Unknown district for ${city.name}: ${input.districtName}`, 400);

  const category = getCollectorCategory(input.categoryKey);
  if (!category) throw createCollectorError(`Unknown collector category: ${input.categoryKey}`, 400);

  const maxResults = clampResults(input.maxResults ?? 20);
  const query = `${category.query} in ${district.query}, ${city.query}, Vietnam`;
  const googlePlaces = await searchGooglePlaces(query, district, maxResults);
  const usablePlaces = googlePlaces.filter((place) => isUsablePlace(place, category));
  const result: CollectorStepResult = {
    query,
    city: city.name,
    district: district.name,
    category: category.label,
    fetched: googlePlaces.length,
    usable: usablePlaces.length,
    saved: 0,
    skipped: 0,
    errors: [],
    rows: [],
  };

  for (const place of usablePlaces) {
    const detailedPlace = await getPlaceDetails(place).catch(() => place);
    const row = buildRestaurantRow(detailedPlace, city, district, category);

    try {
      const existingReason = await findExistingRestaurant(row);
      if (existingReason) {
        const refreshed = await refreshExistingRestaurantLocation(row).catch(() => false);
        result.skipped += 1;
        result.rows.push({
          name: row.name,
          slug: row.slug,
          action: "skipped",
          reason: refreshed ? `${existingReason}; refreshed location` : existingReason,
        });
        continue;
      }

      await insertRestaurant(row);
      result.saved += 1;
      result.rows.push({ name: row.name, slug: row.slug, action: "saved" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Supabase insert error";
      result.errors.push(`${row.name}: ${message}`);
      result.rows.push({ name: row.name, slug: row.slug, action: "error", reason: message });
    }
  }

  return result;
}

export function getCollectorPlan(): CollectorPlanStep[] {
  return buildCollectorPlan();
}

export function createCollectorError(message: string, status = 500) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getMissingEnv() {
  const missing: string[] = [];
  if (!getGoogleMapsKey()) missing.push("GOOGLE_MAPS_API_KEY");
  if (!getSupabaseUrl()) missing.push("SUPABASE_URL");
  if (!getSupabaseServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  return missing;
}

function assertCollectorEnv() {
  const missing = getMissingEnv();
  if (missing.length) {
    throw createCollectorError(`Collector environment is incomplete: ${missing.join(", ")}`, 503);
  }
}

function getGoogleMapsKey() {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "").replace(/\/$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || "";
}

function clampResults(value: number) {
  if (!Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(20, Math.round(value)));
}

async function searchGooglePlaces(query: string, district: CollectorDistrict, maxResults: number) {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGoogleMapsKey(),
      "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "ko",
      regionCode: "VN",
      maxResultCount: maxResults,
      locationBias: {
        circle: {
          center: district.center,
          radius: district.radius,
        },
      },
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as GooglePlacesResponse;
  if (!response.ok || data.error) {
    const message = data.error?.message || response.statusText || "Google Places API request failed";
    throw createCollectorError(`Google Places API failed (${response.status}): ${message}`, response.status || 502);
  }

  return data.places ?? [];
}

async function getPlaceDetails(place: GooglePlace) {
  if (!place.id) return place;

  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}?languageCode=ko&regionCode=VN`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": getGoogleMapsKey(),
      "X-Goog-FieldMask": GOOGLE_DETAILS_FIELD_MASK,
    },
    cache: "no-store",
  });

  if (!response.ok) return place;
  const detail = (await response.json().catch(() => ({}))) as GooglePlace;

  return {
    ...place,
    ...detail,
    id: detail.id ?? place.id,
    photos: detail.photos?.length ? detail.photos : place.photos,
    types: detail.types?.length ? detail.types : place.types,
    googleMapsUri: detail.googleMapsUri ?? place.googleMapsUri,
    location: detail.location ?? place.location,
  };
}

function isUsablePlace(place: GooglePlace, category: CollectorCategory) {
  const name = place.displayName?.text?.trim();
  if (!place.id || !name) return false;

  const types = (place.types ?? []).map(normalizeText);
  const text = normalizeText([name, place.formattedAddress, ...(place.types ?? [])].filter(Boolean).join(" "));
  const blocked = category.blockedTypeHints.some((hint) => types.includes(normalizeText(hint)));
  if (blocked) return false;

  if (category.key === "massage") {
    return category.allowedTypeHints.some((hint) => types.includes(normalizeText(hint))) || /massage|spa|foot|body/.test(text);
  }

  if (category.key === "cafe") {
    return types.some((type) => ["cafe", "coffee_shop", "bakery", "food", "restaurant"].includes(type)) || /cafe|coffee|bakery/.test(text);
  }

  return types.some((type) => ["restaurant", "food", "meal_takeaway", "meal_delivery"].includes(type))
    || category.allowedTypeHints.some((hint) => types.includes(normalizeText(hint)))
    || text.includes(normalizeText(category.query));
}

function buildRestaurantRow(
  place: GooglePlace,
  city: CollectorCity,
  requestedDistrict: CollectorDistrict,
  category: CollectorCategory,
): RestaurantInsert {
  const name = place.displayName?.text?.trim() || "Unnamed place";
  const inferredDistrict = inferDistrict(city, place.formattedAddress ?? "", place.location, requestedDistrict);
  const googleMapsUrl = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${city.name}`)}`;
  const photoName = place.photos?.find((photo) => photo.name)?.name ?? null;
  const openingHours = place.regularOpeningHours?.weekdayDescriptions ?? [];
  const editorial = buildPlaceEditorial({
    name,
    cityName: city.name,
    cityKoreanName: city.koreanName,
    districtName: inferredDistrict.name,
    categoryLabel: category.label,
    categoryKoreanLabel: category.koreanLabel,
    address: place.formattedAddress ?? "",
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    openingHours,
    priceLevel: place.priceLevel ?? null,
    reviews: (place.reviews ?? []).map((review) => ({
      rating: review.rating,
      text: review.text?.text ?? review.originalText?.text ?? "",
    })),
  });

  return {
    name,
    slug: createRestaurantSlug(city, inferredDistrict, name, place.id ?? googleMapsUrl),
    city: city.name,
    district: inferredDistrict.name,
    address: place.formattedAddress ?? "",
    latitude: typeof place.location?.latitude === "number" ? place.location.latitude : null,
    longitude: typeof place.location?.longitude === "number" ? place.location.longitude : null,
    google_maps_url: googleMapsUrl,
    category: category.label,
    rating: typeof place.rating === "number" ? place.rating : null,
    review_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    description: editorial.description,
    seo_title: editorial.seoTitle,
    seo_description: editorial.seoDescription,
    featured_image: photoName ? `/api/place-photo?name=${encodeURIComponent(photoName)}&w=1200&h=800&label=${encodeURIComponent(name)}` : null,
    google_place_id: place.id ?? null,
    opening_hours: openingHours.join("\n") || null,
    price_level: place.priceLevel ?? null,
    review_summary: editorial.reviewSummary,
    review_positive_signals: editorial.positiveSignals,
    review_caution_signals: editorial.cautionSignals,
    mentioned_menus: editorial.mentionedMenus,
    recommended_for: editorial.recommendedFor,
    editorial_body: editorial.editorialBody,
    faq_json: editorial.faq,
    source_updated_at: new Date().toISOString(),
  };
}

function createRestaurantSlug(city: CollectorCity, district: CollectorDistrict, name: string, placeId: string) {
  const base = slugify(`${city.name}-${district.name}-${name}`).slice(0, 82).replace(/-+$/g, "");
  return `${base}-${shortHash(placeId)}`;
}

function inferDistrict(
  city: CollectorCity,
  address: string,
  location: GooglePlace["location"],
  fallback: CollectorDistrict,
) {
  const normalizedAddress = normalizeText(address);
  const byAddress = city.districts.find((district) =>
    district.patterns.some((pattern) => normalizedAddress.includes(normalizeText(pattern))),
  );
  if (byAddress) return byAddress;

  const latitude = location?.latitude;
  const longitude = location?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return fallback;

  return city.districts
    .map((district) => ({
      district,
      distance: getDistanceMeters(latitude, longitude, district.center.latitude, district.center.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.district ?? fallback;
}

async function findExistingRestaurant(row: RestaurantInsert) {
  if (await restaurantExistsBy("slug", row.slug)) return "duplicate slug";
  if (row.google_maps_url && await restaurantExistsBy("google_maps_url", row.google_maps_url)) return "duplicate Google Maps URL";
  return "";
}

async function restaurantExistsBy(column: "slug" | "google_maps_url", value: string) {
  const response = await supabaseFetch(
    `restaurants?select=${column}&${column}=eq.${encodeURIComponent(value)}&limit=1`,
    { method: "GET" },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw createCollectorError(`Supabase duplicate check failed: ${detail || response.statusText}`, response.status);
  }

  const rows = (await response.json()) as unknown[];
  return rows.length > 0;
}

async function insertRestaurant(row: RestaurantInsert) {
  let response = await supabaseFetch("restaurants?select=slug", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (isMissingOptionalColumnError(detail)) {
      response = await supabaseFetch("restaurants?select=slug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(stripOptionalEditorialFields(row)),
      });

      if (response.ok) return;
      const retryDetail = await response.text();
      throw createCollectorError(`Supabase insert failed: ${retryDetail || response.statusText}`, response.status);
    }

    throw createCollectorError(`Supabase insert failed: ${detail || response.statusText}`, response.status);
  }
}

async function refreshExistingRestaurantLocation(row: RestaurantInsert) {
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number") return false;

  const filter = row.google_place_id
    ? `google_place_id=eq.${encodeURIComponent(row.google_place_id)}`
    : row.google_maps_url
      ? `google_maps_url=eq.${encodeURIComponent(row.google_maps_url)}`
      : "";
  if (!filter) return false;

  const response = await supabaseFetch(`restaurants?${filter}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      latitude: row.latitude,
      longitude: row.longitude,
      source_updated_at: new Date().toISOString(),
    }),
  });

  if (response.ok) return true;

  const detail = await response.text();
  if (isMissingOptionalColumnError(detail)) return false;
  throw createCollectorError(`Supabase location refresh failed: ${detail || response.statusText}`, response.status);
}

function isMissingOptionalColumnError(detail: string) {
  const normalized = detail.toLowerCase();
  return normalized.includes("pgrst204") || EDITORIAL_OPTIONAL_FIELDS.some((field) => normalized.includes(field));
}

function stripOptionalEditorialFields(row: RestaurantInsert) {
  const fallback: Record<string, unknown> = { ...row };
  EDITORIAL_OPTIONAL_FIELDS.forEach((field) => {
    delete fallback[field];
  });
  return fallback;
}

async function getRestaurantTotalCount() {
  const response = await supabaseFetch("restaurants?select=slug&limit=1", {
    method: "GET",
    headers: {
      Prefer: "count=exact",
      Range: "0-0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const contentRange = response.headers.get("content-range");
  const total = contentRange?.split("/")?.[1];
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : null;
}

function supabaseFetch(path: string, init: RequestInit) {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const baseUrl = getSupabaseUrl();

  return fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

function slugify(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function shortHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function normalizeText(value: string) {
  return stripAccents(value).toLowerCase();
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
