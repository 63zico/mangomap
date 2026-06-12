import { NextResponse } from "next/server";

import {
  authorizeCollectorRequest,
  collectPlacesStep,
} from "@/lib/place-collector-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    authorizeCollectorRequest(request);
    const body = await request.json();
    const result = await collectPlacesStep(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return collectorErrorResponse(error);
  }
}

function collectorErrorResponse(error: unknown) {
  const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
  const message = error instanceof Error ? error.message : "Collector step failed.";
  return NextResponse.json({ ok: false, error: message }, { status });
}
