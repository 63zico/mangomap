export function getSupabaseAdminConfig() {
  const url = (process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || "";

  return { url, serviceKey };
}

export function assertSupabaseAdminConfig() {
  const { url, serviceKey } = getSupabaseAdminConfig();
  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");

  if (missing.length) {
    throw new Error(`Supabase admin environment is incomplete: ${missing.join(", ")}`);
  }

  return { url, serviceKey };
}

export async function supabaseAdminFetch(path: string, init: RequestInit = {}) {
  const { url, serviceKey } = assertSupabaseAdminConfig();

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}
