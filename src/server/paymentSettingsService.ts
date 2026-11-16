import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { open, seal } from "./secretBox";

export class PaymentSettingsError extends AppError {}

/** Secret fields per provider. Values are write-only: the browser only ever sees hints. */
export const SECRET_FIELDS = { MIDTRANS: ["serverKey", "clientKey"], XENDIT: ["secretKey", "callbackToken"], MANUAL_TRANSFER: [] } as const;
type Provider = keyof typeof SECRET_FIELDS;
type Secrets = Partial<Record<string, string>>;

const hint = (v: string) => (v.length <= 4 ? "••••" : "••••" + v.slice(-4));

export async function paymentSettings() {
  return db.paymentSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

/** Public view for pages: never includes secrets. */
export async function publicPaymentSettings() {
  const s = await paymentSettings();
  return {
    provider: s.provider, mode: s.mode, bankName: s.bankName, bankAccountNumber: s.bankAccountNumber, bankAccountHolder: s.bankAccountHolder,
    hints: (s.secretHints ?? {}) as Record<string, string>, lastTestAt: s.lastTestAt, lastTestOk: s.lastTestOk, lastTestMessage: s.lastTestMessage,
    updatedAt: s.updatedAt, updatedBy: s.updatedBy,
  };
}

/** Bank details to show travellers and companies, or null if they aren't set up yet. */
export async function bankTransferDetails() {
  const s = await paymentSettings();
  return s.bankName && s.bankAccountNumber && s.bankAccountHolder ? { bank: s.bankName, number: s.bankAccountNumber, holder: s.bankAccountHolder } : null;
}

const opt = z.string().trim().max(200, "v.invalid").optional().transform((v) => v || undefined);
export const paymentSettingsInput = z.object({
  provider: z.enum(["MANUAL_TRANSFER", "MIDTRANS", "XENDIT"], { message: "v.invalid" }),
  mode: z.enum(["SANDBOX", "PRODUCTION"], { message: "v.invalid" }),
  bankName: opt, bankAccountNumber: z.string().trim().max(40, "v.invalid").regex(/^[\d\s-]*$/, "v.accountNumber").optional().transform((v) => v || undefined), bankAccountHolder: opt,
  serverKey: opt, clientKey: opt, secretKey: opt, callbackToken: opt,
  clear: z.array(z.string()).default([]),
});
export type PaymentSettingsInput = z.infer<typeof paymentSettingsInput>;

/** Merge new secrets into the stored ones: a blank field keeps what is saved; `clear` removes a key. */
export function mergeSecrets(stored: Secrets, input: Record<string, unknown>, clear: readonly string[]): Secrets {
  const out: Secrets = { ...stored };
  for (const f of [...SECRET_FIELDS.MIDTRANS, ...SECRET_FIELDS.XENDIT]) {
    if (clear.includes(f)) delete out[f];
    else if (typeof input[f] === "string" && input[f]) out[f] = input[f] as string;
  }
  return out;
}

async function storedSecrets(): Promise<Secrets> {
  const s = await paymentSettings();
  if (!s.secretsEnc) return {};
  try { return JSON.parse(open(s.secretsEnc)); } catch { throw new PaymentSettingsError("err.secretsUnreadable"); }
}

export async function updatePaymentSettings(opsUserId: string, input: PaymentSettingsInput) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new PaymentSettingsError("err.opsOnly");
  if (input.provider === "MANUAL_TRANSFER" && !(input.bankName && input.bankAccountNumber && input.bankAccountHolder)) throw new PaymentSettingsError("err.bankDetails");
  const secrets = mergeSecrets(await storedSecrets(), input, input.clear);
  const hints = Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, hint(v!)]));
  return db.paymentSetting.update({
    where: { id: "default" },
    data: {
      provider: input.provider, mode: input.mode, bankName: input.bankName ?? null, bankAccountNumber: input.bankAccountNumber ?? null, bankAccountHolder: input.bankAccountHolder ?? null,
      secretsEnc: Object.keys(secrets).length ? seal(JSON.stringify(secrets)) : null, secretHints: hints,
      lastTestAt: null, lastTestOk: null, lastTestMessage: null, updatedBy: ops.name ?? ops.phone,
    },
  });
}

export type TestResult = { ok: boolean; key: "pay.testOk" | "pay.testBadKey" | "pay.testUnreachable" | "pay.testMissingKey" | "pay.testModeMismatch" | "pay.testUnexpected" | "pay.testManual"; params?: Record<string, string> };

export const GATEWAY_HOSTS = {
  MIDTRANS: { SANDBOX: "api.sandbox.midtrans.com", PRODUCTION: "api.midtrans.com" },
  XENDIT: { SANDBOX: "api.xendit.co", PRODUCTION: "api.xendit.co" },
} as const;

/**
 * Check the saved keys with a harmless read-only call:
 * - Midtrans: status of an order that doesn't exist. 404 means the key was accepted; 401 means it wasn't.
 * - Xendit: GET /balance. 200 means the key works. Xendit keys say whether they are test or live.
 */
export async function checkGateway(provider: Provider, mode: "SANDBOX" | "PRODUCTION", secrets: Secrets, doFetch: typeof fetch = fetch): Promise<TestResult> {
  if (provider === "MANUAL_TRANSFER") return { ok: true, key: "pay.testManual" };
  const host = GATEWAY_HOSTS[provider][mode];
  const k = provider === "MIDTRANS" ? secrets.serverKey : secrets.secretKey;
  if (!k) return { ok: false, key: "pay.testMissingKey" };
  if (provider === "XENDIT" && (k.startsWith("xnd_development_") ? "SANDBOX" : k.startsWith("xnd_production_") ? "PRODUCTION" : mode) !== mode) return { ok: false, key: "pay.testModeMismatch" };
  if (provider === "MIDTRANS" && (k.startsWith("SB-") ? "SANDBOX" : "PRODUCTION") !== mode) return { ok: false, key: "pay.testModeMismatch" };
  const url = provider === "MIDTRANS" ? `https://${host}/v2/kitawisata-connection-test/status` : `https://${host}/balance`;
  let res: Response;
  try {
    res = await doFetch(url, { headers: { Authorization: "Basic " + Buffer.from(k + ":").toString("base64"), Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  } catch (e) {
    return { ok: false, key: "pay.testUnreachable", params: { host, reason: e instanceof Error ? e.message : String(e) } };
  }
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  const code = String((body as Record<string, unknown>).status_code ?? res.status);
  if (res.status === 401 || res.status === 403 || code === "401") return { ok: false, key: "pay.testBadKey" };
  if (provider === "MIDTRANS" ? code === "404" || res.ok : res.ok) return { ok: true, key: "pay.testOk", params: { host } };
  return { ok: false, key: "pay.testUnexpected", params: { status: String(res.status) } };
}

export async function testPaymentConnection(opsUserId: string) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new PaymentSettingsError("err.opsOnly");
  const s = await paymentSettings();
  const r = await checkGateway(s.provider, s.mode, await storedSecrets());
  await db.paymentSetting.update({ where: { id: "default" }, data: { lastTestAt: new Date(), lastTestOk: r.ok, lastTestMessage: JSON.stringify(r) } });
  return r;
}
