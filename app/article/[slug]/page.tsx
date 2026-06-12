import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, FileText } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { editorialSeoPages } from "@/lib/editorial-seo";
import { getAllGuides, getGuideBySlug, type Guide } from "@/lib/guides";
import { getCategoryBySlug, SITE_NAME, SITE_URL } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};

  const url = getArticleUrl(guide.slug);

  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const category = getCategoryBySlug(guide.categorySlug);
  const canonical = getArticleUrl(guide.slug);
  const categoryHref = getArticleCategoryHref(guide);
  const relatedSeoPages = getRelatedSeoPages(guide);
  const relatedGuides = getAllGuides()
    .filter((item) => item.slug !== guide.slug && (item.categorySlug === guide.categorySlug || item.citySlug === guide.citySlug))
    .slice(0, 6);

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.updatedAt,
          dateModified: guide.updatedAt,
          mainEntityOfPage: canonical,
          author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          keywords: guide.keywords.join(", "),
          articleSection: category?.label ?? guide.categorySlug,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faq.map((item) => ({
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
            { "@type": "ListItem", position: 2, name: category?.label ?? "생활정보", item: `${SITE_URL}${categoryHref}` },
            { "@type": "ListItem", position: 3, name: guide.title, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{guide.cityName || "베트남"}</Badge>
            {category ? <Badge>{category.label}</Badge> : null}
            <Badge className="bg-white">Article</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">{guide.title}</h1>
          <p className="mt-5 text-lg font-semibold leading-8 text-[#42554a]">{guide.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]">
              <CalendarDays size={17} />
              업데이트 {guide.updatedAt}
            </span>
            <Link href={categoryHref} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]">
              <FileText size={17} />
              관련 허브
            </Link>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[#dfe5d8] bg-white p-6">
          <SectionHeading eyebrow="요약" title="한눈에 보는 핵심" description="AI 검색과 일반 검색에서 바로 이해할 수 있게 사실형 요약을 먼저 둡니다." />
          <div className="grid gap-3 md:grid-cols-2">
            {guide.sections.slice(0, 4).map((section) => (
              <div key={section.heading} className="rounded-md border border-[#edf0e7] bg-[#fffdf8] p-4">
                <p className="text-sm font-extrabold text-[#16231d]">{section.heading}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#647067]">{section.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 space-y-6">
          {guide.sections.map((section) => (
            <Card key={section.heading}>
              <CardContent className="p-6">
                <SectionHeading eyebrow="체크" title={section.heading} description={section.body} />
                <div className="grid gap-3 md:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 rounded-md border border-[#edf0e7] bg-[#fffdf8] p-4">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-[#0b6b43]" size={18} />
                      <p className="text-sm font-semibold leading-6 text-[#16231d]">{bullet}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-10">
          <SectionHeading eyebrow="FAQ" title="자주 묻는 질문" />
          <div className="grid gap-3">
            {guide.faq.map((item) => (
              <Card key={item.question}>
                <CardContent className="p-5">
                  <h2 className="text-base font-extrabold text-[#16231d]">{item.question}</h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#647067]">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </article>

      {relatedSeoPages.length > 0 ? (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading eyebrow="관련 검색" title="이 글 다음에 많이 이어지는 검색" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {relatedSeoPages.map((page) => (
                <Link key={page.slug} href={`/${page.slug}`} className="rounded-lg border border-[#e3e8dc] bg-[#fffdf8] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <Badge>{page.eyebrow}</Badge>
                  <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{page.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{page.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="내부 링크" title="함께 읽을 글과 허브" description="모든 글은 최소 5개 이상의 관련 페이지로 이어지게 설계합니다." />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Link href={categoryHref} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <Badge>{category?.label ?? "생활정보"}</Badge>
            <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{category?.label ?? "생활정보"} 허브로 이동</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#647067]">같은 주제의 도시별 페이지와 검색 랜딩을 함께 볼 수 있습니다.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#0b6b43]">
              허브 보기 <ArrowRight size={16} />
            </span>
          </Link>
          {relatedGuides.slice(0, 5).map((item) => (
            <Link key={item.slug} href={`/article/${item.slug}`} className="rounded-lg border border-[#e3e8dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <Badge>{item.cityName || "베트남"}</Badge>
              <h2 className="mt-4 text-lg font-extrabold leading-7 text-[#16231d]">{item.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#647067]">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function getArticleUrl(slug: string) {
  return `${SITE_URL}/article/${slug}`;
}

function getArticleCategoryHref(guide: Guide) {
  if (/비자/.test(guide.title) || guide.keywords.some((keyword) => keyword.includes("비자"))) return "/category/visa";
  if (guide.categorySlug === "restaurants" || guide.categorySlug === "korean-restaurants") return "/category/restaurants";
  if (guide.categorySlug === "hospitals") return "/category/hospital";
  if (guide.categorySlug === "hair-salons") return "/category/beauty";
  if (guide.categorySlug === "life-info") return "/category/life";
  if (guide.citySlug) return `/${guide.citySlug}/${guide.categorySlug}`;
  return "/category/life";
}

function getRelatedSeoPages(guide: Guide) {
  const texts = [guide.title, guide.description, ...guide.keywords].join(" ");
  const matches = editorialSeoPages.filter((page) => {
    const sameCity = guide.citySlug && page.citySlug === guide.citySlug;
    const sameCategory = page.categorySlug === guide.categorySlug;
    const keywordMatch = guide.keywords.some((keyword) => page.title.includes(keyword.split(" ")[0]) || page.summary.includes(keyword.split(" ")[0]));
    return sameCity || sameCategory || keywordMatch || texts.includes(page.eyebrow.replace("베트남 ", ""));
  });
  const fallback = editorialSeoPages.filter((page) => !matches.some((match) => match.slug === page.slug));

  return [...matches, ...fallback].slice(0, 6);
}
