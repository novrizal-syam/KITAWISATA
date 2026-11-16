import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import { offersFor, readSearch } from "@/server/ticketService";
import { KIND_BY_SLUG, searchQuery } from "../../kinds";
import { PriceLines, offerLines } from "../../offer-summary";
import { TicketBookForm } from "./form";

export default async function BookTicket({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const slug = (await params).kind;
  const kind = KIND_BY_SLUG[slug];
  if (!kind) notFound();
  const sp = await searchParams;
  const session = await auth();
  const here = `/travel/${slug}/book?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`;
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(here)}`);
  const { search, error } = readSearch(kind, sp);
  const offer = error ? null : offersFor(search).find((o) => o.id === sp.offer);
  if (!offer) notFound();
  const [{ t, locale }, me] = await Promise.all([getT(), db.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } })]);
  const { title, lines } = offerLines(search, offer, t, locale);
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <nav className="text-[14px]"><Link href={`/travel/${slug}?${searchQuery(search as unknown as Record<string, string>)}`} className="font-semibold text-red">← {t("tk.backToResults")}</Link></nav>
        <h1 className="text-2xl font-bold">{t("book.title")}</h1>
        <TicketBookForm kindSlug={slug} offerId={offer.id} search={search as unknown as Record<string, string>} names={kind === "STAY" ? 1 : search.pax}
          lead={kind === "STAY"} contactName={me?.name ?? ""} contactPhone={me?.phone ?? ""} total={offer.total} />
      </div>
      <aside className="card flex h-fit flex-col gap-2 p-5 lg:sticky lg:top-20">
        <b>{t("book.summary")}</b>
        <b className="text-lg">{title}</b>
        {lines.map((l) => <span key={l} className="text-[14px] text-muted">{l}</span>)}
        <PriceLines offer={offer} t={t} />
        <p className="note">{t("tk.payFullNote")}</p>
      </aside>
    </main>
  );
}
