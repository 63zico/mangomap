import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Building2, ClipboardList, MessageSquareText, Search, ShoppingBag, Utensils } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { EditorialSeoLanding } from "@/components/editorial-seo-landing";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { editorialSeoUrl, getEditorialSeoPageBySlug, getEditorialSeoPageSlugs } from "@/lib/editorial-seo";
import { getAllGuides } from "@/lib/guides";
import { getCityStats, getListingsForRoute } from "@/lib/places";
import { getSeedPostUrlByHref } from "@/lib/seed-posts";
import {
  allCities,
  communityPosts,
  getCityBySlug,
  jobPosts,
  popularSearches,
  priceReportPosts,
  realEstatePosts,
  SITE_NAME,
  SITE_URL,
  usedMarketPosts,
} from "@/lib/site";

type PageProps = {
  params: Promise<{ city: string }>;
};

const cityCategoryCards = [
  { slug: "restaurants", label: "맛집", icon: Utensils, description: "한식, 로컬 맛집, 카페, 가족 식사 후보" },
  { slug: "jobs", label: "구인구직", icon: BriefcaseBusiness, description: "한인 매장 채용, 통역, 파트타임, 급여 조건" },
  { slug: "real-estate", label: "부동산", icon: Building2, description: "월세, 단기 임대, 원룸, 아파트, 가게 양도" },
  { slug: "used-market", label: "중고거래", icon: ShoppingBag, description: "오토바이, 가전, 가구, 귀국정리 물품" },
  { slug: "community", label: "커뮤니티", icon: MessageSquareText, description: "동네 질문, 후기, 가격 변화, 현지 제보" },
  { slug: "life-info", label: "생활정보", icon: ClipboardList, description: "비자, 은행, 통신, 집 구하기 체크리스트" },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return [...allCities.map((city) => ({ city: city.slug })), ...getEditorialSeoPageSlugs().map((slug) => ({ city: slug }))];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) {
    const seoPage = getEditorialSeoPageBySlug(citySlug);
    if (!seoPage) return {};

    const url = editorialSeoUrl(seoPage.slug);
    return {
      title: seoPage.title,
      description: seoPage.metaDescription,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title: `${seoPage.title} | ${SITE_NAME}`,
        description: seoPage.metaDescription,
        url,
        siteName: SITE_NAME,
        locale: "ko_KR",
      },
    };
  }

  const url = `${SITE_URL}/${city.slug}`;
  const title = `${city.name} 생활 정보`;
  const description = `${city.name} 맛집, 구인구직, 부동산, 중고거래, 여행, 커뮤니티 정보를 한국인 기준으로 모은 도시 허브입니다.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
    },
  };
}

export default async function CityHubPage({ params }: PageProps) {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) {
    const seoPage = getEditorialSeoPageBySlug(citySlug);
    if (!seoPage) notFound();
    return <EditorialSeoLanding page={seoPage} />;
  }

  const canonical = `${SITE_URL}/${city.slug}`;
  const stats = getCityStats(city.slug);
  const restaurantListings = getListingsForRoute(city.slug, "restaurants", 6);
  const massageListings = getListingsForRoute(city.slug, "massage", 3);
  const cityJobs = jobPosts.filter((post) => post.city === city.name);
  const cityUsed = usedMarketPosts.filter((post) => post.city === city.name);
  const cityRealEstate = realEstatePosts.filter((post) => post.city === city.name);
  const cityCommunity = [...communityPosts, ...priceReportPosts]
    .filter((post) => post.city === city.name)
    .map((post) => ({ ...post, tag: post.category, price: post.excerpt }));
  const allGuides = getAllGuides();
  const guides = [
    ...allGuides.filter((guide) => guide.citySlug === city.slug),
    ...allGuides.filter((guide) => !guide.citySlug),
  ].slice(0, 4);
  const hubSearches = [
    `${city.name} 맛집`,
    `${city.name} 구인구직`,
    `${city.name} 부동산`,
    `${city.name} 중고거래`,
    `${city.name} 마사지`,
    ...popularSearches.filter((term) => term.includes(city.name)).slice(0, 4),
  ];

  const faq = [
    {
      question: `${city.name}에서 한국인이 가장 많이 찾는 정보는 무엇인가요?`,
      answer: "맛집, 병원, 마사지, 구인구직, 중고거래, 부동산, 비자와 은행 같은 생활정보를 가장 많이 찾습니다.",
    },
    {
      question: `${city.name} 구인구직과 중고거래 글은 바로 공개되나요?`,
      answer: "신뢰를 위해 등록 신청 후 운영자 검수를 거쳐 공개하는 구조를 기본으로 합니다.",
    },
    {
      question: `${city.name} 부동산 정보는 어떤 기준으로 확인해야 하나요?`,
      answer: "월세, 보증금, 관리비, 전기요금 단가, 계약 기간, 퇴실 조건, 위치를 먼저 확인해야 합니다.",
    },
  ];

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${city.name} 생활 정보`,
          description: `${city.name} 맛집, 구인구직, 부동산, 중고거래, 여행, 커뮤니티 정보`,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          about: [`${city.name} 맛집`, `${city.name} 구인구직`, `${city.name} 부동산`, `${city.name} 중고거래`],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: city.name, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{city.name}</Badge>
            <Badge className="bg-white">도시 허브</Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">
            {city.name} 한국인 생활 정보
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#42554a]">
            {city.name}에서 필요한 맛집, 구인구직, 부동산, 중고거래, 여행, 커뮤니티 정보를 한 곳에서 확인하세요.
          </p>
          <form action="/search" className="mt-7 max-w-2xl rounded-lg border border-[#dfe5d8] bg-white p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="ml-3 shrink-0 text-[#647067]" size={21} />
              <input
                name="q"
                defaultValue={`${city.name} 맛집`}
                className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold text-[#16231d] outline-none"
              />
              <button className="h-12 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white">검색</button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="요약" title={`${city.name}에서 먼저 볼 정보`} description={city.description} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="업체 데이터" value={`${stats.total}개`} />
          <Fact label="맛집 후보" value={`${stats.restaurants}개`} />
          <Fact label="사진 기반 후보" value={`${restaurantListings.reduce((sum, listing) => sum + listing.photoTotal, 0)}장+`} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="카테고리" title={`${city.name} 생활 카테고리`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cityCategoryCards.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.slug} href={`/${city.slug}/${category.slug}`}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#edf5ea] text-[#0b6b43]">
                        <Icon size={20} />
                      </span>
                      <ArrowRight size={18} className="text-[#0b6b43]" />
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold text-[#16231d]">{category.label}</h2>
                    <p className="mt-3 text-sm leading-6 text-[#647067]">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="인기 검색" title={`${city.name}에서 자주 찾는 키워드`} />
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(hubSearches)).map((term) => (
            <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
              <Badge className="bg-white px-4 py-2 text-sm hover:border-[#0b6b43]">{term}</Badge>
            </Link>
          ))}
        </div>
      </section>

      {restaurantListings.length > 0 ? (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="맛집" title={`${city.name}에서 많이 보는 맛집`} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {restaurantListings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} priority={index < 3} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="생활 게시판" title={`${city.name} 구인구직 · 부동산 · 중고거래 · 커뮤니티`} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PostColumn title="구인구직" href={`/${city.slug}/jobs`} items={cityJobs} empty={`${city.name} 구인구직 제보를 기다립니다.`} />
          <PostColumn title="부동산" href={`/${city.slug}/real-estate`} items={cityRealEstate} empty={`${city.name} 부동산 제보를 기다립니다.`} />
          <PostColumn title="중고거래" href={`/${city.slug}/used-market`} items={cityUsed} empty={`${city.name} 중고거래 제보를 기다립니다.`} />
          <PostColumn title="커뮤니티" href={`/${city.slug}/community`} items={cityCommunity} empty={`${city.name} 생활 질문을 기다립니다.`} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="가이드" title={`${city.name} 생활과 함께 보는 글`} />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/guide/${guide.slug}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <Badge>{guide.cityName || "베트남"}</Badge>
                  <h2 className="mt-4 text-base font-extrabold text-[#16231d]">{guide.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#647067]">{guide.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {massageListings.length > 0
            ? massageListings.slice(0, 1).map((listing) => (
                <Link key={listing.id} href={`/listing/${listing.slug}`}>
                  <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-5">
                      <Badge>마사지</Badge>
                      <h2 className="mt-4 text-base font-extrabold text-[#16231d]">{listing.name}</h2>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#647067]">{listing.summary}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="FAQ" title={`${city.name} 생활 정보 FAQ`} />
        <div className="grid gap-3 md:grid-cols-3">
          {faq.map((item) => (
            <Card key={item.question}>
              <CardContent className="p-5">
                <h2 className="text-base font-extrabold text-[#16231d]">{item.question}</h2>
                <p className="mt-3 text-sm leading-6 text-[#647067]">{item.answer}</p>
              </CardContent>
            </Card>
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

function PostColumn({
  title,
  href,
  items,
  empty,
}: {
  title: string;
  href: string;
  items: Array<{ title: string; city: string; status: string; date: string; views: number; href: string; tag: string; pay?: string; price?: string }>;
  empty: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge>{title}</Badge>
          <Link href={href} className="text-sm font-bold text-[#0b6b43]">
            더 보기
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {(items.length > 0 ? items : [{ title: empty, city: "", status: "제보 대기", date: "오늘", views: 0, href: "/submit", tag: "등록 신청" }]).map((item) => {
            const href = getSeedPostUrlByHref(item.href) ?? item.href;

            return (
              <Link key={`${title}-${item.href}-${item.title}`} href={href} className="rounded-md border border-[#edf0e7] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white">{item.status}</Badge>
                  <span className="text-xs font-bold text-[#8a968d]">{item.date}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-extrabold leading-6 text-[#16231d]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-[#0b6b43]">{item.pay || item.price || item.tag}</p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
