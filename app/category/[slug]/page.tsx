import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, MapPin, Search, ShieldCheck } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { ListingCard } from "@/components/listing-card";
import { SearchSuggestBox } from "@/components/search-suggest-box";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { editorialSeoUrl } from "@/lib/editorial-seo";
import { getAllListings, getPopularListings, type Listing } from "@/lib/places";
import {
  categoryHubPages,
  getCategoryHubBySlug,
  getCategoryHubGuides,
  getCategoryHubRelatedSeoPages,
  getCategoryHubSlugs,
  getHubCategory,
} from "@/lib/seo-hubs";
import { allCities, lifeInfoPosts, SITE_NAME, SITE_URL } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategoryHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getCategoryHubBySlug(slug);
  if (!page) return {};

  const url = `${SITE_URL}/category/${page.slug}`;

  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${page.title} | ${SITE_NAME}`,
      description: page.metaDescription,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
    },
  };
}

export default async function CategoryHubPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getCategoryHubBySlug(slug);
  if (!page) notFound();

  const category = getHubCategory(page);
  const canonical = `${SITE_URL}/category/${page.slug}`;
  const listings = getCategoryHubListings(page.slug, page.categorySlug);
  const relatedPages = getCategoryHubRelatedSeoPages(page);
  const guides = getCategoryHubGuides(page);
  const faq = getHubFaq(page.label, page.summary);
  const suggestions = [
    ...page.searchExamples.map((label) => {
      const cityLink = page.cityLinks?.find((item) => item.label === label || label.startsWith(item.label));
      return { label, href: cityLink?.href };
    }),
    ...(page.cityLinks ?? []).map((item) => ({ label: item.label, href: item.href })),
    ...categoryHubPages.map((item) => ({ label: item.label, href: `/category/${item.slug}` })),
  ];

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
          about: category?.searchIntent ?? page.label,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: [
              ...relatedPages.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.title,
                url: editorialSeoUrl(item.slug),
              })),
              ...guides.map((guide, index) => ({
                "@type": "ListItem",
                position: relatedPages.length + index + 1,
                name: guide.title,
                url: `${SITE_URL}/article/${guide.slug}`,
              })),
            ],
          },
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
            { "@type": "ListItem", position: 2, name: page.label, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{page.label}</Badge>
            <Badge className="bg-white">검색 허브</Badge>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-[#42554a]">{page.summary}</p>
          <div className="mt-7 max-w-3xl">
            <SearchSuggestBox suggestions={suggestions} placeholder={page.searchExamples.slice(0, 3).join(", ")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {page.searchExamples.map((term) => (
              <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}>
                <Badge className="bg-white px-3 py-1.5 hover:border-[#0b6b43]">{term}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="선택 기준" title={`${page.label} 정보를 고를 때 먼저 볼 것`} />
        <div className="grid gap-3 md:grid-cols-4">
          {page.editorAngles.map((angle) => (
            <div key={angle} className="rounded-lg border border-[#e3e8dc] bg-white p-5">
              <CheckCircle2 className="text-[#0b6b43]" size={22} />
              <p className="mt-4 text-base font-extrabold leading-6 text-[#16231d]">{angle}</p>
            </div>
          ))}
        </div>
      </section>

      {page.cityLinks ? (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="도시별 바로가기" title="검색량이 큰 도시 페이지" />
            <div className="grid gap-3 md:grid-cols-4">
              {page.cityLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg border border-[#e3e8dc] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <MapPin className="text-[#0b6b43]" size={21} />
                  <h2 className="mt-4 text-lg font-extrabold text-[#16231d]">{item.label}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#647067]">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {relatedPages.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionHeading eyebrow="SEO 랜딩" title="검색 의도별 대표 페이지" description="카테고리 허브에서 실제 검색어 랜딩 페이지로 내부링크를 보냅니다." />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatedPages.map((item) => (
              <Link key={item.slug} href={`/${item.slug}`} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Badge>{item.eyebrow}</Badge>
                <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{item.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{item.summary}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0b6b43]">
                  페이지 보기 <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {listings.length > 0 ? (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="추천 업체" title={`${page.label}에서 먼저 확인할 실제 장소`} description="사진과 평점, 후기 신호가 있는 기존 데이터를 우선 사용합니다." />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} priority={index < 3} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="데이터 축적" title={`${page.label} 실제 제보를 받을 준비`} description="아직 실제 업체 데이터가 부족한 영역은 가짜 목록 대신 확인 기준과 제보 흐름을 먼저 보여줍니다." />
            <div className="grid gap-3 md:grid-cols-3">
              {getSeedCards(page.slug).map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-5">
                    <ShieldCheck className="text-[#0b6b43]" size={22} />
                    <h2 className="mt-4 text-lg font-extrabold text-[#16231d]">{item.title}</h2>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#647067]">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {guides.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionHeading eyebrow="관련 글" title="저장하고 다시 보는 생활 가이드" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link key={guide.slug} href={`/article/${guide.slug}`} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <FileText className="text-[#0b6b43]" size={21} />
                <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{guide.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{guide.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="FAQ" title={`${page.label} 자주 묻는 질문`} />
        <div className="grid gap-3 md:grid-cols-3">
          {faq.map((item) => (
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

function getCategoryHubListings(slug: string, categorySlug: string): Listing[] {
  if (categorySlug === "restaurants") return getPopularListings("restaurants", 9);
  if (categorySlug === "massage") return getPopularListings("massage", 9);
  if (categorySlug === "bars") return getPopularListings("bars", 9);
  if (categorySlug === "karaoke") return getPopularListings("karaoke", 9);
  if (categorySlug === "nightlife") return [...getPopularListings("bars", 6), ...getPopularListings("karaoke", 3)].slice(0, 9);
  if (categorySlug === "hospitals") {
    return findListingsByTerms(["병원", "치과", "clinic", "hospital", "medical"], 6);
  }
  if (categorySlug === "hair-salons") {
    return findListingsByTerms(["미용", "헤어", "네일", "hair", "beauty", "salon", "spa"], 6);
  }
  if (slug === "visa") return [];
  return [];
}

function findListingsByTerms(terms: string[], limit: number) {
  return getAllListings()
    .filter((listing) => terms.some((term) => listing.searchText.includes(term.toLowerCase())))
    .slice(0, limit);
}

function getSeedCards(slug: string) {
  if (slug === "visa") {
    return lifeInfoPosts.slice(0, 3).map((post) => ({ title: post.title, description: post.excerpt }));
  }
  if (slug === "life") {
    return [
      { title: "비자와 체류", description: "만료일, 연장 가능성, 대행 수수료, 접수 증빙을 분리해서 확인합니다." },
      { title: "은행과 통신", description: "계좌, 유심, eSIM, 집 인터넷처럼 반복해서 찾는 정보를 저장형 콘텐츠로 만듭니다." },
      { title: "집 구하기", description: "월세, 보증금, 전기요금, 퇴실 조건을 도시별 체크리스트로 정리합니다." },
    ];
  }
  if (slug === "beauty") {
    return [
      { title: "가격표", description: "커트, 염색, 펌, 네일, 피부관리 가격을 항목별로 나눠 수집합니다." },
      { title: "스타일 사진", description: "한국 스타일 상담이 가능한지 결과물 사진과 후기 중심으로 확인합니다." },
      { title: "예약 채널", description: "카카오톡, 전화, 인스타그램, 구글맵 링크를 실제 예약 동선으로 연결합니다." },
    ];
  }
  if (slug === "massage") {
    return [
      { title: "가격과 팁 포함 여부", description: "60분·90분·120분 가격, 팁 포함 여부, 카드 결제 가능성을 먼저 확인합니다." },
      { title: "예약과 귀가 동선", description: "저녁 시간대 예약 가능 여부와 숙소까지 돌아가는 동선을 함께 봅니다." },
      { title: "가족·커플 방문", description: "대기 공간, 커플룸, 샤워 가능 여부처럼 실제 방문 전 필요한 조건을 정리합니다." },
    ];
  }
  if (slug === "nightlife") {
    return [
      { title: "정보성 운영", description: "술집과 가라오케를 선정적으로 다루지 않고 위치, 가격, 예약 기준으로만 정리합니다." },
      { title: "귀가 동선", description: "늦은 시간 이동이 필요한 카테고리라 숙소와의 거리, 택시 동선, 영업시간을 함께 봅니다." },
      { title: "총액 기준 확인", description: "룸, 음료, 서비스 차지, 예약 조건처럼 실제 결제 전 확인할 항목을 분리합니다." },
    ];
  }
  if (slug === "bars") {
    return [
      { title: "루프탑과 펍 구분", description: "야경을 보는 루프탑바와 가볍게 맥주를 마시는 펍을 목적별로 나눠 봅니다." },
      { title: "가격과 분위기", description: "칵테일, 맥주, 안주 가격대와 사진으로 분위기를 먼저 확인합니다." },
      { title: "라스트오더와 귀가", description: "영업시간, 라스트오더, 숙소까지의 이동 동선을 함께 확인합니다." },
    ];
  }
  if (slug === "karaoke") {
    return [
      { title: "예약 조건", description: "인원수, 룸 기준, 시간 기준, 예약 필요 여부를 먼저 확인합니다." },
      { title: "한국 노래 지원", description: "한국 노래 지원 여부와 단체 모임에 적합한지 정보성으로 정리합니다." },
      { title: "총액 기준 가격", description: "룸 이용료, 음료, 안주, 추가 비용을 방문 전 확인하도록 안내합니다." },
    ];
  }
  return [
    { title: "확인 기준", description: "방문 전 꼭 봐야 할 항목을 먼저 보여줍니다." },
    { title: "실제 제보", description: "사용자 제보가 들어오면 운영팀 예시보다 우선 노출합니다." },
    { title: "지역별 확장", description: "호치민, 다낭, 하노이 등 도시별 페이지로 확장합니다." },
  ];
}

function getHubFaq(label: string, summary: string) {
  return [
    { question: `${label} 정보는 어떤 기준으로 보나요?`, answer: summary },
    { question: "실제 데이터가 부족하면 어떻게 하나요?", answer: "가짜 목록을 만들지 않고 확인 기준, 관련 가이드, 제보 요청을 먼저 보여준 뒤 실제 데이터가 들어오면 교체합니다." },
    { question: "도시별 페이지와 어떻게 연결되나요?", answer: `카테고리 허브에서 호치민, 다낭, 하노이 같은 도시별 검색 페이지와 관련 SEO 랜딩 페이지로 연결합니다.` },
  ];
}
