const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseSessionStorageKey = "mangomap:supabase-access-token";
const supabaseRefreshTokenStorageKey = "mangomap:supabase-refresh-token";

let supabaseAccessToken = readPersistedSupabaseAccessToken();
let supabaseRefreshToken = readPersistedSupabaseRefreshToken();

type RestMethod = "GET" | "POST" | "PATCH" | "DELETE";
type SupabaseUploadOptions = {
  folder?: string;
  fileNamePrefix?: string;
  maxBytes?: number;
};
type SupabaseUploadFileOptions = SupabaseUploadOptions & {
  contentType?: string;
  fileName?: string;
};

type RealtimeStatus = "connecting" | "live" | "error";
type SupabaseRealtimeMessage<T> = {
  event?: string;
  payload?: {
    data?: {
      record?: T;
    };
    record?: T;
    status?: string;
  };
  ref?: string;
  topic?: string;
};

type SupabaseRestOptions = {
  method?: RestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  prefer?: string;
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfigStatus() {
  return {
    configured: isSupabaseConfigured(),
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey)
  };
}

export function hasSupabaseSession() {
  return Boolean(supabaseAccessToken || supabaseRefreshToken);
}

function readPersistedSupabaseAccessToken() {
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return storage?.getItem(supabaseSessionStorageKey) ?? "";
}

function readPersistedSupabaseRefreshToken() {
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  return storage?.getItem(supabaseRefreshTokenStorageKey) ?? "";
}

export function setSupabaseAccessToken(accessToken?: string) {
  supabaseAccessToken = accessToken ?? "";
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;
  if (supabaseAccessToken) storage.setItem(supabaseSessionStorageKey, supabaseAccessToken);
  else storage.removeItem(supabaseSessionStorageKey);
}

export function setSupabaseSession(accessToken?: string, refreshToken?: string) {
  setSupabaseAccessToken(accessToken);
  supabaseRefreshToken = refreshToken ?? supabaseRefreshToken;
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (!storage) return;
  if (supabaseRefreshToken) storage.setItem(supabaseRefreshTokenStorageKey, supabaseRefreshToken);
  else storage.removeItem(supabaseRefreshTokenStorageKey);
}

export function clearSupabaseSession() {
  supabaseRefreshToken = "";
  setSupabaseAccessToken();
  const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  storage?.removeItem(supabaseRefreshTokenStorageKey);
}

function requireSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase URL/Anon Key is not configured.");
  }
}

function createHeaders(options?: SupabaseRestOptions) {
  const bearerToken = supabaseAccessToken || supabaseAnonKey;
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json",
    ...(options?.prefer ? { Prefer: options.prefer } : {}),
    ...options?.headers
  };
}

async function parseSupabaseResponse<T>(response: Response): Promise<T> {
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

async function refreshSupabaseSession() {
  if (!supabaseRefreshToken) return false;
  requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: supabaseRefreshToken })
  });
  if (!response.ok) {
    clearSupabaseSession();
    return false;
  }
  const payload = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (!payload.access_token) return false;
  setSupabaseSession(payload.access_token, payload.refresh_token);
  return true;
}

async function shouldRefreshSupabaseSession(response: Response) {
  if (response.ok || !supabaseRefreshToken) return false;
  if (response.status === 401) return true;
  const text = await response.clone().text();
  return /jwt expired|invalid jwt|expired/i.test(text);
}

export async function supabaseRest<T>(path: string, options: SupabaseRestOptions = {}): Promise<T> {
  requireSupabaseConfig();
  const request = () => fetch(`${supabaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: createHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  let response = await request();
  if (await shouldRefreshSupabaseSession(response)) {
    const refreshed = await refreshSupabaseSession();
    if (refreshed) response = await request();
  }

  return parseSupabaseResponse<T>(response);
}

export async function supabaseSelect<T>(table: string, query = "select=*") {
  return supabaseRest<T[]>(`/rest/v1/${table}?${query}`);
}

export async function supabaseInsert<T>(table: string, row: unknown) {
  const rows = await supabaseRest<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    body: row,
    prefer: "return=representation"
  });
  return rows[0];
}

export async function supabaseUpsert<T>(table: string, row: unknown, conflictColumn = "id") {
  const rows = await supabaseRest<T[]>(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
    method: "POST",
    body: row,
    prefer: "resolution=merge-duplicates,return=representation"
  });
  return rows[0];
}

export async function supabasePatchById<T>(table: string, id: string, row: unknown) {
  const rows = await supabaseRest<T[]>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: row,
    prefer: "return=representation"
  });
  return rows[0];
}

export async function supabaseDeleteById(table: string, id: string) {
  await supabaseRest<unknown>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function supabaseAuthRequest<T>(path: string, body: unknown) {
  return supabaseRest<T>(`/auth/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    body
  });
}

export async function supabaseAuthUser<T>(accessToken: string) {
  requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  return parseSupabaseResponse<T>(response);
}

