"use client";

import { useActionState } from "react";
import { cancelTicketAction, type TicketFormState } from "../../../travel/actions";
import { useI18n } from "@/i18n/client";

export function CancelTicketForm({ code }: { code: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<TicketFormState, FormData>(cancelTicketAction, {});
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-lg font-bold">{t("my.cancelTitle")}</h2>
      <p className="mb-3 text-[14px]">{t("tk.cancelFree")}</p>
      <form action={action} onSubmit={(e) => { if (!confirm(t("my.cancelConfirm"))) e.preventDefault(); }}>
        <input type="hidden" name="code" value={code} />
        <button className="btn btn-line" disabled={pending}>{t("my.cancelButton")}</button>
      </form>
      {state.error && <p role="alert" className="mt-3 rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
    </section>
  );
}
