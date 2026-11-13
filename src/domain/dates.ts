// Calendar-date helpers. Trip dates are whole days with no time zone, held as UTC midnight.
const DAY_MS = 86_400_000;

export function utcDate(y: number, m1: number, d: number): Date {
  return new Date(Date.UTC(y, m1 - 1, d));
}

/** Parse "YYYY-MM-DD" as a calendar date. */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return utcDate(y, m, d);
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in Asia/Jakarta (WIB), where the business runs. */
export function todayInJakarta(now = new Date()): Date {
  return parseDate(now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }));
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** Whole days from a to b (b - a). */
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY_MS);

/** Trip length counting both the first and last day (15 to 17 October = 3 days). */
export const tripDays = (start: Date, end: Date) => daysBetween(start, end) + 1;

/**
 * Demo data is written against a fixed reference date and shifted so that the reference
 * date lands on `anchor` (default: today). See docs/decisions.md §3.
 */
export function shiftFrom(reference: Date, anchor: Date) {
  const offset = daysBetween(reference, anchor);
  return (iso: string) => addDays(parseDate(iso), offset);
}
