import { NextResponse } from "next/server";

import {
  generateSeoAutomation,
  type SeoLandmarkRecord,
  type SeoRestaurantRecord,
} from "@/lib/seo-automation";
import { authorizeCollectorRequest, createCollectorError } from "@/lib/place-collector-server";
import { supabaseAdminFetch } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GenerateSeoRequest = {
  limit?: number;
  minRestaurantsPerPage?: number;
  maxRestaurantsPerPage?: number;
  siteUrl?: string;
};

const FULL_RESTAURANT_SELECT = [
  "slug",
  "name",
  "city",
  "district",
  "address",
  "google_maps_url",
  "category",
  "subcategory",
  "rating",
  "review_count",
  "phone",
  "website",
  "description",
  "seo_title",
  "seo_description",
  "featured_image",
  "opening_hours",
  "price_level",
  "review_summary",
  "review_positive_signals",
  "review_caution_signals",
  "mentioned_menus",
  "recommended_for",
  "editorial_body",
  "faq_json",
  "latitude",
  "longitude",
  "photos",
  "menu_items",
].join(",");

const BASE_RESTAURANT_SELECT = [
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
  "seo_title",
  "seo_description",
  "featured_image",
].join(",");

export async function POST(request: Request) {
  try {
    authorizeCollectorRequest(request);

    const body = (await request.json().catch(() => ({}))) as GenerateSeoRequest;
    const limit = clamp(body.limit ?? 3000, 1, 5000);
    const minRestaurantsPerPage = clamp(body.minRestaurantsPerPage ?? 3, 2, 20);
    const maxRestaurantsPerPage = clamp(body.maxRestaurantsPerPage ?? 20, 5, 50);
    const siteUrl = body.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://mango-vietnam.com";

    const restaurants = await fetchRestaurants(limit);
    const landmarks = await fetchLandmarks();
    const result = generateSeoAutomation(restaurants, landmarks, {
      siteUrl,
      minRestaurantsPerPage,
      maxRestaurantsPerPage,
    });

    await upsertRows("seo_landing_pages", "slug", withUpdatedAt(result.pages));
    await upsertRows("seo_landing_page_restaurants", "page_slug,restaurant_slug", result.pageRestaurants);
    await upsertRows("seo_internal_links", "source_type,source_slug,target_type,target_slug", result.internalLinks);
    await upsertRows("restaurant_related", "restaurant_slug,related_restaurant_slug", result.relatedRestaurants);
    await upsertRows("restaurant_schema_cache", "restaurant_slug", withUpdatedAt(result.restaurantSchemas));

    return NextResponse.json({
      ok: true,
      restaurants: restaurants.length,
      landmarks: landmarks.length,
      generated: {
        seoLandingPages: result.pages.length,
        pageRestaurants: result.pageRestaurants.length,
        internalLinks: result.internalLinks.length,
        relatedRestaurants: result.relatedRestaurants.length,
        restaurantSchemas: result.restaurantSchemas.length,
      },
      samples: {
        pages: result.pages.slice(0, 8).map((page) => ({
          slug: page.slug,
          keyword: page.primary_keyword,
          path: page.canonical_path,
          restaurants: page.related_restaurants.length,
        })),
      },
    });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : 500;
    const message = error instanceof Error ? error.message : "Unknown SEO automation error";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: message.includes("relation") || message.includes("seo_landing_pages")
          ? "Run supabase/seo-growth-schema.sql in Supabase SQL Editor first."
          : undefined,
      },
      { status },
    );
  }
}

async function fetchRestaurants(limit: number) {
  const fullResponse = await supabaseAdminFetch(
    `restaurants?select=${FULL_RESTAURANT_SELECT}&limit=${limit}&order=review_count.desc.nullslast`,
    { method: "GET" },
  );

  if (fullResponse.ok) {
    return (await fullResponse.json()) as SeoRestaurantRecord[];
  }

  const detail = await fullResponse.text();
  if (!isMissingColumnError(detail)) {
    throw createCollectorError(`Failed to read restaurants: ${detail || fullResponse.statusText}`, fullResponse.status);
  }

  const fallbackResponse = await supabaseAdminFetch(
    `restaurants?select=${BASE_RESTAURANT_SELECT}&limit=${limit}&order=review_count.desc.nullslast`,
    { method: "GET" },
  );
  if (!fallbackResponse.ok) {
    const fallbackDetail = await fallbackResponse.text();
    throw createCollectorError(`Failed to read restaurants: ${fallbackDetail || fallbackResponse.statusText}`, fallbackResponse.status);
  }

  return (await fallbackResponse.json()) as SeoRestaurantRecord[];
}

async function fetchLandmarks() {
  const response = await supabaseAdminFetch(
    "landmarks?select=slug,name,city,district,type,seo_keywords,latitude,longitude,radius_meters&status=eq.active&limit=1000",
    { method: "GET" },
  );

  if (!response.ok) {
    const fallbackResponse = await supabaseAdminFetch(
      "landmarks?select=slug,name,city,district,type,seo_keywords,latitude,longitude&status=eq.active&limit=1000",
      { method: "GET" },
    );
    if (!fallbackResponse.ok) return [];
    return (await fallbackResponse.json()) as SeoLandmarkRecord[];
  }
  return (await response.json()) as SeoLandmarkRecord[];
}

async function upsertRows(table: string, onConflict: string, rows: Array<Record<string, unknown>>) {
  const chunks = chunkRows(rows, 400);

  for (const chunk of chunks) {
    const response = await supabaseAdminFetch(`${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw createCollectorError(`Failed to upsert ${table}: ${detail || response.statusText}`, response.status);
    }
  }
}

function withUpdatedAt<T extends Record<string, unknown>>(rows: T[]) {
  const updatedAt = new Date().toISOString();
  return rows.map((row) => ({ ...row, updated_at: updatedAt }));
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isMissingColumnError(detail: string) {
  const normalized = detail.toLowerCase();
  return normalized.includes("pgrst204") || normalized.includes("column") || normalized.includes("could not find");
}
