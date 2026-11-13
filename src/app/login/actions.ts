"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { issueOtp, normalisePhone } from "@/lib/otp";

export type LoginState = { step: "phone" | "code"; phone?: string; error?: string };

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  if (prev.step === "phone") {
    const phone = normalisePhone(String(form.get("phone") ?? ""));
    if (!phone) return { step: "phone", error: "That isn't a valid Indonesian mobile number. Example: 0812 3456 7890" };
    const res = await issueOtp(phone);
    if (!res.ok) return { step: "phone", error: res.error };
    return { step: "code", phone };
  }
  try {
    await signIn("phone-otp", {
      phone: prev.phone,
      code: String(form.get("code") ?? ""),
      redirectTo: String(form.get("callbackUrl") || "/portal"),
    });
  } catch (e) {
    if (e instanceof AuthError) return { ...prev, error: "That code is wrong or has expired." };
    throw e; // NEXT_REDIRECT on success
  }
  return prev;
}
