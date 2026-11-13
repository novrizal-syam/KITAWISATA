import Image from "next/image";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/i18n/switcher";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const { t, locale } = await getT();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Image src="/logo.png" alt="kitawisata" width={148} height={30} priority />
        <LanguageSwitcher locale={locale} label={t("lang.label")} />
      </div>
      <div className="card p-6">
        <h1 className="mb-5 text-2xl font-bold">{t("login.title")}</h1>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
