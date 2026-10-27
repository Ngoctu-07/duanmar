#!/usr/bin/env node
/**
 * One-time purge of every review/rating record (task 2026-10-27).
 *
 * Ratings are DERIVED from `reviews` (AVG/COUNT at request time), so deleting
 * every row resets each tour to `averageRating: 0, totalReviews: 0` — there is
 * no denormalized counter column to rewrite. The review/rating schema, the
 * write API and the owner-delete flow are left untouched: the next submission
 * works exactly as before.
 *
 * Dry-run by default. `--apply` writes; the deleted rows are first dumped to
 * `data/purge-backups/` (gitignored) unless `--no-backup` is passed.
 *
 * Usage:
 *   node scripts/purge-reviews.mjs               # dry-run (prints counts)
 *   node scripts/purge-reviews.mjs --apply       # purge + local backup
 *   node scripts/purge-reviews.mjs --apply --no-backup
 *   VN_INTERACTIONS_DB_PATH=... node scripts/purge-reviews.mjs --apply
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

/** Tables that hold user ratings; `reviews` is the only one the app writes. */
const RATING_TABLES = ["reviews", "ratings", "tour_ratings"];

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Same target precedence as `src/lib/db/sqlite-store.ts`. */
export function resolveDbTarget(env = process.env) {
  const remote = env.TURSO_DATABASE_URL?.trim();
  if (remote) {
    return { url: remote, authToken: env.TURSO_AUTH_TOKEN?.trim() || undefined };
  }
  const path =
    env.VN_INTERACTIONS_DB_PATH ||
    env.ARTICLE_LIKES_DB_PATH ||
    join(process.cwd(), "data", "article-likes.db");
  return { url: `file:${path}`, authToken: undefined };
}

async function existingTables(client) {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table'"
  );
  return new Set(result.rows.map((row) => String(row.name)));
}

async function countRows(client, table) {
  const result = await client.execute(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Purge every review/rating row.
 * @param {{url: string, authToken?: string, apply?: boolean, backupDir?: string|null, log?: (line: string) => void}} options
 */
export async function purgeReviews({
  url,
  authToken,
  apply = false,
  backupDir = null,
  log = () => {},
}) {
  const client = createClient({ url, authToken });
  try {
    const tables = await existingTables(client);
    const targets = RATING_TABLES.filter((table) => tables.has(table));
    const before = {};
    for (const table of targets) before[table] = await countRows(client, table);

    const total = before.reviews ?? 0;
    const tours =
      total > 0 && targets.includes("reviews")
        ? (
            await client.execute(
              "SELECT tour_slug, COUNT(*) AS n, AVG(rating) AS avg " +
                "FROM reviews GROUP BY tour_slug ORDER BY tour_slug"
            )
          ).rows.map((row) => ({
            slug: String(row.tour_slug),
            count: Number(row.n),
            avg: Number(row.avg),
          }))
        : [];

    log(`reviews rows: ${total}`);
    for (const tour of tours) {
      log(`  before  ${tour.slug}: ${tour.count} review(s), avg ${tour.avg.toFixed(2)}`);
    }

    if (!apply) {
      return { applied: false, before, tours, deleted: 0, backupPath: null };
    }

    let backupPath = null;
    if (backupDir && total > 0) {
      mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupPath = join(backupDir, `reviews-${stamp}.json`);
      const rows = (await client.execute("SELECT * FROM reviews")).rows;
      writeFileSync(backupPath, JSON.stringify(rows, null, 2), { mode: 0o600 });
      log(`backup: ${backupPath} (${rows.length} row(s))`);
    }

    for (const table of targets) {
      if (before[table] > 0) await client.execute(`DELETE FROM ${table}`);
    }

    const after = {};
    for (const table of targets) after[table] = await countRows(client, table);
    const remaining = Object.values(after).reduce((sum, n) => sum + n, 0);
    if (remaining !== 0) {
      throw new Error(`purge incomplete: ${JSON.stringify(after)}`);
    }

    log(`after: ${targets.map((t) => `${t}=0`).join(" ") || "no rating tables"}`);
    for (const tour of tours) {
      log(`  reset   ${tour.slug}: averageRating 0, totalReviews 0`);
    }

    return { applied: true, before, tours, after, deleted: total, backupPath };
  } finally {
    client.close();
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const noBackup = process.argv.includes("--no-backup");
  const env = {
    TURSO_DATABASE_URL: envValue("TURSO_DATABASE_URL"),
    TURSO_AUTH_TOKEN: envValue("TURSO_AUTH_TOKEN"),
    VN_INTERACTIONS_DB_PATH: envValue("VN_INTERACTIONS_DB_PATH"),
    ARTICLE_LIKES_DB_PATH: envValue("ARTICLE_LIKES_DB_PATH"),
  };
  const target = resolveDbTarget(env);
  const remote = !target.url.startsWith("file:");
  console.log(`target: ${remote ? "remote Turso" : target.url}`);
  console.log(`mode:   ${apply ? "APPLY" : "dry-run"}`);

  const result = await purgeReviews({
    ...target,
    apply,
    backupDir: noBackup ? null : join(process.cwd(), "data", "purge-backups"),
    log: console.log,
  });
  if (!apply) {
    console.log("dry-run: nothing deleted (re-run with --apply)");
  } else {
    console.log(`deleted ${result.deleted} review row(s)`);
  }
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
