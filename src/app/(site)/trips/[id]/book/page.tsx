import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import { tripForSale, MAX_PAX } from "@/server/openTripBookingService";
import { buildInstalments } from "@/domain/openTripBooking";
import { toIsoDate, todayInJakarta } from "@/domain/dates";
import { fmtDate, rp } from "@/lib/format";
import { FeeTable } from "../../../_components/fee-table";
import { BookForm } from "./form";

export default async function BookTrip({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ dep?: string; pax?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/trips/${id}/book?dep=${sp.dep ?? ""}&pax=${sp.pax ?? ""}`)}`);
  const [{ t, locale }, trip, me] = await Promise.all([getT(), tripForSale(id), db.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } })]);
  const dep = trip?.departures.find((d) => d.id === sp.dep);
  if (!trip || !dep) notFound();
  const pax = Math.max(1, Math.min(Number(sp.pax) || 1, MAX_PAX, Math.max(1, dep.seatsLeft)));
  const total = trip.pricePerPax * pax;
  const today = todayInJakarta();
  const split = buildInstalments("SPLIT", total, today, dep.departDate);
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <nav className="text-[14px]"><Link href={`/trips/${trip.id}`} className="font-semibold text-red">← {trip.name}</Link></nav>
        <h1 className="text-2xl font-bold">{t("book.title")}</h1>
        <BookForm
          departureId={dep.id} pax={pax} total={total} contactName={me?.name ?? ""} contactPhone={me?.phone ?? ""}
          split={split?.map((s) => ({ percent: s.percent, due: toIsoDate(s.dueOn), amount: s.amount })) ?? null}
          terms={<>
            <FeeTable tiers={trip.tiers} total={total} t={t} />
            <details className="mt-3"><summary className="cursor-pointer font-semibold">{t("fees.terms")}</summary><p className="mt-2 text-[14px] whitespace-pre-line text-muted">{trip.terms}</p></details>
          </>}
        />
      </div>
      <aside className="card flex h-fit flex-col gap-2 p-5 lg:sticky lg:top-20">
        <b>{t("book.summary")}</b>
        <b className="text-lg">{trip.name}</b>
        <span className="text-muted">{fmtDate(dep.departDate, locale)} · {trip.durationLabel}</span>
        <div className="num flex justify-between"><span className="text-muted">{t("book.paxLine", { n: pax, price: rp(trip.pricePerPax) })}</span><span>{rp(total)}</span></div>
        <div className="num flex justify-between border-t border-line pt-2 font-bold"><span>{t("col.total")}</span><span>{rp(total)}</span></div>
      </aside>
    </main>
  );
}
