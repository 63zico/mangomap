import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, EyeOff, Flag, MapPin, ShieldCheck } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSeedPostBySlug } from "@/lib/seed-posts";
import { getUserPostBySlug } from "@/lib/user-posts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seedPost = getSeedPostBySlug(slug);
  if (seedPost) {
    return {
      title: `${seedPost.title} | ${seedPost.city} ${seedPost.category}`,
      description: seedPost.excerpt,
      alternates: { canonical: `${SITE_URL}/posts/${seedPost.slug}` },
      robots: { index: false, follow: true },
      openGraph: {
        type: "article",
        title: `${seedPost.title} | ${SITE_NAME}`,
        description: seedPost.excerpt,
        url: `${SITE_URL}/posts/${seedPost.slug}`,
        siteName: SITE_NAME,
        locale: "ko_KR",
      },
    };
  }

  const post = await getUserPostBySlug(slug).catch(() => null);
  if (!post) {
    return {
      title: "등록글",
      robots: { index: false, follow: false },
    };
  }

  const canIndex = post.status === "approved" && post.indexStatus === "index";

  return {
    title: `${post.title} | ${post.city} ${post.category}`,
    description: `${post.city} ${post.category} 등록글. ${post.price ? `${post.price}. ` : ""}${post.detail.slice(0, 110)}`,
    alternates: { canonical: `${SITE_URL}/posts/${post.slug}` },
    robots: { index: canIndex, follow: canIndex },
    openGraph: {
      type: "article",
      title: `${post.title} | ${SITE_NAME}`,
      description: post.detail.slice(0, 140),
      url: `${SITE_URL}/posts/${post.slug}`,
      siteName: SITE_NAME,
      locale: "ko_KR",
    },
  };
}

export default async function UserPostPage({ params }: PageProps) {
  const { slug } = await params;
  const seedPost = getSeedPostBySlug(slug);
  const userPost = seedPost ? null : await getUserPostBySlug(slug).catch(() => null);
  const post = seedPost ?? userPost;
  if (!post) notFound();

  const isSeedPost = Boolean(seedPost);
  const canIndex = !isSeedPost && userPost?.status === "approved" && userPost.indexStatus === "index";
  const createdDate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(post.createdAt));
  const statusLabel = seedPost ? seedPost.statusLabel : userPost?.status === "approved" ? "승인됨" : "검수 전";
  const indexLabel = canIndex ? "검색 노출" : isSeedPost ? "운영팀 시드" : "검색 노출 대기";
  const detail = post.detail;

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: detail.slice(0, 180),
          datePublished: post.createdAt,
          dateModified: post.updatedAt,
          author: { "@type": isSeedPost ? "Organization" : "Person", name: post.authorName },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          mainEntityOfPage: `${SITE_URL}/posts/${post.slug}`,
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <div className="flex flex-wrap gap-2">
            <Badge>{post.city}</Badge>
            <Badge>{post.category}</Badge>
            <Badge className={canIndex ? "bg-white text-[#0b6b43]" : "bg-[#fff2cc] text-[#735c00]"}>{statusLabel}</Badge>
            <Badge className="bg-white">{indexLabel}</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">{post.title}</h1>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-[#647067]">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={17} />
              {createdDate}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={17} />
              {post.city}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-4 py-10 md:grid-cols-[1fr_0.62fr]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-extrabold text-[#16231d]">상세 내용</h2>
            <div className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#42554a]">{detail}</div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {seedPost ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-extrabold text-[#16231d]">확인 체크리스트</h2>
                <div className="mt-4 grid gap-2">
                  {seedPost.checklist.map((item) => (
                    <div key={item} className="rounded-md border border-[#edf0e7] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#16231d]">
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-5">
              <h2 className="text-lg font-extrabold text-[#16231d]">기본 정보</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <InfoRow label="분류" value={post.category} />
                <InfoRow label="지역" value={post.city} />
                <InfoRow label="가격/급여" value={post.price || "협의"} />
                <InfoRow label="연락" value={post.contact} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                {canIndex ? <ShieldCheck className="mt-0.5 shrink-0 text-[#0b6b43]" size={20} /> : <EyeOff className="mt-0.5 shrink-0 text-[#8a6d00]" size={20} />}
                <div>
                  <h2 className="text-base font-extrabold text-[#16231d]">{canIndex ? "검색 노출 중" : isSeedPost ? "운영팀 시드 글" : "검수 전 공개 글"}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#647067]">
                    {canIndex ? "운영자 확인을 거쳐 검색 노출이 허용된 글입니다." : seedPost ? seedPost.notice : "사이트에는 바로 공개되지만 Google 색인은 승인 후에만 허용됩니다."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Link href="/submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white">
            새 글 등록하기
            <ArrowRight size={17} />
          </Link>
          <Link href="/posts" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]">
            최근 등록글 보기
            <Flag size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-[#edf0e7] bg-[#fffdf8] p-3">
      <dt className="text-xs font-bold text-[#8a968d]">{label}</dt>
      <dd className="break-words font-bold text-[#16231d]">{value}</dd>
    </div>
  );
}
