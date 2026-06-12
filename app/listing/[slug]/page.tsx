import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, CalendarDays, Clock, ExternalLink, MapPin, MessageSquareText, Phone, Share2, Star, WalletCards } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { ListingCard } from "@/components/listing-card";
import { Badge } from "@/components/ui/badge";
import { getListingCopy } from "@/lib/listing-copy";
import { getAbsolutePlacePhotoSrc, getPlacePhotoNames, getPlacePhotoSrc } from "@/lib/place-photos";
import type { Listing } from "@/lib/places";
import { categoryLabelForListing, getKoreanFitScore, getListingBySlug, getListingParams, getRelatedListings, getRestaurantDecisionTags } from "@/lib/places";
import { getListingSeoContent } from "@/lib/seo-content";
import { getSupabaseRestaurantBySlug, normalizeGuideFaq, type SupabaseRestaurantRecord } from "@/lib/seo-guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatCount } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return getListingParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) {
    const restaurant = await getSupabaseRestaurantBySlug(slug);
    if (!restaurant) return {};
    const title = restaurant.seo_title || `${restaurant.name} - ${restaurant.city ?? "Vietnam"} 맛집`;
    const description = restaurant.seo_description || restaurant.description || `${restaurant.name} 방문 전 확인할 주소, 평점, 후기 수, 사진 정보를 Mango Vietnam에서 정리했습니다.`;
    const url = `${SITE_URL}/listing/${restaurant.slug}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "article",
        title: `${title} | ${SITE_NAME}`,
        description,
        url,
        siteName: SITE_NAME,
        locale: "ko_KR",
        images: restaurant.featured_image ? [{ url: absoluteListingImageUrl(restaurant.featured_image), width: 1200, height: 800, alt: `${restaurant.name} 사진` }] : undefined,
      },
    };
  }

  const categoryLabel = categoryLabelForListing(listing);
  const seo = getListingSeoContent(listing, categoryLabel);
  const title = `${listing.name} - ${listing.city} ${categoryLabel}`;
  const url = `${SITE_URL}/listing/${listing.slug}`;
  const image = getAbsolutePlacePhotoSrc(listing, 0, { width: 1200, height: 800 });

  return {
    title,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${title} | ${SITE_NAME}`,
      description: seo.description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      images: image ? [{ url: image, width: 1200, height: 800, alt: `${listing.name} 사진` }] : undefined,
    },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) {
    const restaurant = await getSupabaseRestaurantBySlug(slug);
    if (!restaurant) notFound();
    return <SupabaseRestaurantDetail restaurant={restaurant} />;
  }

  const categoryLabel = categoryLabelForListing(listing);
  const seo = getListingSeoContent(listing, categoryLabel);
  const canonical = `${SITE_URL}/listing/${listing.slug}`;
  const copy = getListingCopy(listing, categoryLabel);
  const photoNames = getPlacePhotoNames(listing);
  const heroPhoto = getPlacePhotoSrc(listing, 0, { width: 1800, height: 1200 });
  const schemaImage = getAbsolutePlacePhotoSrc(listing, 0, { width: 1200, height: 800 });
  const fitScore = getKoreanFitScore(listing);
  const score = getMangoScoreBreakdown(listing, fitScore);
  const perfectFor = getPerfectFor(listing, copy.recommendedFor);
  const recommendedDishes = copy.primaryItems.slice(0, 4);
  const relatedListings = getRelatedListings(listing, 6);
  const phoneNumber = listing.internationalPhoneNumber || listing.nationalPhoneNumber;
  const selectTier = getSelectTier(score.overall);
  const shareHref = `mailto:?subject=${encodeURIComponent(`${listing.name} | Mango Vietnam`)}&body=${encodeURIComponent(canonical)}`;
  const mapEmbed = listing.latitude && listing.longitude ? `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=15&output=embed` : undefined;
  const schemaReviews = (listing.reviews ?? [])
    .filter((review) => review.content && review.source !== "google_reference")
    .slice(0, 5)
    .map((review) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: review.rating ?? listing.rating ?? 4.5 },
      author: { "@type": "Person", name: review.nickname ?? "Mango Vietnam user" },
      reviewBody: review.content,
    }));

  return (
    <main className="bg-[#fffdf6] pb-24 text-[#171717] lg:pb-0">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": listing.category === "맛집" ? "Restaurant" : "LocalBusiness",
          name: listing.name,
          url: canonical,
          image: schemaImage,
          description: seo.description,
          address: listing.address,
          telephone: phoneNumber,
          priceRange: listing.priceLevel,
          aggregateRating: listing.rating
            ? {
                "@type": "AggregateRating",
                ratingValue: listing.rating,
                reviewCount: listing.userRatingCount ?? listing.reviewTotal,
              }
            : undefined,
          geo:
            listing.latitude && listing.longitude
              ? {
                  "@type": "GeoCoordinates",
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                }
              : undefined,
          review: schemaReviews.length > 0 ? schemaReviews : undefined,
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
            { "@type": "ListItem", position: 2, name: listing.city, item: `${SITE_URL}/${listing.citySlug}/${listing.primaryCategorySlug}` },
            { "@type": "ListItem", position: 3, name: listing.name, item: canonical },
          ],
        }}
      />

      <section className="relative min-h-[680px] overflow-hidden bg-[#141414] text-white md:min-h-[780px]">
        {heroPhoto ? <img src={heroPhoto} alt={`${listing.name} photo`} className="absolute inset-0 h-full w-full object-cover opacity-76" loading="eager" fetchPriority="high" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.82))]" />
        <div className="absolute left-0 top-0 h-2 w-full bg-[#ffd43b]" />
        <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 md:min-h-[780px] md:pb-16">
          <div className="mb-5 flex flex-wrap gap-2">
            <Link href={`/${listing.citySlug}/${listing.primaryCategorySlug}`}>
              <span className="rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur">{listing.city}</span>
            </Link>
            <span className="rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-white backdrop-blur">{categoryLabel}</span>
            <span className="rounded-full border border-[#f6d46b]/35 bg-[#f6d46b]/16 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffe18b] backdrop-blur">{selectTier}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.94] tracking-normal md:text-7xl">{listing.name}</h1>
              <p className="mt-6 max-w-3xl text-xl font-medium leading-8 text-white/84 md:text-2xl md:leading-9">{copy.cardReason}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ActionPill icon={<MapPin size={16} />} label={listing.area || listing.city} />
                <ActionPill icon={<Star size={16} className="fill-[#ffd43b] text-[#ffd43b]" />} label={listing.rating ? `평점 ${listing.rating.toFixed(1)}` : "평점 확인 중"} />
                <ActionPill icon={<MessageSquareText size={16} />} label={`후기 신호 ${formatCount(listing.reviewTotal)}`} />
              </div>
            </div>

            <div className="rounded-[12px] border border-white/14 bg-white/12 p-5 backdrop-blur-xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ffd43b]">Mango Score</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-black leading-none text-white">{score.overall}</span>
                <span className="mb-2 text-sm font-bold text-white/60">/ 100</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/70">Korean traveler fit based on rating, photos, reviews, location and visit-readiness.</p>
              <div className="mt-5 flex gap-2">
                <button className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-white text-sm font-extrabold text-[#161616]" type="button">
                  <Bookmark size={16} />
                  저장
                </button>
                <Link href={shareHref} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-extrabold text-white">
                  <Share2 size={16} />
                  공유
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="space-y-16">
            <EditorialSection eyebrow="한 줄 요약" title="왜 추천하나요">
              <p className="max-w-4xl text-2xl font-semibold leading-10 text-[#252525] md:text-3xl md:leading-[1.45]">{copy.summary}</p>
            </EditorialSection>

            <EditorialSection eyebrow="Perfect For" title="이런 상황에 좋아요">
              <div className="flex flex-wrap gap-2">
                {perfectFor.map((tag) => (
                  <Badge key={tag} className="border-[#d9d0bd] bg-white px-4 py-2 text-sm text-[#161616]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </EditorialSection>

            <EditorialSection eyebrow="Mango Score" title="세부 점수">
              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreBar label="맛" value={score.taste} />
                <ScoreBar label="가성비" value={score.value} />
                <ScoreBar label="서비스" value={score.service} />
                <ScoreBar label="청결" value={score.cleanliness} />
                <ScoreBar label="재방문 의향" value={score.revisit} />
              </div>
            </EditorialSection>

            <EditorialSection eyebrow="추천 메뉴" title={categoryLabel === "맛집" ? "먼저 볼 메뉴" : "먼저 확인할 것"}>
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendedDishes.map((dish, index) => {
                  const image = getPlacePhotoSrc(listing, index + 1, { width: 800, height: 620 }) ?? heroPhoto;
                  return (
                    <div key={dish} className="overflow-hidden rounded-[10px] border border-[#ece7da] bg-white">
                      <div className="relative aspect-[4/3] bg-[#eee7d7]">
                        {image ? <img src={image} alt={`${listing.name} ${dish}`} className="h-full w-full object-cover" loading="lazy" /> : null}
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#9a6a19]">Editor Pick</p>
                        <h3 className="mt-2 text-2xl font-extrabold leading-7">{dish}</h3>
                        <p className="mt-3 text-sm font-semibold leading-6 text-[#686156]">
                          {copy.visitChecklist[index] ?? "방문 전 메뉴와 가격을 한 번 더 확인하세요."}
                        </p>
                        <p className="mt-4 inline-flex rounded-full bg-[#fff0a8] px-3 py-1 text-xs font-black text-[#171717]">
                          {listing.priceLevel || "가격 정보 확인 중"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </EditorialSection>

            <EditorialSection eyebrow="에디터 리뷰" title={copy.title}>
              <div className="max-w-3xl space-y-6 text-lg font-medium leading-9 text-[#3f3a34]">
                {copy.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <p>
                  Mango Vietnam은 이 장소를 한국인 여행자와 거주자 기준으로 봅니다. 위치가 쉬운지, 메뉴 선택이 편한지, 사진이 충분한지,
                  여행 전에 저장할 만큼 이유가 있는지를 중심으로 정리합니다.
                </p>
              </div>
            </EditorialSection>

            {photoNames.length > 1 ? (
              <EditorialSection eyebrow="사진" title="방문 전 분위기 보기">
                <div className="grid gap-3 md:grid-cols-3">
                  {photoNames.slice(1, 7).map((_, index) => {
                    const photo = getPlacePhotoSrc(listing, index + 1, { width: 760, height: 560 });
                    return photo ? (
                      <div key={photo} className="aspect-[4/3] overflow-hidden rounded-[10px] bg-[#eee7d7]">
                        <img src={photo} alt={`${listing.name} photo ${index + 2}`} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ) : null;
                  })}
                </div>
              </EditorialSection>
            ) : null}

            <EditorialSection eyebrow="후기" title="방문자 신호">
              <div className="grid gap-4">
                {(listing.reviews ?? []).length > 0 ? (
                  (listing.reviews ?? []).slice(0, 4).map((review, index) => (
                    <div key={`${review.nickname}-${index}`} className="rounded-[10px] border border-[#ece7da] bg-white p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-extrabold">{review.nickname || "Visitor"}</p>
                        <Badge>{review.rating ?? listing.rating ?? 4.5} / 5</Badge>
                      </div>
                      <p className="mt-4 text-base font-medium leading-8 text-[#4f4941]">{review.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[10px] border border-[#ece7da] bg-white p-6">
                    <p className="font-extrabold">한국인 후기 수집 중</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#686156]">사진, 추천 메뉴, 재방문 의향이 쌓일수록 이 페이지의 신뢰도가 올라갑니다.</p>
                  </div>
                )}
              </div>
            </EditorialSection>

            <EditorialSection eyebrow="FAQ" title="방문 전 확인">
              <div className="grid gap-3">
                {seo.faq.map((item) => (
                  <div key={item.question} className="rounded-[10px] border border-[#ece7da] bg-white p-6">
                    <h3 className="text-base font-extrabold">{item.question}</h3>
                    <p className="mt-3 text-sm font-semibold leading-7 text-[#686156]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </EditorialSection>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[12px] border border-[#e5decd] bg-white shadow-sm">
              {mapEmbed ? (
                <iframe src={mapEmbed} title={`${listing.name} map`} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              ) : (
                <div className="flex h-64 items-center justify-center bg-[#eee7d7] text-sm font-bold text-[#686156]">지도 정보 확인 중</div>
              )}
              <div className="grid gap-4 p-6">
                <Fact icon={<MapPin size={18} />} label="위치" value={listing.address || `${listing.city} ${listing.area ?? ""}`} />
                <Fact icon={<Clock size={18} />} label="영업시간" value={listing.openingHoursText?.[0] || "방문 전 확인 필요"} />
                <Fact icon={<WalletCards size={18} />} label="가격대" value={listing.priceLevel || "가격 정보 확인 중"} />
                <Fact icon={<Phone size={18} />} label="연락처" value={phoneNumber || "연락처 확인 중"} />
                <Fact icon={<CalendarDays size={18} />} label="업데이트" value={listing.lastVerifiedAt || "검수 정보 확인 중"} />
                {listing.googleMapsUri ? (
                  <Link href={listing.googleMapsUri} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#161616] px-5 text-sm font-extrabold text-white">
                    구글맵 열기
                    <ExternalLink size={16} />
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {relatedListings.length > 0 ? (
        <section className="border-t border-[#ece7da] bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#9a6a19]">주변 후보</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">근처에서 같이 비교해보기</h2>
            <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {relatedListings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ded6c6] bg-[#fbfaf6]/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <button type="button" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-[#ded6c6] bg-white text-sm font-extrabold">
            <Bookmark size={16} />
            저장
          </button>
          {listing.googleMapsUri ? (
            <Link href={listing.googleMapsUri} target="_blank" rel="noreferrer" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#161616] text-sm font-extrabold text-white">
              <MapPin size={16} />
              지도
            </Link>
          ) : null}
          <Link href={shareHref} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-[#ded6c6] bg-white text-sm font-extrabold">
            <Share2 size={16} />
            공유
          </Link>
        </div>
      </div>
    </main>
  );
}

function SupabaseRestaurantDetail({ restaurant }: { restaurant: SupabaseRestaurantRecord }) {
  const canonical = `${SITE_URL}/listing/${restaurant.slug}`;
  const description = restaurant.seo_description || restaurant.description || restaurant.review_summary || `${restaurant.name} 방문 전 확인할 정보를 정리했습니다.`;
  const faq = normalizeGuideFaq(restaurant.faq_json);
  const image = restaurant.featured_image ? absoluteListingImageUrl(restaurant.featured_image) : undefined;

  return (
    <main className="bg-[#fffdf6] text-[#171717]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": restaurant.category?.toLowerCase().includes("cafe") ? "CafeOrCoffeeShop" : "Restaurant",
          name: restaurant.name,
          url: canonical,
          image,
          description,
          address: restaurant.address || undefined,
          telephone: restaurant.phone || undefined,
          hasMap: restaurant.google_maps_url || undefined,
          sameAs: [restaurant.google_maps_url, restaurant.website].filter(Boolean),
          aggregateRating: typeof restaurant.rating === "number" && typeof restaurant.review_count === "number"
            ? {
                "@type": "AggregateRating",
                ratingValue: restaurant.rating,
                reviewCount: restaurant.review_count,
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
        }}
      />
      {faq.length ? (
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
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Restaurants", item: `${SITE_URL}/guides` },
            { "@type": "ListItem", position: 3, name: restaurant.name, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#ded6c6] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-16">
          <div className="min-h-[360px] overflow-hidden bg-[#eee7d7]">
            {restaurant.featured_image ? (
              <img src={restaurant.featured_image} alt={`${restaurant.name} 대표 사진`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center bg-[#ffe04b] text-5xl font-black">MANGO</div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff9800]">Mango Restaurant</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02] md:text-7xl">{restaurant.name}</h1>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em]">
              {restaurant.category ? <span className="border border-[#171717] px-3 py-2">{restaurant.category}</span> : null}
              {restaurant.city ? <span className="border border-[#171717] px-3 py-2">{restaurant.city}</span> : null}
              {restaurant.district ? <span className="border border-[#171717] px-3 py-2">{restaurant.district}</span> : null}
            </div>
            <p className="mt-6 text-lg font-semibold leading-9 text-[#333]">{description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 bg-[#ffe04b] px-4 py-3 text-sm font-black">
                <Star size={17} fill="#171717" />
                {typeof restaurant.rating === "number" ? restaurant.rating.toFixed(1) : "평점 확인 중"}
              </span>
              <span className="inline-flex items-center gap-2 border border-[#171717] px-4 py-3 text-sm font-black">
                <MessageSquareText size={17} />
                후기 {formatCount(restaurant.review_count ?? 0)}
              </span>
              {restaurant.google_maps_url ? (
                <Link href={restaurant.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#171717] px-4 py-3 text-sm font-black text-white">
                  지도 보기
                  <ExternalLink size={17} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1fr_360px]">
        <article className="space-y-10">
          <section className="bg-white p-6 md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0869f2]">Summary</p>
            <h2 className="mt-3 text-3xl font-black">방문 전 한눈에 보기</h2>
            <p className="mt-5 text-lg font-semibold leading-9 text-[#444]">{restaurant.editorial_body || restaurant.review_summary || description}</p>
          </section>

          {faq.length ? (
            <section className="bg-white p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0869f2]">FAQ</p>
              <h2 className="mt-3 text-3xl font-black">자주 묻는 질문</h2>
              <div className="mt-6 space-y-4">
                {faq.map((item) => (
                  <div key={item.question} className="border-t border-[#ded6c6] pt-4">
                    <h3 className="text-xl font-black">{item.question}</h3>
                    <p className="mt-3 text-base font-semibold leading-8 text-[#555]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="bg-white p-6 md:sticky md:top-24 md:self-start">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff9800]">Info</p>
          <div className="mt-5 space-y-5">
            <Fact icon={<MapPin size={18} />} label="주소" value={restaurant.address || `${restaurant.city ?? ""} ${restaurant.district ?? ""}`.trim() || "주소 확인 중"} />
            <Fact icon={<Clock size={18} />} label="영업시간" value={restaurant.opening_hours?.split("\n")[0] || "방문 전 확인 필요"} />
            <Fact icon={<WalletCards size={18} />} label="가격대" value={restaurant.price_level || "가격 정보 확인 중"} />
            <Fact icon={<Phone size={18} />} label="연락처" value={restaurant.phone || "연락처 확인 중"} />
          </div>
        </aside>
      </section>
    </main>
  );
}

function absoluteListingImageUrl(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith("/") ? src : `/${src}`}`;
}

function EditorialSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#9a6a19]">{eyebrow}</p>
      <h2 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-[#171717] md:text-5xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ActionPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-bold text-white backdrop-blur">
      {icon}
      {label}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[#ece7da] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-[#161616]">{label}</p>
        <p className="text-sm font-black text-[#161616]">{value}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee7d7]">
        <div className="h-full rounded-full bg-[#ffd43b]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-[#eee7d7] pb-4 last:border-b-0 last:pb-0">
      <span className="mt-0.5 text-[#9a6a19]">{icon}</span>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9a958b]">{label}</p>
        <p className="mt-1 text-sm font-bold leading-6 text-[#161616]">{value}</p>
      </div>
    </div>
  );
}

function getPerfectFor(listing: Listing, recommendedFor: string[]) {
  const tags = new Set<string>(["한국인 여행자", "한국인 거주자", ...recommendedFor, ...getRestaurantDecisionTags(listing)]);
  if (listing.primaryCategorySlug.includes("restaurant")) tags.add("혼밥");
  if (listing.openNow) tags.add("지금 영업 중");
  return Array.from(tags).slice(0, 8);
}

function getMangoScoreBreakdown(listing: Listing, fitScore: number) {
  const ratingBase = Math.round(((listing.rating ?? 4.2) / 5) * 100);
  const reviewBoost = Math.min(10, Math.round(Math.log10((listing.reviewTotal || 1) + 1) * 4));
  const photoBoost = Math.min(8, listing.photoTotal);
  const infoBoost = [listing.address, listing.openingHoursText?.length, listing.googleMapsUri, listing.priceLevel].filter(Boolean).length * 2;
  const overall = clamp(Math.round(fitScore * 0.62 + ratingBase * 0.28 + photoBoost + infoBoost), 60, 98);

  return {
    overall,
    taste: clamp(ratingBase + reviewBoost - 4, 58, 98),
    value: clamp((listing.priceLevel ? 78 : 70) + reviewBoost, 58, 94),
    service: clamp(70 + Math.round((listing.koreanReviewSignal?.score ?? 50) * 0.24), 58, 95),
    cleanliness: clamp(72 + photoBoost + (listing.openingHoursText?.length ? 6 : 0), 58, 96),
    revisit: clamp(Math.round(overall * 0.86 + reviewBoost), 58, 98),
  };
}

function getSelectTier(score: number) {
  if (score >= 92) return "Mango Black";
  if (score >= 84) return "Mango Gold";
  return "Mango Select";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
