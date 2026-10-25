import {
  getDb,
  queryRow,
  queryRows,
  runStatement,
  withTransaction,
} from "@/lib/db/sqlite-store";
import { isValidVisitor } from "@/lib/visitor";

/**
 * Article like counts + visitor votes — plan 261007-2145. Server-only
 * (libSQL: Turso in production, local file in dev), connection + DDL live in
 * `db/sqlite-store.ts`. `likes(slug,count)` is the fast read model,
 * `like_votes(slug,visitor)` the source of truth; every write goes through a
 * single transaction so the count can never drift from `COUNT(like_votes)`.
 * Degrades when the DB is unreachable: readers return empty maps, writers
 * throw "db unavailable" (routes map that to 503).
 */

export const ARTICLE_LIKES_SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;

const CHUNK_SIZE = 400;

const VOTE_INSERT =
  "INSERT INTO like_votes(slug, visitor, created_at) VALUES(?, ?, ?) ON CONFLICT DO NOTHING";

const COUNT_UPSERT =
  "INSERT INTO likes(slug, count) VALUES(?, 1) " +
  "ON CONFLICT(slug) DO UPDATE SET count = count + 1 RETURNING count";

type CountRow = { count?: number };

function chunk<T>(items: T[]): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    parts.push(items.slice(i, i + CHUNK_SIZE));
  }
  return parts;
}

function validSlugs(slugs: string[]): string[] {
  return [...new Set(slugs.filter((slug) => ARTICLE_LIKES_SLUG_PATTERN.test(slug)))];
}

/** Atomically +1 for slug; returns the new total. Throws on bad slug / no DB. */
export async function incrementArticleLike(slug: string): Promise<number> {
  if (!ARTICLE_LIKES_SLUG_PATTERN.test(slug)) {
    throw new Error("invalid slug");
  }
  const database = await getDb();
  if (!database) throw new Error("db unavailable");
  const row = await queryRow<CountRow>(database, COUNT_UPSERT, [slug]);
  return Number(row?.count ?? 1);
}

/** Batch lookup for feed hydration. Missing/unknown slugs → absent (treated as 0). */
export async function getArticleLikeCounts(slugs: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const valid = validSlugs(slugs);
  if (valid.length === 0) return counts;
  const database = await getDb();
  if (!database) return counts;
  for (const part of chunk(valid)) {
    const placeholders = part.map(() => "?").join(",");
    const rows = await queryRows<{ slug: string; count: number }>(
      database,
      `SELECT slug, count FROM likes WHERE slug IN (${placeholders})`,
      part
    );
    for (const row of rows) counts.set(row.slug, Number(row.count));
  }
  return counts;
}

/**
 * Flip this visitor's vote for a slug inside one write transaction. Vote
 * present → remove it and decrement (floor 0, empty rows deleted); absent →
 * record it and increment. Throws on bad slug, bad visitor id or missing DB.
 */
export async function toggleArticleLike(
  slug: string,
  visitor: string
): Promise<{ count: number; isLiked: boolean }> {
  if (!ARTICLE_LIKES_SLUG_PATTERN.test(slug)) throw new Error("invalid slug");
  if (!isValidVisitor(visitor)) throw new Error("invalid visitor");
  return withTransaction(async (db) => {
    const voted = await queryRow<{ present?: number }>(
      db,
      "SELECT 1 AS present FROM like_votes WHERE slug = ? AND visitor = ?",
      [slug, visitor]
    );
    if (voted) {
      await runStatement(db, "DELETE FROM like_votes WHERE slug = ? AND visitor = ?", [
        slug,
        visitor,
      ]);
      await runStatement(db, "UPDATE likes SET count = MAX(count - 1, 0) WHERE slug = ?", [slug]);
      await runStatement(db, "DELETE FROM likes WHERE slug = ? AND count = 0", [slug]);
      const row = await queryRow<CountRow>(db, "SELECT count FROM likes WHERE slug = ?", [slug]);
      return { count: Number(row?.count ?? 0), isLiked: false };
    }
    const inserted = await runStatement(db, VOTE_INSERT, [
      slug,
      visitor,
      new Date().toISOString(),
    ]);
    if (inserted === 0) {
      const row = await queryRow<CountRow>(db, "SELECT count FROM likes WHERE slug = ?", [slug]);
      return { count: Number(row?.count ?? 0), isLiked: true };
    }
    const row = await queryRow<CountRow>(db, COUNT_UPSERT, [slug]);
    return { count: Number(row?.count ?? 1), isLiked: true };
  });
}

/**
 * Batch "did this visitor vote" lookup — every valid slug gets an entry
 * (false when no vote, no visitor or DB degraded); only an unusable DB
 * yields an empty map.
 */
export async function getVisitorLikedSlugs(
  slugs: string[],
  visitor: string | null
): Promise<Map<string, boolean>> {
  const liked = new Map<string, boolean>();
  const valid = validSlugs(slugs);
  if (valid.length === 0) return liked;
  const database = await getDb();
  if (!database) return liked;
  if (isValidVisitor(visitor)) {
    for (const part of chunk(valid)) {
      const placeholders = part.map(() => "?").join(",");
      const rows = await queryRows<{ slug: string }>(
        database,
        `SELECT slug FROM like_votes WHERE visitor = ? AND slug IN (${placeholders})`,
        [visitor, ...part]
      );
      for (const row of rows) liked.set(row.slug, true);
    }
  }
  for (const slug of valid) if (!liked.has(slug)) liked.set(slug, false);
  return liked;
}
