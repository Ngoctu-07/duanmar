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
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_preset_id TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promotion_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price TEXT,
  original_price TEXT,
  badge TEXT,
  valid_until TEXT,
  tour_slug TEXT,
  claimed_at TEXT NOT NULL,
  UNIQUE (user_id, promotion_id)
);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers(user_id, claimed_at DESC);
CREATE TABLE IF NOT EXISTS bookings (
  reference TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  reset_token_hash TEXT,
  expires_at INTEGER NOT NULL,
  token_expires_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at INTEGER,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_otps(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_otps(reset_token_hash);
`;

/** Additive migration: `ALTER TABLE` only when the column is really missing. */
function ensureColumns(
  database: DatabaseSync,
  table: string,
  columns: Array<[name: string, definition: string]>
) {
  const existing = new Set(
    (
      database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    ).map((column) => column.name)
  );
  for (const [name, definition] of columns) {
    if (existing.has(name)) continue;
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

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
    // Legacy files predate the CMS avatar columns.
    ensureColumns(database, "users", [
      ["avatar_preset_id", "TEXT"],
      ["avatar_url", "TEXT"],
    ]);
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
