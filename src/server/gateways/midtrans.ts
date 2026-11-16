// Midtrans Snap (https://docs.midtrans.com): create a Snap transaction, verify HTTP notifications,
// and read the transaction status.
import { createHash, timingSafeEqual } from "node:crypto";
import { basic, baseUrl, GatewayError, type CreatedPayment, type GatewayStatus } from "./common";

type Mode = "SANDBOX" | "PRODUCTION";
export const midtransHosts = (mode: Mode) =>
  mode === "SANDBOX" ? { snap: "app.sandbox.midtrans.com", api: "api.sandbox.midtrans.com" } : { snap: "app.midtrans.com", api: "api.midtrans.com" };
const snapBase = (mode: Mode) => baseUrl("MIDTRANS_SNAP_BASE", midtransHosts(mode).snap);
export const midtransApiBase = (mode: Mode) => baseUrl("MIDTRANS_API_BASE", midtransHosts(mode).api);

export async function createSnap(
  p: { serverKey: string; mode: Mode; orderId: string; amount: number; name: string; phone: string; itemName: string; finishUrl: string; expiryMinutes: number },
  doFetch: typeof fetch = fetch,
): Promise<CreatedPayment> {
  const res = await doFetch(`${snapBase(p.mode)}/snap/v1/transactions`, {
    method: "POST",
    headers: { Authorization: basic(p.serverKey), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      transaction_details: { order_id: p.orderId, gross_amount: p.amount },
      item_details: [{ id: p.orderId, price: p.amount, quantity: 1, name: p.itemName.slice(0, 50) }],
      customer_details: { first_name: p.name.slice(0, 50), phone: p.phone },
      callbacks: { finish: p.finishUrl },
      expiry: { unit: "minute", duration: Math.max(15, Math.round(p.expiryMinutes)) },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] };
  if (!res.ok || !body.token || !body.redirect_url) throw new GatewayError(`Midtrans: ${body.error_messages?.join("; ") ?? `HTTP ${res.status}`}`, res.status);
  return { providerRef: body.token, redirectUrl: body.redirect_url };
}

/** signature_key = SHA512(order_id + status_code + gross_amount + server_key), compared in constant time. */
export function verifyMidtransSignature(n: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }, serverKey: string): boolean {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const expected = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + serverKey).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(String(n.signature_key));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function midtransState(s: { transaction_status?: string; fraud_status?: string }): GatewayStatus["state"] {
  switch (s.transaction_status) {
    case "settlement": return "paid";
    case "capture": return s.fraud_status === "accept" || !s.fraud_status ? "paid" : "pending";
    case "pending": return "pending";
    case "expire": return "expired";
    default: return s.transaction_status ? "failed" : "pending"; // deny, cancel, failure
  }
}

/** Ask Midtrans directly; never trust a notification body on its own. */
export async function midtransStatus(p: { serverKey: string; mode: Mode; orderId: string }, doFetch: typeof fetch = fetch): Promise<GatewayStatus> {
  const res = await doFetch(`${midtransApiBase(p.mode)}/v2/${encodeURIComponent(p.orderId)}/status`, {
    headers: { Authorization: basic(p.serverKey), Accept: "application/json" }, signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status_code?: string; transaction_status?: string; fraud_status?: string; gross_amount?: string };
  if (res.status === 401 || body.status_code === "401") throw new GatewayError("Midtrans rejected the server key", 401);
  if (body.status_code === "404") return { state: "pending", amount: null, raw: body }; // customer hasn't chosen a method yet
  return { state: midtransState(body), amount: body.gross_amount ? Math.round(Number(body.gross_amount)) : null, raw: body };
}
