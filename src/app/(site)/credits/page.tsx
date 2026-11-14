import { getT } from "@/i18n/server";
import { PHOTO_CREDITS } from "@/content/photo-credits";

export default async function Credits() {
  const { t } = await getT();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">{t("site.photoCredits")}</h1>
      <p className="mb-5 text-muted">{t("site.creditsIntro")}</p>
      <ul className="flex flex-col divide-y divide-line">
        {PHOTO_CREDITS.map((p) => (
          <li key={p.key} className="py-2.5 text-[14px]">
            <a href={p.source} className="font-semibold underline-offset-2 hover:underline" rel="noopener">{p.title}</a>
            <span className="text-muted"> · {p.author} · </span>
            <a href={p.licenseUrl} className="underline-offset-2 hover:underline" rel="noopener license">{p.license}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
