import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/i18n/switcher";

// Consumer site frame: header with navigation and sign-in state, footer with photo credits.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, { t, locale }] = await Promise.all([auth(), getT()]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <Link href="/" aria-label="kitawisata"><Image src="/logo.png" alt="kitawisata" width={140} height={28} priority /></Link>
          <nav className="flex gap-5 font-semibold" aria-label={t("site.nav")}>
            <Link href="/#trips" className="hover:text-red">{t("site.openTrip")}</Link>
            <Link href="/portal" className="hover:text-red">{t("site.business")}</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher locale={locale} label={t("lang.label")} />
            {session ? (
              <>
                <Link href="/my-trips" className="btn btn-line btn-sm">{t("site.myTrips")}</Link>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="btn btn-line btn-sm">{t("common.signOut")}</button></form>
              </>
            ) : <Link href="/login?callbackUrl=/my-trips" className="btn btn-red btn-sm">{t("site.login")}</Link>}
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-12 bg-ink text-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-6 text-[13px]">
          <span>© {new Date().getFullYear()} kitawisata</span>
          <Link href="/credits" className="underline-offset-2 hover:underline">{t("site.photoCredits")}</Link>
        </div>
      </footer>
    </div>
  );
}
