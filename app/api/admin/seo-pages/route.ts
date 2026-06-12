import { NextResponse } from "next/server";

import { authorizeCollectorRequest, createCollectorError } from "@/lib/place-collector-server";
import { supabaseAdminFetch } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeoPageRow = {
  slug: string;
  title: string;
  canonical_path?: string | null;
  city?: string | null;
  category?: string | null;
  landmark_slug?: string | null;
  intent?: string | null;
  primary_keyword?: string | null;
  status?: string | null;
  noindex?: boolean | null;
  meta_description?: string | null;
  summary?: string | null;
  body_sections?: unknown;
  faq_json?: unknown;
  updated_at?: string | null;
};

type PageRestaurantRow = {
  page_slug: string;
  restaurant_slug: string;
};

type RestaurantQualityRow = {
  slug: string;
  rating?: number | null;
  review_count?: number | null;
  address?: string | null;
  featured_image?: string | null;
  description?: string | null;
  seo_description?: string | null;
};

type RestaurantMetrics = {
  qualityScore: number;
  rating: number;
  reviewCount: number;
};

type UpdatePayload = {
  slug?: string;
  title?: string;
  meta_description?: string;
  summary?: string;
  body_sections?: unknown;
  faq_json?: unknown;
  status?: string;
  noindex?: boolean;
};

const PAGE_SELECT = [
  "slug",
  "title",
  "canonical_path",
  "city",
  "category",
  "landmark_slug",
  "intent",
  "primary_keyword",
  "status",
  "noindex",
  "meta_description",
  "summary",
  "body_sections",
  "faq_json",
  "updated_at",
].join(",");

const PAGE_SELECT_FALLBACK = PAGE_SELECT.replace(",noindex", "");

export async function GET(request: Request) {
  try {
    authorizeCollectorRequest(request);
    const url = new URL(request.url);
    const limit = clamp(Number(url.searchParams.get("limit") ?? 200), 1, 500);
    const statusFilter = url.searchParams.get("status")?.trim();
    const search = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

    const pages = await fetchSeoPages(limit, statusFilter);
    const filteredPages = search
      ? pages.filter((page) => [page.slug, page.title, page.city, page.category, page.intent].filter(Boolean).join(" ").toLowerCase().includes(search))
      : pages;
    const relations = await fetchPageRestaurants(filteredPages.map((page) => page.slug));
    const restaurantMetrics = await fetchRestaurantMetrics([...new Set(relations.map((row) => row.restaurant_slug))]);

    const duplicateTitles = getDuplicateSet(filteredPages.map((page) => page.title?.trim()).filter(isNonEmptyString));
    const duplicateMetas = getDuplicateSet(filteredPages.map((page) => page.meta_description?.trim()).filter(isNonEmptyString));
    const relationsByPage = groupBy(relations, (row) => row.page_slug);

    const items = filteredPages.map((page) => {
      const pageRelations = relationsByPage.get(page.slug) ?? [];
      const metrics = pageRelations
        .map((relation) => restaurantMetrics.get(relation.restaurant_slug))
        .filter((score): score is RestaurantMetrics => Boolean(score));
      const scores = metrics.map((metric) => metric.qualityScore);
      const ratings = metrics.map((metric) => metric.rating).filter((rating) => rating > 0);
      const totalReviewCount = metrics.reduce((sum, metric) => sum + metric.reviewCount, 0);
      const averageScore = scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
      const averageRating = ratings.length ? round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : 0;
      const contentLength = getContentLength(page);
      const warnings = getWarnings({
        page,
        restaurantsCount: pageRelations.length,
        contentLength,
        averageScore,
        duplicateTitles,
        duplicateMetas,
      });
      const priorityScore = calculatePriorityScore({
        page,
        restaurantsCount: pageRelations.length,
        averageRating,
        totalReviewCount,
        averageScore,
        contentLength,
      });

      return {
        slug: page.slug,
        title: page.title,
        city: page.city,
        category: page.category,
        page_type: page.intent,
        primary_keyword: page.primary_keyword,
        landmark_slug: page.landmark_slug,
        status: page.status,
        noindex: Boolean(page.noindex),
        meta_description: page.meta_description ?? "",
        summary: page.summary ?? "",
        body_sections: normalizeJson(page.body_sections, []),
        faq_json: normalizeJson(page.faq_json, []),
        restaurants_count: pageRelations.length,
        average_rating: averageRating,
        total_review_count: totalReviewCount,
        content_length: contentLength,
        data_quality_score: averageScore,
        priority_score: priorityScore,
        warnings,
        preview_url: `/guides/${page.slug}`,
        updated_at: page.updated_at,
      };
    });
    const topPages = items
      .filter((item) => !item.noindex && item.priority_score > 0)
      .sort((a, b) => b.priority_score - a.priority_score || b.restaurants_count - a.restaurants_count)
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      result: {
        total: items.length,
        warningCount: items.filter((item) => item.warnings.length > 0).length,
        topPages,
        pages: items,
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    authorizeCollectorRequest(request);
    const body = (await request.json().catch(() => ({}))) as UpdatePayload;
    const slug = body.slug?.trim();
    if (!slug) throw createCollectorError("Missing seo page slug.", 400);

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.meta_description === "string") update.meta_description = body.meta_description.trim();
    if (typeof body.summary === "string") update.summary = body.summary.trim();
    if (body.body_sections !== undefined) update.body_sections = normalizeEditableJson(body.body_sections, []);
    if (body.faq_json !== undefined) update.faq_json = normalizeEditableJson(body.faq_json, []);
    if (typeof body.status === "string") update.status = body.status;
    if (typeof body.noindex === "boolean") update.noindex = body.noindex;

    if (typeof update.title === "string" && update.title.length < 8) {
      throw createCollectorError("Title is too short.", 400);
    }
    if (typeof update.meta_description === "string" && update.meta_description.length < 40) {
      throw createCollectorError("Meta description is too short.", 400);
    }

    let response = await supabaseAdminFetch(`seo_landing_pages?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(update),
    });

    if (!response.ok && "noindex" in update) {
      const detail = await response.text();
      if (isMissingColumnError(detail)) {
        const fallbackUpdate = { ...update };
        delete fallbackUpdate.noindex;
        response = await supabaseAdminFetch(`seo_landing_pages?slug=eq.${encodeURIComponent(slug)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(fallbackUpdate),
        });
      } else {
        throw createCollectorError(`Failed to update SEO page: ${detail || response.statusText}`, response.status);
      }
    }

    if (!response.ok) {
      const detail = await response.text();
      throw createCollectorError(`Failed to update SEO page: ${detail || response.statusText}`, response.status);
    }

    const rows = (await response.json()) as SeoPageRow[];
    return NextResponse.json({ ok: true, result: rows[0] ?? null });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

