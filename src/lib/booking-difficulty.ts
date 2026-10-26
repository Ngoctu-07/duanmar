/**
 * Booking-time difficulty chosen by the traveller (not a CMS tour attribute).
 *
 * Values are capitalized on purpose so the persisted booking payload matches
 * the product contract exactly: `"Easy" | "Medium" | "Hard"`. Legacy records
 * written before this step may still carry lowercase values; the normalizer
 * accepts them for display without ever emitting them for new bookings.
 */
export const BOOKING_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export type BookingDifficulty = (typeof BOOKING_DIFFICULTIES)[number];

/** Lowercase values found on legacy trip records only. */
export type LegacyBookingDifficulty = "easy" | "medium" | "hard";

export type BookingDifficultyKey = LegacyBookingDifficulty;

export function isBookingDifficulty(
  value: unknown
): value is BookingDifficulty {
  return (
    typeof value === "string" &&
    (BOOKING_DIFFICULTIES as readonly string[]).includes(value)
  );
}

/**
 * Case-insensitive read used at every trust boundary (form payload, stored
 * record, delayed email). Returns `null` for empty or unknown values so the
 * caller decides whether to omit the row or reject the payload.
 */
export function normalizeBookingDifficulty(
  value: unknown
): BookingDifficulty | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  return (
    BOOKING_DIFFICULTIES.find(
      (difficulty) => difficulty.toLowerCase() === candidate
    ) ?? null
  );
}

/** i18n key (`booking.easy|medium|hard`) for a stored difficulty value. */
export function bookingDifficultyKey(
  value: unknown
): BookingDifficultyKey | null {
  const normalized = normalizeBookingDifficulty(value);
  return normalized
    ? (normalized.toLowerCase() as BookingDifficultyKey)
    : null;
}
