/** Rolling booking window: a trip can start tomorrow … up to 7 days ahead. */
export const BOOKING_WINDOW_DAYS = 7;

/** Local-timezone `YYYY-MM-DD` (never `toISOString`, which shifts by UTC offset). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` into a local date; `null` for malformed/impossible dates. */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export interface TravelDateWindow {
  /** First bookable day (`YYYY-MM-DD`) — tomorrow. */
  min: string;
  /** Last bookable day (`YYYY-MM-DD`) — today + 7. */
  max: string;
}

export function travelDateWindow(today = new Date()): TravelDateWindow {
  return {
    min: toIsoDate(addDays(today, 1)),
    max: toIsoDate(addDays(today, BOOKING_WINDOW_DAYS)),
  };
}

/**
 * A travel date is allowed only inside the rolling window. ISO strings sort
 * lexicographically, so a direct string comparison is safe here.
 */
export function isTravelDateAllowed(iso: string, today = new Date()): boolean {
  if (!parseIsoDate(iso)) return false;
  const { min, max } = travelDateWindow(today);
  return iso >= min && iso <= max;
}

/** Ticket-friendly date: "Th 4, 02/10/2026" / "Wed, 02/10/2026". */
export function formatTravelDate(iso: string, locale: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
