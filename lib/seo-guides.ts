import { supabaseAdminFetch } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/site";

export type SeoGuideRecord = {
  slug: string;
  canonical_path?: string | null;
  city?: string | null;
  district?: string | null;
  category?: string | null;
  subcategory?: string | null;
  landmark_slug?: string | null;
  intent?: string | null;
  primary_keyword: string;
  secondary_keywords?: unknown;
  title: string;
  h1: string;
  meta_description: string;
  summary: string;
  body_sections?: unknown;
  faq_json?: unknown;
  schema_json?: unknown;
  internal_links?: unknown;
  related_restaurants?: unknown;
  priority?: number | null;
  noindex?: boolean | null;
  published_at?: string | null;
  updated_at?: string | null;
};

export type SeoGuideRestaurantRecord = {
  slug: string;
  name: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  google_maps_url?: string | null;
  category?: string | null;
  rating?: number | null;
  review_count?: number | null;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  seo_description?: string | null;
  featured_image?: string | null;
  price_level?: string | null;
  rank?: number;
  reason?: string | null;
  score?: number | null;
};

export type SeoGuideRelatedLink = {
  slug: string;
  label: string;
  reason?: string | null;
};

export type SeoGuidePageData = {
  page: SeoGuideRecord;
  restaurants: SeoGuideRestaurantRecord[];
  relatedGuides: SeoGuideRelatedLink[];
};

export type SupabaseRestaurantRecord = SeoGuideRestaurantRecord & {
  seo_title?: string | null;
  opening_hours?: string | null;
  review_summary?: string | null;
  editorial_body?: string | null;
  faq_json?: unknown;
  source_updated_at?: string | null;
  updated_at?: string | null;
};

const GUIDE_SELECT = [
  "slug",
  "canonical_path",
  "city",
  "district",
  "category",
  "subcategory",
  "landmark_slug",
  "intent",
  "primary_keyword",
  "secondary_keywords",
  "title",
  "h1",
  "meta_description",
  "summary",
  "body_sections",
  "faq_json",
  "schema_json",
  "internal_links",
  "related_restaurants",
  "priority",
  "noindex",
  "published_at",
  "updated_at",
].join(",");

const RESTAURANT_SELECT = [
  "slug",
  "name",
  "city",
  "district",
  "address",
  "google_maps_url",
  "category",
  "rating",
  "review_count",
  "phone",
  "website",
  "description",
  "seo_description",
  "featured_image",
  "price_level",
].join(",");

const RESTAURANT_DETAIL_SELECT = [
  RESTAURANT_SELECT,
  "seo_title",
  "opening_hours",
  "review_summary",
  "editorial_body",
  "faq_json",
  "source_updated_at",
].join(",");

export async function getSeoGuidePage(slug: string): Promise<SeoGuidePageData | null> {
  const page = await getSeoGuideBySlug(slug);
  if (!page) return null;

  const relations = await getPageRestaurantRelations(slug);
  const restaurants = await getRestaurantsBySlugs(relations.map((relation) => relation.restaurant_slug));
  const restaurantMap = new Map(restaurants.map((restaurant) => [restaurant.slug, restaurant]));
  const orderedRestaurants = relations
    .map((relation) => {
      const restaurant = restaurantMap.get(relation.restaurant_slug);
      if (!restaurant) return null;
      return {
        ...restaurant,
        rank: relation.rank,
        reason: relation.reason,
        score: relation.score,
      };
    })
    .filter(Boolean) as SeoGuideRestaurantRecord[];

  const relatedGuides = await getRelatedGuides(slug);

  return { page, restaurants: orderedRestaurants, relatedGuides };
}

