"use client";

import { Database, Pause, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  buildBalancedCollectorPlan,
  collectorCities,
  collectorCategories,
  type CollectorPlanStep,
} from "@/lib/place-collector-config";

type RunStatus = "idle" | "running" | "stopping" | "stopped" | "completed" | "error";

type CollectorApiStatus = {
  configured: boolean;
  missing: string[];
  plan: {
    cities: number;
    districts: number;
    categories: number;
    steps: number;
    defaultTestTarget: number;
    defaultTestTotal: number;
  };
  totalRestaurants: number | null;
};

type StepApiResult = {
  query: string;
  city: string;
  district: string;
  category: string;
  fetched: number;
  usable: number;
  saved: number;
  skipped: number;
  errors: string[];
};

type ApiResponse<T> =
  | { ok: true; status: T }
  | { ok: true; result: T }
  | { ok: false; error: string };

type CollectorLog = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
};

const cityTargets = Object.fromEntries(collectorCities.map((city) => [city.slug, 0]));

export function PlaceCollectorDashboard() {
  const plan = useMemo(() => buildBalancedCollectorPlan(), []);
  const stopRequested = useRef(false);
  const [token, setToken] = useState("");
  const [targetPerCity, setTargetPerCity] = useState(20);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [status, setStatus] = useState<CollectorApiStatus | null>(null);
  const [currentStep, setCurrentStep] = useState<CollectorPlanStep | null>(null);
  const [cityProgress, setCityProgress] = useState<Record<string, number>>(cityTargets);
  const [logs, setLogs] = useState<CollectorLog[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const totalTarget = Math.max(1, collectorCities.length * targetPerCity);
  const savedTotal = Object.values(cityProgress).reduce((sum, value) => sum + value, 0);
  const progressPercent = Math.min(100, Math.round((savedTotal / totalTarget) * 100));
  const isRunning = runStatus === "running" || runStatus === "stopping";

  async function refreshStatus() {
    setErrorMessage("");
    try {
      const response = await collectorRequest<CollectorApiStatus>("/api/admin/place-collector/status", { method: "GET" });
      if ("status" in response) {
        setStatus(response.status);
        appendLog(`DB 현재 저장 수: ${response.status.totalRestaurants ?? "확인 불가"}개`, "info");
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function startCollection() {
    if (!token.trim()) {
      setErrorMessage("관리자 토큰을 먼저 입력해주세요.");
      return;
    }

    const clampedTarget = Math.max(1, Math.round(targetPerCity));
    const counts = Object.fromEntries(collectorCities.map((city) => [city.slug, 0]));
    stopRequested.current = false;
    setRunStatus("running");
    setErrorMessage("");
    setCityProgress(counts);
    setCurrentStep(null);
    setLogs([]);
    appendLog(`테스트 수집 시작: ${collectorCities.length}개 도시 x 도시당 ${clampedTarget}개`, "info");

    try {
      for (const step of plan) {
        if (stopRequested.current) break;
        if (counts[step.citySlug] >= clampedTarget) continue;

        const remaining = clampedTarget - counts[step.citySlug];
        const city = collectorCities.find((candidate) => candidate.slug === step.citySlug);
        const plannedStepsForCity = Math.max(1, (city?.districts.length ?? 1) * collectorCategories.length);
        const maxResults = Math.min(20, remaining, Math.max(1, Math.ceil(clampedTarget / plannedStepsForCity)));
        setCurrentStep(step);

        const response = await collectorRequest<StepApiResult>("/api/admin/place-collector/collect-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            citySlug: step.citySlug,
            districtName: step.districtName,
            categoryKey: step.categoryKey,
            maxResults,
          }),
        });

        if (!("result" in response)) continue;

        const result = response.result;
        counts[step.citySlug] += result.saved;
        setCityProgress({ ...counts });

        const logType = result.errors.length ? "warning" : result.saved ? "success" : "info";
        appendLog(
          `${result.city} / ${result.district} / ${result.category}: 검색 ${result.fetched}, 유효 ${result.usable}, 저장 ${result.saved}, 중복 ${result.skipped}`,
          logType,
        );

        if (result.errors.length) {
          appendLog(`오류 ${result.errors.length}건: ${result.errors.slice(0, 2).join(" / ")}`, "warning");
        }

        await delay(250);
      }

      setRunStatus(stopRequested.current ? "stopped" : "completed");
      setCurrentStep(null);
      appendLog(stopRequested.current ? "수집을 중지했습니다. 이미 진행 중이던 1개 요청은 반영됐을 수 있습니다." : "수집 작업이 끝났습니다.", stopRequested.current ? "warning" : "success");
      await refreshStatus();
    } catch (error) {
      setRunStatus("error");
      handleError(error);
    }
  }

  function stopCollection() {
    stopRequested.current = true;
    setRunStatus("stopping");
    appendLog("중지 요청됨: 현재 API 요청이 끝나면 다음 단계로 넘어가지 않습니다.", "warning");
  }

  async function collectorRequest<T>(path: string, init: RequestInit): Promise<ApiResponse<T>> {
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        ...(init.headers ?? {}),
      },
    });
    const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

    if (!response.ok || data.ok === false) {
      throw new Error(data.ok === false ? data.error : `요청 실패 (${response.status})`);
    }

    return data;
  }

  function appendLog(message: string, type: CollectorLog["type"] = "info") {
    setLogs((previous) => [
      { id: `${Date.now()}-${Math.random()}`, message, type },
      ...previous,
    ].slice(0, 80));
  }

  function handleError(error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    setErrorMessage(message);
    appendLog(message, "error");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0066ee]">Google Places Collector</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-950 md:text-6xl">
              Mango Vietnam 전국 장소 DB 수집기
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-neutral-600">
              Google Places API로 주요 도시의 식당, 카페, 마사지 장소를 수집하고 Supabase restaurants 테이블에 중복 없이 저장합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm font-bold text-neutral-700">
            <div className="flex items-center gap-2 text-neutral-950">
              <ShieldCheck className="h-5 w-5 text-[#0066ee]" />
              Service role key는 서버 API에서만 사용
            </div>
            <p className="mt-2 leading-6">브라우저에는 관리자 토큰만 입력합니다.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <label className="space-y-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Admin Token</span>
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                type="password"
                placeholder="COLLECTOR_ADMIN_TOKEN"
                className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base font-bold outline-none transition focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Per City</span>
              <input
                value={targetPerCity}
                onChange={(event) => setTargetPerCity(Number(event.target.value))}
                min={1}
                max={800}
                type="number"
                className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base font-black outline-none transition focus:border-[#0066ee] focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startCollection}
              disabled={isRunning}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#0066ee] px-5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#0054c8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              수집 시작
            </button>
            <button
              type="button"
              onClick={stopCollection}
              disabled={!isRunning}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-black uppercase tracking-[0.08em] text-neutral-950 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              중지
            </button>
            <button
              type="button"
              onClick={refreshStatus}
              disabled={!token.trim() || isRunning}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-black uppercase tracking-[0.08em] text-neutral-950 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              상태 확인
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-neutral-950 p-5 text-white shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-300">Progress</p>
              <p className="mt-2 text-3xl font-black">{savedTotal.toLocaleString("ko-KR")} / {totalTarget.toLocaleString("ko-KR")}</p>
            </div>
            <Database className="h-10 w-10 text-[#ffe04b]" />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#ffe04b]" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm font-bold">
            <Stat label="상태" value={statusLabel(runStatus)} />
            <Stat label="DB 저장 수" value={status?.totalRestaurants?.toLocaleString("ko-KR") ?? "-"} />
            <Stat label="API 단계" value={status?.plan.steps.toLocaleString("ko-KR") ?? plan.length.toLocaleString("ko-KR")} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collectorCities.map((city) => {
          const value = cityProgress[city.slug] ?? 0;
          const percent = Math.min(100, Math.round((value / Math.max(1, targetPerCity)) * 100));
          return (
            <article key={city.slug} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-neutral-950">{city.name}</h2>
                  <p className="mt-1 text-sm font-bold text-neutral-500">{city.districts.length}개 주요 지역</p>
                </div>
                <span className="rounded-full bg-[#ffe04b] px-3 py-1 text-sm font-black text-neutral-950">{percent}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-[#0066ee]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-sm font-black text-neutral-600">
                저장 {value.toLocaleString("ko-KR")} / 목표 {targetPerCity.toLocaleString("ko-KR")}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Current Step</p>
          {currentStep ? (
            <div className="mt-4 space-y-3">
              <p className="text-3xl font-black text-neutral-950">{currentStep.cityName}</p>
              <p className="text-lg font-bold text-neutral-700">{currentStep.districtName} / {currentStep.categoryLabel}</p>
              <p className="text-sm font-semibold leading-6 text-neutral-500">
                Google Places는 요청당 최대 20개 결과를 받습니다. 도시 목표치에 도달하면 해당 도시는 자동으로 건너뜁니다.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-lg font-bold text-neutral-500">대기 중</p>
          )}

          {status?.missing.length ? (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
              누락된 환경변수: {status.missing.join(", ")}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-neutral-500">Run Log</p>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-sm font-black text-[#0066ee] transition hover:text-neutral-950"
            >
              비우기
            </button>
          </div>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {logs.length ? logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${logColor(log.type)}`}
              >
                {log.message}
              </div>
            )) : (
              <div className="rounded-2xl bg-neutral-50 px-4 py-6 text-sm font-bold text-neutral-500">
                아직 실행 로그가 없습니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-white/55">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function statusLabel(status: RunStatus) {
  const labels: Record<RunStatus, string> = {
    idle: "대기",
    running: "실행 중",
    stopping: "중지 중",
    stopped: "중지됨",
    completed: "완료",
    error: "오류",
  };
  return labels[status];
}

function logColor(type: CollectorLog["type"]) {
  const colors: Record<CollectorLog["type"], string> = {
    info: "bg-neutral-50 text-neutral-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
  };
  return colors[type];
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
