import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function Forbidden() {
  const { t } = await getT();
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-2xl font-bold">{t("forbidden.title")}</h1>
      <p className="mt-2 text-muted">{t("forbidden.body")}</p>
      <Link href="/" className="btn btn-line mt-6">{t("forbidden.home")}</Link>
    </main>
  );
}
