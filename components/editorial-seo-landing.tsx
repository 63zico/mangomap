import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, MessageSquareText, Star } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  editorialSeoUrl,
  getEditorialSeoGuides,
  getEditorialSeoLifePosts,
  getEditorialSeoListings,
  getEditorialSeoRelatedPages,
  type EditorialSeoPage,
} from "@/lib/editorial-seo";
import { getListingCopy } from "@/lib/listing-copy";
import { getPlacePhotoSrc } from "@/lib/place-photos";
import { categoryLabelForListing } from "@/lib/places";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { formatCount } from "@/lib/utils";

export function EditorialSeoLanding({ page }: { page: EditorialSeoPage }) {
  const listings = getEditorialSeoListings(page, 8);
  const relatedPages = getEditorialSeoRelatedPages(page);
  const guides = getEditorialSeoGuides(page);
  const lifePosts = getEditorialSeoLifePosts(page);
  const canonical = editorialSeoUrl(page.slug);

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: page.title,
          description: page.metaDescription,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: listings.map((listing, index) => ({
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
          mainEntity: page.faq.map((item) => ({
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
            { "@type": "ListItem", position: 2, name: page.eyebrow, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{page.eyebrow}</Badge>
            <Badge className="bg-white">Editor's Guide</Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#42554a]">{page.summary}</p>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {page.editorAngles.slice(0, 3).map((angle) => (
              <div key={angle} className="rounded-lg border border-[#dfe5d8] bg-white p-4 shadow-sm">
                <p className="text-sm font-extrabold leading-6 text-[#16231d]">{angle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {listings.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionHeading eyebrow="추천 장소" title="에디터 기준으로 먼저 볼 곳" description="단순 평점순이 아니라 검색 상황에 맞는 이유를 붙여 보여줍니다." />
          <div className="grid gap-4">
            {listings.map((listing, index) => (
              <EditorialPick key={listing.id} listing={listing} angle={page.editorAngles[index % page.editorAngles.length]} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionHeading eyebrow="콘텐츠" title="먼저 확인할 생활정보" description="업체 데이터가 부족한 주제는 가이드와 체크리스트를 중심으로 검색 페이지를 만듭니다." />
          <div className="grid gap-3 md:grid-cols-3">
            {lifePosts.map((post) => (
              <Link key={post.href} href={post.href} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Badge>{post.label}</Badge>
                <h2 className="mt-4 text-lg font-extrabold text-[#16231d]">{post.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#647067]">{post.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white py-10">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading eyebrow="관련 검색" title="다음으로 이어지는 검색 흐름" description="모든 SEO 글은 최소 5개 이상의 관련 페이지로 연결되도록 설계합니다." />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatedPages.map((related) => (
              <Link key={related.slug} href={`/${related.slug}`} className="rounded-lg border border-[#e3e8dc] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Badge className="bg-white">{related.eyebrow}</Badge>
                <h2 className="mt-3 text-base font-extrabold leading-6 text-[#16231d]">{related.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#647067]">{related.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {guides.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionHeading eyebrow="관련 글" title="함께 읽을 생활 가이드" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {guides.map((guide) => (
              <Link key={guide.slug} href={`/guide/${guide.slug}`} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Badge>{guide.cityName || "베트남"}</Badge>
                <h2 className="mt-4 text-base font-extrabold leading-6 text-[#16231d]">{guide.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{guide.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="FAQ" title={`${page.eyebrow} 자주 묻는 질문`} />
        <div className="grid gap-3 md:grid-cols-3">
          {page.faq.map((item) => (
            <Card key={item.question}>
              <CardContent className="p-5">
                <h2 className="text-base font-extrabold text-[#16231d]">{item.question}</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#647067]">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function EditorialPick({ listing, angle, rank }: { listing: ReturnType<typeof getEditorialSeoListings>[number]; angle: string; rank: number }) {
  const photoSrc = getPlacePhotoSrc(listing, 0, { width: 520, height: 360 });
  const categoryLabel = categoryLabelForListing(listing);
  const copy = getListingCopy(listing, categoryLabel);

  return (
    <Link href={`/listing/${listing.slug}`}>
      <article className="grid gap-4 rounded-lg border border-[#e3e8dc] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[220px_1fr_auto] md:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#edf5ea]">
          {photoSrc ? <img src={photoSrc} alt={`${listing.name} 사진`} className="h-full w-full object-cover" loading={rank <= 2 ? "eager" : "lazy"} /> : null}
          <div className="absolute left-3 top-3 rounded-md bg-[#16231d] px-2.5 py-1 text-xs font-extrabold text-white">#{rank}</div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge>{angle}</Badge>
            <Badge className="bg-white">{categoryLabel}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-extrabold leading-8 text-[#16231d]">{listing.name}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#42554a]">{copy.cardReason}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#42554a]">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#fffdf8] px-2.5 py-1 ring-1 ring-[#edf0e7]">
              <Star size={13} className="fill-[#f6c84c] text-[#f6c84c]" />
              {listing.rating?.toFixed(1) ?? "평점 확인"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#fffdf8] px-2.5 py-1 ring-1 ring-[#edf0e7]">
              <MessageSquareText size={13} />
              후기 {formatCount(listing.reviewTotal)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[#fffdf8] px-2.5 py-1 ring-1 ring-[#edf0e7]">
              <MapPin size={13} />
              {listing.area || listing.city}
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[#0b6b43]">
          상세 보기 <ArrowRight size={16} />
        </div>
      </article>
    </Link>
  );
}
