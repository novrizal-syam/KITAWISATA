"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "phone" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      {state.step === "phone" ? (
        <label className="flex flex-col gap-1 text-sm">
          Nomor HP
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required
            placeholder="0812 3456 7890" className="rounded border px-3 py-2 text-base" />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Kode OTP dikirim ke {state.phone}
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
            required className="rounded border px-3 py-2 text-base tracking-widest" />
        </label>
      )}
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">
        {state.step === "phone" ? "Kirim kode" : "Masuk"}
      </button>
    </form>
  );
}
