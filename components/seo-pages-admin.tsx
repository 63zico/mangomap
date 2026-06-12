"use client";

import { AlertTriangle, ExternalLink, RefreshCw, Save, Search, Sparkles, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

type SeoPageWarning = {
  type: string;
  label: string;
};

type SeoAdminPageItem = {
  slug: string;
  title: string;
  city?: string | null;
  category?: string | null;
  page_type?: string | null;
  primary_keyword?: string | null;
  landmark_slug?: string | null;
  status?: string | null;
  noindex: boolean;
  meta_description: string;
  summary: string;
  body_sections: unknown;
  faq_json: unknown;
  restaurants_count: number;
  average_rating: number;
  total_review_count: number;
  content_length: number;
  data_quality_score: number;
  priority_score: number;
  warnings: SeoPageWarning[];
  preview_url: string;
  updated_at?: string | null;
};

type ApiResponse =
  | {
      ok: true;
      result: {
        total: number;
        warningCount: number;
        topPages: SeoAdminPageItem[];
        pages: SeoAdminPageItem[];
      };
    }
  | { ok: false; error: string };

type EnrichResponse =
  | {
      ok: true;
      result: {
        updated: number;
        pages: Array<{
          slug: string;
          title: string;
          priority_score: number;
          before_length: number;
          after_length: number;
          faq_count: number;
        }>;
      };
    }
  | { ok: false; error: string };

const statusOptions = ["published", "draft", "archived"];

export function SeoPagesAdmin() {
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pages, setPages] = useState<SeoAdminPageItem[]>([]);
  const [topPages, setTopPages] = useState<SeoAdminPageItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [draft, setDraft] = useState<SeoAdminPageItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<Extract<EnrichResponse, { ok: true }>["result"] | null>(null);
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) ?? null,
    [pages, selectedSlug],
  );
  const warningCount = pages.filter((page) => page.warnings.length > 0).length;

  async function loadPages() {
    if (!token.trim()) {
      setMessage("관리자 토큰을 먼저 입력하세요.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "300");
      params.set("status", statusFilter);
      if (query.trim()) params.set("q", query.trim());

      const response = await fetch(`/api/admin/seo-pages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const data = (await response.json().catch(() => ({}))) as ApiResponse;
      if (!response.ok || data.ok === false) {
        throw new Error(data.ok === false ? data.error : `요청 실패 (${response.status})`);
      }

      setPages(data.result.pages);
      setTopPages(data.result.topPages);
      const nextSelected = data.result.pages.find((page) => page.slug === selectedSlug)
        ?? data.result.topPages[0]
        ?? data.result.pages[0]
        ?? null;
      setSelectedSlug(nextSelected?.slug ?? "");
      setDraft(nextSelected ? clonePage(nextSelected) : null);
      setMessage(`SEO 페이지 ${data.result.total}개 로드, 경고 ${data.result.warningCount}개, 우선 수정 ${data.result.topPages.length}개.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "SEO 페이지를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function selectPage(page: SeoAdminPageItem) {
    const source = pages.find((item) => item.slug === page.slug) ?? page;
    setSelectedSlug(source.slug);
    setDraft(clonePage(source));
    setMessage("");
  }

  async function savePage() {
    if (!draft) return;
    if (!token.trim()) {
      setMessage("관리자 토큰을 먼저 입력하세요.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const bodySections = parseJsonField(draft.body_sections, "Body Sections");
      const faqJson = parseJsonField(draft.faq_json, "FAQ");
      const response = await fetch("/api/admin/seo-pages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          slug: draft.slug,
          title: draft.title,
          meta_description: draft.meta_description,
          summary: draft.summary,
          body_sections: bodySections,
          faq_json: faqJson,
          status: draft.status,
          noindex: draft.noindex,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || data.ok === false) throw new Error(data.error || `저장 실패 (${response.status})`);
      setMessage("저장 완료. 목록을 다시 불러와 점수와 경고를 갱신했습니다.");
      await loadPages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function enrichTopPages() {
    if (!token.trim()) {
      setMessage("관리자 토큰을 먼저 입력하세요.");
      return;
    }

    setEnriching(true);
    setEnrichResult(null);
    setMessage("");
    try {
      const response = await fetch("/api/admin/seo-pages/enrich-top", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = (await response.json().catch(() => ({}))) as EnrichResponse;
      if (!response.ok || data.ok === false) throw new Error(data.ok === false ? data.error : `본문 보강 실패 (${response.status})`);

      setEnrichResult(data.result);
      setMessage(`TOP 20 본문 보강 완료: ${data.result.updated}개 페이지를 업데이트했습니다.`);
      await loadPages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "TOP 20 본문 보강 중 오류가 발생했습니다.");
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0066ee]">SEO Quality Control</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 md:text-6xl">SEO 페이지 검수 센터</h1>
            <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-neutral-600">
              자동 생성된 SEO 페이지를 검수하고, 상위 노출 가능성이 높은 페이지부터 title, meta, 본문, FAQ를 직접 보강합니다.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl bg-neutral-950 p-5 text-white md:min-w-[420px]">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ffe04b]">Current Batch</p>
            <div className="grid grid-cols-4 gap-3">
              <Metric label="Pages" value={pages.length} />
              <Metric label="Top 20" value={topPages.length} />
              <Metric label="Warnings" value={warningCount} />
              <Metric label="Selected" value={selected ? 1 : 0} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_220px_180px]">
        <label className="space-y-2">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Admin Token</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            type="password"
            placeholder="COLLECTOR_ADMIN_TOKEN"
            className="h-14 w-full rounded-xl border border-neutral-300 px-4 text-sm font-bold outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-14 w-full rounded-xl border border-neutral-300 px-4 text-sm font-black outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">all</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={loadPages}
          disabled={loading}
          className="mt-7 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#0066ee] px-5 text-sm font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          불러오기
        </button>
        <label className="space-y-2 lg:col-span-3">
          <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadPages();
              }}
              placeholder="title, slug, city, category 검색"
              className="h-14 w-full rounded-xl border border-neutral-300 px-11 text-sm font-bold outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </label>
      </section>

      {message ? <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm font-bold text-neutral-700">{message}</div> : null}

      {topPages.length ? (
        <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#0066ee]">
                <Trophy className="h-4 w-4" />
                Priority Score
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 md:text-5xl">우선 수정 TOP 20</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-neutral-600">
                검색 수요, 도시 중요도, 연결 식당 수, 평점, 리뷰 수, 랜드마크 여부를 합산했습니다. 이 영역의 페이지는 제목, 메타, 본문, FAQ를 길게 보강할 후보입니다.
              </p>
            </div>
            <p className="text-sm font-black text-neutral-500">noindex 페이지는 점수 계산에서 제외</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#0066ee]/20 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-blue-950">TOP 20 본문 보강 실행</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-blue-900">
                우선순위가 높은 20개 페이지의 본문을 2000~3500자 수준의 가이드형 콘텐츠와 FAQ 5~10개로 확장합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={enrichTopPages}
              disabled={enriching || !topPages.length}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0066ee] px-5 text-sm font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
            >
              <Sparkles className={`h-4 w-4 ${enriching ? "animate-pulse" : ""}`} />
              {enriching ? "보강 중" : "TOP 20 본문 보강 실행"}
            </button>
          </div>

          {enrichResult ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Enhancement Result</p>
                  <h3 className="mt-1 text-2xl font-black text-neutral-950">{enrichResult.updated}개 페이지 보강 완료</h3>
                </div>
                <p className="text-sm font-bold text-neutral-500">전/후 content length 기준</p>
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
                {enrichResult.pages.map((page) => (
                  <div key={page.slug} className="grid gap-2 border-b border-neutral-100 px-4 py-3 text-sm md:grid-cols-[1fr_120px_120px_90px]">
                    <span className="font-black text-neutral-950">{page.title}</span>
                    <span className="font-bold text-neutral-500">전 {page.before_length}</span>
                    <span className="font-bold text-[#0066ee]">후 {page.after_length}</span>
                    <span className="font-bold text-neutral-500">FAQ {page.faq_count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topPages.map((page, index) => (
              <article
                key={page.slug}
                className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-[#0066ee] hover:shadow-md ${
                  page.slug === selectedSlug ? "border-[#0066ee] bg-blue-50" : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500">#{index + 1}</p>
                    <h3 className="mt-2 line-clamp-2 text-xl font-black leading-6 text-neutral-950">{page.title}</h3>
                  </div>
                  <PriorityBadge score={page.priority_score} />
                </div>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.1em] text-[#f59e0b]">
                  {page.primary_keyword || page.category || page.page_type || "SEO PAGE"}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="식당" value={page.restaurants_count} />
                  <MiniStat label="평점" value={page.average_rating || "-"} />
                  <MiniStat label="리뷰" value={page.total_review_count} />
                </div>
                <p className="mt-4 rounded-xl bg-[#fff7df] px-3 py-2 text-xs font-black leading-5 text-neutral-800">
                  title / meta / content / FAQ 수동 보강 추천
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectPage(page)}
                    className="flex-1 rounded-xl bg-neutral-950 px-3 py-3 text-xs font-black uppercase tracking-[0.08em] text-white"
                  >
                    수정하기
                  </button>
                  <a
                    href={page.preview_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-3 text-neutral-950 hover:border-neutral-950"
                    aria-label={`${page.title} 미리보기`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(480px,0.9fr)]">
        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.45fr_0.85fr_0.75fr_0.45fr_0.65fr] gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-4 text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
            <span>Title</span>
            <span>Score</span>
            <span>Slug</span>
            <span>Type</span>
            <span>Count</span>
            <span>Status</span>
          </div>
          <div className="max-h-[760px] overflow-y-auto">
            {pages.map((page) => (
              <button
                key={page.slug}
                type="button"
                onClick={() => selectPage(page)}
                className={`grid w-full grid-cols-[1.2fr_0.45fr_0.85fr_0.75fr_0.45fr_0.65fr] gap-3 border-b border-neutral-100 px-5 py-4 text-left transition hover:bg-[#fff7df] ${page.slug === selectedSlug ? "bg-[#fff7df]" : "bg-white"}`}
              >
                <span>
                  <span className="block text-sm font-black leading-5 text-neutral-950">{page.title}</span>
                  <span className="mt-1 block text-xs font-bold text-neutral-500">{page.city || "-"} / {page.category || "-"}</span>
                  {page.warnings.length ? (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {page.warnings.slice(0, 3).map((warning) => (
                        <WarningPill key={`${page.slug}-${warning.type}`} label={warning.label} />
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className="self-start">
                  <PriorityBadge score={page.priority_score} muted={page.noindex} />
                </span>
                <span className="break-all text-xs font-bold leading-5 text-neutral-600">{page.slug}</span>
                <span className="text-sm font-black text-neutral-800">{page.page_type || "-"}</span>
                <span className={`text-sm font-black ${page.restaurants_count < 3 ? "text-red-600" : "text-neutral-900"}`}>{page.restaurants_count}</span>
                <span className="space-y-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${page.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                    {page.status}
                  </span>
                  {page.noindex ? <span className="block text-xs font-black text-red-600">noindex</span> : null}
                </span>
              </button>
            ))}
            {!pages.length ? (
              <div className="p-8 text-center text-sm font-bold text-neutral-500">SEO 페이지를 불러오세요.</div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          {draft ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#0066ee]">Editor</p>
                  <h2 className="mt-2 text-2xl font-black text-neutral-950">{draft.slug}</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-neutral-500">
                    우선순위 {draft.priority_score}점 · 식당 {draft.restaurants_count}개 · 평균 평점 {draft.average_rating || "-"} · 리뷰 {draft.total_review_count}개 · 본문 {draft.content_length}자 · 데이터 품질 {draft.data_quality_score}점
                  </p>
                </div>
                <a
                  href={draft.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-4 text-sm font-black text-neutral-950 hover:border-neutral-950"
                >
                  Preview
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {topPages.some((page) => page.slug === draft.slug) ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-900">
                  이 페이지는 우선 수정 TOP 20입니다. 제목은 더 검색 의도가 선명하게, 메타는 클릭 이유가 보이게, 본문은 실제 방문 전 참고할 내용으로, FAQ는 4개 이상으로 보강하세요.
                </div>
              ) : null}

              {draft.warnings.length ? (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    품질 경고
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draft.warnings.map((warning) => (
                      <WarningPill key={`${draft.slug}-editor-${warning.type}`} label={warning.label} />
                    ))}
                  </div>
                </div>
              ) : null}

              <Field label="Title">
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm font-bold outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              <Field label="Meta Description">
                <textarea
                  value={draft.meta_description}
                  onChange={(event) => setDraft({ ...draft, meta_description: event.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              <Field label="Content / Intro">
                <textarea
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                  rows={5}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              <Field label="Body Sections JSON">
                <textarea
                  value={jsonToText(draft.body_sections)}
                  onChange={(event) => setDraft({ ...draft, body_sections: event.target.value })}
                  rows={7}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 font-mono text-xs leading-5 outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              <Field label="FAQ JSON">
                <textarea
                  value={jsonToText(draft.faq_json)}
                  onChange={(event) => setDraft({ ...draft, faq_json: event.target.value })}
                  rows={7}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 font-mono text-xs leading-5 outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Status">
                  <select
                    value={draft.status ?? "draft"}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                    className="h-12 w-full rounded-xl border border-neutral-300 px-4 text-sm font-black outline-none focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
                  >
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>
                <label className="mt-7 flex h-12 items-center gap-3 rounded-xl border border-neutral-300 px-4 text-sm font-black">
                  <input
                    type="checkbox"
                    checked={draft.noindex}
                    onChange={(event) => setDraft({ ...draft, noindex: event.target.checked })}
                    className="h-4 w-4"
                  />
                  noindex 처리
                </label>
              </div>

              <button
                type="button"
                onClick={savePage}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-black uppercase tracking-[0.08em] text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                저장
              </button>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-neutral-50 p-8 text-center text-sm font-bold text-neutral-500">
              왼쪽에서 검수할 SEO 페이지를 선택하세요.
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-white/55">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-neutral-100 px-2 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-black text-neutral-950">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function PriorityBadge({ score, muted = false }: { score: number; muted?: boolean }) {
  if (muted) {
    return (
      <span className="inline-flex rounded-full bg-neutral-200 px-3 py-1 text-xs font-black text-neutral-500">
        제외
      </span>
    );
  }

  const tone = score >= 75
    ? "bg-[#ffe04b] text-neutral-950"
    : score >= 55
      ? "bg-blue-100 text-[#0066ee]"
      : "bg-neutral-100 text-neutral-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tone}`}>
      {score}
    </span>
  );
}

function WarningPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-black text-yellow-800">
      {label}
    </span>
  );
}

function clonePage(page: SeoAdminPageItem): SeoAdminPageItem {
  return JSON.parse(JSON.stringify(page)) as SeoAdminPageItem;
}

function jsonToText(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2);
}

function parseJsonField(value: unknown, label: string) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`${label} JSON 형식이 올바르지 않습니다.`);
  }
}
