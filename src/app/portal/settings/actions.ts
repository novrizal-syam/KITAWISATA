"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { SettingsError, approvalRulesInput, updateApprovalRules } from "@/server/settingsService";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";

export type SettingsState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean };

export async function saveApprovalRules(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await requireRole(["FINANCE_ADMIN"], "/portal/settings/approvals");
  const parsed = approvalRulesInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, (await getT()).t, tMaybe) };
  try {
    await updateApprovalRules(session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof SettingsError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  return { saved: true };
}
