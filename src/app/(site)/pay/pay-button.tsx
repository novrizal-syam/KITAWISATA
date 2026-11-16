"use client";

import { useActionState } from "react";
import { payOnlineAction, type PayState } from "./actions";
import { useI18n } from "@/i18n/client";

export function PayOnlineButton({ code, kind, label }: { code: string; kind: "trip" | "ticket"; label: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<PayState, FormData>(payOnlineAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="code" value={code} /><input type="hidden" name="kind" value={kind} />
      <button className="btn btn-red" disabled={pending}>{pending ? t("ret.redirecting") : label}</button>
      <span className="note">{t("ret.methods")}</span>
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
    </form>
  );
}
