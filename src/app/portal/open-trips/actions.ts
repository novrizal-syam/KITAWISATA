"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { OpenTripError, createOpenTrip, parseOpenTripForm, updateOpenTrip } from "@/server/openTripService";

export type TripFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function saveOpenTrip(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  await requireRole(["OPS"], "/portal/open-trips");
  const parsed = parseOpenTripForm(form);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, error: "Check the highlighted fields." };
  }
  const id = String(form.get("id") ?? "");
  let saved;
  try {
    saved = id ? await updateOpenTrip(id, parsed.data) : await createOpenTrip(parsed.data);
  } catch (e) {
    if (e instanceof OpenTripError) return { error: e.message };
    throw e;
  }
  revalidatePath("/portal/open-trips");
  redirect(`/portal/open-trips?saved=${encodeURIComponent(saved.name)}`);
}
