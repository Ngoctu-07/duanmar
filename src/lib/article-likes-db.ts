import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Article like counts — file-backed SQLite store (plan 260929-2254).
 * Server-only (node:sqlite). Degrades to "no counts" when the FS is
 * read-only: getArticleLikeCounts → empty map, increments throw.
 */

export const ARTICLE_LIKES_SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;

function dbPath(): string {
  return (
    process.env.ARTICLE_LIKES_DB_PATH ??
    join(process.cwd(), "data", "article-likes.db")
  );
}

let cached: DatabaseSync | null = null;
let failed = false;

function getDb(): DatabaseSync | null {
  if (failed) return null;
  if (cached) return cached;
  try {
    const path = dbPath();
    mkdirSync(dirname(path), { recursive: true });
    const database = new DatabaseSync(path);
    database.exec(
      "CREATE TABLE IF NOT EXISTS likes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)"
    );
    cached = database;
    return cached;
  } catch (error) {
    failed = true;
    console.error("[article-likes] db unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Atomically +1 for slug; returns the new total. Throws on bad slug / no DB. */
export function incrementArticleLike(slug: string): number {
  if (!ARTICLE_LIKES_SLUG_PATTERN.test(slug)) {
    throw new Error("invalid slug");
  }
  const database = getDb();
  if (!database) throw new Error("db unavailable");
  const row = database
    .prepare(
      "INSERT INTO likes(slug, count) VALUES(?, 1) " +
        "ON CONFLICT(slug) DO UPDATE SET count = count + 1 RETURNING count"
    )
    .get(slug) as { count?: number } | undefined;
  return Number(row?.count ?? 1);
}

/** Batch lookup for feed hydration. Missing/unknown slugs → absent (treated as 0). */
export function getArticleLikeCounts(slugs: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const valid = [...new Set(slugs.filter((s) => ARTICLE_LIKES_SLUG_PATTERN.test(s)))];
  if (valid.length === 0) return counts;
  const database = getDb();
  if (!database) return counts;
  const placeholders = valid.map(() => "?").join(",");
  const rows = database
    .prepare(`SELECT slug, count FROM likes WHERE slug IN (${placeholders})`)
    .all(...valid) as Array<{ slug: string; count: number }>;
  for (const row of rows) counts.set(row.slug, Number(row.count));
  return counts;
}
