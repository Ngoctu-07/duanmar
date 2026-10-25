import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

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

const storeUrl = pathToFileURL(join(process.cwd(), "src", "lib", "db", "sqlite-store.ts")).href;
const tempDir = mkdtempSync(join(tmpdir(), "sqlite-store-test-"));

// legacy on-disk shape from plan 260929-2254: only `likes`, with data
const legacyFile = join(tempDir, "legacy.db");
const legacy = new DatabaseSync(legacyFile);
legacy.exec("CREATE TABLE likes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)");
legacy.exec("INSERT INTO likes(slug, count) VALUES('starup', 7)");
legacy.close();

process.env.ARTICLE_LIKES_DB_PATH = legacyFile;
delete process.env.VN_INTERACTIONS_DB_PATH;
delete process.env.TURSO_DATABASE_URL;
const store = await import("../../src/lib/db/sqlite-store.ts");

await check("S1 legacy likes file opens, data intact, new tables created", async () => {
  const db = await store.getDb();
  assert.ok(db, "expected a connection");
  const tables = (
    await store.queryRows<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type = 'table'")
  ).map((row) => row.name);
  for (const name of ["likes", "like_votes", "reviews", "users", "vouchers", "bookings"]) {
    assert.ok(tables.includes(name), `missing table ${name}`);
  }
  const row = await store.queryRow<{ count: number }>(
    db,
    "SELECT count FROM likes WHERE slug = 'starup'"
  );
  assert.equal(row?.count, 7);
});

await check("S2 path resolution: VN_INTERACTIONS_DB_PATH wins, then ARTICLE_LIKES_DB_PATH", () => {
  assert.equal(store.dbPath(), legacyFile);
  process.env.VN_INTERACTIONS_DB_PATH = join(tempDir, "vn.db");
  assert.equal(store.dbPath(), join(tempDir, "vn.db"));
  delete process.env.VN_INTERACTIONS_DB_PATH;
});

// fresh module instance against the same already-migrated file → DDL re-runs
const reopened = await import(`${storeUrl}?idem=1`);

await check("S3 second open of a migrated file is idempotent", async () => {
  const db = await reopened.getDb();
  assert.ok(db, "re-open with DDL should succeed");
  const row = await store.queryRow<{ count: number }>(
    db,
    "SELECT count FROM likes WHERE slug = 'starup'"
  );
  assert.equal(row?.count, 7);
  const tables = (
    await store.queryRows<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type = 'table'")
  ).map((row2) => row2.name);
  assert.ok(tables.includes("like_votes"));
  assert.ok(tables.includes("reviews"));
});

await check("S4 withTransaction commits on success, rolls back on throw", async () => {
  const db = (await store.getDb())!;
  await store.withTransaction(async (tx) => {
    await store.runStatement(tx, "INSERT INTO likes(slug, count) VALUES('committed', 1)");
  });
  const committed = await store.queryRow<{ count: number }>(
    db,
    "SELECT count FROM likes WHERE slug = 'committed'"
  );
  assert.equal(committed?.count, 1);

  await assert.rejects(
    () =>
      store.withTransaction(async (tx) => {
        await store.runStatement(tx, "INSERT INTO likes(slug, count) VALUES('rolled-back', 1)");
        throw new Error("boom");
      }),
    /boom/
  );
  const rolledBack = await store.queryRow(db, "SELECT count FROM likes WHERE slug = 'rolled-back'");
  assert.equal(rolledBack, null);
});

// degrade path: a file where a directory must go (ENOTDIR), fresh module instance
const blockerFile = join(tempDir, "blocker");
writeFileSync(blockerFile, "not a directory");
process.env.ARTICLE_LIKES_DB_PATH = join(blockerFile, "nested", "x.db");
const degraded = await import(`${storeUrl}?degrade=1`);

await check("S5 unusable path → getDb() null, withTransaction throws db unavailable", async () => {
  assert.equal(await degraded.getDb(), null);
  await assert.rejects(() => degraded.withTransaction(async () => 1), /db unavailable/);
});

delete process.env.ARTICLE_LIKES_DB_PATH;
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