export async function getSeoGuideBySlug(slug: string) {
  try {
    const response = await supabaseAdminFetch(
      `seo_landing_pages?select=${GUIDE_SELECT}&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
      { method: "GET" },
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as SeoGuideRecord[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSupabaseRestaurantBySlug(slug: string) {
  try {
    const response = await supabaseAdminFetch(
      `restaurants?select=${RESTAURANT_DETAIL_SELECT}&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { method: "GET" },
    );
    if (response.ok) {
      const rows = (await response.json()) as SupabaseRestaurantRecord[];
      return rows[0] ?? null;
    }

    const fallback = await supabaseAdminFetch(
      `restaurants?select=${RESTAURANT_SELECT}&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      { method: "GET" },
    );
    if (!fallback.ok) return null;
    const rows = (await fallback.json()) as SupabaseRestaurantRecord[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getSeoGuideSitemapEntries(limit = 50000) {
  return getPagedRows<{ slug: string; updated_at?: string | null; priority?: number | null }>(
    "seo_landing_pages?select=slug,updated_at,priority&status=eq.published&noindex=is.false&order=priority.desc,updated_at.desc",
    limit,
  );
}

export async function getRestaurantSitemapEntries(limit = 50000): Promise<Array<{ slug: string; source_updated_at?: string | null }>> {
  const fullRows = await getPagedRows<{ slug: string; source_updated_at?: string | null }>(
    "restaurants?select=slug,source_updated_at&slug=not.is.null&order=review_count.desc.nullslast",
    limit,
  );
  if (fullRows.length) return fullRows;

  return getPagedRows<{ slug: string }>(
    "restaurants?select=slug&slug=not.is.null",
    limit,
  );
}

export function normalizeGuideFaq(value: unknown) {
  return asArray<{ question?: unknown; answer?: unknown }>(value)
    .map((item) => ({
      question: typeof item.question === "string" ? item.question : "",
      answer: typeof item.answer === "string" ? item.answer : "",
    }))
    .filter((item) => item.question && item.answer);
}

export function normalizeGuideSections(value: unknown) {
  return asArray<{ heading?: unknown; body?: unknown; items?: unknown }>(value)
    .map((section) => ({
      heading: typeof section.heading === "string" ? section.heading : "",
      body: typeof section.body === "string" ? section.body : "",
      items: asStringArray(section.items),
    }))
    .filter((section) => section.heading || section.body || section.items.length);
}

export function getGuideCanonicalUrl(slug: string) {
  return `${SITE_URL}/guides/${slug}`;
}

async function getPageRestaurantRelations(pageSlug: string) {
  const response = await supabaseAdminFetch(
    `seo_landing_page_restaurants?select=restaurant_slug,rank,reason,score&page_slug=eq.${encodeURIComponent(pageSlug)}&order=rank.asc&limit=60`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as Array<{
    restaurant_slug: string;
    rank: number;
    reason?: string | null;
    score?: number | null;
  }>;
}

async function getRestaurantsBySlugs(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs.filter(Boolean))];
  if (!uniqueSlugs.length) return [];

  const response = await supabaseAdminFetch(
    `restaurants?select=${RESTAURANT_SELECT}&slug=in.(${uniqueSlugs.map(encodeURIComponent).join(",")})`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as SeoGuideRestaurantRecord[];
}

async function getRelatedGuides(sourceSlug: string) {
  const response = await supabaseAdminFetch(
    `seo_internal_links?select=target_slug,anchor_text,reason,weight&source_type=eq.seo_landing_page&source_slug=eq.${encodeURIComponent(sourceSlug)}&target_type=eq.seo_landing_page&status=eq.active&order=weight.desc&limit=10`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  const rows = (await response.json()) as Array<{ target_slug: string; anchor_text: string; reason?: string | null }>;

  return rows.map((row) => ({
    slug: row.target_slug,
    label: row.anchor_text,
    reason: row.reason,
  }));
}

async function getPagedRows<T>(basePath: string, maxRows: number) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    try {
      const separator = basePath.includes("?") ? "&" : "?";
      const response = await supabaseAdminFetch(`${basePath}${separator}limit=${pageSize}&offset=${offset}`, {
        method: "GET",
      });
      if (!response.ok) break;
      const batch = (await response.json()) as T[];
      rows.push(...batch);
      if (batch.length < pageSize) break;
    } catch {
      break;
    }
  }

  return rows.slice(0, maxRows);
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asStringArray(value: unknown) {
  return asArray<unknown>(value).filter((item): item is string => typeof item === "string");
}
