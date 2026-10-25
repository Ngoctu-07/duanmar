#!/usr/bin/env npx tsx
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { DDL_STATEMENTS } from "../src/lib/db/sqlite-store.ts";

/**
 * Copies the local SQLite database into a remote Turso database.
 *
 *   TURSO_DATABASE_URL=libsql://<db>.turso.io \
 *   TURSO_AUTH_TOKEN=<token> \
 *   npm run migrate:turso
 *
 * Why: `data/` is gitignored, so the accounts/bookings/vouchers created on a
 * developer machine never reach Vercel. Run this once after creating the Turso
 * database to bring existing local rows across. Rows are upserted (INSERT OR
 * REPLACE), so re-running the script is safe and idempotent.
 *
 * Source: VN_INTERACTIONS_DB_PATH / ARTICLE_LIKES_DB_PATH / data/article-likes.db
 * Target: TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN). A `file:` target is accepted
 * for dry runs against a scratch database.
 */

const TABLES = [
  "users",
  "likes",
  "like_votes",
  "reviews",
  "vouchers",
  "bookings",
  "password_reset_otps",
] as const;

const CHUNK = 200;

const sourcePath = resolve(
  process.env.VN_INTERACTIONS_DB_PATH ||
    process.env.ARTICLE_LIKES_DB_PATH ||
    join(process.cwd(), "data", "article-likes.db")
);

const targetUrl = process.env.TURSO_DATABASE_URL?.trim();
if (!targetUrl) {
  console.error(
    "Missing TURSO_DATABASE_URL — set it to your Turso database URL (libsql://…)."
  );
  process.exit(1);
}
if (!existsSync(sourcePath)) {
  console.error(`Source database not found: ${sourcePath}`);
  process.exit(1);
}

const source = createClient({ url: `file:${sourcePath}` });
const target = createClient({
  url: targetUrl,
  authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
});

const mask = (value: string) => (value.startsWith("file:") ? value : "remote (Turso)");

async function tableNames(client: Client): Promise<Set<string>> {
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
  return new Set(result.rows.map((row) => String(row.name)));
}

async function copyTable(table: string, sourceCount: number): Promise<number> {
  if (sourceCount === 0) return 0;
  const { columns } = await source.execute(`SELECT * FROM ${table}`);
  if (columns.length === 0) return 0;
  const columnList = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const insert = `INSERT OR REPLACE INTO ${table} (${columnList}) VALUES (${placeholders})`;
  const rows = await source.execute(`SELECT * FROM ${table}`);

  for (let index = 0; index < rows.rows.length; index += CHUNK) {
    const slice = rows.rows.slice(index, index + CHUNK);
    await target.batch(
      slice.map((row) => ({
        sql: insert,
        args: columns.map((column) => row[column] as string | number | null),
      })),
      "write"
    );
  }
  return rows.rows.length;
}

async function main() {
  console.log(`source: ${sourcePath}`);
  console.log(`target: ${mask(targetUrl!)}`);

  const sourceTables = await tableNames(source);
  await target.batch(DDL_STATEMENTS, "write");
  const targetTables = await tableNames(target);

  for (const table of TABLES) {
    if (!sourceTables.has(table) || !targetTables.has(table)) {
      console.log(`skip   ${table} (missing on one side)`);
      continue;
    }
    const localCount = Number(
      (await source.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0]?.n ?? 0
    );
    const copied = await copyTable(table, localCount);
    const remoteCount = Number(
      (await target.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0]?.n ?? 0
    );
    const flag = remoteCount >= copied ? "ok" : "MISMATCH";
    console.log(
      `${flag.padEnd(8)} ${table.padEnd(20)} source=${String(localCount).padStart(4)} copied=${String(
        copied
      ).padStart(4)} target=${remoteCount}`
    );
  }
  console.log("\nDone. Set the same TURSO_DATABASE_URL/TURSO_AUTH_TOKEN on Vercel.");
}

try {
  await main();
} finally {
  source.close();
  target.close();
}
