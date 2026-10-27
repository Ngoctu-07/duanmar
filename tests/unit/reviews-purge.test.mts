import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { purgeReviews, resolveDbTarget } from "../../scripts/purge-reviews.mjs";

/**
 * P1–P5 cover the one-time purge script: dry-run is read-only, apply empties
 * every rating table, the deleted rows are backed up first, every affected tour
 * reads back as averageRating 0 / totalReviews 0, and the schema + CHECK
 * constraint stay usable for future submissions.
 */

let passed = 0;
let failed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const tempDir = mkdtempSync(join(tmpdir(), "reviews-purge-test-"));
const dbPath = join(tempDir, "purge.db");
const url = `file:${dbPath}`;
const backupDir = join(tempDir, "backups");

const client = createClient({ url });
await client.batch(
  [
    `CREATE TABLE reviews (
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
      updated_at TEXT NOT NULL
    )`,
    "CREATE TABLE ratings (slug TEXT PRIMARY KEY, score REAL NOT NULL, total INTEGER NOT NULL)",
  ],
  "write"
);
const insert =
  "INSERT INTO reviews (reference, tour_slug, booking_reference, visitor, author_id, " +
  "author_name, author_email, rating, comment, images, created_at, updated_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)";
const seed = [
  ["VN-1:hcm", "hcm", "VN-1", 5],
  ["VN-2:hcm", "hcm", "VN-2", 4],
  ["VN-3:dn", "dn", "VN-3", 3],
];
for (const [reference, slug, booking, rating] of seed) {
  await client.execute({
    sql: insert,
    args: [reference, slug, booking, "visitor", null, "Probe", "p@example.com", rating, "ok", "2026-10-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z"],
  });
}
await client.execute("INSERT INTO ratings (slug, score, total) VALUES ('hcm', 4.5, 2)");

await check("P1 dry-run reports counts and deletes nothing", async () => {
  const lines: string[] = [];
  const result = await purgeReviews({ url, apply: false, backupDir, log: (l) => lines.push(l) });
  assert.equal(result.applied, false);
  assert.equal(result.deleted, 0);
  assert.equal(result.before.reviews, 3);
  assert.equal(result.before.ratings, 1);
  assert.deepEqual(
    result.tours.map((tour) => [tour.slug, tour.count]),
    [["dn", 1], ["hcm", 2]]
  );
  assert.equal((await client.execute("SELECT COUNT(*) AS n FROM reviews")).rows[0].n, 3);
  assert.ok(lines.some((line) => line.includes("hcm")));
});

await check("P2 apply empties reviews + ratings and resets every tour to 0", async () => {
  const result = await purgeReviews({ url, apply: true, backupDir });
  assert.equal(result.applied, true);
  assert.equal(result.deleted, 3);
  assert.deepEqual(result.after, { reviews: 0, ratings: 0 });
  assert.deepEqual(
    result.tours.map((tour) => [tour.slug, tour.avg]),
    [["dn", 3], ["hcm", 4.5]]
  );
  assert.equal((await client.execute("SELECT COUNT(*) AS n FROM reviews")).rows[0].n, 0);
  assert.equal((await client.execute("SELECT COUNT(*) AS n FROM ratings")).rows[0].n, 0);
  const aggregate = await client.execute("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews");
  assert.equal(aggregate.rows[0].n, 0);
  assert.equal(aggregate.rows[0].avg, null);
});

await check("P3 deleted rows were backed up before the purge", async () => {
  const names = readdirSync(backupDir).filter((name) => name.startsWith("reviews-"));
  assert.equal(names.length, 1);
  const rows = JSON.parse(readFileSync(join(backupDir, names[0]), "utf8"));
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row: { reference: string }) => row.reference).sort(),
    ["VN-1:hcm", "VN-2:hcm", "VN-3:dn"]
  );
});

await check("P4 submission logic still works after the purge (schema + CHECK intact)", async () => {
  await client.execute({
    sql: insert,
    args: ["VN-9:hcm", "hcm", "VN-9", "visitor", null, "New", "n@example.com", 5, "fresh", "2026-10-27T00:00:00.000Z", "2026-10-27T00:00:00.000Z"],
  });
  const rows = await client.execute("SELECT reference, rating FROM reviews");
  assert.deepEqual(rows.rows.map((row) => [row.reference, row.rating]), [["VN-9:hcm", 5]]);
  await assert.rejects(
    () =>
      client.execute({
        sql: insert,
        args: ["BAD:hcm", "hcm", "BAD", "visitor", null, "Bad", "b@example.com", 6, "x", "2026-10-27T00:00:00.000Z", "2026-10-27T00:00:00.000Z"],
      }),
    /CHECK constraint/i
  );
  await client.execute("DELETE FROM reviews");
});

await check("P5 --no-backup skips the dump; target resolution prefers Turso", async () => {
  const result = await purgeReviews({ url, apply: true, backupDir: null });
  assert.equal(result.backupPath, null);
  assert.deepEqual(
    resolveDbTarget({ TURSO_DATABASE_URL: "libsql://x", TURSO_AUTH_TOKEN: "t" }),
    { url: "libsql://x", authToken: "t" }
  );
  assert.deepEqual(resolveDbTarget({ VN_INTERACTIONS_DB_PATH: "custom.db" }), {
    url: "file:custom.db",
    authToken: undefined,
  });
});

client.close();
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows may keep the SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
