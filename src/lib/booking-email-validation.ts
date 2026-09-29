import type { BookingConfirmationPayload } from "@/lib/email/email-types";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/contact-validation";
import type { PaymentMethod } from "@/lib/payment";

/**
 * Server-side validation for POST /api/booking-confirmation (plan 260929-2229).
 * Manual checks, no zod — mirrors contact-validation.ts. Never throws.
 */
export const MAX_NOTES_LENGTH = 500;
const REFERENCE_PATTERN = /^VN-[0-9A-Z]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type BookingConfirmationErrors = Partial<
  Record<keyof BookingConfirmationPayload, string>
>;

export type ValidationResult =
  | { ok: true; payload: BookingConfirmationPayload }
  | { ok: false; errors: BookingConfirmationErrors };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function validateBookingConfirmation(
  body: unknown
): ValidationResult {
  const errors: BookingConfirmationErrors = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { reference: "required" } };
  }
  const record = body as Record<string, unknown>;

  if (!isNonEmptyString(record.fullName) || record.fullName.trim().length < 2) {
    errors.fullName = "invalid";
  }
  if (!isNonEmptyString(record.email) || !EMAIL_PATTERN.test(record.email.trim())) {
    errors.email = "invalid";
  }
  if (!isNonEmptyString(record.phone) || !PHONE_PATTERN.test(record.phone.trim())) {
    errors.phone = "invalid";
  }
  if (!isNonEmptyString(record.tourName)) errors.tourName = "invalid";
  if (!isNonEmptyString(record.slug)) errors.slug = "invalid";
  if (
    !isNonEmptyString(record.reference) ||
    !REFERENCE_PATTERN.test(record.reference)
  ) {
    errors.reference = "invalid";
  }
  if (
    !isNonEmptyString(record.travelDate) ||
    !DATE_PATTERN.test(record.travelDate) ||
    Number.isNaN(Date.parse(record.travelDate))
  ) {
    errors.travelDate = "invalid";
  }
  if (
    typeof record.guests !== "number" ||
    !Number.isInteger(record.guests) ||
    record.guests < 1 ||
    record.guests > 99
  ) {
    errors.guests = "invalid";
  }
  if (
    typeof record.total !== "number" ||
    !Number.isFinite(record.total) ||
    record.total < 0
  ) {
    errors.total = "invalid";
  }
  if (record.currency !== "VND" && record.currency !== "USD") {
    errors.currency = "invalid";
  }
  if (record.paymentMethod !== "momo" && record.paymentMethod !== "bank") {
    errors.paymentMethod = "invalid";
  }
  if (record.locale !== "en" && record.locale !== "vi") {
    errors.locale = "invalid";
  }
  if (record.notes !== undefined && record.notes !== null) {
    if (
      typeof record.notes !== "string" ||
      record.notes.length > MAX_NOTES_LENGTH
    ) {
      errors.notes = "invalid";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const payload: BookingConfirmationPayload = {
    reference: (record.reference as string).trim(),
    slug: (record.slug as string).trim(),
    tourName: (record.tourName as string).trim(),
    fullName: (record.fullName as string).trim(),
    email: (record.email as string).trim(),
    phone: (record.phone as string).trim(),
    travelDate: (record.travelDate as string).trim(),
    guests: record.guests as number,
    total: record.total as number,
    currency: record.currency as "VND" | "USD",
    paymentMethod: record.paymentMethod as PaymentMethod,
    notes: typeof record.notes === "string" ? record.notes.trim() : "",
    locale: record.locale as "en" | "vi",
  };
  return { ok: true, payload };
}
