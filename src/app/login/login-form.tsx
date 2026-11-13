"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { useI18n } from "@/i18n/client";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "phone" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      {state.step === "phone" ? (
        <label className="field">{t("login.phone")}
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0812 3456 7890" className="input" />
        </label>
      ) : (
        <label className="field">{t("login.code", { phone: state.phone ?? "" })}
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="input num tracking-[.3em]" />
        </label>
      )}
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      <button disabled={pending} className="btn btn-red">{state.step === "phone" ? t("login.sendCode") : t("login.signIn")}</button>
    </form>
  );
}
