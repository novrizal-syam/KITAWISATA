"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";
import { TripBookingError, bookingInput, cancelTripBooking, createTripBooking } from "@/server/openTripBookingService";

export type SiteFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function bookTripAction(_prev: SiteFormState, form: FormData): Promise<SiteFormState> {
  const session = await auth();
  if (!session) redirect("/login");
  const { t } = await getT();
  const parsed = bookingInput.safeParse({
    departureId: form.get("departureId"), pax: form.get("pax"), plan: form.get("plan"),
    contactName: form.get("contactName"), contactPhone: form.get("contactPhone"),
    travellerNames: form.getAll("travellerName").map(String), acceptTerms: form.get("acceptTerms") === "on",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  let code: string;
  try {
    code = (await createTripBooking(session.user.id, parsed.data)).code;
  } catch (e) {
    if (e instanceof TripBookingError) return { error: t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/my-trips/${code}?held=1`);
}

export async function cancelTripAction(_prev: SiteFormState, form: FormData): Promise<SiteFormState> {
  const session = await auth();
  if (!session) redirect("/login");
  const code = String(form.get("code"));
  try {
    await cancelTripBooking(session.user.id, code);
  } catch (e) {
    if (e instanceof TripBookingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/my-trips/${code}?cancelled=1`);
}