async function fetchSeoPages(limit: number, statusFilter?: string) {
  const filter = statusFilter && statusFilter !== "all" ? `&status=eq.${encodeURIComponent(statusFilter)}` : "";
  const path = `seo_landing_pages?select=${PAGE_SELECT}${filter}&order=priority.desc,updated_at.desc&limit=${limit}`;
  let response = await supabaseAdminFetch(path, { method: "GET" });

  if (!response.ok) {
    const detail = await response.text();
    if (!isMissingColumnError(detail)) {
      throw createCollectorError(`Failed to read seo_landing_pages: ${detail || response.statusText}`, response.status);
    }
    response = await supabaseAdminFetch(
      `seo_landing_pages?select=${PAGE_SELECT_FALLBACK}${filter}&order=priority.desc,updated_at.desc&limit=${limit}`,
      { method: "GET" },
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw createCollectorError(`Failed to read seo_landing_pages: ${detail || response.statusText}`, response.status);
  }

  return (await response.json()) as SeoPageRow[];
}

async function fetchPageRestaurants(pageSlugs: string[]) {
  if (!pageSlugs.length) return [];
  const response = await supabaseAdminFetch(
    `seo_landing_page_restaurants?select=page_slug,restaurant_slug&page_slug=in.(${pageSlugs.map(encodeURIComponent).join(",")})&limit=5000`,
    { method: "GET" },
  );
  if (!response.ok) return [];
  return (await response.json()) as PageRestaurantRow[];
}

async function fetchRestaurantMetrics(slugs: string[]) {
  const metrics = new Map<string, RestaurantMetrics>();
  if (!slugs.length) return metrics;
  const response = await supabaseAdminFetch(
    `restaurants?select=slug,rating,review_count,address,featured_image,description,seo_description&slug=in.(${slugs.map(encodeURIComponent).join(",")})&limit=5000`,
    { method: "GET" },
  );
  if (!response.ok) return metrics;
  const rows = (await response.json()) as RestaurantQualityRow[];
  rows.forEach((restaurant) => {
    metrics.set(restaurant.slug, {
      qualityScore: calculateRestaurantQualityScore(restaurant),
      rating: typeof restaurant.rating === "number" ? restaurant.rating : 0,
      reviewCount: typeof restaurant.review_count === "number" ? restaurant.review_count : 0,
    });
  });
  return metrics;
}

function calculateRestaurantQualityScore(restaurant: RestaurantQualityRow) {
  let score = 0;
  if (restaurant.featured_image) score += 22;
  if (restaurant.address) score += 14;
  if (restaurant.description || restaurant.seo_description) score += 18;
  if (typeof restaurant.rating === "number" && restaurant.rating >= 4) score += 18;
  if (typeof restaurant.review_count === "number") {
    if (restaurant.review_count >= 100) score += 18;
    else if (restaurant.review_count >= 20) score += 12;
    else if (restaurant.review_count >= 5) score += 6;
  }
  return Math.min(100, score);
}

function getWarnings(input: {
  page: SeoPageRow;
  restaurantsCount: number;
  contentLength: number;
  averageScore: number;
  duplicateTitles: Set<string>;
  duplicateMetas: Set<string>;
}) {
  const warnings: Array<{ type: string; label: string }> = [];
  if (input.restaurantsCount < 3) warnings.push({ type: "restaurants", label: "식당 3개 미만" });
  if (input.contentLength < 650) warnings.push({ type: "content", label: "본문 길이 부족" });
  if (input.page.title && input.duplicateTitles.has(input.page.title.trim())) warnings.push({ type: "title", label: "중복 title" });
  if (input.page.meta_description && input.duplicateMetas.has(input.page.meta_description.trim())) warnings.push({ type: "meta", label: "중복 meta" });
  if (input.restaurantsCount > 0 && input.averageScore < 45) warnings.push({ type: "data", label: "식당 데이터 품질 낮음" });
  if (input.page.noindex) warnings.push({ type: "noindex", label: "noindex 적용됨" });
  return warnings;
}

function calculatePriorityScore(input: {
  page: SeoPageRow;
  restaurantsCount: number;
  averageRating: number;
  totalReviewCount: number;
  averageScore: number;
  contentLength: number;
}) {
  if (input.page.noindex) return 0;

  const searchText = normalizeSearchText([
    input.page.slug,
    input.page.title,
    input.page.city,
    input.page.category,
    input.page.intent,
    input.page.primary_keyword,
  ].filter(Boolean).join(" "));

  let score = 0;

  score += Math.min(36, [
    { keywords: ["맛집", "restaurant", "restaurants", "best-restaurants"], points: 18 },
    { keywords: ["카페", "cafe", "cafes"], points: 14 },
    { keywords: ["마사지", "massage"], points: 12 },
    { keywords: ["한식", "korean"], points: 16 },
    { keywords: ["해산물", "seafood"], points: 14 },
    { keywords: ["짬뽕", "jjamppong", "jjambbong"], points: 16 },
    { keywords: ["해장", "hangover"], points: 13 },
  ].reduce((sum, group) => sum + (group.keywords.some((keyword) => searchText.includes(keyword)) ? group.points : 0), 0));

  const cityText = normalizeSearchText(input.page.city ?? "");
  if (cityText.includes("ho chi minh") || cityText.includes("호치민")) score += 18;
  else if (cityText.includes("da nang") || cityText.includes("다낭")) score += 14;
  else if (cityText.includes("nha trang") || cityText.includes("나트랑")) score += 11;
  else if (cityText.includes("hanoi") || cityText.includes("하노이")) score += 10;

  score += Math.min(18, input.restaurantsCount * 1.35);

  if (input.averageRating >= 4.5) score += 14;
  else if (input.averageRating >= 4.2) score += 10;
  else if (input.averageRating >= 4) score += 6;

  score += Math.min(14, Math.log10(input.totalReviewCount + 1) * 5.5);

  if (input.page.landmark_slug || searchText.includes("near") || searchText.includes("근처")) score += 10;

  if (input.averageScore >= 70) score += 8;
  else if (input.averageScore >= 55) score += 5;

  if (input.contentLength < 1200 && score >= 45) score += 4;

  return round(Math.min(100, score));
}

function getContentLength(page: SeoPageRow) {
  const sectionText = JSON.stringify(normalizeJson(page.body_sections, []));
  const faqText = JSON.stringify(normalizeJson(page.faq_json, []));
  return [page.title, page.meta_description, page.summary, sectionText, faqText].filter(Boolean).join(" ").length;
}

function getDuplicateSet(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value));
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(item);
  }
  return groups;
}

function normalizeEditableJson(value: unknown, fallback: unknown[]) {
  if (typeof value === "string") return normalizeJson(value, fallback);
  if (Array.isArray(value)) return value;
  return fallback;
}

function normalizeJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (value === null || value === undefined) return fallback;
  return value as T;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[-_/]+/g, " ");
}

function isMissingColumnError(detail: string) {
  const normalized = detail.toLowerCase();
  return normalized.includes("pgrst204") || normalized.includes("column") || normalized.includes("could not find");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function adminErrorResponse(error: unknown) {
  const status = typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : 500;
  const message = error instanceof Error ? error.message : "SEO page admin request failed.";
  return NextResponse.json({ ok: false, error: message }, { status });
}
