import type { Metadata } from "next";
import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { SearchSuggestBox } from "@/components/search-suggest-box";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { editorialSeoPages } from "@/lib/editorial-seo";
import { getAllGuides } from "@/lib/guides";
import { getAllListings } from "@/lib/places";
import { categoryHubPages } from "@/lib/seo-hubs";
import { popularSearches, SITE_URL } from "@/lib/site";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = {
  title: "검색",
  description: "베트남 생활에 필요한 맛집, 병원, 구인구직, 부동산, 중고거래, 여행, 생활정보를 검색하세요.",
  alternates: { canonical: `${SITE_URL}/search` },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const normalizedQuery = query.toLowerCase();
  const results = query
    ? getAllListings()
        .filter((listing) => listing.searchText.includes(normalizedQuery))
        .slice(0, 30)
    : [];
  const contentResults = query ? getContentResults(query).slice(0, 12) : [];
  const suggestions = getSearchSuggestions();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <SectionHeading
        eyebrow="검색"
        title="무엇을 찾고 계신가요?"
        description="지역, 메뉴, 업종, 부동산, 구인구직, 후기 키워드로 베트남 생활 정보를 찾습니다."
      />
      <SearchSuggestBox suggestions={suggestions} defaultValue={query} placeholder="호치민 짬뽕, 베트남 부동산, 한국인 병원" />

      {query ? (
        <section className="mt-10">
          <SectionHeading eyebrow="콘텐츠 결과" title={`"${query}"와 연결되는 SEO 페이지`} />
          {contentResults.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {contentResults.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-5">
                      <Badge>{item.badge}</Badge>
                      <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{item.title}</h2>
                      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{item.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#dfe5d8] bg-[#f8faf4] p-6">
              <p className="text-sm font-semibold leading-6 text-[#647067]">연결된 콘텐츠 페이지는 아직 없습니다. 아래 업체 결과를 확인하세요.</p>
            </div>
          )}

          <div className="mt-10">
            <SectionHeading eyebrow="업체 결과" title={`"${query}" 업체 ${results.length}개`} />
          </div>
          {results.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#dfe5d8] bg-[#f8faf4] p-6">
              <p className="text-lg font-extrabold text-[#16231d]">아직 데이터가 없습니다</p>
              <p className="mt-2 text-sm leading-6 text-[#647067]">
                이 검색어는 생활정보 또는 제보 랜딩으로 먼저 축적합니다. 도시와 카테고리를 조금 넓혀 다시 검색해보세요.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-10">
          <SectionHeading eyebrow="인기 검색어" title="빠르게 시작하기" />
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                <Badge className="bg-white px-4 py-2 text-sm hover:border-[#0b6b43]">{term}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function getSearchSuggestions() {
  return [
    ...editorialSeoPages.map((page) => ({ label: page.eyebrow, href: `/${page.slug}` })),
    ...editorialSeoPages.map((page) => ({ label: page.title.replace(/\s\|.+$/, ""), href: `/${page.slug}` })),
    ...categoryHubPages.map((page) => ({ label: page.label, href: `/category/${page.slug}` })),
    ...getAllGuides()
      .slice(0, 20)
      .map((guide) => ({ label: guide.title, href: `/article/${guide.slug}` })),
    ...popularSearches.map((label) => ({ label })),
  ];
}

function getContentResults(query: string) {
  const normalized = query.toLowerCase();
  const seoResults = editorialSeoPages
    .filter((page) => [page.title, page.eyebrow, page.summary, page.metaDescription].join(" ").toLowerCase().includes(normalized))
    .map((page) => ({ title: page.title, description: page.summary, href: `/${page.slug}`, badge: page.eyebrow }));
  const hubResults = categoryHubPages
    .filter((page) => [page.title, page.label, page.summary, ...page.searchExamples].join(" ").toLowerCase().includes(normalized))
    .map((page) => ({ title: page.title, description: page.summary, href: `/category/${page.slug}`, badge: page.label }));
  const guideResults = getAllGuides()
    .filter((guide) => [guide.title, guide.description, ...guide.keywords].join(" ").toLowerCase().includes(normalized))
    .map((guide) => ({ title: guide.title, description: guide.description, href: `/article/${guide.slug}`, badge: guide.cityName || "가이드" }));

  return [...seoResults, ...hubResults, ...guideResults];
}
