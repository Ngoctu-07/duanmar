import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

// ---- libSQL store (own temp DB; fresh module instance via query-string import) ----
const tempDir = mkdtempSync(join(tmpdir(), "likes-test-"));
const dbFile = join(tempDir, "test-likes.db");
process.env.ARTICLE_LIKES_DB_PATH = dbFile;

const db = await import("../../src/lib/article-likes-db.ts");
const store = await import("../../src/lib/db/sqlite-store.ts");

await check("D1 increment starts at 1 and increments atomically", async () => {
  assert.equal(await db.incrementArticleLike("starup"), 1);
  assert.equal(await db.incrementArticleLike("starup"), 2);
  assert.equal(await db.incrementArticleLike("starup"), 3);
});

await check("D2 batch counts: known slug present, unknown absent (=0)", async () => {
  await db.incrementArticleLike("ha-giang-loop");
  const counts = await db.getArticleLikeCounts(["starup", "ha-giang-loop", "never-liked"]);
  assert.equal(counts.get("starup"), 3);
  assert.equal(counts.get("ha-giang-loop"), 1);
  assert.equal(counts.has("never-liked"), false);
});

await check("D3 invalid slug rejected", async () => {
  await assert.rejects(() => db.incrementArticleLike("BAD SLUG!"), /invalid slug/);
  await assert.rejects(() => db.incrementArticleLike("../../etc/passwd"), /invalid slug/);
  assert.equal((await db.getArticleLikeCounts(["BAD!", "also bad"])).size, 0);
});

await check("D4 empty/invalid slug list → empty map, no query", async () => {
  assert.equal((await db.getArticleLikeCounts([])).size, 0);
  assert.equal((await db.getArticleLikeCounts(["BAD SLUG", "also bad!"])).size, 0);
});

const rawDb = await store.getDb();
if (!rawDb) throw new Error("expected a connection for the temp DB");

const rawVotes = async (slug: string) => {
  const row = await store.queryRow<{ n: number }>(
    rawDb,
    "SELECT COUNT(*) AS n FROM like_votes WHERE slug = ?",
    [slug]
  );
  return Number(row?.n ?? 0);
};
const rawCount = async (slug: string) => {
  const row = await store.queryRow<{ count?: number }>(
    rawDb,
    "SELECT count FROM likes WHERE slug = ?",
    [slug]
  );
  return Number(row?.count ?? 0);
};

const visitorA = crypto.randomUUID();
const visitorB = crypto.randomUUID();
const visitorC = crypto.randomUUID();

await check("T1 toggle validates slug and visitor", async () => {
  await assert.rejects(() => db.toggleArticleLike("BAD SLUG!", visitorA), /invalid slug/);
  await assert.rejects(() => db.toggleArticleLike("../../etc/passwd", visitorA), /invalid slug/);
  await assert.rejects(() => db.toggleArticleLike("starup", "not-a-uuid"), /invalid visitor/);
  await assert.rejects(() => db.toggleArticleLike("starup", ""), /invalid visitor/);
});

await check("T2 like → unlike → re-like, empty row cleaned at 0", async () => {
  assert.deepEqual(await db.toggleArticleLike("round-trip", visitorA), {
    count: 1,
    isLiked: true,
  });
  assert.deepEqual(await db.toggleArticleLike("round-trip", visitorA), {
    count: 0,
    isLiked: false,
  });
  assert.equal((await db.getArticleLikeCounts(["round-trip"])).has("round-trip"), false);
  assert.equal(await rawVotes("round-trip"), 0);
  assert.equal(await rawCount("round-trip"), 0);
  assert.deepEqual(await db.toggleArticleLike("round-trip", visitorA), {
    count: 1,
    isLiked: true,
  });
});

