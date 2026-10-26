import type { PriceCurrency } from "@/lib/pricing";
import type { PaymentMethod } from "@/lib/payment";
import type {
  BookingDifficulty,
  LegacyBookingDifficulty,
} from "@/lib/booking-difficulty";

/**
 * One paid booking as stored in localStorage (no auth/backend in this app).
 * `reference` is the primary key — re-paying the same ticket upserts instead of
 * duplicating when the user switches payment method and the mock webhook fires
 * a second time.
 */
export interface TripBooking {
  reference: string;
  slug: string;
  tourName: string;
  travelDate: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  guests: number;
  /** Booking-time choice; legacy rows may still hold lowercase values. */
  difficulty?: BookingDifficulty | LegacyBookingDifficulty;
  pricePerGuest: number | null;
  total: number | null;
  /** Pre-voucher total (present on orders that applied a voucher). */
  subtotal?: number | null;
  /** Voucher amount removed from `subtotal` (present only when > 0). */
  discount?: number | null;
  /** Voucher code used for the order (display only). */
  voucherCode?: string;
  currency: PriceCurrency;
  locale: string;
  paidAt: string;
  /** Optional (absent on pre-260929 records) — method used at payment. */
  paymentMethod?: PaymentMethod;
  /**
   * Optional mission telemetry captured at completion. When absent, the
   * account view derives a stable placeholder from the reference hash
   * (see `src/lib/missions.ts`).
   */
  mission?: {
    outcome: "success" | "failed";
    clearTimeMs: number;
    cluesUsed: number;
    cluesTotal: number;
  };
}

export const BOOKINGS_STORAGE_KEY = "vn-my-trips:v1";

export function isTripBooking(value: unknown): value is TripBooking {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const isString = (field: string) => typeof record[field] === "string";
  const isAmount = (field: string) =>
    record[field] === null ||
    (typeof record[field] === "number" && Number.isFinite(record[field]));
  return (
    typeof record.reference === "string" &&
    record.reference.trim().length > 0 &&
    record.reference.length <= 120 &&
    isString("slug") &&
    isString("tourName") &&
    isString("travelDate") &&
    isString("fullName") &&
    isString("email") &&
    isString("phone") &&
    isString("notes") &&
    // Optional (absent on standard tours) but must still be a string when present.
    (record.difficulty === undefined || isString("difficulty")) &&
    // Optional (absent on pre-260929 records) — enum-checked when present.
    (record.paymentMethod === undefined ||
      record.paymentMethod === "momo" ||
      record.paymentMethod === "bank") &&
    isString("locale") &&
    isString("paidAt") &&
    (record.currency === "VND" || record.currency === "USD") &&
    typeof record.guests === "number" &&
    Number.isInteger(record.guests) &&
    record.guests >= 1 &&
    isAmount("total") &&
    isAmount("pricePerGuest") &&
    // Optional voucher breakdown — must be well-formed when present.
    (record.subtotal === undefined || isAmount("subtotal")) &&
    (record.discount === undefined || isAmount("discount")) &&
    (record.voucherCode === undefined || isString("voucherCode"))
  );
}

/** Newest first. Silently returns `[]` for corrupted storage or private mode. */
export function listBookings(): TripBooking[] {
  try {
    const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isTripBooking)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  } catch {
    return [];
  }
}

export function getBooking(reference: string): TripBooking | null {
  return listBookings().find((booking) => booking.reference === reference) ?? null;
}

/**
 * Merge account-backed bookings with this device's legacy/local records.
 * Server rows win on a shared reference; the result is newest-first.
 */
export function mergeBookings(
  server: TripBooking[],
  local: TripBooking[]
): TripBooking[] {
  const merged = new Map<string, TripBooking>();
  for (const booking of local) merged.set(booking.reference, booking);
  for (const booking of server) merged.set(booking.reference, booking);
  return [...merged.values()].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export function saveBooking(booking: TripBooking): void {
  try {
    const current = listBookings().filter(
      (entry) => entry.reference !== booking.reference
    );
    window.localStorage.setItem(
      BOOKINGS_STORAGE_KEY,
      JSON.stringify([booking, ...current])
    );
  } catch {
    // Storage unavailable (private mode, quota) — the ticket stays on screen
  }
}

/** Removes every saved trip from this device (user-initiated PII delete). */
export function clearBookings(): void {
  try {
    window.localStorage.removeItem(BOOKINGS_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode) — nothing to clear
  }
}
