import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (phone: string, code: string) =>
  createHash("sha256").update(`${phone}:${code}:${process.env.AUTH_SECRET}`).digest("hex");

/** Normalise Indonesian numbers to E.164 (+62...). Returns null if invalid. */
export function normalisePhone(input: string): string | null {
  let p = input.replace(/[\s\-().]/g, "");
  if (p.startsWith("0")) p = "+62" + p.slice(1);
  else if (p.startsWith("62")) p = "+" + p;
  return /^\+628\d{7,11}$/.test(p) ? p : null;
}

export async function issueOtp(phone: string): Promise<{ ok: true } | { ok: false; error: "login.wait" }> {
  const recent = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "login.wait" };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({
    data: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await deliverOtp(phone, code);
  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await db.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;
  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(hash(phone, code), "hex");
  if (!timingSafeEqual(a, b)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  return true;
}

async function deliverOtp(phone: string, code: string) {
  if (process.env.OTP_DELIVERY === "console" || process.env.NODE_ENV !== "production") {
    console.log(`[otp] ${phone} -> ${code}`);
    return;
  }
  // TODO(phase 3): SMS / WhatsApp provider integration.
  throw new Error("No OTP delivery provider configured");
}
