import type { Metadata } from "next";

import { PlaceCollectorDashboard } from "@/components/place-collector-dashboard";
import { collectorCategories, collectorCities } from "@/lib/place-collector-config";

export const metadata: Metadata = {
  title: "Google Places DB 수집기",
  description: "Mango Vietnam restaurants 테이블에 Google Places 기반 장소 데이터를 저장하는 관리자 도구입니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlaceCollectorAdminPage() {
  const districtCount = collectorCities.reduce((sum, city) => sum + city.districts.length, 0);

  return (
    <main className="bg-[#f4f5f7] px-4 py-10 text-neutral-950 md:px-8 lg:px-12">
      <div className="mx-auto max-w-[1480px]">
        <PlaceCollectorDashboard />

        <section className="mt-8 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#0066ee]">Collection Plan</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">1차 목표는 120개, 최종 목표는 3,000개 이상</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <PlanCard label="도시" value={`${collectorCities.length}개`} detail={collectorCities.map((city) => city.name).join(" / ")} />
            <PlanCard label="지역" value={`${districtCount}개`} detail="도시별 핵심 상권과 여행 동선을 기준으로 분류" />
            <PlanCard label="카테고리" value={`${collectorCategories.length}개`} detail={collectorCategories.map((category) => category.label).join(" / ")} />
          </div>
        </section>
      </div>
    </main>
  );
}

function PlanCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-neutral-950">{value}</p>
      <p className="mt-3 text-sm font-bold leading-6 text-neutral-600">{detail}</p>
    </article>
  );
}
