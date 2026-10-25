import {
  getDb,
  queryRows,
  runStatement,
  withTransaction,
} from "@/lib/db/sqlite-store";
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

export async function saveBookingForUser(
  userId: string,
  booking: TripBooking,
  nowIso = new Date().toISOString()
): Promise<boolean> {
  if (!isTripBooking(booking)) return false;
  try {
    await withTransaction(async (db) => {
      await runStatement(
        db,
        "INSERT INTO bookings (reference, user_id, payload, created_at) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT(reference) DO UPDATE SET payload = excluded.payload " +
          "WHERE bookings.user_id = excluded.user_id",
        [booking.reference, userId, JSON.stringify(booking), nowIso]
      );
    });
    return true;
  } catch {
    return false;
  }
}

/** Newest first; malformed rows are ignored rather than crashing the page. */
export async function listBookingsForUser(userId: string): Promise<TripBooking[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await queryRows<BookingRow>(
    db,
    "SELECT payload FROM bookings WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
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

export async function getBookingForUser(
  userId: string,
  reference: string
): Promise<TripBooking | null> {
  return (
    (await listBookingsForUser(userId)).find(
      (booking) => booking.reference === reference
    ) ?? null
  );
}

export async function clearBookingsForUser(userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await runStatement(db, "DELETE FROM bookings WHERE user_id = ?", [userId]);
  return true;
}
