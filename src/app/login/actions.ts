"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { issueOtp, normalisePhone } from "@/lib/otp";
import { getT } from "@/i18n/server";

export type LoginState = { step: "phone" | "code"; phone?: string; error?: string };

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const { t } = await getT();
  if (prev.step === "phone") {
    const phone = normalisePhone(String(form.get("phone") ?? ""));
    if (!phone) return { step: "phone", error: t("login.badPhone") };
    const res = await issueOtp(phone);
    if (!res.ok) return { step: "phone", error: t(res.error) };
    return { step: "code", phone };
  }
  try {
    await signIn("phone-otp", {
      phone: prev.phone,
      code: String(form.get("code") ?? ""),
      redirectTo: String(form.get("callbackUrl") || "/portal"),
    });
  } catch (e) {
    if (e instanceof AuthError) return { ...prev, error: t("login.badCode") };
    throw e; // NEXT_REDIRECT on success
  }
  return prev;
}
