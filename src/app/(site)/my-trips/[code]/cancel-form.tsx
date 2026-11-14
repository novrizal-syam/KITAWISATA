"use client";

import { useActionState } from "react";
import { cancelTripAction, type SiteFormState } from "../../trips/actions";
import { useI18n } from "@/i18n/client";
import { rp } from "@/lib/format";
import type { CancelQuote } from "@/domain/openTripBooking";

export function CancelForm({ code, quote, held }: { code: string; quote: CancelQuote; held: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<SiteFormState, FormData>(cancelTripAction, {});
  const summary = held ? t("my.cancelFree") : t("my.cancelQuote", { days: quote.daysBefore, pct: quote.feePercent, fee: rp(quote.feeKept), refund: rp(quote.refund) });
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-lg font-bold">{t("my.cancelTitle")}</h2>
      <p className="mb-3 text-[14px]">{summary}</p>
      {!held && quote.tripFee > quote.feeKept && <p className="note mb-3">{t("my.cancelCapped", { fee: rp(quote.tripFee), paid: rp(quote.paid) })}</p>}
      <form action={action} onSubmit={(e) => { if (!confirm(`${t("my.cancelConfirm")}\n\n${summary}`)) e.preventDefault(); }}>
        <input type="hidden" name="code" value={code} />
        <button className="btn btn-line" disabled={pending}>{t("my.cancelButton")}</button>
      </form>
      {state.error && <p role="alert" className="mt-3 rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
    </section>
  );
}
