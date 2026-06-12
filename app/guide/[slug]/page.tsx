import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Search } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAllGuides, getGuideBySlug, getGuideUrl } from "@/lib/guides";
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

  const url = getGuideUrl(guide);

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

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const category = getCategoryBySlug(guide.categorySlug);
  const canonical = getGuideUrl(guide);
  const relatedCategoryHref = guide.citySlug && category ? `/${guide.citySlug}/${category.slug}` : category ? `/ho-chi-minh/${category.slug}` : "/";

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
            { "@type": "ListItem", position: 2, name: category?.label ?? "가이드", item: `${SITE_URL}${relatedCategoryHref}` },
            { "@type": "ListItem", position: 3, name: guide.title, item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{guide.cityName || "베트남"}</Badge>
            {category ? <Badge>{category.label}</Badge> : null}
            <Badge className="bg-white">생활 가이드</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">{guide.title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#42554a]">{guide.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]">
              <CalendarDays size={17} />
              업데이트 {guide.updatedAt}
            </span>
            <Link
              href={relatedCategoryHref}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]"
            >
              <Search size={17} />
              관련 카테고리
            </Link>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-6">
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
                  <p className="mt-3 text-sm leading-6 text-[#647067]">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-lg border border-[#dfe5d8] bg-[#f8faf4] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-extrabold text-[#16231d]">{category ? `${category.label} 정보 더 보기` : "Mango Vietnam 더 보기"}</p>
              <p className="mt-2 text-sm leading-6 text-[#647067]">가이드는 지역별 생활 정보와 함께 계속 업데이트됩니다.</p>
            </div>
            <Link
              href={relatedCategoryHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white"
            >
              바로가기
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
