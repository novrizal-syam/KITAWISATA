import type { T } from "@/i18n";

export const BOOKING_BADGE = {
  HELD: "bg-amber-t text-amber", CONFIRMED: "bg-blue-t text-blue", PAID: "bg-green-t text-green-d",
  CANCELLED: "bg-grey-t text-muted", EXPIRED: "bg-grey-t text-muted",
} as const;

export function BookingBadge({ status, t }: { status: keyof typeof BOOKING_BADGE; t: T }) {
  return <span className={`badge ${BOOKING_BADGE[status]}`}>{t(`bk.${status}`)}</span>;
}
