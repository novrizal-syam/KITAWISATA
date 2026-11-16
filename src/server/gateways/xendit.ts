// Xendit Invoices (https://docs.xendit.co): create an invoice, verify the callback token, read the invoice.
import { timingSafeEqual } from "node:crypto";
import { basic, baseUrl, GatewayError, type CreatedPayment, type GatewayStatus } from "./common";

export const XENDIT_HOST = "api.xendit.co"; // test or live is decided by the key
export const xenditApiBase = () => baseUrl("XENDIT_API_BASE", XENDIT_HOST);

export async function createXenditInvoice(
  p: { secretKey: string; externalId: string; amount: number; description: string; name: string; phone: string; successUrl: string; failureUrl: string; durationSeconds: number },
  doFetch: typeof fetch = fetch,
): Promise<CreatedPayment> {
  const res = await doFetch(`${xenditApiBase()}/v2/invoices`, {
    method: "POST",
    headers: { Authorization: basic(p.secretKey), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      external_id: p.externalId, amount: p.amount, currency: "IDR", description: p.description.slice(0, 255),
      invoice_duration: Math.max(900, Math.round(p.durationSeconds)),
      customer: { given_names: p.name.slice(0, 50), mobile_number: p.phone },
      success_redirect_url: p.successUrl, failure_redirect_url: p.failureUrl,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; invoice_url?: string; message?: string };
  if (!res.ok || !body.id || !body.invoice_url) throw new GatewayError(`Xendit: ${body.message ?? `HTTP ${res.status}`}`, res.status);
  return { providerRef: body.id, redirectUrl: body.invoice_url };
}

/** The x-callback-token header must equal the account's callback verification token. */
export function verifyXenditToken(header: string | null, token: string | undefined): boolean {
  if (!header || !token) return false;
  const a = Buffer.from(header), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function xenditState(status?: string): GatewayStatus["state"] {
  return status === "PAID" || status === "SETTLED" ? "paid" : status === "EXPIRED" ? "expired" : status === "PENDING" || !status ? "pending" : "failed";
}

export async function xenditInvoiceStatus(p: { secretKey: string; invoiceId: string }, doFetch: typeof fetch = fetch): Promise<GatewayStatus> {
  const res = await doFetch(`${xenditApiBase()}/v2/invoices/${encodeURIComponent(p.invoiceId)}`, {
    headers: { Authorization: basic(p.secretKey), Accept: "application/json" }, signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401 || res.status === 403) throw new GatewayError("Xendit rejected the secret key", res.status);
  const body = (await res.json().catch(() => ({}))) as { status?: string; amount?: number; paid_amount?: number };
  if (!res.ok) throw new GatewayError(`Xendit: HTTP ${res.status}`, res.status);
  return { state: xenditState(body.status), amount: body.paid_amount ?? body.amount ?? null, raw: body };
}
