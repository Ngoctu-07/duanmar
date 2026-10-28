import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createClient,
  type Client,
  type InArgs,
  type InStatement,
  type ResultSet,
} from "@libsql/client";

/**
 * Shared libSQL connection for the interactions DB (likes / like_votes /
 * reviews / users / vouchers / bookings / password reset OTPs). Server-only.
 *
 * Two runtimes, one SQL dialect:
 * - `TURSO_DATABASE_URL` set → remote Turso (libsql:// or https://). This is the
 *   production path: Vercel's filesystem is read-only and per-instance, so a
 *   local file can never hold accounts that survive a deploy.
 * - unset → local `file:` database (`VN_INTERACTIONS_DB_PATH` /
 *   `ARTICLE_LIKES_DB_PATH` / `data/article-likes.db`), zero config for dev.
 *
 * DDL is additive and idempotent — it runs on every open. Future column
 * additions must be guarded with `PRAGMA table_info(<table>)` checks before
 * `ALTER TABLE`, never unconditional (legacy files from plan 260929-2254 only
 * have `likes`). An unusable local path (read-only FS, ENOTDIR) degrades to
 * `getDb() === null`: readers return empty results, writers throw
 * "db unavailable" (routes map that to 503). Remote failures are NOT latched —
 * a transient network error must not poison the process forever.
 *
 * The libSQL API is async, so every store that used `node:sqlite` is async too.
 * Use `queryRows` / `queryRow` / `runStatement` instead of hand-rolling
 * `execute({ sql, args })` calls; they keep the row typing sane.
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
  author_id TEXT,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  booking_paid_at TEXT
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

/** Idempotent schema statements, shared with `scripts/migrate-sqlite-to-turso.mts`. */
export const DDL_STATEMENTS: string[] = DDL.split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

/** The subset of `Client` / `Transaction` the query helpers need. */
export interface SqlExecutor {
  execute(stmt: InStatement): Promise<ResultSet>;
}

export type Db = Client;

/** Additive migration: `ALTER TABLE` only when the column is really missing. */
async function ensureColumns(
  db: SqlExecutor,
  table: string,
  columns: Array<[name: string, definition: string]>
): Promise<void> {
  const rows = await queryRows<{ name: string }>(db, `PRAGMA table_info(${table})`);
  const existing = new Set(rows.map((column) => column.name));
  for (const [name, definition] of columns) {
    if (existing.has(name)) continue;
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

/** Local file path, kept for diagnostics + the legacy env precedence tests. */
export function dbPath(): string {
  const override =
    process.env.VN_INTERACTIONS_DB_PATH || process.env.ARTICLE_LIKES_DB_PATH;
  if (override) return override;
  return join(process.cwd(), "data", "article-likes.db");
}

export function dbIsRemote(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

interface DbTarget {
  /** Cache/dedup key — one client per distinct target. */
  key: string;
  url: string;
  authToken?: string;
  /** Local file targets can be statically broken (read-only FS) → latch failure. */
  local: boolean;
  path?: string;
}

function resolveTarget(): DbTarget {
  const remote = process.env.TURSO_DATABASE_URL?.trim();
  if (remote) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
    return { key: `remote:${remote}`, url: remote, authToken, local: false };
  }
  const path = dbPath();
  return { key: `file:${path}`, url: `file:${path}`, local: true, path };
}

let client: Client | null = null;
let readyKey: string | null = null;
let pending: { key: string; promise: Promise<Client | null> } | null = null;
let localFailureKey: string | null = null;

/**
 * Resolves the shared client, opening + migrating it on first use. Returns
 * `null` when the database cannot be reached (callers degrade gracefully).
 */
export async function getDb(): Promise<Client | null> {
  const target = resolveTarget();
  if (client && readyKey === target.key) return client;
  if (target.local && localFailureKey === target.key) return null;
  if (pending && pending.key === target.key) return pending.promise;

  const promise = openTarget(target);
  pending = { key: target.key, promise };
  try {
    return await promise;
  } finally {
    if (pending && pending.key === target.key) pending = null;
  }
}

async function openTarget(target: DbTarget): Promise<Client | null> {
  let created: Client | null = null;
  try {
    if (target.local && target.path) {
      mkdirSync(dirname(target.path), { recursive: true });
    }
    created = createClient({ url: target.url, authToken: target.authToken });
    if (target.local) await created.execute("PRAGMA busy_timeout = 5000");
    await created.batch(DDL_STATEMENTS, "write");
    // Legacy files predate the CMS avatar columns and account-owned reviews.
    await ensureColumns(created, "users", [
      ["avatar_preset_id", "TEXT"],
      ["avatar_url", "TEXT"],
    ]);
    await ensureColumns(created, "reviews", [
      ["author_id", "TEXT"],
      ["booking_paid_at", "TEXT"],
    ]);
    // Must run after ensureColumns: older tables have no author_id yet.
    await created.execute(
      "CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id, created_at DESC)"
    );
    client = created;
    readyKey = target.key;
    localFailureKey = null;
    return created;
  } catch (error) {
    if (target.local) localFailureKey = target.key;
    if (created) {
      try {
        created.close();
      } catch {
        // Already unusable — nothing to release.
      }
    }
    console.error("[sqlite-store] db unavailable", {
      remote: target.local ? false : true,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Interactive write transaction: BEGIN → fn → COMMIT, or ROLLBACK + rethrow. */
export async function withTransaction<T>(
  fn: (db: SqlExecutor) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("db unavailable");
  const tx = await db.transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // Transaction already gone — surface the original error instead.
    }
    throw error;
  } finally {
    try {
      await tx.close();
    } catch {
      // Already closed by commit/rollback.
    }
  }
}

/** All rows for a statement, typed by the caller. */
export async function queryRows<T = Record<string, unknown>>(
  db: SqlExecutor,
  sql: string,
  args: InArgs = []
): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as unknown as T[];
}

/** First row or `null` — the async replacement for `.get()`. */
export async function queryRow<T = Record<string, unknown>>(
  db: SqlExecutor,
  sql: string,
  args: InArgs = []
): Promise<T | null> {
  const rows = await queryRows<T>(db, sql, args);
  return rows[0] ?? null;
}

/** Executes a write; returns the affected row count (`.changes`). */
export async function runStatement(
  db: SqlExecutor,
  sql: string,
  args: InArgs = []
): Promise<number> {
  const result = await db.execute({ sql, args });
  return result.rowsAffected;
}

export type { InArgs, InStatement };
