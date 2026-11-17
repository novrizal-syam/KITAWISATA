"use client";

import { useActionForm } from "@/lib/use-action-form";
import { ticketOpsAction, type TicketOpsState } from "./actions";
import { useI18n } from "@/i18n/client";
import { rp } from "@/lib/format";

export function TicketRowActions({ id, code, status, refundPending, total, kind, supplierName }: { id: string; code: string; status: string; refundPending: boolean; total: number; kind: string; supplierName?: string }) {
  const { t } = useI18n();
  const [state, onSubmit, pending] = useActionForm<TicketOpsState>(ticketOpsAction, {});
  const confirmOn = (msg: string) => (e: React.MouseEvent<HTMLButtonElement>) => { if (!confirm(msg)) e.preventDefault(); };
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="code" value={code} />
      {status === "AWAITING_PAYMENT" && <button name="op" value="pay" className="btn btn-line btn-sm" disabled={pending} onClick={confirmOn(t("tb.confirmPayment", { amount: rp(total), code }))}>{t("tb.record", { amount: rp(total) })}</button>}
      {status === "PAID" && supplierName && <button name="op" value="supplier" className="btn btn-green btn-sm" disabled={pending} formNoValidate>{t("sup.issueVia", { name: supplierName })}</button>}
      {status === "PAID" && (<>
        <span className="flex gap-1.5">
          <input name="ref" aria-label={t(kind === "STAY" ? "tk.voucher" : "tk.ticketRef")} placeholder={t(kind === "STAY" ? "tk.voucher" : "tk.ticketRef")} className="input min-h-9 w-40 text-[13px]" />
          <button name="op" value="issue" className="btn btn-green btn-sm" disabled={pending}>{t("tko.issue")}</button>
        </span>
        <button name="op" value="fail" className="btn btn-line btn-sm" disabled={pending} formNoValidate onClick={confirmOn(t("tko.confirmFail", { code, amount: rp(total) }))}>{t("tko.fail")}</button>
      </>)}
      {refundPending && <button name="op" value="refunded" className="btn btn-line btn-sm" disabled={pending} onClick={confirmOn(t("tb.confirmRefund", { code }))}>{t("tb.markRefunded")}</button>}
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-red-d">{state.error}</span>}
    </form>
  );
}
