// Display formatting shared by server and client components.
export const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

/** Calendar dates are stored as UTC midnight, so format in UTC to avoid shifting the day. */
export const fmtDate = (d: Date, opts: { year?: boolean } = {}) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(opts.year === false ? {} : { year: "numeric" }), timeZone: "UTC" });

/** Moments (submitted, decided) shown in Jakarta time. */
export const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const GRADE_LABEL = { STAFF: "Staff", SUPERVISOR: "Supervisor", MANAGER: "Manager", DIRECTOR: "Director" } as const;
export const NEED_LABEL = { FLIGHT: "Flights", TRAIN: "Trains", HOTEL: "Hotels", CAR: "Car rental" } as const;
export const LINE_LABEL = { ...NEED_LABEL, ALLOWANCE: "Daily allowance" } as const;
export const FLIGHT_LABEL = { ECONOMY: "Economy", BUSINESS: "Business" } as const;
export const TRAIN_LABEL = { ECONOMY: "Economy", BUSINESS: "Business", EXECUTIVE: "Executive" } as const;
export const CAR_LABEL = { SMALL_CAR: "Small car", MEDIUM_MPV: "Medium MPV", SUV: "SUV", PREMIUM_SEDAN: "Premium sedan" } as const;

export const STATUS_BADGE = {
  DRAFT: ["Draft", "bg-grey-t text-muted"],
  PENDING_APPROVAL: ["Waiting for approval", "bg-amber-t text-amber"],
  APPROVED: ["Approved, plan your trip", "bg-blue-t text-blue"],
  BOOKED: ["Booked", "bg-green-t text-green-d"],
  COMPLETED: ["Completed", "bg-ink text-white"],
  REJECTED: ["Rejected", "bg-red-t text-red-d"],
  CANCELLED: ["Cancelled", "bg-grey-t text-muted"],
} as const;
