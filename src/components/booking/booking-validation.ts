import { isTravelDateAllowed } from "@/lib/date-window";
import { isDateBookable, type TourCapacity } from "@/lib/tour-capacity";

export interface BookingValues {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  travelDate: string;
  guests: string;
  difficulty: string;
}

export type BookingField = keyof BookingValues;

export type BookingErrorKey =
  | "requiredName"
  | "nameTooShort"
  | "emailRequired"
  | "emailInvalid"
  | "phoneRequired"
  | "phoneInvalid"
  | "dateRequired"
  | "dateOutOfRange"
  | "dateFull"
  | "guestsRequired"
  | "guestsInvalid"
  | "difficultyRequired";

export type BookingErrors = Partial<Record<BookingField, BookingErrorKey>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,14}$/;
const MAX_GUESTS = 99;

/**
 * One shared definition of "the guest count is usable": the calendar, the
 * live date revalidation and submit all ask this, so they can never disagree
 * (the `max` attribute on the number input does not block typing `100`).
 */
export function isValidGuests(count: number): boolean {
  return Number.isInteger(count) && count >= 1 && count <= MAX_GUESTS;
}

/**
 * Manual validation (no validation library in this project). Returns i18n error
 * keys instead of messages so the caller stays locale-agnostic; an empty object
 * means the form is valid. `capacity` (optional) adds the spots-left check for
 * the chosen date — omitted capacity never blocks (no data = no guessing).
 * `isSpecialTour` gates the Challenge Level rule: only special tours require a
 * difficulty pick (`=== true`, so omitted/undefined behaves as a standard tour).
 */
export function validateBooking(
  values: BookingValues,
  capacity?: TourCapacity | null,
  isSpecialTour?: boolean
): BookingErrors {
  const errors: BookingErrors = {};

  const name = values.fullName.trim();
  if (!name) errors.fullName = "requiredName";
  else if (name.length < 2) errors.fullName = "nameTooShort";

  const email = values.email.trim();
  if (!email) errors.email = "emailRequired";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "emailInvalid";

  const phone = values.phone.trim();
  if (!phone) errors.phone = "phoneRequired";
  else if (!PHONE_PATTERN.test(phone)) errors.phone = "phoneInvalid";

  const guests = values.guests.trim();
  const count = Number(guests);
  if (!guests) errors.guests = "guestsRequired";
  else if (!isValidGuests(count)) errors.guests = "guestsInvalid";

  const travelDate = values.travelDate.trim();
  if (!travelDate) errors.travelDate = "dateRequired";
  else if (!isTravelDateAllowed(travelDate)) errors.travelDate = "dateOutOfRange";
  else if (
    !errors.guests &&
    capacity &&
    !isDateBookable(capacity, travelDate, count)
  )
    errors.travelDate = "dateFull";

  if (isSpecialTour === true && !values.difficulty)
    errors.difficulty = "difficultyRequired";

  return errors;
}

export const MAX_GUEST_LIMIT = MAX_GUESTS;

/**
 * Recomputes only the travel-date error after the guest count changed. Bumping
 * guests can push the already-picked date past its remaining spots (`dateFull`),
 * and lowering it again clears that error. Missing/out-of-window errors are
 * left alone — they are not the guest count's business — and an invalid guest
 * input stays the guests field's error instead of doubling up.
 */
export function travelDateErrorAfterGuestsChange(
  previous: BookingErrorKey | undefined,
  travelDate: string,
  guests: number,
  capacity?: TourCapacity | null
): BookingErrorKey | undefined {
  if (previous === "dateRequired" || previous === "dateOutOfRange") return previous;

  const dateFull = Boolean(
    isValidGuests(guests) && travelDate && capacity && !isDateBookable(capacity, travelDate, guests)
  );
  if (dateFull) return "dateFull";
  return previous === "dateFull" ? undefined : previous;
}
