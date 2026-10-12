import { getDb, withTransaction } from "@/lib/db/sqlite-store";
import { isEditWindowExpired } from "@/lib/edit-window";
import { isValidReference, isValidTourSlug, type ReviewInput } from "@/lib/reviews-validation";

/**
 * SQLite-backed review store (plan 261007-2145, phase 03), server-only
 * (`node:sqlite`). PK `reference = ${bookingReference}:${tourSlug}` = one
 * review per booking per tour. `created_at` is the immutable 3h edit-window
 * anchor (client-supplied only on first insert for migration, never rewritten
 * on edit; window judged against the server clock); ownership = `visitor`
 * cookie match. `author_email` is written but NEVER serialized. Degrade:
 * reads → empty/throw, writes → "db unavailable" (routes map that to 503).
 */

export type ReviewStoreErrorCode = "not_found" | "not_owner" | "window_closed";

export class ReviewStoreError extends Error {
  constructor(readonly code: ReviewStoreErrorCode, message: string) {
    super(message);
    this.name = "ReviewStoreError";
  }
}

export type RatingAggregate = { avg: number; count: number };

/** API-facing review: no `authorEmail`, no `visitor` id. */
export interface PublicReview {
  reference: string;
  tourSlug: string;
  bookingReference: string;
  authorName: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  owned: boolean;
}

interface ReviewRow {
  reference: string;
  tour_slug: string;
  booking_reference: string;
  visitor: string;
  author_name: string;
  rating: number;
  comment: string;
  images: string;
  created_at: string;
}

const LIST_COLUMNS =
  "reference, tour_slug, booking_reference, visitor, author_name, rating, comment, images, created_at";

function parseImages(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function toPublic(row: ReviewRow, visitor: string | null): PublicReview {
  return {
    reference: row.reference,
    tourSlug: row.tour_slug,
    bookingReference: row.booking_reference,
    authorName: row.author_name,
    rating: Number(row.rating),
    comment: row.comment,
    images: parseImages(row.images),
    createdAt: row.created_at,
    owned: row.visitor === visitor,
  };
}

function writtenReview(input: ReviewInput, createdAt: string): PublicReview {
  return {
    reference: input.reference,
    tourSlug: input.tourSlug,
    bookingReference: input.bookingReference,
    authorName: input.authorName,
    rating: input.rating,
    comment: input.comment,
    images: input.images,
    createdAt,
    owned: true,
  };
}

/** Insert when the reference is new, else owner+window edit. Throws typed errors. */
export function upsertReview(input: ReviewInput, visitor: string, nowIso: string): PublicReview {
  return withTransaction((db) => {
    const existing = db
      .prepare("SELECT visitor, created_at FROM reviews WHERE reference = ?")
      .get(input.reference) as { visitor: string; created_at: string } | undefined;

    if (!existing) {
      const createdAt = input.createdAt ?? nowIso;
      db.prepare(
        "INSERT INTO reviews (reference, tour_slug, booking_reference, visitor, " +
          "author_name, author_email, rating, comment, images, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        input.reference,
        input.tourSlug,
        input.bookingReference,
        visitor,
        input.authorName,
        input.authorEmail,
        input.rating,
        input.comment,
        JSON.stringify(input.images),
        createdAt,
        nowIso
      );
      return writtenReview(input, createdAt);
    }

    if (existing.visitor !== visitor) {
      throw new ReviewStoreError("not_owner", "not owner");
    }
    if (isEditWindowExpired(existing.created_at, nowIso)) {
      throw new ReviewStoreError("window_closed", "edit window closed");
    }
    db.prepare(
      "UPDATE reviews SET author_name = ?, author_email = ?, rating = ?, comment = ?, " +
        "images = ?, updated_at = ? WHERE reference = ? AND visitor = ?"
    ).run(
      input.authorName,
      input.authorEmail,
      input.rating,
      input.comment,
      JSON.stringify(input.images),
      nowIso,
      input.reference,
      visitor
    );
    return writtenReview(input, existing.created_at);
  });
}

/** Newest first, ≤100 rows, each carrying `owned` for the requesting visitor. */
export function listReviewsForSlug(slug: string, visitor: string | null): PublicReview[] {
  if (!isValidTourSlug(slug)) throw new Error("invalid slug");
  const db = getDb();
  if (!db) throw new Error("db unavailable");
  const rows = db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM reviews WHERE tour_slug = ? ORDER BY created_at DESC LIMIT 100`
    )
    .all(slug) as unknown as ReviewRow[];
  return rows.map((row) => toPublic(row, visitor));
}

/** Owner-only at any age; only edits stay behind the 3h window. */
export function deleteReview(
  reference: string,
  visitor: string
): { reference: string; tourSlug: string } {
  if (!isValidReference(reference)) throw new Error("invalid reference");
  return withTransaction((db) => {
    const row = db
      .prepare("SELECT visitor, tour_slug, created_at FROM reviews WHERE reference = ?")
      .get(reference) as { visitor: string; tour_slug: string; created_at: string } | undefined;
    if (!row) throw new ReviewStoreError("not_found", "review not found");
    if (row.visitor !== visitor) throw new ReviewStoreError("not_owner", "not owner");
    db.prepare("DELETE FROM reviews WHERE reference = ? AND visitor = ?").run(reference, visitor);
    return { reference, tourSlug: row.tour_slug };
  });
}

/** Batch AVG/COUNT (mirrors `getArticleLikeCounts`): unknown slugs absent, no DB → empty map. */
export function getRatingAggregates(slugs: string[]): Map<string, RatingAggregate> {
  const aggregates = new Map<string, RatingAggregate>();
  const valid = [...new Set(slugs.filter((slug) => isValidTourSlug(slug)))];
  if (valid.length === 0) return aggregates;
  const db = getDb();
  if (!db) return aggregates;
  const placeholders = valid.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT tour_slug, AVG(rating) AS avg, COUNT(*) AS n FROM reviews ` +
        `WHERE tour_slug IN (${placeholders}) GROUP BY tour_slug`
    )
    .all(...valid) as Array<{ tour_slug: string; avg: number | null; n: number }>;
  for (const row of rows) {
    if (row.avg === null) continue;
    aggregates.set(row.tour_slug, { avg: Number(row.avg), count: Number(row.n) });
  }
  return aggregates;
}
