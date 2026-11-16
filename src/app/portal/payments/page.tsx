import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { fmtDay } from "@/lib/format";
import { tMaybe } from "@/i18n";
import { publicPaymentSettings } from "@/server/paymentSettingsService";
import { PaymentSettingsForm } from "./form";

export default async function PaymentSettings() {
  await requireRole(["OPS"], "/portal/payments");
  const [{ t, locale }, s] = await Promise.all([getT(), publicPaymentSettings()]);
  const last = s.lastTestMessage ? (JSON.parse(s.lastTestMessage) as { key: string; params?: Record<string, string> }) : null;
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("pay.title")}</h1><p className="mt-1 text-muted">{t("pay.intro")}</p></div>
      <PaymentSettingsForm initial={{ provider: s.provider, mode: s.mode, bankName: s.bankName ?? "", bankAccountNumber: s.bankAccountNumber ?? "", bankAccountHolder: s.bankAccountHolder ?? "", hints: s.hints }} />
      {s.lastTestAt && last && <p className="note">{t("pay.lastTest", { date: fmtDay(s.lastTestAt, locale), result: tMaybe(t, last.key, last.params) })}</p>}
      {s.updatedBy && <p className="note">{t("pay.lastChanged", { date: fmtDay(s.updatedAt, locale), name: s.updatedBy })}</p>}
    </div>
  );
}
