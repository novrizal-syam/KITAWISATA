import { requireRole } from "@/lib/authz";
import { TripForm } from "../trip-form";

export default async function NewOpenTrip() {
  await requireRole(["OPS"], "/portal/open-trips/new");
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><p className="eyebrow">New Open Trip</p><h1 className="text-[28px] font-bold">Create a group trip</h1>
        <p className="mt-1 text-muted">Set the trip&apos;s terms and cancellation fees now: travellers see them before they pay, and each booking keeps the terms it was made with.</p></div>
      <TripForm />
    </div>
  );
}
