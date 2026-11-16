import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import { confirmAttempt } from "@/server/gatewayService";

// Where the provider sends the customer back. Confirms with the provider (in case the webhook
// hasn't arrived yet), then shows the outcome and a link to the booking.
export default async function PayReturn({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const order = (await searchParams).order ?? "";
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/pay/return?order=${order}`)}`);
  const { t } = await getT();
  const a = await db.paymentAttempt.findUnique({ where: { orderId: order }, select: { userId: true } });
  if (!a || a.userId !== session.user.id) redirect("/my-trips");
  let outcome: string = "pending", href = "/my-trips";
  try {
    const r = await confirmAttempt(order);
    outcome = r.outcome;
    href = r.attempt.tripCode ? `/my-trips/${r.attempt.tripCode}` : r.attempt.ticketCode ? `/my-trips/tickets/${r.attempt.ticketCode}`
      : r.attempt.invoiceId ? `/portal/invoices/${r.attempt.invoiceId}` : "/my-trips";
  } catch { outcome = "pending"; }
  const ok = outcome === "paid" || outcome === "already";
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-6 text-center">
        <h1 className="text-2xl font-bold">{t(`ret.${outcome as "paid"}.title`)}</h1>
        <p className="mt-2 text-muted">{t(`ret.${outcome as "paid"}.body`)}</p>
        <Link href={href} className={`btn mt-5 ${ok ? "btn-red" : "btn-line"}`}>{t("ret.viewBooking")}</Link>
      </div>
    </main>
  );
}
