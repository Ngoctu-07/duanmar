/**
 * Server-side validation for review payloads (plan 261007-2145, phase 03).
 * Pure — no DB, no clock: callers inject `nowIso` so the
 * `2020-01-01 ≤ createdAt ≤ now+60s` bound is unit-testable and a client
 * cannot park a future timestamp to keep its 3h edit window open forever.
 * Failures throw `ReviewValidationError` with a short reason that routes
 * return verbatim as the 400 body.
 */

export const TOUR_SLUG_RE = /^[a-z0-9-]{1,120}$/;
export const BOOKING_REF_RE = /^[A-Za-z0-9-]{1,40}$/;
export const REFERENCE_RE = /^[A-Za-z0-9-]{1,40}:[a-z0-9-]{1,120}$/;
/** Allow-list excludes `image/svg+xml` — only raster data URLs, never markup. */
const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,/;

export const MAX_IMAGES = 3;
export const MAX_IMAGE_CHARS = 300_000;
export const MAX_COMMENT_CHARS = 2000;
const MIN_CREATED_AT_MS = Date.UTC(2020, 0, 1);
const MAX_CLOCK_SKEW_MS = 60_000;

export class ReviewValidationError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ReviewValidationError";
  }
}

/**
 * Validated payload; `createdAt` only present when the client supplied it.
 * Author display data is intentionally absent: the server derives it from the
 * session + `users` row (or a generated guest pseudonym), never from this body.
 */
export interface ReviewInput {
  reference: string;
  tourSlug: string;
  bookingReference: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt?: string;
  /**
   * Paid timestamp of the local booking. Guest display names are numbered by
   * this order-completion time (falling back to `createdAt` for legacy rows).
   */
  bookingPaidAt?: string;
}

export function isValidTourSlug(value: unknown): value is string {
  return typeof value === "string" && TOUR_SLUG_RE.test(value);
}

export function isValidReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_RE.test(value);
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new ReviewValidationError(`invalid ${key}`);
  return value;
}

function validateTimestamp(
  value: unknown,
  field: "createdAt" | "bookingPaidAt",
  nowIso: string
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ReviewValidationError(`invalid ${field}`);
  const parsed = Date.parse(value);
  const now = Date.parse(nowIso);
  if (Number.isNaN(parsed) || Number.isNaN(now)) {
    throw new ReviewValidationError(`invalid ${field}`);
  }
  if (parsed > now + MAX_CLOCK_SKEW_MS) {
    throw new ReviewValidationError(`${field} in future`);
  }
  if (parsed < MIN_CREATED_AT_MS) {
    throw new ReviewValidationError(`${field} before 2020`);
  }
  return new Date(parsed).toISOString();
}

export function validateReviewPayload(body: unknown, nowIso: string): ReviewInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ReviewValidationError("invalid payload");
  }
  const record = body as Record<string, unknown>;

  const tourSlug = stringField(record, "tourSlug");
  if (!TOUR_SLUG_RE.test(tourSlug)) throw new ReviewValidationError("invalid tourSlug");
  const bookingReference = stringField(record, "bookingReference");
  if (!BOOKING_REF_RE.test(bookingReference)) {
    throw new ReviewValidationError("invalid bookingReference");
  }
  const reference = stringField(record, "reference");
  if (!REFERENCE_RE.test(reference) || reference !== `${bookingReference}:${tourSlug}`) {
    throw new ReviewValidationError("invalid reference");
  }

  const { rating } = record;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewValidationError("invalid rating");
  }
  const comment = stringField(record, "comment").trim();
  if (comment.length < 1 || comment.length > MAX_COMMENT_CHARS) {
    throw new ReviewValidationError("invalid comment");
  }

  const { images } = record;
  if (!Array.isArray(images) || images.length > MAX_IMAGES) {
    throw new ReviewValidationError("invalid images");
  }
  const pictureUrls: string[] = [];
  for (const image of images) {
    if (
      typeof image !== "string" ||
      image.length > MAX_IMAGE_CHARS ||
      !IMAGE_DATA_URL_RE.test(image)
    ) {
      throw new ReviewValidationError("invalid images");
    }
    pictureUrls.push(image);
  }

  return {
    reference,
    tourSlug,
    bookingReference,
    rating,
    comment,
    images: pictureUrls,
    createdAt: validateTimestamp(record.createdAt, "createdAt", nowIso),
    bookingPaidAt: validateTimestamp(record.bookingPaidAt, "bookingPaidAt", nowIso),
  };
}
