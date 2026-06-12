import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, Camera, Mail, ShoppingBag, Store } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { SectionHeading } from "@/components/section-heading";
import { SubmissionForm } from "@/components/submission-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const submitUrl = `${SITE_URL}/submit`;
const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Mango Vietnam 정보 제보")}&body=${encodeURIComponent(
  "도시:\n카테고리:\n업체명 또는 제목:\n주소 또는 링크:\n가격/영업시간/후기:\n사진 첨부 여부:\n",
)}`;

const submitTypes = [
  {
    icon: Store,
    title: "업체·가격 제보",
    description: "새로 생긴 맛집, 병원, 마사지, 가라오케, 영업시간, 가격표, 메뉴판을 알려주세요.",
    examples: ["업체명", "주소 또는 지도 링크", "가격표 또는 메뉴 사진"],
  },
  {
    icon: Camera,
    title: "사진·후기 제보",
    description: "방문 사진, 추천 메뉴, 재방문 의사, 한국인이 알면 좋은 포인트를 보내주세요.",
    examples: ["방문일", "추천 메뉴", "좋았던 점과 아쉬웠던 점"],
  },
  {
    icon: BriefcaseBusiness,
    title: "구인구직 제보",
    description: "한인 매장 채용, 통역, 파트타임, 원격 업무, 마감 여부를 업데이트합니다.",
    examples: ["근무 지역", "급여 조건", "지원 방법"],
  },
  {
    icon: ShoppingBag,
    title: "중고거래 제보",
    description: "오토바이, 가전, 가구, 귀국정리 물품, 거래 완료 여부를 알려주세요.",
    examples: ["품목", "가격", "거래 지역"],
  },
  {
    icon: Building2,
    title: "부동산 제보",
    description: "월세, 단기 임대, 원룸, 아파트, 사무실, 가게 양도 정보를 알려주세요.",
    examples: ["월세/보증금", "계약 기간", "위치"],
  },
];

const reviewSteps = [
  {
    title: "1. 바로 등록",
    description: "구인구직, 중고거래, 부동산, 업체 정보 중 필요한 항목만 입력하면 즉시 공개됩니다.",
  },
  {
    title: "2. 검수 전 표시",
    description: "등록 직후에는 검수 전 배지와 검색 노출 대기 상태가 함께 표시됩니다.",
  },
  {
    title: "3. 승인 후 검색 노출",
    description: "운영자 승인 또는 신뢰 기준을 통과한 글만 Google 색인을 허용합니다.",
  },
];

export const metadata: Metadata = {
  title: "정보 제보하기",
  description: "Mango Vietnam에 베트남 업체, 가격, 사진, 후기, 구인구직, 중고거래 정보를 제보하는 방법입니다.",
  alternates: { canonical: submitUrl },
  openGraph: {
    type: "website",
    title: `정보 제보하기 | ${SITE_NAME}`,
    description: "베트남 생활 정보, 후기, 구인구직, 중고거래 정보를 Mango Vietnam에 제보하세요.",
    url: submitUrl,
    siteName: SITE_NAME,
    locale: "ko_KR",
  },
};

export default function SubmitPage() {
  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Mango Vietnam 정보 제보",
          description: metadata.description,
          url: submitUrl,
          mainEntity: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            email: CONTACT_EMAIL,
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "정보 제보", item: submitUrl },
          ],
        }}
      />

      <section className="border-b border-[#e7eadf] bg-[#f8faf4]">
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <Badge className="border-[#cfe5d2] bg-white text-[#0b6b43]">제보하기</Badge>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-normal text-[#16231d] md:text-5xl">
            쉽게 올리고, 바로 공개합니다
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#42554a]">
            구인구직, 중고거래, 부동산, 가격표, 메뉴판, 사진, 후기를 누구나 올릴 수 있습니다. 다만 승인 전 글은 검수 전 배지와 noindex로 보호합니다.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href={mailHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white">
              이메일로 제보하기
              <Mail size={17} />
            </Link>
            <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-bold text-[#16231d] ring-1 ring-[#dfe5d8]">
              홈으로 돌아가기
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="등록 흐름" title="바로 공개하고, 검색 노출은 승인 후에 엽니다" />
        <div className="grid gap-3 md:grid-cols-3">
          {reviewSteps.map((step) => (
            <Card key={step.title}>
              <CardContent className="p-5">
                <h2 className="text-lg font-extrabold text-[#16231d]">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#647067]">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <SectionHeading
          eyebrow="등록 신청서"
          title="필요한 내용만 빠르게 작성하세요"
          description="등록 후 바로 공개 URL이 생성됩니다. 승인 전 글은 검색엔진 색인을 막습니다."
        />
        <SubmissionForm />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeading eyebrow="제보 항목" title="사진 한 장도 충분합니다" description="정확하지 않은 정보는 확인 후 반영하고, 민감한 개인정보는 공개하지 않습니다." />
        <div className="grid gap-4 md:grid-cols-2">
          {submitTypes.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full">
                <CardContent className="p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#edf5ea] text-[#0b6b43]">
                    <Icon size={22} />
                  </span>
                  <h2 className="mt-4 text-xl font-extrabold text-[#16231d]">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#647067]">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.examples.map((example) => (
                      <Badge key={example} className="bg-white">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="rounded-lg border border-[#dfe5d8] bg-white p-6">
          <h2 className="text-xl font-extrabold text-[#16231d]">보내기 전에 같이 적어주세요</h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[#42554a] sm:grid-cols-2">
            <p>도시와 동네</p>
            <p>업체명 또는 게시글 제목</p>
            <p>주소, 지도 링크, 연락처</p>
            <p>가격, 영업시간, 방문일</p>
          </div>
          <Link href={mailHref} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white">
            {CONTACT_EMAIL}
            <Mail size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}
