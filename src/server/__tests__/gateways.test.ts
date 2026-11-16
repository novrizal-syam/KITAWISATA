import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createSnap, midtransState, midtransStatus, verifyMidtransSignature } from "../gateways/midtrans";
import { createXenditInvoice, verifyXenditToken, xenditState } from "../gateways/xendit";

const KEY = "SB-Mid-server-TESTKEY";
const sign = (o: string, c: string, g: string) => createHash("sha512").update(o + c + g + KEY).digest("hex");
const fake = (status: number, body: object) => vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify(body), { status }));
type F = typeof fetch;

describe("Midtrans", () => {
  it("accepts a correct signature and rejects a tampered amount or wrong key", () => {
    const n = { order_id: "KW-ABC123-1-XY2Z", status_code: "200", gross_amount: "1470000.00", signature_key: sign("KW-ABC123-1-XY2Z", "200", "1470000.00") };
    expect(verifyMidtransSignature(n, KEY)).toBe(true);
    expect(verifyMidtransSignature({ ...n, gross_amount: "1.00" }, KEY)).toBe(false);
    expect(verifyMidtransSignature(n, "other-key")).toBe(false);
    expect(verifyMidtransSignature({ ...n, signature_key: undefined }, KEY)).toBe(false);
  });
  it.each([
    [{ transaction_status: "settlement" }, "paid"], [{ transaction_status: "capture", fraud_status: "accept" }, "paid"],
    [{ transaction_status: "capture", fraud_status: "challenge" }, "pending"], [{ transaction_status: "pending" }, "pending"],
    [{ transaction_status: "expire" }, "expired"], [{ transaction_status: "deny" }, "failed"], [{ transaction_status: "cancel" }, "failed"],
  ])("%j -> %s", (s, out) => expect(midtransState(s)).toBe(out));
  it("creates a Snap transaction with the order, amount, expiry and finish URL", async () => {
    const f = fake(201, { token: "tok", redirect_url: "https://app.sandbox.midtrans.com/snap/v4/redirection/tok" });
    const r = await createSnap({ serverKey: KEY, mode: "SANDBOX", orderId: "KW-1", amount: 1_470_000, name: "Tari", phone: "+628123", itemName: "Labuan Bajo", finishUrl: "https://kw/pay/return?order=KW-1", expiryMinutes: 600 }, f as unknown as F);
    expect(r).toEqual({ providerRef: "tok", redirectUrl: "https://app.sandbox.midtrans.com/snap/v4/redirection/tok" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Basic " + Buffer.from(KEY + ":").toString("base64"));
    expect(JSON.parse(init!.body as string)).toMatchObject({ transaction_details: { order_id: "KW-1", gross_amount: 1_470_000 }, callbacks: { finish: "https://kw/pay/return?order=KW-1" }, expiry: { unit: "minute", duration: 600 } });
  });
  it("reads status from the API host; unknown order is still pending", async () => {
    const f = fake(404, { status_code: "404" });
    expect((await midtransStatus({ serverKey: KEY, mode: "PRODUCTION", orderId: "KW-1" }, f as unknown as F)).state).toBe("pending");
    expect(f.mock.calls[0][0]).toBe("https://api.midtrans.com/v2/KW-1/status");
    const g = fake(200, { status_code: "200", transaction_status: "settlement", gross_amount: "1470000.00" });
    expect(await midtransStatus({ serverKey: KEY, mode: "SANDBOX", orderId: "KW-1" }, g as unknown as F)).toMatchObject({ state: "paid", amount: 1_470_000 });
  });
});

describe("Xendit", () => {
  it("checks the callback token exactly", () => {
    expect(verifyXenditToken("tok123", "tok123")).toBe(true);
    expect(verifyXenditToken("tok12", "tok123")).toBe(false);
    expect(verifyXenditToken(null, "tok123")).toBe(false);
    expect(verifyXenditToken("x", undefined)).toBe(false);
  });
  it.each([["PAID", "paid"], ["SETTLED", "paid"], ["PENDING", "pending"], ["EXPIRED", "expired"], ["WEIRD", "failed"]])("%s -> %s", (s, out) => expect(xenditState(s)).toBe(out));
  it("creates an invoice in IDR with redirect URLs and at least 15 minutes", async () => {
    const f = fake(200, { id: "inv_1", invoice_url: "https://checkout.xendit.co/web/inv_1" });
    const r = await createXenditInvoice({ secretKey: "xnd_development_x", externalId: "KT-1", amount: 2_700_000, description: "Flight", name: "Rudi", phone: "+628", successUrl: "s", failureUrl: "f", durationSeconds: 60 }, f as unknown as F);
    expect(r.providerRef).toBe("inv_1");
    expect(f.mock.calls[0][0]).toBe("https://api.xendit.co/v2/invoices");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toMatchObject({ external_id: "KT-1", amount: 2_700_000, currency: "IDR", invoice_duration: 900, success_redirect_url: "s" });
  });
});
