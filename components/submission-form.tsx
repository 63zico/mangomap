"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";

import { CONTACT_EMAIL } from "@/lib/site";

const categories = ["구인구직", "중고거래", "부동산", "업체·가격", "사진·후기", "생활정보"];
const cities = ["호치민", "다낭", "나트랑", "하노이", "푸꾸옥", "달랏", "붕따우", "기타"];

export function SubmissionForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [values, setValues] = useState({
    category: categories[0],
    city: cities[0],
    title: "",
    contact: "",
    price: "",
    detail: "",
  });

  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(`Mango Vietnam ${values.category} 등록 신청${values.title ? ` - ${values.title}` : ""}`);
    const body = encodeURIComponent(
      [
        `카테고리: ${values.category}`,
        `도시: ${values.city}`,
        `제목: ${values.title}`,
        `연락 방법: ${values.contact}`,
        `가격/급여: ${values.price}`,
        "",
        "상세 내용:",
        values.detail,
        "",
        "사진이 있으면 메일 앱에서 첨부해주세요.",
      ].join("\n"),
    );

    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }, [values]);

  function updateField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/user-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string; url?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.message || "등록에 실패했습니다.");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "등록에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#dfe5d8] bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-[#16231d]">
          카테고리
          <select
            value={values.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="h-11 rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 text-sm font-semibold outline-none focus:border-[#0b6b43]"
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#16231d]">
          도시
          <select
            value={values.city}
            onChange={(event) => updateField("city", event.target.value)}
            className="h-11 rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 text-sm font-semibold outline-none focus:border-[#0b6b43]"
          >
            {cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#16231d]">
          제목
          <input
            value={values.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="예: 호치민 한식당 홀 파트타임"
            className="h-11 rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 text-sm font-semibold outline-none placeholder:text-[#9aa69d] focus:border-[#0b6b43]"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#16231d]">
          연락 방법
          <input
            value={values.contact}
            onChange={(event) => updateField("contact", event.target.value)}
            placeholder="카톡 오픈채팅, 이메일, 전화번호"
            className="h-11 rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 text-sm font-semibold outline-none placeholder:text-[#9aa69d] focus:border-[#0b6b43]"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#16231d] md:col-span-2">
          가격 또는 급여
          <input
            value={values.price}
            onChange={(event) => updateField("price", event.target.value)}
            placeholder="예: 450만동, 면접 후 협의, 판매완료"
            className="h-11 rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 text-sm font-semibold outline-none placeholder:text-[#9aa69d] focus:border-[#0b6b43]"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#16231d] md:col-span-2">
          상세 내용
          <textarea
            value={values.detail}
            onChange={(event) => updateField("detail", event.target.value)}
            placeholder="위치, 근무시간, 물품 상태, 방문 후기, 주의사항을 적어주세요."
            rows={6}
            className="rounded-md border border-[#dfe5d8] bg-[#fffdf8] px-3 py-3 text-sm font-semibold leading-6 outline-none placeholder:text-[#9aa69d] focus:border-[#0b6b43]"
          />
        </label>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm leading-6 text-[#647067]">제출하면 바로 공개되고, 승인 전까지 Google 색인은 막습니다.</p>
          {message ? (
            <p className="mt-2 text-sm font-bold text-[#b54708]">
              {message}{" "}
              <a href={mailHref} className="inline-flex items-center gap-1 underline">
                이메일로 보내기
                <Mail size={14} />
              </a>
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "submitting" ? (
            <>
              등록 중
              <LoaderCircle size={17} className="animate-spin" />
            </>
          ) : (
            <>
              바로 등록하기
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
