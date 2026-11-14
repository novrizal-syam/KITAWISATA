import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { spendingReport } from "@/server/billingService";
import { monthParam, reportMonth } from "@/server/period";
import { getT } from "@/i18n/server";

const cell = (v: string | number) => {
  const s = String(v);
  // Quote when needed, and neutralise spreadsheet formulas (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV of the month's bookings for Finance. UTF-8 with BOM so Excel opens it correctly. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE_ADMIN") return new NextResponse("Forbidden", { status: 403 });
  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { companyId: true } });
  if (!me?.companyId) return new NextResponse("Forbidden", { status: 403 });
  const p = reportMonth(new URL(req.url).searchParams.get("month") ?? undefined);
  const [{ t }, r] = await Promise.all([getT(), spendingReport(me.companyId, p.year, p.month)]);
  const header = [t("col.sppd"), t("col.employee"), t("col.costCentre"), t("col.department"), t("col.category"), t("col.item"), t("col.policy"), t("col.amount")];
  const rows = r.bookings.map((b) => [
    b.sppd.number ?? "", b.sppd.employee.name ?? "", b.sppd.employee.costCentre ?? "", b.sppd.employee.department?.name ?? "",
    t(`need.${b.category}`), b.description, b.inPolicy ? t("pol.in") : t("pol.exception"), b.amount,
  ]);
  const csv = "﻿" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kitawisata-spending-${monthParam(p)}.csv"` },
  });
}
