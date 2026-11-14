"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { BillingError, billingSettingsInput, generateInvoice, recordPayment, updateBillingSettings } from "@/server/billingService";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";

export type BillingState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean };

export async function generateAction(_prev: BillingState, form: FormData): Promise<BillingState> {
  const session = await requireRole(["OPS"], "/portal/billing");
  let inv;
  try {
    inv = await generateInvoice(session.user.id, String(form.get("companyId")));
  } catch (e) {
    if (e instanceof BillingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  redirect(`/portal/billing?generated=${encodeURIComponent(inv.number)}&company=${encodeURIComponent(String(form.get("companyName") ?? ""))}`);
}

export async function recordPaymentAction(_prev: BillingState, form: FormData): Promise<BillingState> {
  const session = await requireRole(["OPS"], "/portal/billing");
  try {
    await recordPayment(session.user.id, String(form.get("invoiceId")));
  } catch (e) {
    if (e instanceof BillingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  redirect(`/portal/billing?paid=${encodeURIComponent(String(form.get("number") ?? ""))}`);
}

export async function saveBillingSettings(_prev: BillingState, form: FormData): Promise<BillingState> {
  const session = await requireRole(["OPS"], "/portal/billing/settings");
  const ids = form.getAll("company.id").map(String), fees = form.getAll("company.fee").map(String), terms = form.getAll("company.terms").map(String);
  const parsed = billingSettingsInput.safeParse({
    ppnPercent: form.get("ppnPercent"),
    companies: ids.map((id, i) => ({ id, serviceFeePerBooking: fees[i], paymentTermDays: terms[i] })),
  });
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  }
  try {
    await updateBillingSettings(session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof BillingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  return { saved: true };
}
