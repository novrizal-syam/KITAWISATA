"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { TicketError, cannotIssue, issueInput, issueTicket, issueViaSupplier, markTicketRefunded, recordTicketPayment } from "@/server/ticketService";

export type TicketOpsState = { error?: string };

/** One action for the row's buttons; the clicked button's `op` decides. */
export async function ticketOpsAction(_prev: TicketOpsState, form: FormData): Promise<TicketOpsState> {
  const session = await requireRole(["OPS"], "/portal/ticket-bookings");
  const { t } = await getT();
  const id = String(form.get("id")), code = String(form.get("code")), op = String(form.get("op"));
  try {
    if (op === "pay") await recordTicketPayment(session.user.id, id);
    else if (op === "issue") {
      const parsed = issueInput.safeParse({ ref: form.get("ref") });
      if (!parsed.success) return { error: tMaybe(t, parsed.error.issues[0].message) };
      await issueTicket(session.user.id, id, parsed.data.ref);
    } else if (op === "supplier") await issueViaSupplier(session.user.id, id);
    else if (op === "fail") await cannotIssue(session.user.id, id);
    else if (op === "refunded") await markTicketRefunded(session.user.id, id);
    else return { error: t("v.invalid") };
  } catch (e) {
    if (e instanceof TicketError) return { error: t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/portal/ticket-bookings?done=${op}&code=${code}`);
}
