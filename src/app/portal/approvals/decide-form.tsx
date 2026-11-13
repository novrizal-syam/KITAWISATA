"use client";

import { useActionState } from "react";
import { decideAction, type FormState } from "../actions";
import { useI18n } from "@/i18n/client";

export function DecideForm({ stepId, employeeName }: { stepId: string; employeeName: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(decideAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="stepId" value={stepId} />
      <input type="hidden" name="employee" value={employeeName} />
      <label className="field">{t("appr.note", { name: employeeName.split(" ")[0] })}
        <input name="note" className="input" placeholder={t("appr.notePh")} maxLength={300} />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      <div className="flex flex-wrap justify-end gap-2.5">
        <button name="decision" value="REJECTED" className="btn btn-line" disabled={pending}>{t("appr.reject")}</button>
        <button name="decision" value="APPROVED" className="btn btn-green" disabled={pending}>{t("appr.approve")}</button>
      </div>
    </form>
  );
}
