import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SIZE = 80;
const MAX_SIZE = 1600;
let envFileKey: string | undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const photoName = url.searchParams.get("name")?.trim();
  const label = url.searchParams.get("label")?.trim() || "Mango Vietnam";
  const width = clampSize(url.searchParams.get("w"), 720);
  const height = clampSize(url.searchParams.get("h"), 520);
  const key = getGoogleMapsKey();

  if (!photoName || !isValidPhotoName(photoName) || !key) {
    return placeholder(label, width, height);
  }

  const mediaUrl = new URL(`https://places.googleapis.com/v1/${encodePhotoName(photoName)}/media`);
  mediaUrl.searchParams.set("key", key);
  mediaUrl.searchParams.set("maxWidthPx", String(width));
  mediaUrl.searchParams.set("maxHeightPx", String(height));
  mediaUrl.searchParams.set("skipHttpRedirect", "true");

  try {
    const response = await fetch(mediaUrl, { cache: "no-store" });
    if (!response.ok) return placeholder(label, width, height);

    const data = (await response.json()) as { photoUri?: string };
    if (!data.photoUri) return placeholder(label, width, height);

    return NextResponse.redirect(data.photoUri, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    return placeholder(label, width, height);
  }
}

function isValidPhotoName(value: string) {
  return /^places\/[^/\s]+\/photos\/[^/\s]+$/.test(value);
}

function getGoogleMapsKey() {
  if (process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  }
  if (envFileKey !== undefined) return envFileKey;

  try {
    const envPath = path.join(process.cwd(), ".env");
    const envText = fs.readFileSync(envPath, "utf8");
    const match = envText.match(/^(GOOGLE_MAPS_API_KEY|EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)=(.+)$/m);
    envFileKey = match?.[2]?.trim();
  } catch {
    envFileKey = "";
  }

  return envFileKey;
}

function encodePhotoName(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function clampSize(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(parsed)));
}

function placeholder(label: string, width: number, height: number) {
  const safeLabel = escapeSvg(label).slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f8faf4"/>
      <stop offset="1" stop-color="#e6f1df"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.22)}" r="${Math.round(Math.min(width, height) * 0.16)}" fill="#d8ead4"/>
  <path d="M0 ${Math.round(height * 0.78)} C ${Math.round(width * 0.22)} ${Math.round(height * 0.62)}, ${Math.round(width * 0.42)} ${Math.round(height * 0.9)}, ${Math.round(width * 0.64)} ${Math.round(height * 0.7)} S ${Math.round(width * 0.9)} ${Math.round(height * 0.58)}, ${width} ${Math.round(height * 0.72)} L ${width} ${height} L 0 ${height} Z" fill="#cfe3ca"/>
  <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.18)}" fill="#0b6b43" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.045))}" font-weight="700">Mango Vietnam</text>
  <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.28)}" fill="#42554a" font-family="Arial, sans-serif" font-size="${Math.max(14, Math.round(width * 0.032))}" font-weight="600">${safeLabel} 사진 준비중</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

function escapeSvg(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}
