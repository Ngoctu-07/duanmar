import { withTransaction, getDb } from "@/lib/db/sqlite-store";
import { isTripBooking, type TripBooking } from "@/lib/booking-history";

/**
 * Account-backed trip history (server only).
 *
 * Bookings used to live only in `localStorage`. Signed-in users now also get a
 * row in `bookings` keyed by `(reference, user_id)`, so the profile, mission
 * archive and ticket detail survive a new browser, a cleared cache or a
 * months-long gap between sessions. The snapshot stays a JSON payload so the
 * `TripBooking` contract can evolve without a migration per field.
 */

interface BookingRow {
  payload: string;
}

export function saveBookingForUser(
  userId: string,
  booking: TripBooking,
  nowIso = new Date().toISOString()
): boolean {
  if (!isTripBooking(booking)) return false;
  try {
    withTransaction((db) => {
      db.prepare(
        "INSERT INTO bookings (reference, user_id, payload, created_at) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(reference) DO UPDATE SET payload = excluded.payload " +
          "WHERE bookings.user_id = excluded.user_id"
      ).run(booking.reference, userId, JSON.stringify(booking), nowIso);
    });
    return true;
  } catch {
    return false;
  }
}

/** Newest first; malformed rows are ignored rather than crashing the page. */
export function listBookingsForUser(userId: string): TripBooking[] {
  const db = getDb();
  if (!db) return [];
  const rows = db
    .prepare(
      "SELECT payload FROM bookings WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as unknown as BookingRow[];
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.payload) as unknown;
      } catch {
        return null;
      }
    })
    .filter((value): value is TripBooking => isTripBooking(value));
}

export function getBookingForUser(
  userId: string,
  reference: string
): TripBooking | null {
  return (
    listBookingsForUser(userId).find((booking) => booking.reference === reference) ??
    null
  );
}

export function clearBookingsForUser(userId: string): boolean {
  const db = getDb();
  if (!db) return false;
  db.prepare("DELETE FROM bookings WHERE user_id = ?").run(userId);
  return true;
}
