"use client";

import { useActionState } from "react";
import { markRefundedAction, recordTripPaymentAction, type OpsState } from "./actions";
import { useI18n } from "@/i18n/client";

export function RecordTripPayment({ bookingId, label, confirmText }: { bookingId: string; label: string; confirmText: string }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(recordTripPaymentAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(confirmText)) e.preventDefault(); }} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button className="btn btn-line btn-sm" disabled={pending}>{label}</button>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}

export function MarkRefunded({ bookingId, code }: { bookingId: string; code: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<OpsState, FormData>(markRefundedAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(t("tb.confirmRefund", { code }))) e.preventDefault(); }} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="code" value={code} />
      <button className="btn btn-line btn-sm" disabled={pending}>{t("tb.markRefunded")}</button>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}
