import Image from "next/image";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/i18n/switcher";

// Placeholder consumer-site home. The consumer screens are rebuilt from the prototype in a later phase.
export default async function Home() {
  const { t, locale } = await getT();
  return (
    <main className="mx-auto mt-24 max-w-2xl px-4">
      <div className="flex items-center justify-between gap-3">
        <Image src="/logo.png" alt="kitawisata" width={200} height={40} priority />
        <LanguageSwitcher locale={locale} label={t("lang.label")} />
      </div>
      <p className="mt-4 text-muted">{t("home.tagline")}</p>
      <Link href="/portal" className="btn btn-red mt-6">{t("home.portal")}</Link>
    </main>
  );
}
