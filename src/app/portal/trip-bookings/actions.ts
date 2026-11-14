"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { TripBookingError, markRefunded, recordInstalmentPayment } from "@/server/openTripBookingService";

export type OpsState = { error?: string };

export async function recordTripPaymentAction(_prev: OpsState, form: FormData): Promise<OpsState> {
  const session = await requireRole(["OPS"], "/portal/trip-bookings");
  let r;
  try {
    r = await recordInstalmentPayment(session.user.id, String(form.get("bookingId")));
  } catch (e) {
    if (e instanceof TripBookingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/portal/trip-bookings?paid=${r.code}&seq=${r.seq}`);
}

export async function markRefundedAction(_prev: OpsState, form: FormData): Promise<OpsState> {
  const session = await requireRole(["OPS"], "/portal/trip-bookings");
  try {
    await markRefunded(session.user.id, String(form.get("bookingId")));
  } catch (e) {
    if (e instanceof TripBookingError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/portal/trip-bookings?refunded=${encodeURIComponent(String(form.get("code")))}`);
}
