"use client";

import { useActionState, useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { savePaymentSettings, testConnectionAction, type PaymentState } from "./actions";
import { useI18n } from "@/i18n/client";

type Provider = "MANUAL_TRANSFER" | "MIDTRANS" | "XENDIT";
const FIELDS: Record<Exclude<Provider, "MANUAL_TRANSFER">, ("serverKey" | "clientKey" | "secretKey" | "callbackToken")[]> = {
  MIDTRANS: ["serverKey", "clientKey"], XENDIT: ["secretKey", "callbackToken"],
};

export function PaymentSettingsForm({ initial }: {
  initial: { provider: Provider; mode: "SANDBOX" | "PRODUCTION"; bankName: string; bankAccountNumber: string; bankAccountHolder: string; hints: Record<string, string> };
}) {
  const { t } = useI18n();
  const [state, onSubmit, pending] = useActionForm<PaymentState>(savePaymentSettings, {});
  const [test, runTest, testing] = useActionState<PaymentState>(testConnectionAction, {});
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <fieldset className="card flex flex-col gap-3 p-5">
          <legend className="sr-only">{t("pay.provider")}</legend>
          <h2 className="text-base font-bold">{t("pay.provider")}</h2>
          {(["MANUAL_TRANSFER", "MIDTRANS", "XENDIT"] as Provider[]).map((p) => (
            <label key={p} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${provider === p ? "border-red bg-red-t" : "border-line"}`}>
              <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} className="mt-1 size-[18px] accent-red" />
              <span><b className="block">{t(`pay.${p}`)}</b><span className="note">{t(`pay.${p}.body`)}</span></span>
            </label>
          ))}
          <label className="field max-w-xs">{t("pay.mode")}
            <select name="mode" className="input" defaultValue={initial.mode}><option value="SANDBOX">{t("pay.SANDBOX")}</option><option value="PRODUCTION">{t("pay.PRODUCTION")}</option></select>
          </label>
        </fieldset>

        <section className="card grid gap-4 p-5 sm:grid-cols-3">
          <div className="sm:col-span-3"><h2 className="text-base font-bold">{t("pay.bank")}</h2><p className="note">{t("pay.bankHelp")}</p></div>
          <label className="field">{t("pay.bankName")}<input name="bankName" className="input" defaultValue={initial.bankName} placeholder="BCA" />{err("bankName")}</label>
          <label className="field">{t("pay.accountNumber")}<input name="bankAccountNumber" inputMode="numeric" className="input num" defaultValue={initial.bankAccountNumber} />{err("bankAccountNumber")}</label>
          <label className="field">{t("pay.accountHolder")}<input name="bankAccountHolder" className="input" defaultValue={initial.bankAccountHolder} placeholder="PT ..." />{err("bankAccountHolder")}</label>
        </section>

        {provider !== "MANUAL_TRANSFER" && (
          <section className="card flex flex-col gap-4 p-5">
            <div><h2 className="text-base font-bold">{t("pay.keys", { provider: t(`pay.${provider}`) })}</h2><p className="note">{t("pay.keysHelp")}</p></div>
            {FIELDS[provider].map((f) => (
              <div key={f} className="flex flex-col gap-1.5">
                <label className="field">{t(`pay.f.${f}`)}
                  <input name={f} type="password" autoComplete="off" spellCheck={false} className="input font-mono" placeholder={initial.hints[f] ? t("pay.savedHint", { hint: initial.hints[f] }) : t("pay.notSet")} />
                </label>
                {initial.hints[f] && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="clear" value={f} className="size-4 accent-red" />{t("pay.remove")}</label>}
              </div>
            ))}
            <p className="note">{t("pay.notWired")}</p>
          </section>
        )}

        {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
        {state.saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("pay.saved")}</p>}
        <div><button className="btn btn-red" disabled={pending}>{pending ? t("common.saving") : t("pay.save")}</button></div>
      </form>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">{t("pay.test")}</h2>
        <p className="note">{t("pay.testHelp")}</p>
        <form action={runTest}><button className="btn btn-line" disabled={testing}>{testing ? t("pay.testing") : t("pay.testButton")}</button></form>
        {test.test && <p role="status" className={`rounded-xl px-4 py-3 font-semibold ${test.test.ok ? "bg-green-t text-green-d" : "bg-red-t text-red-d"}`}>{test.test.message}</p>}
      </section>
    </div>
  );
}
