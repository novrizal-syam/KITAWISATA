"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";
import { SppdError, bookItems, decideStep, submitInput, submitSppd } from "@/server/sppdService";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

export async function submitSppdAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole(PORTAL_ROLES, "/portal/trips/new");
  const parsed = submitInput.safeParse({
    dest: form.get("dest"), from: form.get("from"), to: form.get("to"),
    purpose: form.get("purpose"), needs: form.getAll("needs"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, (await getT()).t, tMaybe) };
  let id: string;
  try {
    id = (await submitSppd(session.user.id, parsed.data)).id;
  } catch (e) {
    if (e instanceof SppdError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  redirect(`/portal/trips/${id}?submitted=1`);
}

export async function decideAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await requireRole(PORTAL_ROLES, "/portal/approvals");
  const decision = form.get("decision") === "REJECTED" ? "REJECTED" : "APPROVED";
  let r;
  try {
    r = await decideStep(session.user.id, String(form.get("stepId")), decision, String(form.get("note") ?? ""));
  } catch (e) {
    if (e instanceof SppdError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  // The decided request leaves the inbox on refresh, so confirm with a banner on the page itself.
  revalidatePath("/portal", "layout");
  const q = new URLSearchParams({ done: r.status === "REJECTED" ? "rejected" : r.number ? "approved" : "forwarded", who: String(form.get("employee") ?? "") });
  if (r.number) q.set("number", r.number);
  redirect(`/portal/approvals?${q}`);
}

export async function bookAction(_prev: FormState, form: FormData): Promise<FormState> {
  const sppdId = String(form.get("sppdId"));
  const session = await requireRole(PORTAL_ROLES, `/portal/trips/${sppdId}`);
  let r;
  try {
    r = await bookItems(session.user.id, sppdId, form.getAll("pick").map(String));
  } catch (e) {
    if (e instanceof SppdError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal", "layout");
  redirect(`/portal/trips/${sppdId}?booked=${r.complete ? "all" : "some"}`);
}
