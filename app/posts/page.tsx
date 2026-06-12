import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { editorialSeoUrl, getEditorialSeoPageBySlug } from "@/lib/editorial-seo";
import { getGuideUrl } from "@/lib/guides";
import { getMangoGuidePostImage, mangoGuidePosts, type MangoGuidePost } from "@/lib/mango-guide-posts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const canonical = `${SITE_URL}/posts`;
const ogImage = `${SITE_URL}/mango-vietnam-og.png`;

export const metadata: Metadata = {
  title: "Mango Guide | 베트남 한국인 맛집·여행 매거진",
  description: "호치민 맛집, 다낭 카페, 푸꾸옥 해산물, 베트남 생활정보를 한국인 기준으로 큐레이션한 Mango Vietnam 가이드입니다.",
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: `Mango Guide | ${SITE_NAME}`,
    description: "한국인을 위한 베트남 맛집·여행·생활 큐레이션.",
    url: canonical,
    siteName: SITE_NAME,
    locale: "ko_KR",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Mango Vietnam" }],
  },
};

export default function PostsPage() {
  const posts = mangoGuidePosts.map((post) => ({
    ...post,
    image: getMangoGuidePostImage(post, { width: 980, height: 620 }),
    isoDate: new Date(post.date).toISOString(),
  }));

  return (
    <main className="bg-[#e7e8ec] text-[#171717]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Mango Guide",
          description: metadata.description,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          inLanguage: "ko-KR",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: posts.map((post, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(post.href),
              name: post.title,
              description: post.description,
            })),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Mango Guide", item: canonical },
          ],
        }}
      />

      <section className="border-b border-[#d5d5d5] bg-white px-5 py-10 lg:px-12">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-3xl font-black uppercase leading-none text-[#777]">Mango Guide</p>
          <h1 className="mt-3 max-w-5xl text-5xl font-black leading-[0.92] tracking-normal md:text-7xl lg:text-8xl">
            베트남을 고르는 가장 빠른 방법
          </h1>
          <p className="mt-6 max-w-3xl text-xl font-medium leading-8">
            호치민, 다낭, 하노이, 푸꾸옥의 맛집과 여행지를 한국인 기준으로 읽기 쉽게 정리했습니다.
          </p>
          <div className="mt-8 h-[6px] w-28 bg-[#0068f0]" />
        </div>
      </section>

      <section className="mx-auto max-w-[1250px] px-4 py-8 md:px-6 md:py-12">
        <div className="space-y-7 md:space-y-8">
          {posts.map((post, index) => (
            <MagazineListCard key={post.href} post={post} priority={index < 2} />
          ))}
        </div>
      </section>
    </main>
  );
}

function MagazineListCard({
  post,
  priority,
}: {
  post: MangoGuidePost & { image: string; isoDate: string };
  priority?: boolean;
}) {
  return (
    <Link href={post.href} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0068f0]">
      <article className="grid bg-white p-3 transition duration-300 hover:bg-[#fbfbfb] md:grid-cols-[380px_1fr] md:p-0">
        <div className="relative overflow-hidden bg-[#ddd]">
          <img
            src={post.image}
            alt={`${post.title} 대표 이미지`}
            className="aspect-[16/10] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] md:aspect-[4/3]"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
          />
          <div className="absolute left-0 top-0 h-[6px] w-24 bg-[#0068f0]" />
        </div>

        <div className="flex min-h-[270px] flex-col justify-center px-3 py-7 md:px-8 lg:px-10">
          <p className="text-sm font-black uppercase tracking-normal text-[#0068f0]">{post.category}</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-normal transition group-hover:text-[#0068f0] md:text-5xl">
            {post.title}
          </h2>
          <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#111]">{post.description}</p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <img src="/favicon.png" alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
            <div>
              <p className="text-sm font-black uppercase tracking-normal">{post.author}</p>
              <time dateTime={post.isoDate} className="text-sm font-bold uppercase tracking-[0.12em] text-[#555]">
                {formatDate(post.date)}
              </time>
            </div>
            <ArrowRight className="ml-auto hidden text-[#0068f0] transition duration-300 group-hover:translate-x-1 md:block" size={28} strokeWidth={2.8} aria-hidden="true" />
          </div>
        </div>
      </article>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function absoluteUrl(href: string) {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/guide/")) return getGuideUrl({ slug: href.replace("/guide/", "") });
  const seoSlug = href.replace(/^\//, "");
  const seoPage = getEditorialSeoPageBySlug(seoSlug);
  if (seoPage) return editorialSeoUrl(seoPage.slug);
  return `${SITE_URL}${href}`;
}
