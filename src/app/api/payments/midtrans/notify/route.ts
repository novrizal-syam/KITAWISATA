import { NextResponse } from "next/server";
import { handleMidtransNotification } from "@/server/gatewayService";

// Midtrans HTTP notification. The body is only a hint: the signature is checked and the status is
// re-read from Midtrans before anything is recorded. Errors are logged without the body.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const r = await handleMidtransNotification(body);
    return NextResponse.json({ ok: r.status === 200, outcome: r.result?.outcome }, { status: r.status });
  } catch (e) {
    console.error("[midtrans] notification failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Midtrans retries
  }
}
