// Encrypts small secrets (payment gateway keys) for storage. AES-256-GCM with a random IV;
// the key comes from PAYMENT_SECRETS_KEY if set, otherwise it is derived from AUTH_SECRET.
// Rotating that secret makes stored keys unreadable: re-enter them on Payment settings.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function key(): Buffer {
  const base = process.env.PAYMENT_SECRETS_KEY || process.env.AUTH_SECRET;
  if (!base || base.length < 16) throw new Error("PAYMENT_SECRETS_KEY or AUTH_SECRET must be set to store payment keys");
  return Buffer.from(hkdfSync("sha256", base, "kitawisata", "payment-secrets-v1", 32));
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}

export function open(sealed: string): string {
  if (!sealed.startsWith("v1:")) throw new Error("Unknown secret format");
  const raw = Buffer.from(sealed.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
