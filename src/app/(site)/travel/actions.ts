"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";
import { TicketError, cancelUnpaidTicket, createTicketBooking, ticketInput } from "@/server/ticketService";
import { KIND_BY_SLUG } from "./kinds";

export type TicketFormState = { error?: string; fieldErrors?: Record<string, string> };

export async function bookTicketAction(_prev: TicketFormState, form: FormData): Promise<TicketFormState> {
  const session = await auth();
  if (!session) redirect("/login");
  const { t } = await getT();
  const kind = KIND_BY_SLUG[String(form.get("kindSlug"))];
  if (!kind) return { error: t("v.invalid") };
  const parsed = ticketInput.safeParse({
    offerId: form.get("offerId"), contactName: form.get("contactName"), contactPhone: form.get("contactPhone"),
    travellerNames: form.getAll("travellerName").map(String),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  const search = Object.fromEntries(["from", "to", "city", "date", "pax", "nights"].map((k) => [k, form.get(`s.${k}`)?.toString()]));
  let code: string;
  try {
    code = (await createTicketBooking(session.user.id, kind, search, parsed.data)).code;
  } catch (e) {
    if (e instanceof TicketError) return { error: t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/my-trips/tickets/${code}?created=1`);
}

export async function cancelTicketAction(_prev: TicketFormState, form: FormData): Promise<TicketFormState> {
  const session = await auth();
  if (!session) redirect("/login");
  const code = String(form.get("code"));
  try {
    await cancelUnpaidTicket(session.user.id, code);
  } catch (e) {
    if (e instanceof TicketError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/my-trips/tickets/${code}`);
}
