import { NextResponse } from "next/server";

import {
  authorizeCollectorRequest,
  getCollectorStatus,
} from "@/lib/place-collector-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    authorizeCollectorRequest(request);
    const status = await getCollectorStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return collectorErrorResponse(error);
  }
}

function collectorErrorResponse(error: unknown) {
  const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
  const message = error instanceof Error ? error.message : "Collector status failed.";
  return NextResponse.json({ ok: false, error: message }, { status });
}
