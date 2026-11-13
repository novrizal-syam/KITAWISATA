import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the OtpCode table.
type Row = { id: string; phone: string; codeHash: string; expiresAt: Date; attempts: number; usedAt: Date | null; createdAt: Date };
let rows: Row[] = [];
const latest = (pred: (r: Row) => boolean) =>
  rows.filter(pred).sort((a, b) => +b.createdAt - +a.createdAt)[0] ?? null;

vi.mock("@/lib/db", () => ({
  db: {
    otpCode: {
      findFirst: async ({ where }: { where: { phone: string; usedAt?: null; expiresAt?: { gt: Date } } }) =>
        latest((r) => r.phone === where.phone &&
          (!("usedAt" in where) || r.usedAt === null) &&
          (!where.expiresAt || r.expiresAt > where.expiresAt.gt)),
      create: async ({ data }: { data: Pick<Row, "phone" | "codeHash" | "expiresAt"> }) => {
        const r: Row = { id: String(rows.length + 1), attempts: 0, usedAt: null, createdAt: new Date(), ...data };
        rows.push(r);
        return r;
      },
      update: async ({ where, data }: { where: { id: string }; data: { attempts?: { increment: number }; usedAt?: Date } }) => {
        const r = rows.find((x) => x.id === where.id)!;
        if (data.attempts) r.attempts += data.attempts.increment;
        if (data.usedAt) r.usedAt = data.usedAt;
        return r;
      },
    },
  },
}));

const { normalisePhone, issueOtp, verifyOtp } = await import("@/lib/otp");

const PHONE = "+6281234567890";
let sent = "";
beforeEach(() => {
  rows = [];
  vi.useRealTimers();
  vi.spyOn(console, "log").mockImplementation((msg: string) => { sent = msg.split("-> ")[1] ?? ""; });
});

describe("normalisePhone", () => {
  it.each([
    ["0812 3456 7890", PHONE],
    ["6281234567890", PHONE],
    ["+62 812-3456-7890", PHONE],
  ])("%s -> E.164", (input, out) => expect(normalisePhone(input)).toBe(out));

  it.each(["12345", "+6221234567", "0812", "abc", "+1 415 555 0100"])("rejects %s", (input) =>
    expect(normalisePhone(input)).toBeNull());
});

describe("OTP lifecycle", () => {
  it("accepts the issued code exactly once", async () => {
    await issueOtp(PHONE);
    expect(sent).toMatch(/^\d{6}$/);
    expect(await verifyOtp(PHONE, sent)).toBe(true);
    expect(await verifyOtp(PHONE, sent)).toBe(false);
  });

  it("rejects a wrong code and locks after 5 failed attempts", async () => {
    await issueOtp(PHONE);
    const wrong = sent === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(await verifyOtp(PHONE, wrong)).toBe(false);
    expect(await verifyOtp(PHONE, sent)).toBe(false);
  });

  it("rejects an expired code", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-13T00:00:00Z") });
    await issueOtp(PHONE);
    vi.setSystemTime(new Date("2026-11-13T00:05:01Z"));
    expect(await verifyOtp(PHONE, sent)).toBe(false);
  });

  it("enforces the 60s resend cooldown", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-13T00:00:00Z") });
    expect((await issueOtp(PHONE)).ok).toBe(true);
    expect((await issueOtp(PHONE)).ok).toBe(false);
    vi.setSystemTime(new Date("2026-11-13T00:01:01Z"));
    expect((await issueOtp(PHONE)).ok).toBe(true);
  });
});
