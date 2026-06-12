"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type Suggestion = {
  label: string;
  href?: string;
};

export function SearchSuggestBox({
  suggestions,
  defaultValue = "",
  placeholder = "호치민 짬뽕, 베트남 병원, 다낭 맛집",
}: {
  suggestions: Suggestion[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const normalized = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalized) return suggestions.slice(0, 7);
    return suggestions.filter((item) => item.label.toLowerCase().includes(normalized)).slice(0, 7);
  }, [normalized, suggestions]);

  return (
    <div className="relative">
      <form action="/search" className="rounded-2xl border border-[#171717] bg-white p-2 shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
        <div className="flex items-center gap-2">
          <Search className="ml-3 shrink-0 text-[#6b6049]" size={22} />
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold text-[#171717] outline-none placeholder:text-[#9a9285]"
            autoComplete="off"
          />
          <button className="h-12 rounded-xl bg-[#171717] px-5 text-sm font-black text-[#ffd43b] transition hover:bg-[#2b2b2b]">검색</button>
        </div>
      </form>

      {matches.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[#e5decd] bg-white shadow-lg">
          {matches.map((item) => {
            const href = item.href ?? `/search?q=${encodeURIComponent(item.label)}`;
            return (
              <Link key={`${item.label}-${href}`} href={href} className="flex items-center justify-between gap-3 border-b border-[#f0eadb] px-4 py-3 last:border-b-0 hover:bg-[#fff8d8]">
                <span className="text-sm font-black text-[#171717]">{item.label}</span>
                <span className="text-xs font-black text-[#9a6a19]">바로 보기</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
