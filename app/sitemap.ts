import type { MetadataRoute } from "next";

import { getEditorialSeoPageSlugs } from "@/lib/editorial-seo";
import { getAllGuides } from "@/lib/guides";
import { getListingParams, getRouteParams } from "@/lib/places";
import { getRestaurantSitemapEntries, getSeoGuideSitemapEntries } from "@/lib/seo-guides";
import { getCategoryHubSlugs } from "@/lib/seo-hubs";
import { allCities, SITE_URL } from "@/lib/site";
import { staticSeoRoutePaths } from "@/lib/static-route-seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.86,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = getRouteParams().map((route) => ({
    url: `${SITE_URL}/${route.city}/${route.category}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: route.city === "ho-chi-minh" ? 0.9 : 0.75,
  }));

  const cityRoutes: MetadataRoute.Sitemap = allCities.map((city) => ({
    url: `${SITE_URL}/${city.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: city.priority,
  }));

  const cityHubRoutes: MetadataRoute.Sitemap = allCities.map((city) => ({
    url: `${SITE_URL}/city/${city.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: Math.min(city.priority, 0.86),
  }));

  const categoryHubRoutes: MetadataRoute.Sitemap = getCategoryHubSlugs().map((slug) => ({
    url: `${SITE_URL}/category/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: slug === "restaurants" ? 0.88 : 0.78,
  }));

  const editorialRoutes: MetadataRoute.Sitemap = getEditorialSeoPageSlugs().map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: slug.includes("ho-chi-minh") ? 0.9 : 0.82,
  }));

  const staticSeoRoutes: MetadataRoute.Sitemap = staticSeoRoutePaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path.includes("ho-chi-minh") ? 0.9 : 0.82,
  }));

  const listingRoutes: MetadataRoute.Sitemap = getListingParams().map((route) => ({
    url: `${SITE_URL}/listing/${route.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const guideRoutes: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${SITE_URL}/guide/${guide.slug}`,
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const articleRoutes: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${SITE_URL}/article/${guide.slug}`,
    lastModified: new Date(guide.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const generatedGuideRoutes: MetadataRoute.Sitemap = (await getSeoGuideSitemapEntries(35000)).map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: guide.updated_at ? new Date(guide.updated_at) : now,
    changeFrequency: "weekly",
    priority: Math.min(0.9, Math.max(0.55, Number(guide.priority ?? 0.72))),
  }));

  const generatedRestaurantRoutes: MetadataRoute.Sitemap = (await getRestaurantSitemapEntries(12000)).map((restaurant) => ({
    url: `${SITE_URL}/listing/${restaurant.slug}`,
    lastModified: typeof restaurant.source_updated_at === "string" ? new Date(restaurant.source_updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.64,
  }));

  return dedupeSitemap([
    ...staticRoutes,
    ...cityRoutes,
    ...cityHubRoutes,
    ...categoryHubRoutes,
    ...editorialRoutes,
    ...staticSeoRoutes,
    ...categoryRoutes,
    ...guideRoutes,
    ...generatedGuideRoutes,
    ...articleRoutes,
    ...listingRoutes,
    ...generatedRestaurantRoutes,
  ]);
}

function dedupeSitemap(routes: MetadataRoute.Sitemap) {
  const seen = new Set<string>();
  return routes.filter((route) => {
    if (seen.has(route.url)) return false;
    seen.add(route.url);
    return true;
  });
}