export async function supabaseUploadDataUrl(bucket: string, dataUrl: string, options: SupabaseUploadOptions = {}) {
  requireSupabaseConfig();
  const parsed = parseDataUrl(dataUrl);
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;

  if (parsed.bytes.byteLength > maxBytes) {
    throw new Error(`이미지는 최대 ${Math.round(maxBytes / 1024 / 1024)}MB까지만 올릴 수 있어요.`);
  }

  const folder = sanitizeStoragePath(options.folder ?? "uploads");
  const prefix = sanitizeStoragePath(options.fileNamePrefix ?? "image");
  const extension = getExtensionFromMimeType(parsed.mimeType);
  const objectPath = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAccessToken || supabaseAnonKey}`,
      "Content-Type": parsed.mimeType,
      "x-upsert": "false"
    },
    body: new Blob([parsed.bytes], { type: parsed.mimeType })
  });

  await parseSupabaseResponse<unknown>(response);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export async function supabaseUploadFile(bucket: string, file: Blob, options: SupabaseUploadFileOptions = {}) {
  requireSupabaseConfig();
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  const fileSize = typeof file.size === "number" ? file.size : 0;

  if (fileSize > maxBytes) {
    throw new Error(`이미지는 최대 ${Math.round(maxBytes / 1024 / 1024)}MB까지 올릴 수 있어요.`);
  }

  const mimeType = options.contentType || file.type || "image/jpeg";
  if (!mimeType.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있어요.");

  const folder = sanitizeStoragePath(options.folder ?? "uploads");
  const prefix = sanitizeStoragePath(options.fileNamePrefix ?? "image");
  const extension = getStorageExtension(options.fileName, mimeType);
  const objectPath = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAccessToken || supabaseAnonKey}`,
      "Content-Type": mimeType,
      "x-upsert": "false"
    },
    body: file
  });

  await parseSupabaseResponse<unknown>(response);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export function isSupabaseStorageDataUrl(value?: string) {
  return Boolean(value?.startsWith("data:image/"));
}

export function subscribeSupabaseInserts<T>(
  table: string,
  filter: string,
  onInsert: (record: T) => void,
  onStatusChange?: (status: RealtimeStatus) => void
) {
  if (!isSupabaseConfigured() || typeof WebSocket === "undefined") return undefined;

  const socketUrl = `${supabaseUrl.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(supabaseAnonKey)}&vsn=1.0.0`;
  const socket = new WebSocket(socketUrl);
  const topic = `realtime:public:${table}:${filter || "all"}:${Math.random().toString(36).slice(2, 8)}`;
  let ref = 1;
  let heartbeatId: ReturnType<typeof setInterval> | undefined;
  const nextRef = () => String(ref++);
  const send = (event: string, payload: Record<string, unknown>, targetTopic = topic) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ topic: targetTopic, event, payload, ref: nextRef() }));
  };

  onStatusChange?.("connecting");
  socket.onopen = () => {
    send("phx_join", {
      config: {
        broadcast: { self: false },
        presence: { key: "" },
        postgres_changes: [
          {
            event: "INSERT",
            schema: "public",
            table,
            ...(filter ? { filter } : {})
          }
        ]
      },
      access_token: supabaseAccessToken || supabaseAnonKey
    });
    heartbeatId = setInterval(() => send("heartbeat", {}, "phoenix"), 25000);
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as SupabaseRealtimeMessage<T>;
      if (message.event === "phx_reply" && message.payload?.status === "ok") onStatusChange?.("live");
      const record = message.payload?.data?.record ?? message.payload?.record;
      if (message.event === "postgres_changes" && record) onInsert(record);
    } catch {
      // Ignore malformed realtime frames.
    }
  };

  socket.onerror = () => onStatusChange?.("error");
  socket.onclose = () => onStatusChange?.("error");

  return () => {
    if (heartbeatId) clearInterval(heartbeatId);
    if (socket.readyState === WebSocket.OPEN) send("phx_leave", {});
    socket.close();
  };
}

export function getSupabaseOAuthUrl(provider: "google" | "kakao", redirectTo?: string, scopes?: string) {
  requireSupabaseConfig();
  const params = new URLSearchParams({ provider });
  if (redirectTo) params.set("redirect_to", redirectTo);
  if (scopes) {
    params.set("scopes", scopes);
    params.set("scope", scopes);
  }
  return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("이미지 파일 형식을 확인해주세요.");

  const mimeType = match[1];
  if (!mimeType.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있어요.");

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType, bytes };
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

function getStorageExtension(fileName: string | undefined, mimeType: string) {
  const extension = fileName?.split(".").pop()?.trim().toLowerCase();
  if (extension && /^(jpg|jpeg|png|webp|gif)$/.test(extension)) return extension === "jpeg" ? "jpg" : extension;
  return getExtensionFromMimeType(mimeType);
}

function sanitizeStoragePath(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "") || "image";
}
