import type { TripBooking } from "@/lib/booking-history";

/**
 * Availability for one tour: a single tour-level daily capacity minus the
 * guests of all successful (paid) bookings per departure date.
 * `remaining = maxCapacity - totalBookedGuests(date)` — the only ledger is
 * the bookings list; Studio holds no manual per-date counts.
 */
export interface TourCapacity {
  maxCapacity: number;
  /** ISO date (YYYY-MM-DD) → guests already booked. Missing date = 0 booked. */
  bookedByDate: Record<string, number>;
}

interface CapacityDoc {
  maxCapacity?: unknown;
}

/**
 * Reads the tour-level `maxCapacity`. Returns `null` when it is absent or
 * implausible (non-integer, <1, or above `MAX_TOUR_CAPACITY` where Studio's
 * `min(1).integer()` cannot protect against API writes) — callers then show
 * nothing and disable nothing (no data, no guessing, P4).
 */
const MAX_TOUR_CAPACITY = 999;

export function mapTourCapacity(
  doc: CapacityDoc | null | undefined
): TourCapacity | null {
  const max = doc?.maxCapacity;
  if (
    typeof max !== "number" ||
    !Number.isSafeInteger(max) ||
    max < 1 ||
    max > MAX_TOUR_CAPACITY
  )
    return null;

  return { maxCapacity: max, bookedByDate: {} };
}

/**
 * Aggregates this device's successful (paid, validated) bookings for `slug`
 * into `bookedByDate`: `totalBookedGuests(date) = Σ guests` of every booking
 * travelling on that date. This is the ONLY deduction source — recalculates
 * the moment bookings change (mount + cross-tab storage event + remount after
 * a confirmed booking). `null` capacity stays null (P4).
 */
export function mergeDeviceBookings(
  capacity: TourCapacity | null,
  slug: string,
  bookings: TripBooking[]
): TourCapacity | null {
  if (!capacity) return null;

  const bookedByDate = { ...capacity.bookedByDate };

  for (const booking of bookings) {
    if (booking.slug !== slug) continue;
    const guests =
      Number.isFinite(booking.guests) && booking.guests > 0
        ? Math.floor(booking.guests)
        : 0;
    if (!guests || !booking.travelDate) continue;
    bookedByDate[booking.travelDate] =
      (bookedByDate[booking.travelDate] ?? 0) + guests;
  }

  return { maxCapacity: capacity.maxCapacity, bookedByDate };
}

/** Spots left on `iso`; `null` when the tour has no capacity configured. */
export function remainingSlots(
  capacity: TourCapacity | null,
  iso: string
): number | null {
  if (!capacity) return null;
  return Math.max(0, capacity.maxCapacity - (capacity.bookedByDate[iso] ?? 0));
}

/**
 * `true` when a date can host `guests` people. No capacity data never blocks
 * (P4), and a missing/invalid guest count falls back to 1 so an empty input
 * does not unlock sold-out dates. The "Hết chỗ" badge itself only renders when
 * `remainingSlots === 0`.
 */
export function isDateBookable(
  capacity: TourCapacity | null,
  iso: string,
  guests: number
): boolean {
  const remaining = remainingSlots(capacity, iso);
  if (remaining === null) return true;
  const requested =
    Number.isFinite(guests) && guests >= 1 ? Math.floor(guests) : 1;
  return requested <= remaining;
}
