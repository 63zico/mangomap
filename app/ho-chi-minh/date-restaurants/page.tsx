import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorialSeoLanding } from "@/components/editorial-seo-landing";
import { getStaticRouteSeoPage } from "@/lib/static-route-seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const routePath = "/ho-chi-minh/date-restaurants";

export function generateMetadata(): Metadata {
  const page = getStaticRouteSeoPage(routePath);
  if (!page) return {};
  const url = `${SITE_URL}${routePath}`;
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${page.title} | ${SITE_NAME}`,
      description: page.metaDescription,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
    },
  };
}

export default function HoChiMinhDateRestaurantsPage() {
  const page = getStaticRouteSeoPage(routePath);
  if (!page) notFound();
  return <EditorialSeoLanding page={page} />;
}
