import type { AuthJoinPayload } from "../types/auth";
import { getSupabaseOAuthUrl, isSupabaseConfigured, setSupabaseSession, supabaseAuthRequest, supabaseAuthUser } from "./supabaseClient";

type SupabaseUser = {
  id: string;
  phone?: string | null;
  email?: string | null;
  app_metadata?: {
    provider?: string;
  };
  user_metadata?: {
    full_name?: string;
    name?: string;
    nickname?: string;
  };
};

type SupabaseVerifyResponse = {
  user?: SupabaseUser;
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
};

let pendingPhoneNumber = "";

export function isSupabaseAuthConfigured() {
  return typeof window !== "undefined" && isSupabaseConfigured();
}

function buildPhoneNickname(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 4 ? `여행자${digits.slice(-4)}` : "망고베트남 여행자";
}

function buildPayload(provider: AuthJoinPayload["provider"], user: SupabaseUser, fallbackNickname: string): AuthJoinPayload {
  const metadataName = user.user_metadata?.nickname ?? user.user_metadata?.full_name ?? user.user_metadata?.name;

  return {
    authUid: user.id,
    nickname: metadataName?.trim() || fallbackNickname,
    provider,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined
  };
}

export async function sendSupabasePhoneOtp(phoneNumber: string) {
  pendingPhoneNumber = phoneNumber;
  await supabaseAuthRequest<{ message?: string }>("otp", {
    phone: phoneNumber,
    create_user: true
  });
}

export async function confirmSupabasePhoneOtp(code: string, nickname?: string) {
  if (!pendingPhoneNumber) throw new Error("먼저 인증번호를 요청해주세요.");

  const result = await supabaseAuthRequest<SupabaseVerifyResponse>("verify", {
    phone: pendingPhoneNumber,
    token: code,
    type: "sms"
  });

  if (!result.user) throw new Error("Supabase 사용자 정보를 받지 못했어요.");
  setSupabaseSession(result.session?.access_token, result.session?.refresh_token);

  const payload = buildPayload("phone", result.user, nickname?.trim() || buildPhoneNickname(pendingPhoneNumber));
  pendingPhoneNumber = "";
  return payload;
}

export async function confirmSupabasePhoneTrustOtp(code: string) {
  if (!pendingPhoneNumber) throw new Error("먼저 인증번호를 요청해주세요.");

  const verifiedPhoneNumber = pendingPhoneNumber;
  const result = await supabaseAuthRequest<SupabaseVerifyResponse>("verify", {
    phone: verifiedPhoneNumber,
    token: code,
    type: "sms"
  });

  if (!result.user) throw new Error("전화번호 인증 정보를 확인하지 못했어요.");
  setSupabaseSession(result.session?.access_token, result.session?.refresh_token);
  pendingPhoneNumber = "";
  return {
    phone: verifiedPhoneNumber,
    phoneVerifiedAt: new Date().toISOString()
  };
}

export function openSupabaseOAuth(provider: "google" | "kakao") {
  const redirectTo = typeof window === "undefined" ? undefined : window.location.origin;
  const scopes = provider === "kakao" ? "openid profile_nickname profile_image" : "email profile";
  const url = getSupabaseOAuthUrl(provider, redirectTo, scopes);
  if (typeof window !== "undefined") window.location.assign(url);
}

export async function consumeSupabaseOAuthRedirect() {
  if (typeof window === "undefined" || !window.location.hash.includes("access_token=")) return undefined;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") ?? undefined;
  if (!accessToken) return undefined;

  setSupabaseSession(accessToken, refreshToken);
  const user = await supabaseAuthUser<SupabaseUser>(accessToken);
  const provider = user.app_metadata?.provider === "kakao" ? "kakao" : "google";
  const nickname = user.email?.split("@")[0] || (provider === "kakao" ? "카카오 여행자" : "Google 여행자");

  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  return buildPayload(provider, user, nickname);
}
