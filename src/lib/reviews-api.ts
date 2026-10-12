import type { RatingAggregate } from "@/lib/reviews-db";
import {
  clearLocalReviews,
  dropLocalReview,
  listReviews,
  notifyReviewsChanged,
  type TourReview,
} from "@/lib/reviews";

/**
 * Client side of the global reviews API (plan 261007-2145, phase 04): plain
 * `fetch` helpers (no SWR/React Query in repo). Every successful write
 * dispatches `vn-reviews:changed` so badges/lists refetch exactly like the old
 * localStorage flow, and drops the local copy of that reference so a later
 * migration can never re-upload stale content over a fresh save.
 * `migrateLegacyReviews()` imports `vn-reviews:v1` into SQLite exactly once:
 * entry-by-entry, non-destructive on failure, module-level in-flight guard.
 */

export class ReviewApiError extends Error {
  /** HTTP status, or `null` for network failures (retryable). */
  constructor(readonly status: number | null, message: string) {
    super(message);
    this.name = "ReviewApiError";
  }
}

export interface ReviewsPayload {
  reviews: TourReview[];
  aggregate: RatingAggregate | null;
}

/** API rows omit `authorEmail`; `owned` is the visitor-cookie match. */
function isApiReview(value: unknown): value is TourReview {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const isString = (field: string) => typeof record[field] === "string";
  return (
    isString("reference") &&
    isString("tourSlug") &&
    isString("authorName") &&
    isString("comment") &&
    isString("createdAt") &&
    isString("bookingReference") &&
    typeof record.rating === "number" &&
    Array.isArray(record.images)
  );
}

function isAggregate(value: unknown): value is RatingAggregate {
  if (!value || typeof value !== "object") return false;
  const { avg, count } = value as Record<string, unknown>;
  return typeof avg === "number" && typeof count === "number";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** List + AVG/COUNT for one slug. Throws on non-2xx — callers keep prior state. */
export async function fetchReviews(slug: string): Promise<ReviewsPayload> {
  const response = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new ReviewApiError(response.status, "reviews unavailable");
  const body = (await readJson(response)) as { reviews?: unknown; aggregate?: unknown } | null;
  if (!body || typeof body !== "object") throw new ReviewApiError(null, "bad payload");
  return {
    reviews: Array.isArray(body.reviews) ? body.reviews.filter(isApiReview) : [],
    aggregate: isAggregate(body.aggregate) ? body.aggregate : null,
  };
}

/** Batch AVG/COUNT for badges: `{}` on 4xx, throws on 5xx/network. */
export async function fetchRatingAggregates(
  slugs: string[]
): Promise<Record<string, RatingAggregate>> {
  const response = await fetch(
    `/api/ratings?slugs=${encodeURIComponent(slugs.join(","))}`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new ReviewApiError(response.status, "ratings unavailable");
  const body = (await readJson(response)) as { aggregates?: unknown } | null;
  const found = body?.aggregates;
  if (!found || typeof found !== "object") return {};
  const aggregates: Record<string, RatingAggregate> = {};
  for (const [slug, entry] of Object.entries(found as Record<string, unknown>)) {
    if (isAggregate(entry)) aggregates[slug] = entry;
  }
  return aggregates;
}

async function postReview(review: TourReview): Promise<number> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review),
    });
    return response.status;
  } catch {
    throw new ReviewApiError(null, "network error");
  }
}

/** Create/edit → drop the local copy + notify. Throws `ReviewApiError` on failure. */
export async function saveReviewApi(review: TourReview): Promise<void> {
  const status = await postReview(review);
  if (status < 200 || status >= 300) throw new ReviewApiError(status, "save failed");
  dropLocalReview(review.reference);
  notifyReviewsChanged();
}

/** Owner delete → drop the local copy + notify. Throws `ReviewApiError` on failure. */
export async function deleteReviewApi(reference: string): Promise<void> {
  let status: number;
  try {
    const response = await fetch(`/api/reviews/${encodeURIComponent(reference)}`, {
      method: "DELETE",
    });
    status = response.status;
  } catch {
    throw new ReviewApiError(null, "network error");
  }
  if (status < 200 || status >= 300) throw new ReviewApiError(status, "delete failed");
  dropLocalReview(reference);
  notifyReviewsChanged();
}

/** Server-rejecting statuses: the server copy is canonical → drop locally. */
const REJECTED_STATUSES = new Set([400, 403, 409, 413]);
let inflight: Promise<void> | null = null;

/**
 * One-shot, retry-safe import of `vn-reviews:v1` into SQLite. Never blocks
 * first paint (callers `void` it): accepted/rejected entries are dropped one
 * by one; 429/5xx/network stops the run (data kept, retried next mount); the
 * key is cleared only when the list is fully processed.
 */
export function migrateLegacyReviews(): Promise<void> {
  if (inflight) return inflight;
  if (listReviews().length === 0) return Promise.resolve();
  inflight = runMigration().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function runMigration(): Promise<void> {
  for (const entry of listReviews()) {
    let status: number;
    try {
      status = await postReview(entry);
    } catch {
      return;
    }
    const handled =
      (status >= 200 && status < 300) || REJECTED_STATUSES.has(status);
    if (!handled) return;
    dropLocalReview(entry.reference);
  }
  clearLocalReviews();
  notifyReviewsChanged();
}
