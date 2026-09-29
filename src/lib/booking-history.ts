import type { PriceCurrency } from "@/lib/pricing";
import type { PaymentMethod } from "@/lib/payment";

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
  /** Absent for standard tours; present only when the tour is `isSpecialTour`. */
  difficulty?: string;
  pricePerGuest: number | null;
  total: number | null;
  currency: PriceCurrency;
  locale: string;
  paidAt: string;
  /** Optional (absent on pre-260929 records) — method used at payment. */
  paymentMethod?: PaymentMethod;
}

export const BOOKINGS_STORAGE_KEY = "vn-my-trips:v1";

function isTripBooking(value: unknown): value is TripBooking {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const isString = (field: string) => typeof record[field] === "string";
  const isAmount = (field: string) =>
    record[field] === null ||
    (typeof record[field] === "number" && Number.isFinite(record[field]));
  return (
    isString("reference") &&
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
    isAmount("pricePerGuest")
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
