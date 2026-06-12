import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ListFilter,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
  Star,
  WalletCards,
} from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getGuidesBySlugs } from "@/lib/guides";
import { getListingCopy } from "@/lib/listing-copy";
import { getPlacePhotoSrc } from "@/lib/place-photos";
import { getSeedPostUrlByHref } from "@/lib/seed-posts";
import { getCategorySeoContent } from "@/lib/seo-content";
import {
  categoryLabelForListing,
  getCityStats,
  getKoreanFitScore,
  getListingsForRoute,
  getRestaurantDecisionTags,
  getRouteParams,
  isRestaurantCategorySlug,
  type Listing,
} from "@/lib/places";
import {
  communityPosts,
  getCategoryBySlug,
  getCityBySlug,
  jobPosts,
  lifeInfoPosts,
  priceReportPosts,
  realEstatePosts,
  SITE_NAME,
  SITE_URL,
  usedMarketPosts,
} from "@/lib/site";
import { formatCount } from "@/lib/utils";

type PageProps = {
  params: Promise<{ city: string; category: string }>;
};

type SeedItem = {
  title: string;
  description: string;
  href?: string | null;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getRouteParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;
  const city = getCityBySlug(citySlug);
  const category = getCategoryBySlug(categorySlug);
  if (!city || !category) return {};

  const stats = getCityStats(city.slug);
  const listings = getListingsForRoute(city.slug, category.slug);
  const seo = getCategorySeoContent(city, category, stats, listings.length);
  const title = seo.metaTitle ?? `${city.name} ${category.label}`;
  const url = `${SITE_URL}/${city.slug}/${category.slug}`;

  return {
    title,
    description: seo.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description: seo.metaDescription,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { city: citySlug, category: categorySlug } = await params;
  const city = getCityBySlug(citySlug);
  const category = getCategoryBySlug(categorySlug);
  if (!city || !category) notFound();

  const listings = getListingsForRoute(city.slug, category.slug);
  const stats = getCityStats(city.slug);
  const seo = getCategorySeoContent(city, category, stats, listings.length);
  const relatedGuides = getGuidesBySlugs([`${city.slug}-${category.slug}-guide`, ...seo.relatedGuideSlugs]);
  const canonical = `${SITE_URL}/${city.slug}/${category.slug}`;
  const isRestaurantLanding = isRestaurantCategorySlug(category.slug);

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${city.name} ${category.label}`,
          description: seo.metaDescription,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          about: category.searchIntent,
          mainEntity: {
            "@type": "ItemList",
            name: seo.h1 ?? `${city.name} ${category.label}`,
            itemListElement: listings.slice(0, 20).map((listing, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${SITE_URL}/listing/${listing.slug}`,
              name: listing.name,
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: seo.faq.map((item) => ({
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
            { "@type": "ListItem", position: 2, name: city.name, item: `${SITE_URL}/${city.slug}` },
            { "@type": "ListItem", position: 3, name: category.label, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{city.name}</Badge>
            <Badge>{category.label}</Badge>
            <Badge className="bg-white">{isRestaurantLanding ? "한국인 기준 추천" : "비교 가이드"}</Badge>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">
            {seo.h1 ?? `${city.name} ${category.label}`}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#42554a]">{seo.intro}</p>
          <form action="/search" className="mt-7 max-w-2xl rounded-lg border border-[#dfe5d8] bg-white p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="ml-3 shrink-0 text-[#647067]" size={21} />
              <input
                name="q"
                defaultValue={`${city.name} ${category.label}`}
                className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold text-[#16231d] outline-none"
              />
              <button className="h-12 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white">검색</button>
            </div>
          </form>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label={isRestaurantLanding ? "도시 전체 업체" : "전체 업체"} value={`${stats.total}개`} />
            <Metric label={isRestaurantLanding ? "맛집 후보" : "현재 목록"} value={`${listings.length}개`} />
            <Metric label="관련 사진" value={`${listings.reduce((sum, listing) => sum + listing.photoTotal, 0)}장`} />
          </div>
          {isRestaurantLanding ? (
            <RestaurantFastAnswer citySlug={city.slug} cityName={city.name} listings={listings} summaries={seo.aiSummary} />
          ) : null}
        </div>
      </section>

      {isRestaurantLanding ? (
        <>
          <RestaurantFilterSection citySlug={city.slug} cityName={city.name} currentSlug={category.slug} />
        </>
      ) : null}

      {isRestaurantLanding ? (
        <RestaurantChoiceStrip checklist={seo.checklist} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="p-6">
                <SectionHeading eyebrow="선택 기준" title={`${city.name} ${category.label}${objectParticle(category.label)} 찾을 때 중요한 기준`} />
                <div className="space-y-4 text-sm leading-7 text-[#42554a] md:text-base">
                  {seo.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <SectionHeading eyebrow="체크리스트" title="방문 전 확인할 것" />
                <div className="grid gap-3">
                  {seo.checklist.map((item) => (
                    <div key={item} className="flex gap-3 rounded-md border border-[#edf0e7] bg-[#fffdf8] p-4">
                      <ClipboardCheck className="mt-0.5 shrink-0 text-[#0b6b43]" size={18} />
                      <p className="text-sm font-semibold leading-6 text-[#16231d]">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10">
        {listings.length > 0 ? (
          isRestaurantLanding ? (
            <InfatuationRestaurantListExperience cityName={city.name} listings={listings} />
          ) : (
            <>
              <SectionHeading
                eyebrow="추천 목록"
                title={`${city.name}에서 바로 비교할 수 있는 ${category.label}`}
                description="평점, 사진, 후기, 한국인 참고 신호를 기준으로 먼저 보여줍니다."
              />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listings.slice(0, 24).map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} priority={index < 3} />
                ))}
              </div>
            </>
          )
        ) : (
          <EmptyLanding cityName={city.name} categorySlug={category.slug} categoryLabel={category.label} />
        )}
      </section>

      {relatedGuides.length > 0 ? (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="생활 가이드" title={`${city.name} 생활 검색과 함께 보는 글`} />
            <div className="grid gap-3 md:grid-cols-3">
              {relatedGuides.map((guide) => (
                <Link key={guide.slug} href={`/guide/${guide.slug}`}>
                  <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-5">
                      <Badge>{guide.cityName || "베트남"}</Badge>
                      <h3 className="mt-4 text-lg font-extrabold text-[#16231d]">{guide.title}</h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#647067]">{guide.description}</p>
                      <p className="mt-4 text-sm font-bold text-[#0b6b43]">가이드 보기</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {isRestaurantLanding ? <RestaurantRelatedLinks citySlug={city.slug} cityName={city.name} /> : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="FAQ" title={`${city.name} ${category.label} 자주 묻는 질문`} />
        <div className="grid gap-3 md:grid-cols-2">
          {seo.faq.map((item) => (
            <Card key={item.question}>
              <CardContent className="p-5">
                <h3 className="text-base font-extrabold text-[#16231d]">{item.question}</h3>
                <p className="mt-3 text-sm leading-6 text-[#647067]">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow="다음 검색" title={`${city.name}에서 함께 찾는 생활 정보`} />
          <div className="grid gap-3 md:grid-cols-3">
            {["restaurants", "jobs", "real-estate", "used-market", "massage", "hospitals", "community"].map((slug) => {
              const nextCategory = getCategoryBySlug(slug);
              if (!nextCategory) return null;
              return (
                <Link key={slug} href={`/${city.slug}/${slug}`}>
                  <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <Badge>{nextCategory.label}</Badge>
                        <ArrowRight size={18} className="text-[#0b6b43]" />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[#647067]">{nextCategory.searchIntent}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e3e8dc] bg-white p-4">
      <p className="text-xs font-bold text-[#647067]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#16231d]">{value}</p>
    </div>
  );
}

function RestaurantFastAnswer({
  citySlug,
  cityName,
  listings,
  summaries,
}: {
  citySlug: string;
  cityName: string;
  listings: Listing[];
  summaries: string[];
}) {
  const top = listings[0];
  const korean = findListingByTag(listings, "한식 필요할 때");
  const local = findListingByTag(listings, "로컬 입문");
  const answerItems = [
    { label: "처음 고르면", value: top?.name ?? `${cityName} 대표 맛집`, href: top ? `/listing/${top.slug}` : undefined },
    { label: "한식 필요하면", value: korean?.name ?? `${cityName} 한식당`, href: korean ? `/listing/${korean.slug}` : `/${citySlug}/korean-restaurants` },
    { label: "로컬 입문이면", value: local?.name ?? `${cityName} 로컬 맛집`, href: local ? `/listing/${local.slug}` : undefined },
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-[#dfe5d8] bg-white shadow-sm">
      <div className="grid min-w-0 grid-cols-1 gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 border-b border-[#edf0e7] p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#0b6b43]">빠른 결론</p>
          <div className="mt-4 grid gap-3">
            {answerItems.map((item) => {
              const content = (
                <div className="flex items-center justify-between gap-3 rounded-md bg-[#f8faf4] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#647067]">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-extrabold text-[#16231d]">{item.value}</p>
                  </div>
                  <ArrowRight size={17} className="shrink-0 text-[#0b6b43]" />
                </div>
              );

              return item.href ? (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}
          </div>
        </div>
        <div className="grid min-w-0 gap-3 p-5">
          {summaries.slice(0, 3).map((item) => (
            <p key={item} className="text-sm font-semibold leading-6 text-[#42554a]">
              {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function RestaurantQuickPicks({ cityName, listings }: { cityName: string; listings: Listing[] }) {
  const picks = getQuickPickListings(listings);
  if (picks.length === 0) return null;

  return (
    <section className="bg-white py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Quick Picks"
            title={`${cityName} 맛집, 고민 줄이는 3가지 선택`}
            description="긴 설명보다 먼저 오늘 상황에 맞는 후보를 바로 보여줍니다."
          />
          <Link href="#mango-pick" className="text-sm font-extrabold text-[#0b6b43]">
            Mango Pick 보기
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {picks.map((pick) => (
            <QuickPickCard key={pick.label} {...pick} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickPickCard({ label, listing, reason }: { label: string; listing: Listing; reason: string }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 640, height: 420 });
  const tags = getRestaurantDecisionTags(listing).slice(0, 3);

  return (
    <Link href={`/listing/${listing.slug}`}>
      <article className="group h-full overflow-hidden rounded-lg border border-[#e3e8dc] bg-[#fffdf8] transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative aspect-[16/10] bg-[#edf5ea]">
          {photoSrc ? <img src={photoSrc} alt={`${listing.name} 사진`} className="h-full w-full object-cover" /> : null}
          <div className="absolute left-3 top-3 rounded-md bg-white/95 px-3 py-1 text-xs font-extrabold text-[#0b6b43]">{label}</div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-lg font-extrabold leading-6 text-[#16231d]">{listing.name}</h3>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-[#16231d]">
              <Star size={15} className="fill-[#f6c84c] text-[#f6c84c]" />
              {listing.rating?.toFixed(1) ?? "-"}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#647067]">{reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} className="bg-white">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}

function RestaurantChoiceStrip({ checklist }: { checklist: string[] }) {
  const items = checklist.slice(0, 4);

  return (
    <section className="border-y border-[#e7eadf] bg-[#fffdf8]">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="grid gap-2 md:grid-cols-[140px_1fr] md:items-center">
          <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0b6b43]">
            <CheckCircle2 size={17} />
            방문 전 기준
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item} className="rounded-md border border-[#edf0e7] bg-white px-3 py-2 text-sm font-bold leading-5 text-[#31483e]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RestaurantFilterSection({ citySlug, cityName, currentSlug }: { citySlug: string; cityName: string; currentSlug: string }) {
  const situations = [
    "한식",
    "로컬맛집",
    "카페",
    "해산물",
    "가족식사",
    "혼밥",
    "데이트",
    "아이동반",
    "비오는날",
  ];
  const areaLinks = getRestaurantAreaLinks(citySlug, cityName);

  return (
    <section className="sticky top-[138px] z-30 border-y border-[#e7eadf] bg-[#fffdf8]/95 backdrop-blur lg:top-[64px]">
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#edf8ef] px-3 py-2 text-sm font-extrabold text-[#0b6b43]">
          <ListFilter size={16} />
          필터
        </span>
        {areaLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-bold ${
              item.slug === currentSlug
                ? "border-[#0b6b43] bg-[#0b6b43] text-white"
                : "border-[#dfe5d8] bg-white text-[#31483e] hover:border-[#0b6b43] hover:text-[#0b6b43]"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-1 h-9 w-px shrink-0 bg-[#dfe5d8]" />
        {situations.map((item) => (
          <Link
            key={item}
            href={`/search?q=${encodeURIComponent(`${cityName} ${item} 맛집`)}`}
            className="shrink-0 rounded-md border border-[#eadfbf] bg-[#fff8e4] px-3 py-2 text-sm font-bold text-[#59451d] hover:border-[#0b6b43] hover:text-[#0b6b43]"
          >
            {item}
          </Link>
        ))}
      </div>
    </section>
  );
}

function InfatuationRestaurantListExperience({ cityName, listings }: { cityName: string; listings: Listing[] }) {
  const picks = listings.slice(0, 6);
  const listItems = listings.slice(0, 30);

  return (
    <>
      <div id="mango-pick" className="scroll-mt-32">
        <div className="mb-8">
          <p className="text-3xl font-black uppercase text-[#777]">Mango Picks</p>
          <div className="mt-3 h-[6px] w-28 bg-[#0068f0]" />
          <h2 className="mt-3 max-w-4xl text-5xl font-black leading-[0.95] tracking-normal md:text-6xl">
            {cityName}에서 먼저 볼 맛집
          </h2>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#202020]">
            단순 업체 목록이 아니라 한국인이 실제로 고를 때 필요한 사진, 후기, 위치, 메뉴 신호를 먼저 보여줍니다.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {picks.map((listing, index) => (
            <InfatuationPickCard key={listing.id} listing={listing} rank={index + 1} priority={index < 3} />
          ))}
        </div>
      </div>

      {listItems.length > 0 ? (
        <div className="mt-16 border-t border-[#cfcfcf] pt-10">
          <div className="mb-8">
            <p className="text-3xl font-black uppercase text-[#777]">Mango Reviews</p>
            <div className="mt-3 h-[6px] w-28 bg-[#0068f0]" />
            <h2 className="mt-3 text-4xl font-black leading-none md:text-5xl">{cityName} 맛집 빠르게 훑어보기</h2>
          </div>
          <div className="space-y-7 bg-[#e7e8ec] p-3 md:p-6">
            {listItems.map((listing) => (
              <InfatuationCompactItem key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function InfatuationPickCard({ listing, rank, priority }: { listing: Listing; rank: number; priority: boolean }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 760, height: 540 });
  const tags = getRestaurantDecisionTags(listing).slice(0, 3);
  const score = getInfatuationDisplayScore(listing);
  const copy = getListingCopy(listing, categoryLabelForListing(listing));

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <article className="h-full bg-white">
        <div className="relative overflow-hidden bg-[#e7e8ec]">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${listing.name} 대표 사진`}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center text-sm font-black uppercase text-[#666]">No Photo</div>
          )}
          <div className="absolute left-3 top-3 bg-[#111] px-3 py-1 text-sm font-black text-white">#{rank}</div>
          <div className="absolute right-3 top-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe14a] text-2xl font-black text-black shadow-[0_4px_14px_rgba(0,0,0,0.14)]">
            {score}
          </div>
        </div>
        <div className="pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-black uppercase tracking-normal">
            <span>{categoryLabelForListing(listing)}</span>
            <span className="h-5 w-px bg-[#cfcfcf]" />
            <span>{listing.area || listing.city}</span>
          </div>
          <h3 className="mt-4 text-3xl font-black leading-[0.96] tracking-normal text-[#111] transition group-hover:text-[#0068f0] md:text-4xl">
            {listing.name}
          </h3>
          <p className="mt-4 line-clamp-2 text-base font-medium leading-7 text-[#202020]">{copy.cardReason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="border border-[#d9d9d9] bg-white px-3 py-1 text-xs font-black uppercase text-[#111]">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e5e5e5] pt-4 text-xs font-black uppercase text-[#202020]">
            <InfatuationFact icon={<Star size={14} />} value={listing.rating?.toFixed(1) ?? "-"} />
            <InfatuationFact icon={<MessageSquareText size={14} />} value={`후기 ${formatCount(listing.reviewTotal)}`} />
            <InfatuationFact icon={<WalletCards size={14} />} value={listing.priceLevel || "가격 확인"} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function InfatuationCompactItem({ listing }: { listing: Listing }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 520, height: 360 });
  const tags = getRestaurantDecisionTags(listing).slice(0, 4);
  const score = getInfatuationDisplayScore(listing);
  const copy = getListingCopy(listing, categoryLabelForListing(listing));

  return (
    <Link href={`/listing/${listing.slug}`} className="group block">
      <article className="grid bg-white p-3 transition hover:bg-[#fbfbfb] md:grid-cols-[360px_1fr] md:p-0">
        <div className="relative overflow-hidden bg-[#ddd]">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${listing.name} 대표 사진`}
              className="aspect-[16/10] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] md:aspect-[4/3]"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center text-sm font-black uppercase text-[#666] md:aspect-[4/3]">No Photo</div>
          )}
          <div className="absolute right-3 top-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe14a] text-2xl font-black text-black">
            {score}
          </div>
        </div>
        <div className="flex min-h-[260px] flex-col justify-center px-3 py-7 md:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-black uppercase tracking-normal">
            <span>{categoryLabelForListing(listing)}</span>
            <span className="h-5 w-px bg-[#cfcfcf]" />
            <span>{listing.area || listing.city}</span>
          </div>
          <h3 className="mt-4 max-w-3xl text-3xl font-black leading-[0.96] tracking-normal text-[#111] transition group-hover:text-[#0068f0] md:text-4xl">
            {listing.name}
          </h3>
          <p className="mt-4 line-clamp-2 max-w-3xl text-base font-medium leading-7 text-[#202020]">{copy.cardReason}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="border border-[#d9d9d9] bg-white px-3 py-1 text-xs font-black uppercase text-[#111]">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-5 text-sm font-black uppercase text-[#202020]">
            <InfatuationFact icon={<MessageSquareText size={15} />} value={`후기 ${formatCount(listing.reviewTotal)}`} />
            <InfatuationFact icon={<ShieldCheck size={15} />} value={`한국인 점수 ${getKoreanFitScore(listing)}`} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function InfatuationFact({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {icon}
      <span className="truncate">{value}</span>
    </span>
  );
}

function getInfatuationDisplayScore(listing: Listing) {
  if (listing.rating) return (Math.round(listing.rating * 20) / 10).toFixed(1);
  return (Math.round(getKoreanFitScore(listing)) / 10).toFixed(1);
}

function RestaurantListExperience({ cityName, listings }: { cityName: string; listings: Listing[] }) {
  const picks = listings.slice(0, 6);
  const listItems = listings.slice(0, 30);

  return (
    <>
      <div id="mango-pick" className="scroll-mt-32">
        <SectionHeading
          eyebrow="Mango Pick"
          title={`${cityName} 한국인 기준 추천 맛집`}
          description="사진, 후기, 가격대, 영업정보가 비교적 탄탄한 곳부터 먼저 보여줍니다."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {picks.map((listing, index) => (
            <MangoPickCard key={listing.id} listing={listing} rank={index + 1} priority={index < 3} />
          ))}
        </div>
      </div>

      {listItems.length > 0 ? (
        <div className="mt-12">
          <SectionHeading
            eyebrow="전체 리스트"
            title={`${cityName} 맛집 빠르게 훑어보기`}
            description="큰 사진 카드보다 빠르게 비교할 수 있도록 리스트형으로 정리했습니다."
          />
          <div className="grid gap-3">
            {listItems.map((listing) => (
              <RestaurantCompactItem key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function MangoPickCard({ listing, rank, priority }: { listing: Listing; rank: number; priority: boolean }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 760, height: 540 });
  const tags = getRestaurantDecisionTags(listing);
  const fitScore = getKoreanFitScore(listing);
  const copy = getListingCopy(listing, categoryLabelForListing(listing));

  return (
    <Link href={`/listing/${listing.slug}`}>
      <article className="group h-full overflow-hidden rounded-lg border border-[#e3e8dc] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#edf5ea]">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={`${listing.name} 사진`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#0b6b43]">사진 준비중</div>
          )}
          <div className="absolute left-3 top-3 rounded-md bg-[#16231d] px-3 py-1 text-sm font-extrabold text-white">#{rank}</div>
          <div className="absolute bottom-3 right-3 rounded-md bg-white px-3 py-1 text-sm font-extrabold text-[#0b6b43]">추천도 {fitScore}</div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{categoryLabelForListing(listing)}</Badge>
            {listing.openNow ? <Badge className="border-[#bfe4c9] bg-[#edfff2] text-[#0b6b43]">영업 중</Badge> : null}
          </div>
          <h3 className="mt-4 line-clamp-2 text-xl font-extrabold leading-7 text-[#16231d]">{listing.name}</h3>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm font-semibold leading-6 text-[#647067]">{copy.cardReason}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold text-[#42554a]">
            <Fact icon={<Star size={14} className="fill-[#f6c84c] text-[#f6c84c]" />} value={listing.rating?.toFixed(1) ?? "-"} />
            <Fact icon={<MessageSquareText size={14} />} value={`후기 ${formatCount(listing.reviewTotal)}`} />
            <Fact icon={<WalletCards size={14} />} value={listing.priceLevel || "가격"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <Badge key={tag} className="bg-white">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}

function RestaurantCompactItem({ listing }: { listing: Listing }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 280, height: 200 });
  const tags = getRestaurantDecisionTags(listing).slice(0, 4);
  const fitScore = getKoreanFitScore(listing);
  const copy = getListingCopy(listing, categoryLabelForListing(listing));

  return (
    <Link href={`/listing/${listing.slug}`}>
      <article className="grid gap-3 rounded-lg border border-[#e3e8dc] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md sm:grid-cols-[140px_1fr_auto] sm:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#edf5ea] sm:aspect-square">
          {photoSrc ? <img src={photoSrc} alt={`${listing.name} 사진`} className="h-full w-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#f8faf4]">{listing.area || listing.city}</Badge>
            {listing.openNow ? <Badge className="border-[#bfe4c9] bg-[#edfff2] text-[#0b6b43]">영업 중</Badge> : null}
          </div>
          <h3 className="mt-2 line-clamp-1 text-lg font-extrabold text-[#16231d]">{listing.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[#647067]">{copy.cardReason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-md bg-[#fffdf8] px-2.5 py-1 text-xs font-bold text-[#42554a] ring-1 ring-[#edf0e7]">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-bold text-[#42554a] sm:w-48 sm:grid-cols-1">
          <Fact icon={<Star size={14} className="fill-[#f6c84c] text-[#f6c84c]" />} value={listing.rating?.toFixed(1) ?? "-"} />
          <Fact icon={<MessageSquareText size={14} />} value={`후기 ${formatCount(listing.reviewTotal)}`} />
          <Fact icon={<ShieldCheck size={14} />} value={`추천도 ${fitScore}`} />
        </div>
      </article>
    </Link>
  );
}

function Fact({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md bg-[#fffdf8] px-2 py-2 ring-1 ring-[#edf0e7]">
      {icon}
      <span className="truncate">{value}</span>
    </span>
  );
}

function getQuickPickListings(listings: Listing[]) {
  const top = listings[0];
  const korean = findListingByTag(listings, "한식 필요할 때");
  const local = findListingByTag(listings, "로컬 입문");
  const family = findListingByTag(listings, "가족식사");

  return uniqueListings([
    top ? { label: "처음 방문", listing: top, reason: "평점, 사진, 후기 신호가 좋아 처음 고를 때 보기 좋습니다." } : undefined,
    korean ? { label: "한식 필요", listing: korean, reason: "현지 음식이 물릴 때 익숙한 메뉴 후보로 보기 좋습니다." } : undefined,
    family ? { label: "가족식사", listing: family, reason: "아이 동반이나 여럿이 먹는 식사 후보로 비교하기 좋습니다." } : undefined,
    local ? { label: "로컬 입문", listing: local, reason: "베트남 음식 입문용으로 사진과 후기 신호를 함께 볼 수 있습니다." } : undefined,
  ]).slice(0, 3);
}

function findListingByTag(listings: Listing[], tag: string) {
  return listings.find((listing) => getRestaurantDecisionTags(listing).includes(tag));
}

function uniqueListings(
  items: Array<{ label: string; listing: Listing; reason: string } | undefined>,
) {
  const seen = new Set<string>();
  return items.filter((item): item is { label: string; listing: Listing; reason: string } => {
    if (!item || seen.has(item.listing.slug)) return false;
    seen.add(item.listing.slug);
    return true;
  });
}

function RestaurantRelatedLinks({ citySlug, cityName }: { citySlug: string; cityName: string }) {
  const links = getRestaurantRelatedSeoLinks(citySlug, cityName);

  return (
    <section className="bg-[#f8faf4] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="SEO 맛집 허브" title={`${cityName} 맛집을 더 좁혀 보기`} />
        <div className="grid gap-3 md:grid-cols-3">
          {links.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <Badge>{item.label}</Badge>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#42554a]">{item.description}</p>
                  <p className="mt-4 text-sm font-bold text-[#0b6b43]">목록 보기</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function getRestaurantAreaLinks(citySlug: string, cityName: string) {
  if (citySlug === "ho-chi-minh") {
    return [
      { label: "전체 맛집", href: "/ho-chi-minh/restaurants", slug: "restaurants" },
      { label: "맛집 추천", href: "/ho-chi-minh/best-restaurants", slug: "best-restaurants" },
      { label: "한식당", href: "/ho-chi-minh/korean-restaurants", slug: "korean-restaurants" },
      { label: "1군", href: "/ho-chi-minh/district-1-restaurants", slug: "district-1-restaurants" },
      { label: "2군", href: "/ho-chi-minh/district-2-restaurants", slug: "district-2-restaurants" },
      { label: "푸미흥", href: "/ho-chi-minh/phu-my-hung-restaurants", slug: "phu-my-hung-restaurants" },
    ];
  }
  if (citySlug === "da-nang") {
    return [
      { label: "전체 맛집", href: "/da-nang/restaurants", slug: "restaurants" },
      { label: "맛집 추천", href: "/da-nang/best-restaurants", slug: "best-restaurants" },
      { label: "해산물", href: "/da-nang/seafood-restaurants", slug: "seafood-restaurants" },
      { label: "한식당", href: "/da-nang/korean-restaurants", slug: "korean-restaurants" },
      { label: "미케비치", href: `/search?q=${encodeURIComponent("다낭 미케비치 맛집")}`, slug: "my-khe" },
      { label: "한시장", href: `/search?q=${encodeURIComponent("다낭 한시장 맛집")}`, slug: "han-market" },
    ];
  }
  return [
    { label: "전체 맛집", href: `/${citySlug}/restaurants`, slug: "restaurants" },
    { label: "맛집 추천", href: `/${citySlug}/best-restaurants`, slug: "best-restaurants" },
    { label: "한식당", href: `/${citySlug}/korean-restaurants`, slug: "korean-restaurants" },
    { label: "시내", href: `/search?q=${encodeURIComponent(`${cityName} 시내 맛집`)}`, slug: "center" },
    { label: "해변가", href: `/search?q=${encodeURIComponent(`${cityName} 해변 맛집`)}`, slug: "beach" },
  ];
}

function getRestaurantRelatedSeoLinks(citySlug: string, cityName: string) {
  const common = [
    { label: `${cityName} 맛집`, href: `/${citySlug}/restaurants`, description: "도시 전체 맛집 후보를 사진과 후기 기준으로 비교합니다." },
    { label: `${cityName} 맛집 추천`, href: `/${citySlug}/best-restaurants`, description: "처음 방문자가 먼저 볼 만한 대표 맛집 후보입니다." },
    { label: `${cityName} 한식당`, href: `/${citySlug}/korean-restaurants`, description: "한식, 짬뽕, 고기집, 분식처럼 익숙한 메뉴를 찾을 때 봅니다." },
  ];

  if (citySlug === "ho-chi-minh") {
    return [
      ...common,
      { label: "호치민 1군 맛집", href: "/ho-chi-minh/district-1-restaurants", description: "벤탄, 동코이, 레탄톤 주변 식당을 동선 기준으로 봅니다." },
      { label: "호치민 2군 맛집", href: "/ho-chi-minh/district-2-restaurants", description: "타오디엔과 안푸 주변 식당을 거주자 기준으로 비교합니다." },
      { label: "푸미흥 맛집", href: "/ho-chi-minh/phu-my-hung-restaurants", description: "7군 한식, 가족식사, 회식 후보를 좁혀 봅니다." },
    ];
  }
  if (citySlug === "da-nang") {
    return [
      ...common,
      { label: "다낭 해산물 맛집", href: "/da-nang/seafood-restaurants", description: "미케비치와 시내 해산물 식당을 가격과 사진 기준으로 비교합니다." },
      { label: "다낭 카페", href: "/da-nang/cafes", description: "식사 후 쉬어갈 카페와 작업하기 좋은 카페를 함께 봅니다." },
      { label: "다낭 마사지", href: "/da-nang/massage", description: "식사 동선과 함께 묶기 좋은 마사지샵을 비교합니다." },
    ];
  }
  return [
    ...common,
    { label: `${cityName} 카페`, href: `/${citySlug}/cafes`, description: "식사 전후 쉬어가기 좋은 카페를 함께 확인합니다." },
    { label: `${cityName} 마사지`, href: `/${citySlug}/massage`, description: "맛집 동선과 함께 묶기 좋은 마사지 후보를 비교합니다." },
    { label: `${cityName} 생활정보`, href: `/${citySlug}/life-info`, description: "여행과 체류 중 필요한 생활 정보를 함께 봅니다." },
  ];
}

function EmptyLanding({
  cityName,
  categorySlug,
  categoryLabel,
}: {
  cityName: string;
  categorySlug: string;
  categoryLabel: string;
}) {
  const items = getSeedItems(categorySlug, cityName);
  const copy = getSeedLandingCopy(categorySlug, cityName, categoryLabel);

  return (
    <>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const content = (
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <ClipboardCheck className="text-[#0b6b43]" size={22} />
                  <Badge className="bg-white">{copy.badge}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#647067]">{item.description}</p>
                {item.href ? <p className="mt-4 text-sm font-bold text-[#0b6b43]">상세 보기</p> : null}
              </CardContent>
            </Card>
          );

          return item.href ? (
            <Link key={item.title} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.title}>{content}</div>
          );
        })}
      </div>
      <div className="mt-8 rounded-lg border border-[#dfe5d8] bg-[#f8faf4] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-extrabold text-[#16231d]">
              {cityName} {categoryLabel} 실제 제보를 받는 중
            </p>
            <p className="mt-2 text-sm leading-6 text-[#647067]">
              운영팀 예시보다 실제 공고, 실제 매물, 실제 가격 제보를 우선 반영합니다.
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white"
          >
            <MapPin size={17} />
            글 등록하기
          </Link>
        </div>
      </div>
    </>
  );
}

function getSeedLandingCopy(categorySlug: string, cityName: string, categoryLabel: string) {
  const copy: Record<string, { eyebrow: string; title: string; description: string; badge: string }> = {
    jobs: {
      eyebrow: "운영팀 시드",
      title: `${cityName} 구인구직 예시와 제보 요청`,
      description: "실제 공고가 들어오기 전, 어떤 조건을 확인해야 하는지 보여주는 운영팀 시드 글입니다. 실제 공고는 검수 후 샘플보다 우선 노출됩니다.",
      badge: "예시",
    },
    "used-market": {
      eyebrow: "거래 예시",
      title: `${cityName} 중고거래 예시와 안전 체크`,
      description: "없는 매물을 진짜처럼 보이지 않고, 거래할 때 필요한 사진, 상태, 가격, 직거래 위치 기준을 먼저 보여줍니다.",
      badge: "예시",
    },
    "real-estate": {
      eyebrow: "제보 양식",
      title: `${cityName} 부동산 제보와 계약 체크`,
      description: "월세, 보증금, 관리비, 전기요금, 퇴실 조건처럼 실제 계약 전에 확인해야 할 항목을 운영팀이 먼저 정리했습니다.",
      badge: "제보 요청",
    },
    community: {
      eyebrow: "운영팀 질문",
      title: `${cityName} 생활 질문과 현지 제보`,
      description: "사람인 척하는 가짜 글 대신, 운영팀이 실제 제보를 받기 위한 질문을 먼저 올려 커뮤니티 흐름을 만듭니다.",
      badge: "질문",
    },
    "life-info": {
      eyebrow: "생활 제보",
      title: `${cityName} 생활정보 업데이트 요청`,
      description: "비자, 병원, 은행, 통신, 교통처럼 시간이 지나면 바뀌는 정보를 운영팀 기준으로 먼저 정리하고 실제 제보로 보강합니다.",
      badge: "업데이트",
    },
  };

  return (
    copy[categorySlug] ?? {
      eyebrow: "운영팀 정리",
      title: `${cityName} ${categoryLabel} 기준을 먼저 정리했습니다`,
      description: "초기에는 운영팀이 확인 기준을 먼저 깔고, 실제 제보와 후기가 들어오면 해당 내용을 우선 반영합니다.",
      badge: "정리",
    }
  );
}

function getSeedItems(categorySlug: string, cityName: string): SeedItem[] {
  if (categorySlug === "life-info") {
    return [...lifeInfoPosts, ...priceReportPosts]
      .filter((post) => post.city === cityName)
      .map((post) => ({ title: post.title, description: post.excerpt, href: getSeedPostUrlByHref(post.href) }));
  }
  if (categorySlug === "community") {
    return [...communityPosts, ...priceReportPosts]
      .filter((post) => post.city === cityName)
      .map((post) => ({ title: post.title, description: post.excerpt, href: getSeedPostUrlByHref(post.href) }));
  }
  if (categorySlug === "jobs") {
    return jobPosts
      .filter((post) => post.city === cityName)
      .map((post) => ({ title: post.title, description: post.excerpt ?? `${post.pay} · ${post.tag}`, href: getSeedPostUrlByHref(post.href) }));
  }
  if (categorySlug === "used-market") {
    return usedMarketPosts
      .filter((post) => post.city === cityName)
      .map((post) => ({ title: post.title, description: post.excerpt ?? `${post.price} · ${post.tag}`, href: getSeedPostUrlByHref(post.href) }));
  }
  if (categorySlug === "real-estate") {
    const cityPosts = realEstatePosts
      .filter((post) => post.city === cityName)
      .map((post) => ({ title: post.title, description: post.excerpt ?? `${post.price} · ${post.tag}`, href: getSeedPostUrlByHref(post.href) }));
    if (cityPosts.length > 0) return cityPosts;
  }

  const guide: Record<string, Array<{ title: string; description: string }>> = {
    hospitals: [
      { title: "한국어 가능 여부", description: "접수, 진료, 보험 서류에서 한국어 또는 영어 대응 가능성을 확인합니다." },
      { title: "진료 과목", description: "내과, 치과, 소아과, 응급처치처럼 검색이 많은 과목부터 정리합니다." },
      { title: "야간/주말 진료", description: "갑자기 아플 때 바로 찾을 수 있도록 운영시간과 연락처를 우선 수집합니다." },
    ],
    "hair-salons": [
      { title: "시술 가격", description: "커트, 염색, 펌, 네일처럼 가격 비교가 필요한 항목을 분리합니다." },
      { title: "한국 스타일 경험", description: "한국식 커트나 컬러 상담 경험이 있는지 후기와 사진으로 검증합니다." },
      { title: "예약 방법", description: "카카오톡, 전화, 인스타그램 등 실제 예약 동선을 함께 정리합니다." },
    ],
    community: [
      { title: "동네 질문", description: "집, 통신, 배송, 병원처럼 생활 중 바로 필요한 질문을 모읍니다." },
      { title: "현지 제보", description: "폐업, 가격 변경, 새 매장 같은 업데이트를 빠르게 반영합니다." },
      { title: "후기 연결", description: "업체 상세 페이지와 커뮤니티 후기를 연결해 데이터 자산으로 쌓습니다." },
    ],
    "real-estate": [
      { title: "월세와 보증금", description: "월세, 보증금, 관리비, 전기요금 단가를 분리해 비교합니다." },
      { title: "단기 임대와 원룸", description: "출장, 장기 여행, 초기 정착에 필요한 단기 임대 후보를 모읍니다." },
      { title: "가게 양도", description: "권리금, 남은 임대 기간, 장비 포함 여부를 확인하는 기준을 정리합니다." },
    ],
  };

  return (
    guide[categorySlug] ?? [
      { title: "기본 정보", description: "이름, 위치, 운영시간, 가격대를 먼저 모읍니다." },
      { title: "한국인 후기", description: "방문일, 사진, 재방문 의사를 포함한 후기를 쌓습니다." },
      { title: "지역별 비교", description: "같은 카테고리를 도시별로 비교할 수 있게 정리합니다." },
    ]
  );
}

function objectParticle(word: string) {
  const last = word.normalize("NFC").charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "를";
  return (last - 0xac00) % 28 === 0 ? "를" : "을";
}