await check("T3 visitor isolation: A unlikes, B stays liked, count correct", async () => {
  assert.deepEqual(await db.toggleArticleLike("iso-slug", visitorA), {
    count: 1,
    isLiked: true,
  });
  assert.deepEqual(await db.toggleArticleLike("iso-slug", visitorB), {
    count: 2,
    isLiked: true,
  });
  assert.deepEqual(await db.toggleArticleLike("iso-slug", visitorA), {
    count: 1,
    isLiked: false,
  });
  assert.equal((await db.getVisitorLikedSlugs(["iso-slug"], visitorB)).get("iso-slug"), true);
  assert.equal((await db.getVisitorLikedSlugs(["iso-slug"], visitorA)).get("iso-slug"), false);
});

await check("T4 stale count=0 with a vote → unlike floors at 0", async () => {
  await db.toggleArticleLike("floor-slug", visitorC);
  await store.runStatement(rawDb, "UPDATE likes SET count = 0 WHERE slug = 'floor-slug'");
  assert.deepEqual(await db.toggleArticleLike("floor-slug", visitorC), {
    count: 0,
    isLiked: false,
  });
  assert.equal(await rawVotes("floor-slug"), 0);
  assert.equal((await db.getArticleLikeCounts(["floor-slug"])).has("floor-slug"), false);
});

await check("T5 invariant: likes.count == COUNT(like_votes) after mixed sequence", async () => {
  const sequence: Array<[string, string]> = [
    ["inv-a", visitorA],
    ["inv-b", visitorA],
    ["inv-a", visitorB],
    ["inv-b", visitorB],
    ["inv-a", visitorC],
    ["inv-a", visitorA],
    ["inv-b", visitorC],
    ["inv-b", visitorA],
    ["inv-a", visitorC],
    ["inv-b", visitorB],
  ];
  for (const [slug, visitor] of sequence) await db.toggleArticleLike(slug, visitor);
  for (const slug of ["inv-a", "inv-b"]) {
    const votes = await rawVotes(slug);
    assert.equal((await db.getArticleLikeCounts([slug])).get(slug) ?? 0, votes, `${slug} count drift`);
    assert.equal(await rawCount(slug), votes, `${slug} likes row drift`);
    const present = await store.queryRow(rawDb, "SELECT 1 AS present FROM likes WHERE slug = ?", [
      slug,
    ]);
    assert.equal(votes > 0, present !== null, `${slug} empty row not cleaned`);
  }
});

await check("T6 getVisitorLikedSlugs: batch, unknown false, invalid visitor all false", async () => {
  const liked = await db.getVisitorLikedSlugs(
    ["iso-slug", "round-trip", "never-toggled", "BAD!"],
    visitorA
  );
  assert.equal(liked.get("iso-slug"), false);
  assert.equal(liked.get("round-trip"), true);
  assert.equal(liked.get("never-toggled"), false);
  assert.equal(liked.has("BAD!"), false);
  assert.equal((await db.getVisitorLikedSlugs(["round-trip"], null)).get("round-trip"), false);
  assert.equal(
    (await db.getVisitorLikedSlugs(["round-trip"], "not-a-uuid")).get("round-trip"),
    false
  );
  assert.equal((await db.getVisitorLikedSlugs([], visitorA)).size, 0);
});

// degrade path: fresh module instance pointed at an impossible path (file where a dir must go)
const blockerFile = join(tempDir, "blocker");
writeFileSync(blockerFile, "not a directory");
process.env.ARTICLE_LIKES_DB_PATH = join(blockerFile, "nested", "x.db");
const degraded = await import(
  `${pathToFileURL(join(process.cwd(), "src", "lib", "article-likes-db.ts")).href}?degrade=1`
);

await check("D5 unavailable FS → degrade: readers empty, writers throw", async () => {
  assert.equal((await degraded.getArticleLikeCounts(["starup"])).size, 0);
  assert.equal((await degraded.getVisitorLikedSlugs(["starup"], visitorA)).size, 0);
  await assert.rejects(() => degraded.incrementArticleLike("starup"), /db unavailable/);
  await assert.rejects(() => degraded.toggleArticleLike("starup", visitorA), /db unavailable/);
});

delete process.env.ARTICLE_LIKES_DB_PATH;
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
