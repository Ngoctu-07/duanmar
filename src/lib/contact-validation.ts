/**
 * Shared contact-form validation: used by the React Hook Form rules on the
 * client AND by POST /api/contact on the server, so the two can never
 * disagree (mirrors booking-validation.ts — manual checks, no zod).
 */
export interface ContactValues {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export type ContactField = keyof ContactValues;

export type ContactErrorKey =
  | "required"
  | "nameInvalid"
  | "emailInvalid"
  | "phoneInvalid"
  | "messageInvalid";

export type ContactErrors = Partial<Record<ContactField, ContactErrorKey>>;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,14}$/;
export const MAX_MESSAGE_LENGTH = 5000;

export const isNameValid = (value: string): boolean => value.trim().length >= 2;
export const isEmailValid = (value: string): boolean => EMAIL_PATTERN.test(value.trim());
export const isPhoneValid = (value: string): boolean => PHONE_PATTERN.test(value.trim());
export const isMessageValid = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
};

/**
 * Validates an untrusted payload. Returns locale-agnostic error keys per
 * field; `{}` means valid. Never throws (guards non-object/non-string input).
 */
export function validateContactPayload(values: unknown): ContactErrors {
  const errors: ContactErrors = {};
  if (!values || typeof values !== "object") {
    return {
      fullName: "required",
      email: "required",
      phone: "required",
      message: "required",
    };
  }
  const record = values as Record<string, unknown>;
  // Missing, blank or wrong-typed (API accepts JSON — never coerce types).
  const missing = (value: unknown) =>
    typeof value !== "string" || value.trim() === "";

  if (missing(record.fullName)) errors.fullName = "required";
  else if (!isNameValid(String(record.fullName))) errors.fullName = "nameInvalid";

  if (missing(record.email)) errors.email = "required";
  else if (!isEmailValid(String(record.email))) errors.email = "emailInvalid";

  if (missing(record.phone)) errors.phone = "required";
  else if (!isPhoneValid(String(record.phone))) errors.phone = "phoneInvalid";

  if (missing(record.message)) errors.message = "required";
  else if (!isMessageValid(String(record.message))) errors.message = "messageInvalid";

  return errors;
}

/** Log helper: `nguyen@example.com` → `n***n@example.com` (PII-safe logs). */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
}

/** Log helper: `+84901234567` → `+84****4567` (country code + last 4 only). */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 5) return "***";
  const prefix = trimmed.startsWith("+") ? `+${digits.slice(0, 3)}` : "";
  const prefixDigits = prefix ? 3 : 0;
  const masked = Math.max(1, digits.length - prefixDigits - 4);
  return `${prefix}${"*".repeat(masked)}${digits.slice(-4)}`;
}
