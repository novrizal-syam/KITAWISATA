"use client";

import { useActionState } from "react";
import { generateAction, recordPaymentAction, saveBillingSettings, type BillingState } from "./actions";
import { useI18n } from "@/i18n/client";

export function GenerateButton({ companyId, companyName, disabled }: { companyId: string; companyName: string; disabled: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<BillingState, FormData>(generateAction, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="companyName" value={companyName} />
      <button className="btn btn-red btn-sm" disabled={disabled || pending}>{disabled ? t("bill.nothing") : t("bill.generate")}</button>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}

export function RecordPaymentButton({ invoiceId, number }: { invoiceId: string; number: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<BillingState, FormData>(recordPaymentAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(t("bill.confirmPay", { number }))) e.preventDefault(); }} className="flex flex-col items-end gap-1">
      <input type="hidden" name="invoiceId" value={invoiceId} /><input type="hidden" name="number" value={number} />
      <button className="btn btn-line btn-sm" disabled={pending}>{t("bill.recordPayment")}</button>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}

export function BillingSettingsForm({ ppnPercent, companies }: { ppnPercent: string; companies: { id: string; name: string; fee: number; terms: number }[] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<BillingState, FormData>(saveBillingSettings, {});
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  return (
    <form action={action} className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">{t("bs.ppn")}</h2>
        <p className="note">{t("bs.ppnHelp")}</p>
        <label className="field max-w-[12rem]">{t("bs.ppnLabel")}
          <input name="ppnPercent" inputMode="decimal" className="input num" defaultValue={ppnPercent} required />{err("ppnPercent")}
        </label>
      </section>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 text-base font-bold">{t("bs.companies")}</h2>
        <table className="w-full text-[13.5px]">
          <thead><tr className="text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
            <th className="py-2 pr-3">{t("col.company")}</th><th className="py-2 pr-3">{t("col.feePerBooking")}</th><th className="py-2">{t("col.terms")}</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-2 pr-3 font-bold">{c.name}<input type="hidden" name="company.id" value={c.id} /></td>
                <td className="py-2 pr-3"><span className="flex items-center gap-1.5"><b>Rp</b>
                  <input name="company.fee" inputMode="numeric" aria-label={`${t("col.feePerBooking")}: ${c.name}`} className="input num max-w-40" defaultValue={c.fee.toLocaleString("id-ID")} /></span></td>
                <td className="py-2"><input name="company.terms" inputMode="numeric" aria-label={`${t("col.terms")}: ${c.name}`} className="input num max-w-24" defaultValue={c.terms} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {err("companies")}
      </section>
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("bs.saved")}</p>}
      <div><button className="btn btn-red" disabled={pending}>{pending ? t("common.saving") : t("bs.save")}</button></div>
    </form>
  );
}
