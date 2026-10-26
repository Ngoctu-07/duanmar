import {
  getDb,
  queryRow,
  queryRows,
  runStatement,
  withTransaction,
} from "@/lib/db/sqlite-store";
import { isEditWindowExpired } from "@/lib/edit-window";
import { isValidReference, isValidTourSlug, type ReviewInput } from "@/lib/reviews-validation";

/**
 * SQLite-backed review store (plan 261007-2145, phase 03), server-only
 * (`node:sqlite`). PK `reference = ${bookingReference}:${tourSlug}` = one
 * review per booking per tour. `created_at` is the immutable 3h edit-window
 * anchor (client-supplied only on first insert for migration, never rewritten
 * on edit; window judged against the server clock). New reviews also store
 * `author_id` when the writer has a session — that is the authoritative delete
 * owner. Legacy rows with no `author_id` keep the original `visitor` cookie
 * fallback. `author_email` is written but NEVER serialized. Degrade: reads →
 * empty/throw, writes → "db unavailable" (routes map that to 503).
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
  /** Account id captured when the review was posted (null for legacy rows). */
  authorId: string | null;
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
  author_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  images: string;
  created_at: string;
}

const LIST_COLUMNS =
  "reference, tour_slug, booking_reference, visitor, author_id, author_name, rating, comment, images, created_at";

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

function toPublic(
  row: ReviewRow,
  visitor: string | null,
  viewerId: string | null
): PublicReview {
  return {
    reference: row.reference,
    tourSlug: row.tour_slug,
    bookingReference: row.booking_reference,
    authorId: row.author_id ?? null,
    authorName: row.author_name,
    rating: Number(row.rating),
    comment: row.comment,
    images: parseImages(row.images),
    createdAt: row.created_at,
    // Account ownership is authoritative once author_id exists; legacy rows
    // (pre-account) keep the visitor-cookie provenance.
    owned: row.author_id
      ? viewerId !== null && row.author_id === viewerId
      : row.visitor === visitor,
  };
}

function writtenReview(
  input: ReviewInput,
  createdAt: string,
  authorId: string | null
): PublicReview {
  return {
    reference: input.reference,
    tourSlug: input.tourSlug,
    bookingReference: input.bookingReference,
    authorId,
    authorName: input.authorName,
    rating: input.rating,
    comment: input.comment,
    images: input.images,
    createdAt,
    owned: true,
  };
}

/** Insert when the reference is new, else owner+window edit. Throws typed errors. */
export async function upsertReview(
  input: ReviewInput,
  visitor: string,
  nowIso: string,
  authorId: string | null = null
): Promise<PublicReview> {
  return withTransaction(async (db) => {
    const existing = await queryRow<{
      visitor: string;
      author_id: string | null;
      created_at: string;
    }>(
      db,
      "SELECT visitor, author_id, created_at FROM reviews WHERE reference = ?",
      [input.reference]
    );

    if (!existing) {
      const createdAt = input.createdAt ?? nowIso;
      await runStatement(
        db,
        "INSERT INTO reviews (reference, tour_slug, booking_reference, visitor, author_id, " +
          "author_name, author_email, rating, comment, images, created_at, updated_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          input.reference,
          input.tourSlug,
          input.bookingReference,
          visitor,
          authorId,
          input.authorName,
          input.authorEmail,
          input.rating,
          input.comment,
          JSON.stringify(input.images),
          createdAt,
          nowIso,
        ]
      );
      return writtenReview(input, createdAt, authorId);
    }

    if (existing.visitor !== visitor) {
      throw new ReviewStoreError("not_owner", "not owner");
    }
    // Once an account owns a review, an anonymous/other-account edit through
    // the same device cookie must not take it over.
    if (existing.author_id && existing.author_id !== authorId) {
      throw new ReviewStoreError("not_owner", "not owner");
    }
    if (isEditWindowExpired(existing.created_at, nowIso)) {
      throw new ReviewStoreError("window_closed", "edit window closed");
    }
    const ownerId = existing.author_id ?? authorId;
    await runStatement(
      db,
      "UPDATE reviews SET author_id = ?, author_name = ?, author_email = ?, rating = ?, " +
        "comment = ?, images = ?, updated_at = ? WHERE reference = ? AND visitor = ?",
      [
        ownerId,
        input.authorName,
        input.authorEmail,
        input.rating,
        input.comment,
        JSON.stringify(input.images),
        nowIso,
        input.reference,
        visitor,
      ]
    );
    return writtenReview(input, existing.created_at, ownerId);
  });
}

