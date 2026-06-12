import { createHash, randomUUID } from "node:crypto";

export type UserPostStatus = "pending_review" | "approved" | "hidden" | "deleted";
export type UserPostIndexStatus = "noindex" | "index";

export type UserPostInput = {
  category: string;
  city: string;
  title: string;
  contact: string;
  price: string;
  detail: string;
  authorName?: string;
};

export type UserPost = {
  id: string;
  slug: string;
  category: string;
  city: string;
  title: string;
  contact: string;
  price: string | null;
  detail: string;
  authorName: string;
  status: UserPostStatus;
  indexStatus: UserPostIndexStatus;
  trustScore: number;
  reportCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

type UserPostRow = {
  id: string;
  slug: string;
  category: string;
  city: string;
  title: string;
  contact: string;
  price: string | null;
  detail: string;
  author_name: string | null;
  status: UserPostStatus;
  index_status: UserPostIndexStatus;
  trust_score: number;
  report_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const allowedUserPostCategories = ["구인구직", "중고거래", "부동산", "업체·가격", "사진·후기", "생활정보"];
export const allowedUserPostCities = ["호치민", "다낭", "나트랑", "하노이", "푸꾸옥", "달랏", "붕따우", "기타"];

export function isUserPostsConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function validateUserPostInput(input: UserPostInput) {
  const category = input.category.trim();
  const city = input.city.trim();
  const title = input.title.trim();
  const contact = input.contact.trim();
  const price = input.price.trim();
  const detail = input.detail.trim();
  const authorName = input.authorName?.trim() || "망고 유저";
  const textForSafety = [title, contact, price, detail].join(" ");

  if (!allowedUserPostCategories.includes(category)) return { ok: false as const, message: "카테고리를 다시 선택해주세요." };
  if (!allowedUserPostCities.includes(city)) return { ok: false as const, message: "도시를 다시 선택해주세요." };
  if (title.length < 4 || title.length > 80) return { ok: false as const, message: "제목은 4자 이상 80자 이하로 적어주세요." };
  if (contact.length < 2 || contact.length > 120) return { ok: false as const, message: "연락 방법을 적어주세요." };
  if (detail.length < 20 || detail.length > 3000) return { ok: false as const, message: "상세 내용은 20자 이상 적어주세요." };
  if (["구인구직", "중고거래", "부동산"].includes(category) && price.length < 2) {
    return { ok: false as const, message: "가격, 급여, 월세 또는 협의 여부를 적어주세요." };
  }
  if ((textForSafety.match(/https?:\/\/|www\.|t\.me|텔레그램|telegram/gi) ?? []).length > 3) {
    return { ok: false as const, message: "링크가 너무 많습니다. 핵심 연락 링크만 남겨주세요." };
  }
  if (/카지노|도박|바카라|토토|성인인증|조건만남|마약|대포통장/i.test(textForSafety)) {
    return { ok: false as const, message: "등록할 수 없는 표현이 포함되어 있습니다." };
  }

  return {
    ok: true as const,
    value: { category, city, title, contact, price, detail, authorName },
  };
}

export async function createUserPost(input: UserPostInput, request: Request) {
  if (!isUserPostsConfigured()) {
    throw new Error("USER_POSTS_NOT_CONFIGURED");
  }

  const validation = validateUserPostInput(input);
  if (!validation.ok) {
    const error = new Error(validation.message);
    error.name = "ValidationError";
    throw error;
  }

  const value = validation.value;
  const slug = createPostSlug(value.city, value.category, value.title);
  const row = {
    slug,
    category: value.category,
    city: value.city,
    title: value.title,
    contact: value.contact,
    price: value.price || null,
    detail: value.detail,
    author_name: value.authorName,
    status: "pending_review",
    index_status: "noindex",
    visibility: "public",
    ip_hash: hashIp(request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? ""),
    user_agent_hash: hashIp(request.headers.get("user-agent") ?? ""),
  };

  const rows = await supabaseRest<UserPostRow[]>("/rest/v1/user_posts?select=*", {
    method: "POST",
    body: row,
    prefer: "return=representation",
  });

  if (!rows[0]) throw new Error("등록 결과를 확인할 수 없습니다.");
  return mapUserPost(rows[0]);
}

export async function getUserPostBySlug(slug: string) {
  if (!isUserPostsConfigured()) return null;
  const rows = await supabaseRest<UserPostRow[]>(
    `/rest/v1/user_posts?slug=eq.${encodeURIComponent(slug)}&visibility=eq.public&status=in.(pending_review,approved)&select=*&limit=1`,
    { method: "GET", next: { revalidate: 0 } },
  );

  return rows[0] ? mapUserPost(rows[0]) : null;
}

export async function getLatestUserPosts(limit = 30) {
  if (!isUserPostsConfigured()) return [];
  const rows = await supabaseRest<UserPostRow[]>(
    `/rest/v1/user_posts?visibility=eq.public&status=in.(pending_review,approved)&select=*&order=created_at.desc&limit=${limit}`,
    { method: "GET", next: { revalidate: 0 } },
  );

  return rows.map(mapUserPost);
}

type SupabaseRestOptions = {
  method: "GET" | "POST";
  body?: unknown;
  prefer?: string;
  next?: NextFetchRequestConfig;
};

async function supabaseRest<T>(path: string, options: SupabaseRestOptions): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    next: options.next,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : `Supabase request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function mapUserPost(row: UserPostRow): UserPost {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    city: row.city,
    title: row.title,
    contact: row.contact,
    price: row.price,
    detail: row.detail,
    authorName: row.author_name || "망고 유저",
    status: row.status,
    indexStatus: row.index_status,
    trustScore: row.trust_score,
    reportCount: row.report_count,
    viewCount: row.view_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPostSlug(city: string, category: string, title: string) {
  const readable = slugSegment(`${city}-${category}-${title}`).slice(0, 72);
  const suffix = randomUUID().slice(0, 8);
  return `${readable || "post"}-${suffix}`;
}

function slugSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function hashIp(value: string) {
  if (!value) return null;
  return createHash("sha256").update(value.split(",")[0].trim()).digest("hex");
}
