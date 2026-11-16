"use client";

import { useActionState } from "react";
import { resolveUnappliedAction, type PaymentState } from "./actions";
import { useI18n } from "@/i18n/client";

export function ResolveButton({ id, orderId }: { id: string; orderId: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<PaymentState, FormData>(resolveUnappliedAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(t("gw.confirmResolve", { order: orderId }))) e.preventDefault(); }} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-line btn-sm" disabled={pending}>{t("gw.resolve")}</button>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}
