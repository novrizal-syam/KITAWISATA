"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";
import { PaymentSettingsError, paymentSettingsInput, testPaymentConnection, updatePaymentSettings } from "@/server/paymentSettingsService";

export type PaymentState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean; test?: { ok: boolean; message: string } };

export async function savePaymentSettings(_prev: PaymentState, form: FormData): Promise<PaymentState> {
  const session = await requireRole(["OPS"], "/portal/payments");
  const { t } = await getT();
  const parsed = paymentSettingsInput.safeParse({ ...Object.fromEntries(form), clear: form.getAll("clear").map(String) });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  try {
    await updatePaymentSettings(session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof PaymentSettingsError) return { error: t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function testConnectionAction(_prev: PaymentState): Promise<PaymentState> {
  const session = await requireRole(["OPS"], "/portal/payments");
  const { t } = await getT();
  const r = await testPaymentConnection(session.user.id);
  revalidatePath("/portal/payments");
  return { test: { ok: r.ok, message: t(r.key, r.params) } };
}
