import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { platformSettings } from "@/server/billingService";
import { getT } from "@/i18n/server";
import { fmtDay } from "@/lib/format";
import { BillingSettingsForm } from "../forms";

export default async function BillingSettings() {
  await requireRole(["OPS"], "/portal/billing/settings");
  const [{ t, locale }, settings, companies] = await Promise.all([getT(), platformSettings(), db.company.findMany({ orderBy: { name: "asc" } })]);
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><p className="eyebrow">{t("bs.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("bs.title")}</h1><p className="mt-1 text-muted">{t("bs.intro")}</p></div>
      <BillingSettingsForm
        ppnPercent={(settings.ppnRateBps / 100).toLocaleString(locale === "id" ? "id-ID" : "en-GB", { maximumFractionDigits: 2 })}
        companies={companies.map((c) => ({ id: c.id, name: c.name, fee: c.serviceFeePerBooking, terms: c.paymentTermDays }))}
      />
      {settings.updatedBy && <p className="note">{t("bs.lastChanged", { date: fmtDay(settings.updatedAt, locale), name: settings.updatedBy })}</p>}
    </div>
  );
}
