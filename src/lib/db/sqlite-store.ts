import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Shared `node:sqlite` connection for the interactions DB
 * (likes / like_votes / reviews). Server-only.
 *
 * DDL is additive and idempotent — it runs on every open. Future column
 * additions must be guarded with `PRAGMA table_info(<table>)` checks before
 * `ALTER TABLE`, never unconditional (legacy files from plan 260929-2254
 * only have `likes`). Unusable path (read-only FS, ENOTDIR) degrades to
 * `getDb() === null`: readers return empty results, writers throw
 * "db unavailable" (routes map that to 503). The connection is cached per
 * resolved path, so a changed env path re-opens instead of reusing a stale
 * handle; one failed open latches the module to degraded for the process.
 */

const DDL = `
CREATE TABLE IF NOT EXISTS likes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS like_votes (
  slug TEXT NOT NULL,
  visitor TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (slug, visitor)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_like_votes_visitor ON like_votes(visitor);
CREATE TABLE IF NOT EXISTS reviews (
  reference TEXT PRIMARY KEY,
  tour_slug TEXT NOT NULL,
  booking_reference TEXT NOT NULL,
  visitor TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_tour_created ON reviews(tour_slug, created_at DESC);
`;

export function dbPath(): string {
  return (
    process.env.VN_INTERACTIONS_DB_PATH ||
    process.env.ARTICLE_LIKES_DB_PATH ||
    join(process.cwd(), "data", "article-likes.db")
  );
}

let cached: DatabaseSync | null = null;
let cachedPath: string | null = null;
let failed = false;

export function getDb(): DatabaseSync | null {
  if (failed) return null;
  const path = dbPath();
  if (cached && cachedPath === path) return cached;
  try {
    mkdirSync(dirname(path), { recursive: true });
    const database = new DatabaseSync(path);
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec(DDL);
    cached = database;
    cachedPath = path;
    return database;
  } catch (error) {
    failed = true;
    console.error("[sqlite-store] db unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** BEGIN IMMEDIATE → fn → COMMIT; fn throws → ROLLBACK → rethrow. */
export function withTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  if (!db) throw new Error("db unavailable");
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // connection already gone — surface the original error instead
    }
    throw error;
  }
}
