import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { fmtDay } from "@/lib/format";
import { tMaybe } from "@/i18n";
import { publicPaymentSettings } from "@/server/paymentSettingsService";
import { PaymentSettingsForm } from "./form";
import { ResolveButton } from "./unapplied";
import { gatewayReady, unappliedPayments, webhookUrls } from "@/server/gatewayService";
import { rp } from "@/lib/format";

export default async function PaymentSettings() {
  await requireRole(["OPS"], "/portal/payments");
  const [{ t, locale }, s, unapplied, ready] = await Promise.all([getT(), publicPaymentSettings(), unappliedPayments(), gatewayReady()]);
  const hooks = webhookUrls();
  const last = s.lastTestMessage ? (JSON.parse(s.lastTestMessage) as { key: string; params?: Record<string, string> }) : null;
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("pay.title")}</h1><p className="mt-1 text-muted">{t("pay.intro")}</p></div>
      <PaymentSettingsForm initial={{ provider: s.provider, mode: s.mode, bankName: s.bankName ?? "", bankAccountNumber: s.bankAccountNumber ?? "", bankAccountHolder: s.bankAccountHolder ?? "", hints: s.hints }} />
      {s.provider !== "MANUAL_TRANSFER" && (
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="text-base font-bold">{t("gw.webhooks")}</h2>
          <p className="note">{t(s.provider === "MIDTRANS" ? "gw.webhooksMidtrans" : "gw.webhooksXendit")}</p>
          <code className="rounded-lg bg-ground px-3 py-2 text-[13px] break-all">{s.provider === "MIDTRANS" ? hooks.midtrans : hooks.xendit}</code>
          <p className={`text-[13.5px] font-semibold ${ready ? "text-green-d" : "text-amber"}`}>{t(ready ? "gw.live" : "gw.notLive")}</p>
        </section>
      )}
      {unapplied.length > 0 && (
        <section className="card overflow-x-auto p-5">
          <h2 className="mb-1 text-base font-bold">{t("gw.unapplied")}</h2>
          <p className="note mb-3">{t("gw.unappliedHelp")}</p>
          <table className="w-full text-[13.5px]">
            <tbody>{unapplied.map((u) => (
              <tr key={u.id} className="border-t border-line align-top">
                <td className="num py-2 pr-3 font-bold">{u.orderId}<div className="note font-normal">{u.provider} · {u.paidAt ? fmtDay(u.paidAt, locale) : ""}</div></td>
                <td className="py-2 pr-3">{u.openTripInstalment?.booking.code ?? u.ticketBooking?.code ?? u.invoice?.number}<div className="note">{u.note}</div></td>
                <td className="num py-2 pr-3 text-right">{rp(u.amount)}</td>
                <td className="py-2 text-right"><ResolveButton id={u.id} orderId={u.orderId} /></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
      {s.lastTestAt && last && <p className="note">{t("pay.lastTest", { date: fmtDay(s.lastTestAt, locale), result: tMaybe(t, last.key, last.params) })}</p>}
      {s.updatedBy && <p className="note">{t("pay.lastChanged", { date: fmtDay(s.updatedAt, locale), name: s.updatedBy })}</p>}
    </div>
  );
}
