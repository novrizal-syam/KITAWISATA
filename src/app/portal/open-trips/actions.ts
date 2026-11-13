"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { OpenTripError, createOpenTrip, parseOpenTripForm, updateOpenTrip } from "@/server/openTripService";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";

export type TripFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function saveOpenTrip(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  await requireRole(["OPS"], "/portal/open-trips");
  const parsed = parseOpenTripForm(form);
  if (!parsed.success) {
    const { t } = await getT();
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  }
  const id = String(form.get("id") ?? "");
  let saved;
  try {
    saved = id ? await updateOpenTrip(id, parsed.data) : await createOpenTrip(parsed.data);
  } catch (e) {
    if (e instanceof OpenTripError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/portal/open-trips");
  redirect(`/portal/open-trips?saved=${encodeURIComponent(saved.name)}`);
}
