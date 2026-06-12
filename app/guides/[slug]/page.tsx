import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, MapPin, MessageSquareText, Star } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import {
  getGuideCanonicalUrl,
  getSeoGuideBySlug,
  getSeoGuidePage,
  normalizeGuideFaq,
  normalizeGuideSections,
  type SeoGuideRestaurantRecord,
} from "@/lib/seo-guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSeoGuideBySlug(slug);
  if (!page) return {};

  const canonical = getGuideCanonicalUrl(page.slug);
  const title = page.title || page.h1 || page.primary_keyword;
  const description = page.meta_description || page.summary;
  const firstKeyword = Array.isArray(page.secondary_keywords) ? page.secondary_keywords[0] : page.primary_keyword;

  return {
    title,
    description,
    keywords: [page.primary_keyword, firstKeyword].filter(Boolean) as string[],
    alternates: { canonical },
    robots: page.noindex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      type: "article",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "ko_KR",
      publishedTime: page.published_at ?? undefined,
      modifiedTime: page.updated_at ?? page.published_at ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SeoGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSeoGuidePage(slug);
  if (!data) notFound();

  const { page, restaurants, relatedGuides } = data;
  const canonical = getGuideCanonicalUrl(page.slug);
  const faq = normalizeGuideFaq(page.faq_json);
  const sections = normalizeGuideSections(page.body_sections);
  const topRestaurants = restaurants.slice(0, 12);
  const relatedRestaurants = restaurants.slice(12, 20);

  return (
    <main className="bg-[#f7f7f2] text-[#171717]">
      <JsonLd data={buildFaqJsonLd(faq)} />
      <JsonLd data={buildBreadcrumbJsonLd(page.h1, canonical)} />
      <JsonLd data={buildItemListJsonLd(page.h1, canonical, topRestaurants)} />
      <JsonLd data={buildArticleJsonLd(page, canonical)} />

      <section className="border-b border-[#d9d9d2] bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-12 md:grid-cols-[0.7fr_1fr] md:px-8 md:py-16">
          <div className="flex flex-col justify-between gap-8 border-t-8 border-[#0869f2] pt-7">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff9800]">Mango SEO Guide</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-normal md:text-7xl">
                {page.h1}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em]">
              {page.city ? <span className="border border-[#171717] px-3 py-2">{page.city}</span> : null}
              {page.district ? <span className="border border-[#171717] px-3 py-2">{page.district}</span> : null}
              {page.category ? <span className="border border-[#171717] px-3 py-2">{page.category}</span> : null}
            </div>
          </div>

          <div className="flex flex-col justify-end gap-7">
            <p className="max-w-3xl text-xl font-bold leading-9 md:text-2xl">{page.summary}</p>
            <div className="grid gap-3 border-t border-[#d9d9d2] pt-5 text-sm font-bold leading-7 text-[#3d3d3d] md:grid-cols-3">
              <span>추천 후보 {restaurants.length}곳</span>
              <span>FAQ {faq.length}개</span>
              <span>업데이트 {formatDate(page.updated_at ?? page.published_at)}</span>
            </div>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
        <section className="grid gap-8 lg:grid-cols-[0.65fr_1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0869f2]">Why This Guide</p>
            <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">검색 의도에 맞춘 베트남 맛집 가이드</h2>
          </div>
          <div className="space-y-6 text-lg font-semibold leading-9 text-[#333]">
            <p>
              {page.primary_keyword}을 검색하는 사람은 단순한 업체 목록보다 위치, 메뉴 성격, 후기 수,
              사진, 이동 동선을 한 번에 비교할 수 있는 정보를 원합니다.
            </p>
            <p>
              Mango Vietnam은 수집된 식당 데이터와 지역 정보를 묶어 한국인이 실패 확률을 줄일 수 있는
              후보부터 보여줍니다.
            </p>
          </div>
        </section>

        {sections.length ? (
          <section className="mt-14 grid gap-4 md:grid-cols-2">
            {sections.slice(0, 4).map((section) => (
              <div key={`${section.heading}-${section.body}`} className="border-t-4 border-[#171717] bg-white p-6">
                <h2 className="text-2xl font-black leading-tight">{section.heading}</h2>
                {section.body ? <p className="mt-4 text-base font-semibold leading-8 text-[#4a4a4a]">{section.body}</p> : null}
                {section.items.length ? (
                  <ul className="mt-5 space-y-3">
                    {section.items.slice(0, 5).map((item) => (
                      <li key={item} className="flex gap-3 text-sm font-bold leading-6 text-[#222]">
                        <span className="mt-2 h-2 w-2 shrink-0 bg-[#0869f2]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        <section className="mt-16">
          <div className="border-t-8 border-[#0869f2] pt-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff9800]">Restaurant List</p>
            <h2 className="mt-2 text-4xl font-black md:text-6xl">추천 맛집 리스트</h2>
          </div>

          <div className="mt-8 space-y-6">
            {topRestaurants.map((restaurant) => (
              <RestaurantGuideCard key={restaurant.slug} restaurant={restaurant} />
            ))}
          </div>
        </section>

        <section className="mt-16 border-y border-[#cfcfc8] py-10">
          <div className="grid gap-8 md:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0869f2]">Before You Go</p>
              <h2 className="mt-3 text-3xl font-black leading-tight">방문 전 참고할 점</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "운영시간과 휴무일은 방문 직전에 다시 확인하세요.",
                "관광지 근처는 피크 시간대 대기가 생길 수 있습니다.",
                "사진, 후기 수, 주소를 함께 보고 동선을 잡는 것이 좋습니다.",
                "가격대와 대표 메뉴가 불분명하면 먼저 문의 후 이동하세요.",
              ].map((item) => (
                <div key={item} className="bg-white p-5 text-base font-bold leading-7">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {faq.length ? (
          <section className="mt-16">
            <div className="border-t-8 border-[#171717] pt-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff9800]">FAQ</p>
              <h2 className="mt-2 text-4xl font-black md:text-5xl">자주 묻는 질문</h2>
            </div>
            <div className="mt-8 grid gap-4">
              {faq.map((item) => (
                <details key={item.question} className="group bg-white p-6">
                  <summary className="cursor-pointer list-none text-xl font-black leading-tight">
                    {item.question}
                  </summary>
                  <p className="mt-4 text-base font-semibold leading-8 text-[#4a4a4a]">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {relatedGuides.length ? (
          <section className="mt-16">
            <div className="border-t-8 border-[#0869f2] pt-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff9800]">Related Guides</p>
              <h2 className="mt-2 text-4xl font-black md:text-5xl">관련 가이드</h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {relatedGuides.slice(0, 8).map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group flex min-h-32 flex-col justify-between bg-white p-6 transition hover:-translate-y-1 hover:bg-[#fff7df]"
                >
                  <span className="text-2xl font-black leading-tight group-hover:text-[#0869f2]">{guide.label}</span>
                  {guide.reason ? <span className="mt-4 text-sm font-bold leading-6 text-[#555]">{guide.reason}</span> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedRestaurants.length ? (
          <section className="mt-16">
            <div className="border-t-8 border-[#171717] pt-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ff9800]">More Restaurants</p>
              <h2 className="mt-2 text-4xl font-black md:text-5xl">관련 맛집</h2>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {relatedRestaurants.map((restaurant) => (
                <RestaurantMiniCard key={restaurant.slug} restaurant={restaurant} />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}

function RestaurantGuideCard({ restaurant }: { restaurant: SeoGuideRestaurantRecord }) {
  return (
    <Link
      href={`/listing/${restaurant.slug}`}
      className="group grid overflow-hidden bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:grid-cols-[360px_1fr]"
    >
      <div className="relative min-h-64 overflow-hidden bg-[#e5e5dc] md:min-h-72">
        {restaurant.featured_image ? (
          <img
            src={restaurant.featured_image}
            alt={`${restaurant.name} 대표 사진`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#ffe04b] text-5xl font-black">MANGO</div>
        )}
        {restaurant.rank ? (
          <span className="absolute left-4 top-4 bg-[#ffe04b] px-3 py-2 text-lg font-black">#{restaurant.rank}</span>
        ) : null}
      </div>

      <div className="flex flex-col justify-between gap-7 p-6 md:p-8">
        <div>
          <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em]">
            {restaurant.category ? <span>{restaurant.category}</span> : null}
            {restaurant.district ? <span className="text-[#0869f2]">{restaurant.district}</span> : null}
          </div>
          <h3 className="mt-4 text-3xl font-black leading-tight transition group-hover:text-[#0869f2] md:text-4xl">
            {restaurant.name}
          </h3>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[#444]">
            {restaurant.reason || restaurant.seo_description || restaurant.description || "방문 전 위치와 후기 수를 함께 비교해볼 만한 식당입니다."}
          </p>
        </div>

        <div className="grid gap-3 text-sm font-black text-[#222] md:grid-cols-3">
          <span className="inline-flex items-center gap-2">
            <Star size={17} fill="#ffe04b" />
            {formatRating(restaurant.rating)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MessageSquareText size={17} />
            후기 {formatCount(restaurant.review_count)}
          </span>
          <span className="inline-flex items-center gap-2 text-[#0869f2]">
            상세 보기
            <ArrowRight size={17} />
          </span>
        </div>
        {restaurant.address ? (
          <p className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-[#555]">
            <MapPin className="mt-1 shrink-0" size={16} />
            {restaurant.address}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function RestaurantMiniCard({ restaurant }: { restaurant: SeoGuideRestaurantRecord }) {
  return (
    <Link href={`/listing/${restaurant.slug}`} className="group flex gap-4 bg-white p-4">
      <div className="h-24 w-28 shrink-0 overflow-hidden bg-[#e5e5dc]">
        {restaurant.featured_image ? (
          <img src={restaurant.featured_image} alt={`${restaurant.name} 사진`} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : null}
      </div>
      <div>
        <h3 className="text-xl font-black leading-tight group-hover:text-[#0869f2]">{restaurant.name}</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-[#555]">{restaurant.reason || restaurant.district || restaurant.category}</p>
      </div>
    </Link>
  );
}

function buildFaqJsonLd(faq: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function buildBreadcrumbJsonLd(title: string, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  };
}

function buildItemListJsonLd(title: string, canonical: string, restaurants: SeoGuideRestaurantRecord[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    url: canonical,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.map((restaurant, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": restaurant.category?.toLowerCase().includes("cafe") ? "CafeOrCoffeeShop" : "Restaurant",
        name: restaurant.name,
        url: `${SITE_URL}/listing/${restaurant.slug}`,
        image: restaurant.featured_image ? absoluteImageUrl(restaurant.featured_image) : undefined,
        address: restaurant.address || undefined,
        telephone: restaurant.phone || undefined,
        aggregateRating: typeof restaurant.rating === "number" && typeof restaurant.review_count === "number"
          ? {
              "@type": "AggregateRating",
              ratingValue: restaurant.rating,
              reviewCount: restaurant.review_count,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
      },
    })),
  };
}

function buildArticleJsonLd(page: { title: string; h1: string; summary: string; primary_keyword: string; published_at?: string | null; updated_at?: string | null }, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1 || page.title,
    description: page.summary,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: "ko-KR",
    keywords: page.primary_keyword,
    datePublished: page.published_at ?? undefined,
    dateModified: page.updated_at ?? page.published_at ?? undefined,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

function absoluteImageUrl(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith("/") ? src : `/${src}`}`;
}

function formatRating(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "정보 확인 중";
}

function formatCount(value: number | null | undefined) {
  if (typeof value !== "number") return "0";
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "자동 업데이트";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "자동 업데이트";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(date);
}
