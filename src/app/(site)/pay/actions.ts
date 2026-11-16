"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { GatewayPaymentError, startOpenTripPayment, startTicketPayment } from "@/server/gatewayService";

export type PayState = { error?: string };

/** Send the traveller to the gateway's payment page for their own booking. */
export async function payOnlineAction(_prev: PayState, form: FormData): Promise<PayState> {
  const session = await auth();
  if (!session) redirect("/login");
  const code = String(form.get("code")), kind = String(form.get("kind"));
  let url: string;
  try {
    url = kind === "ticket" ? await startTicketPayment(session.user.id, code) : await startOpenTripPayment(session.user.id, code);
  } catch (e) {
    if (e instanceof GatewayPaymentError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  redirect(url);
}