/** Newest first, ≤100 rows, each carrying `owned` for the requesting visitor. */
export async function listReviewsForSlug(
  slug: string,
  visitor: string | null,
  viewerId: string | null = null
): Promise<PublicReview[]> {
  if (!isValidTourSlug(slug)) throw new Error("invalid slug");
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const rows = await queryRows<ReviewRow>(
    db,
    `SELECT ${LIST_COLUMNS} FROM reviews WHERE tour_slug = ? ORDER BY created_at DESC LIMIT 100`,
    [slug]
  );
  return rows.map((row) => toPublic(row, visitor, viewerId));
}

/** All reviews posted by one account, newest first (account history). */
export async function listReviewsForAuthor(authorId: string): Promise<PublicReview[]> {
  if (!authorId.trim()) throw new Error("invalid author");
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const rows = await queryRows<ReviewRow>(
    db,
    `SELECT ${LIST_COLUMNS} FROM reviews WHERE author_id = ? ORDER BY created_at DESC LIMIT 100`,
    [authorId]
  );
  return rows.map((row) => toPublic(row, null, authorId));
}

/**
 * Owner-only at any age; only edits stay behind the 3h window. Account-owned
 * rows require the exact session user. Legacy rows (author_id IS NULL) retain
 * the original visitor-cookie check so pre-auth data remains manageable.
 */
export async function deleteReview(
  reference: string,
  visitor: string | null,
  userId: string | null = null
): Promise<{ reference: string; tourSlug: string }> {
  if (!isValidReference(reference)) throw new Error("invalid reference");
  return withTransaction(async (db) => {
    const row = await queryRow<{
      visitor: string;
      author_id: string | null;
      tour_slug: string;
      created_at: string;
    }>(
      db,
      "SELECT visitor, author_id, tour_slug, created_at FROM reviews WHERE reference = ?",
      [reference]
    );
    if (!row) throw new ReviewStoreError("not_found", "review not found");
    if (row.author_id) {
      if (!userId || row.author_id !== userId) {
        throw new ReviewStoreError("not_owner", "not owner");
      }
    } else if (!visitor || row.visitor !== visitor) {
      throw new ReviewStoreError("not_owner", "not owner");
    }
    await runStatement(db, "DELETE FROM reviews WHERE reference = ?", [reference]);
    return { reference, tourSlug: row.tour_slug };
  });
}

/** Batch AVG/COUNT (mirrors `getArticleLikeCounts`): unknown slugs absent, no DB → empty map. */
export async function getRatingAggregates(
  slugs: string[]
): Promise<Map<string, RatingAggregate>> {
  const aggregates = new Map<string, RatingAggregate>();
  const valid = [...new Set(slugs.filter((slug) => isValidTourSlug(slug)))];
  if (valid.length === 0) return aggregates;
  const db = await getDb();
  if (!db) return aggregates;
  const placeholders = valid.map(() => "?").join(",");
  const rows = await queryRows<{ tour_slug: string; avg: number | null; n: number }>(
    db,
    `SELECT tour_slug, AVG(rating) AS avg, COUNT(*) AS n FROM reviews ` +
      `WHERE tour_slug IN (${placeholders}) GROUP BY tour_slug`,
    valid
  );
  for (const row of rows) {
    if (row.avg === null) continue;
    aggregates.set(row.tour_slug, { avg: Number(row.avg), count: Number(row.n) });
  }
  return aggregates;
}
