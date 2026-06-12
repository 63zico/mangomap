import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SearchSuggestBox } from "@/components/search-suggest-box";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCityStats } from "@/lib/places";
import { allCities, getCityBySlug, SITE_NAME, SITE_URL } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const cityCategories = [
  { label: "맛집", href: "restaurants" },
  { label: "한식당", href: "korean-restaurants" },
  { label: "카페", href: "cafes" },
  { label: "마사지", href: "massage" },
  { label: "병원", href: "hospitals" },
  { label: "구인구직", href: "jobs" },
  { label: "중고거래", href: "used-market" },
  { label: "생활정보", href: "life-info" },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return allCities.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const url = `${SITE_URL}/city/${city.slug}`;
  const title = `${city.name} 한국인 생활 검색`;
  const description = `${city.name} 맛집, 병원, 미용실, 비자, 구인구직, 중고거래, 생활정보를 한국인 기준으로 찾는 도시 허브입니다.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: "ko_KR" },
  };
}

export default async function CityAliasPage({ params }: PageProps) {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const stats = getCityStats(city.slug);
  const canonical = `${SITE_URL}/city/${city.slug}`;
  const suggestions = [
    { label: `${city.name} 맛집`, href: `/${city.slug}/restaurants` },
    { label: `${city.name} 한식당`, href: `/${city.slug}/korean-restaurants` },
    { label: `${city.name} 마사지`, href: `/${city.slug}/massage` },
    { label: `${city.name} 구인구직`, href: `/${city.slug}/jobs` },
    { label: `${city.name} 중고거래`, href: `/${city.slug}/used-market` },
  ];

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${city.name} 한국인 생활 검색`,
          description: `${city.name} 생활정보 도시 허브`,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <Badge>{city.name}</Badge>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight text-[#16231d] md:text-5xl">{city.name} 한국인 생활 검색</h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#42554a]">맛집, 병원, 미용실, 비자, 구인구직, 중고거래를 도시 기준으로 찾습니다.</p>
          <div className="mt-7 max-w-3xl">
            <SearchSuggestBox suggestions={suggestions} placeholder={`${city.name} 맛집, ${city.name} 병원, ${city.name} 구인구직`} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="요약" title={`${city.name} 데이터 현황`} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="전체 업체" value={`${stats.total}개`} />
          <Fact label="맛집" value={`${stats.restaurants}개`} />
          <Fact label="마사지" value={`${stats.massage}개`} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="카테고리" title={`${city.name}에서 바로 찾기`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cityCategories.map((category) => (
            <Link key={category.href} href={`/${city.slug}/${category.href}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold text-[#16231d]">{category.label}</h2>
                    <ArrowRight size={18} className="text-[#0b6b43]" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dfe5d8] bg-white p-5">
      <p className="text-sm font-bold text-[#647067]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#16231d]">{value}</p>
    </div>
  );
}
