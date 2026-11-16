import { NextResponse } from "next/server";
import { handleXenditCallback } from "@/server/gatewayService";

// Xendit invoice callback. The x-callback-token is checked and the invoice is re-read from Xendit.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const r = await handleXenditCallback(req.headers.get("x-callback-token"), body);
    return NextResponse.json({ ok: r.status === 200, outcome: r.result?.outcome }, { status: r.status });
  } catch (e) {
    console.error("[xendit] callback failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Xendit retries
  }
}
