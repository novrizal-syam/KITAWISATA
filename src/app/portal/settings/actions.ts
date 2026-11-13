"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { SettingsError, approvalRulesInput, updateApprovalRules } from "@/server/settingsService";

export type SettingsState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean };

export async function saveApprovalRules(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const session = await requireRole(["FINANCE_ADMIN"], "/portal/settings/approvals");
  const parsed = approvalRulesInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  try {
    await updateApprovalRules(session.user.id, parsed.data);
  } catch (e) {
    if (e instanceof SettingsError) return { error: e.message };
    throw e;
  }
  revalidatePath("/portal", "layout");
  return { saved: true };
}
