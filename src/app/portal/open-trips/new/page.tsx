import { requireRole } from "@/lib/authz";
import { TripForm } from "../trip-form";
import { getT } from "@/i18n/server";

export default async function NewOpenTrip() {
  await requireRole(["OPS"], "/portal/open-trips/new");
  const { t } = await getT();
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><p className="eyebrow">{t("ot.newEyebrow")}</p><h1 className="text-[28px] font-bold">{t("ot.newTitle")}</h1>
        <p className="mt-1 text-muted">{t("ot.newIntro")}</p></div>
      <TripForm />
    </div>
  );
}
