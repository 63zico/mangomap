import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Layers3, MapPin, Search } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { editorialSeoPages } from "@/lib/editorial-seo";
import { getAllGuides } from "@/lib/guides";
import { categoryHubPages } from "@/lib/seo-hubs";
import { allCities, categories, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "베트남 한국인 검색어 지도",
  description: "호치민 맛집, 다낭 마사지, 베트남 비자, 중고거래, 구인구직처럼 Mango Vietnam이 다루는 한국인 베트남 생활 검색어를 한곳에 모았습니다.",
  alternates: { canonical: `${SITE_URL}/topics` },
  openGraph: {
    type: "website",
    title: `베트남 한국인 검색어 지도 | ${SITE_NAME}`,
    description: "Mango Vietnam의 도시, 카테고리, SEO 랜딩 페이지, 생활 가이드 전체를 연결한 검색 허브입니다.",
    url: `${SITE_URL}/topics`,
    siteName: SITE_NAME,
    locale: "ko_KR",
  },
};

const priorityCategorySlugs = ["restaurants", "massage", "hospitals", "hair-salons", "jobs", "used-market", "real-estate", "life-info"];

const searchClusters = [
  {
    title: "맛집 검색",
    description: "호치민 맛집, 짬뽕, 해장, 혼밥, 부이비엔, 벤탄시장처럼 식사 결정에 가까운 검색어",
    links: ["ho-chi-minh-best-restaurants", "ho-chi-minh-jjamppong", "ho-chi-minh-hangover-food", "ho-chi-minh-solo-dining", "bui-vien-restaurants", "ben-thanh-restaurants"],
  },
  {
    title: "생활 필수",
    description: "병원, 비자, 은행, 통신, 집 구하기처럼 저장하고 다시 보는 정보",
    links: ["vietnam-hospitals", "vietnam-visa-extension"],
    guideSlugs: ["vietnam-bank-account-koreans", "vietnam-mobile-internet", "vietnam-house-rent-checklist"],
  },
  {
    title: "거래와 일자리",
    description: "중고 오토바이, 귀국정리, 구인구직, 파트타임처럼 재방문과 제보가 쌓이는 검색어",
    links: ["vietnam-used-market"],
    guideSlugs: ["vietnam-used-motorbike-checklist", "vietnam-moving-sale-used-market", "vietnam-korean-jobs"],
  },
  {
    title: "여행 동선",
    description: "다낭 맛집, 마사지, 스파, 저녁 동선처럼 여행자가 바로 결정해야 하는 검색어",
    links: ["da-nang-best-restaurants"],
    guideSlugs: ["da-nang-massage-price", "ho-chi-minh-1day-korean-food-massage", "da-nang-family-3days"],
  },
];

export default function TopicsPage() {
  const guides = getAllGuides();
  const guideMap = new Map(guides.map((guide) => [guide.slug, guide]));
  const seoMap = new Map(editorialSeoPages.map((page) => [page.slug, page]));
  const priorityCategories = priorityCategorySlugs.map((slug) => categories.find((category) => category.slug === slug)).filter(Boolean);
  const canonical = `${SITE_URL}/topics`;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "베트남 한국인 검색어 지도",
          description: metadata.description,
          url: canonical,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          inLanguage: "ko-KR",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: editorialSeoPages.slice(0, 24).map((page, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: page.title,
              url: `${SITE_URL}/${page.slug}`,
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "검색어 지도", item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>SEO 허브</Badge>
            <Badge className="bg-white">도시·카테고리·가이드 연결</Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">
            베트남 한국인 검색어 지도
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#42554a]">
            Mango Vietnam이 다루는 맛집, 마사지, 병원, 비자, 중고거래, 구인구직 페이지를 한 번에 연결합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="도시" title="도시별 생활 허브" description="Google이 도시 주제와 카테고리 주제를 함께 이해하도록 주요 도시 페이지를 묶습니다." />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allCities.map((city) => (
            <Card key={city.slug}>
              <CardContent className="p-5">
                <MapPin className="text-[#0b6b43]" size={22} />
                <h2 className="mt-4 text-xl font-extrabold text-[#16231d]">{city.name}</h2>
                <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-[#647067]">{city.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <TopicLink href={`/${city.slug}`} label="도시 페이지" />
                  <TopicLink href={`/city/${city.slug}`} label="도시 허브" />
                  <TopicLink href={`/${city.slug}/restaurants`} label="맛집" />
                  <TopicLink href={`/${city.slug}/massage`} label="마사지" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow="카테고리" title="반복 검색이 생기는 생활 주제" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {priorityCategories.map((category) => (
              <Link key={category!.slug} href={categoryHref(category!.slug)}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Layers3 className="text-[#0b6b43]" size={22} />
                      <ArrowRight size={18} className="text-[#0b6b43]" />
                    </div>
                    <h2 className="mt-4 text-lg font-extrabold text-[#16231d]">{category!.label}</h2>
                    <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{category!.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="검색 의도" title="Mango가 먼저 잡아야 할 SEO 묶음" />
        <div className="grid gap-4 md:grid-cols-2">
          {searchClusters.map((cluster) => (
            <Card key={cluster.title}>
              <CardContent className="p-6">
                <Search className="text-[#0b6b43]" size={22} />
                <h2 className="mt-4 text-xl font-extrabold text-[#16231d]">{cluster.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#647067]">{cluster.description}</p>
                <div className="mt-5 grid gap-2">
                  {cluster.links.map((slug) => {
                    const page = seoMap.get(slug);
                    if (!page) return null;
                    return <InlineLink key={slug} href={`/${slug}`} label={page.title} />;
                  })}
                  {(cluster.guideSlugs ?? []).map((slug) => {
                    const guide = guideMap.get(slug);
                    if (!guide) return null;
                    return <InlineLink key={slug} href={`/article/${slug}`} label={guide.title} />;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow="SEO 랜딩" title="검색 결과에 직접 노출될 대표 페이지" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {editorialSeoPages.map((page) => (
              <Link key={page.slug} href={`/${page.slug}`} className="rounded-lg border border-[#e3e8dc] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Badge>{page.eyebrow}</Badge>
                <h2 className="mt-3 text-base font-extrabold leading-6 text-[#16231d]">{page.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#647067]">{page.metaDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="가이드" title="저장하고 다시 보는 생활 글" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {guides.slice(0, 18).map((guide) => (
            <Link key={guide.slug} href={`/article/${guide.slug}`} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <FileText className="text-[#0b6b43]" size={21} />
              <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{guide.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{guide.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#f8faf4] py-10">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow="허브" title="카테고리 검색 허브 전체" />
          <div className="flex flex-wrap gap-2">
            {categoryHubPages.map((page) => (
              <Link key={page.slug} href={`/category/${page.slug}`}>
                <Badge className="bg-white px-3 py-1.5 hover:border-[#0b6b43]">{page.label}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function TopicLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Badge className="bg-white hover:border-[#0b6b43]">{label}</Badge>
    </Link>
  );
}

function InlineLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-3 rounded-md border border-[#e3e8dc] bg-[#fffdf8] px-4 py-3 text-sm font-extrabold text-[#16231d] hover:border-[#0b6b43]">
      <span>{label}</span>
      <ArrowRight size={15} className="shrink-0 text-[#0b6b43] transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function categoryHref(slug: string) {
  const hubMap: Record<string, string> = {
    restaurants: "/category/restaurants",
    massage: "/category/massage",
    hospitals: "/category/hospital",
    "hair-salons": "/category/beauty",
    "life-info": "/category/life",
  };

  return hubMap[slug] ?? `/ho-chi-minh/${slug}`;
}
