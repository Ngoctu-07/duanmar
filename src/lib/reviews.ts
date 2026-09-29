import { listBookings } from "@/lib/booking-history";

/**
 * One customer review as stored in localStorage (device-local, no backend).
 * `reference` is the composite upsert key `${bookingReference}:${tourSlug}` so
 * each booking can leave exactly one review per tour (re-submitting edits it).
 */
export interface TourReview {
  reference: string;
  tourSlug: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  bookingReference: string;
}

export const REVIEWS_STORAGE_KEY = "vn-reviews:v1";
/** Same-tab notification — `storage` events only fire cross-tab. */
export const REVIEWS_CHANGED_EVENT = "vn-reviews:changed";

function notifyChanged(): void {
  try {
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT));
  } catch {
    // Non-browser runtimes (unit tests) have no EventTarget
  }
}

export function isReview(value: unknown): value is TourReview {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const isString = (field: string) => typeof record[field] === "string";
  return (
    isString("reference") &&
    isString("tourSlug") &&
    isString("authorName") &&
    isString("authorEmail") &&
    isString("comment") &&
    isString("createdAt") &&
    isString("bookingReference") &&
    typeof record.rating === "number" &&
    Number.isInteger(record.rating) &&
    record.rating >= 1 &&
    record.rating <= 5 &&
    Array.isArray(record.images) &&
    record.images.every((image) => typeof image === "string")
  );
}

/** Newest first. Returns `[]` when storage is unavailable (SSR, private mode). */
export function listReviews(): TourReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isReview)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/** Upsert by `reference`. Returns `false` when storage write fails (quota/private). */
export function saveReview(review: TourReview): boolean {
  if (typeof window === "undefined") return false;
  try {
    const all = listReviews();
    const existing = all.find((entry) => entry.reference === review.reference);
    // Edits keep the ORIGINAL createdAt — the 3h edit window must not
    // self-extend every time the author re-saves.
    const record: TourReview = existing
      ? { ...review, createdAt: existing.createdAt }
      : review;
    const current = all.filter((entry) => entry.reference !== review.reference);
    window.localStorage.setItem(
      REVIEWS_STORAGE_KEY,
      JSON.stringify([record, ...current])
    );
    notifyChanged();
    return true;
  } catch {
    return false;
  }
}

export function deleteReview(reference: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = listReviews().filter(
      (entry) => entry.reference !== reference
    );
    window.localStorage.setItem(
      REVIEWS_STORAGE_KEY,
      JSON.stringify(current)
    );
    notifyChanged();
  } catch {
    // Storage unavailable — nothing to clear
  }
}

export function reviewsForSlug(reviews: TourReview[], slug: string): TourReview[] {
  return reviews
    .filter((review) => review.tourSlug === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** `null` at 0 reviews — badge hides, section shows its empty state. */
export function getAggregate(
  reviews: TourReview[],
  slug: string
): { avg: number; count: number } | null {
  const forSlug = reviews.filter((review) => review.tourSlug === slug);
  if (forSlug.length === 0) return null;
  const total = forSlug.reduce((sum, review) => sum + review.rating, 0);
  return { avg: total / forSlug.length, count: forSlug.length };
}

/** One decimal place: `4` → `"4.0"`, `4.25` → `"4.3"`. */
export function formatRating(avg: number): string {
  return avg.toFixed(1);
}

export function hasBookingForSlug(slug: string): boolean {
  return listBookings().some((booking) => booking.slug === slug);
}

/**
 * Device-local ownership: true when this device holds the booking the review
 * was left for (UX affordance — e.g. showing the actions menu — NOT a
 * security boundary; localStorage is user-forgeable).
 */
export function isMyReview(review: TourReview): boolean {
  if (typeof window === "undefined") return false;
  return listBookings().some(
    (booking) => booking.reference === review.bookingReference
  );
}

/**
 * Client-side photo downscale for review attachments: longest edge ≤ `maxSize`
 * px, re-encoded as JPEG (strips EXIF/scripts). Rejects corrupt/non-image files.
 */
export async function downscaleImageToDataUrl(
  file: Blob,
  maxSize = 800,
  quality = 0.7
): Promise<string> {
  let source: ImageBitmap | HTMLImageElement;
  let objectUrl: string | null = null;
  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(file);
  } else {
    objectUrl = URL.createObjectURL(file);
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("unreadable image"));
      image.src = objectUrl as string;
    });
  }
  try {
    const width = source.width;
    const height = source.height;
    if (!width || !height) throw new Error("empty image");
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if ("close" in source) source.close();
  }
}
