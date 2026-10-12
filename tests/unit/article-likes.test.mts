import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

// ---- SQLite store (own temp DB; fresh module instance via query-string import) ----
const tempDir = mkdtempSync(join(tmpdir(), "likes-test-"));
const dbFile = join(tempDir, "test-likes.db");
process.env.ARTICLE_LIKES_DB_PATH = dbFile;

const db = await import("../../src/lib/article-likes-db.ts");
const store = await import("../../src/lib/db/sqlite-store.ts");

check("D1 increment starts at 1 and increments atomically", () => {
  assert.equal(db.incrementArticleLike("starup"), 1);
  assert.equal(db.incrementArticleLike("starup"), 2);
  assert.equal(db.incrementArticleLike("starup"), 3);
});

check("D2 batch counts: known slug present, unknown absent (=0)", () => {
  db.incrementArticleLike("ha-giang-loop");
  const counts = db.getArticleLikeCounts(["starup", "ha-giang-loop", "never-liked"]);
  assert.equal(counts.get("starup"), 3);
  assert.equal(counts.get("ha-giang-loop"), 1);
  assert.equal(counts.has("never-liked"), false);
});

check("D3 invalid slug rejected", () => {
  assert.throws(() => db.incrementArticleLike("BAD SLUG!"), /invalid slug/);
  assert.throws(() => db.incrementArticleLike("../../etc/passwd"), /invalid slug/);
  assert.equal(db.getArticleLikeCounts(["BAD!", "also bad"]).size, 0);
});

check("D4 empty/invalid slug list → empty map, no query", () => {
  assert.equal(db.getArticleLikeCounts([]).size, 0);
  assert.equal(db.getArticleLikeCounts(["BAD SLUG", "also bad!"]).size, 0);
});

const rawDb = store.getDb();
if (!rawDb) throw new Error("expected a connection for the temp DB");
const rawVotes = (slug: string) =>
  Number(
    (rawDb.prepare("SELECT COUNT(*) AS n FROM like_votes WHERE slug = ?").get(slug) as {
      n: number;
    }).n
  );
const rawCount = (slug: string) => {
  const row = rawDb
    .prepare("SELECT count FROM likes WHERE slug = ?")
    .get(slug) as { count?: number } | undefined;
  return Number(row?.count ?? 0);
};

const visitorA = crypto.randomUUID();
const visitorB = crypto.randomUUID();
const visitorC = crypto.randomUUID();

check("T1 toggle validates slug and visitor", () => {
  assert.throws(() => db.toggleArticleLike("BAD SLUG!", visitorA), /invalid slug/);
  assert.throws(() => db.toggleArticleLike("../../etc/passwd", visitorA), /invalid slug/);
  assert.throws(() => db.toggleArticleLike("starup", "not-a-uuid"), /invalid visitor/);
  assert.throws(() => db.toggleArticleLike("starup", ""), /invalid visitor/);
});

check("T2 like → unlike → re-like, empty row cleaned at 0", () => {
  assert.deepEqual(db.toggleArticleLike("round-trip", visitorA), { count: 1, isLiked: true });
  assert.deepEqual(db.toggleArticleLike("round-trip", visitorA), { count: 0, isLiked: false });
  assert.equal(db.getArticleLikeCounts(["round-trip"]).has("round-trip"), false);
  assert.equal(rawVotes("round-trip"), 0);
  assert.equal(rawCount("round-trip"), 0);
  assert.deepEqual(db.toggleArticleLike("round-trip", visitorA), { count: 1, isLiked: true });
});

check("T3 visitor isolation: A unlikes, B stays liked, count correct", () => {
  assert.deepEqual(db.toggleArticleLike("iso-slug", visitorA), { count: 1, isLiked: true });
  assert.deepEqual(db.toggleArticleLike("iso-slug", visitorB), { count: 2, isLiked: true });
  assert.deepEqual(db.toggleArticleLike("iso-slug", visitorA), { count: 1, isLiked: false });
  assert.equal(db.getVisitorLikedSlugs(["iso-slug"], visitorB).get("iso-slug"), true);
  assert.equal(db.getVisitorLikedSlugs(["iso-slug"], visitorA).get("iso-slug"), false);
});

check("T4 stale count=0 with a vote → unlike floors at 0", () => {
  db.toggleArticleLike("floor-slug", visitorC);
  rawDb.prepare("UPDATE likes SET count = 0 WHERE slug = 'floor-slug'").run();
  assert.deepEqual(db.toggleArticleLike("floor-slug", visitorC), { count: 0, isLiked: false });
  assert.equal(rawVotes("floor-slug"), 0);
  assert.equal(db.getArticleLikeCounts(["floor-slug"]).has("floor-slug"), false);
});

check("T5 invariant: likes.count == COUNT(like_votes) after mixed sequence", () => {
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
  for (const [slug, visitor] of sequence) db.toggleArticleLike(slug, visitor);
  for (const slug of ["inv-a", "inv-b"]) {
    const votes = rawVotes(slug);
    assert.equal(db.getArticleLikeCounts([slug]).get(slug) ?? 0, votes, `${slug} count drift`);
    assert.equal(rawCount(slug), votes, `${slug} likes row drift`);
    assert.equal(votes > 0, rawDb
      .prepare("SELECT 1 AS present FROM likes WHERE slug = ?")
      .get(slug) !== undefined, `${slug} empty row not cleaned`);
  }
});

check("T6 getVisitorLikedSlugs: batch, unknown false, invalid visitor all false", () => {
  const liked = db.getVisitorLikedSlugs(
    ["iso-slug", "round-trip", "never-toggled", "BAD!"],
    visitorA
  );
  assert.equal(liked.get("iso-slug"), false);
  assert.equal(liked.get("round-trip"), true);
  assert.equal(liked.get("never-toggled"), false);
  assert.equal(liked.has("BAD!"), false);
  assert.equal(db.getVisitorLikedSlugs(["round-trip"], null).get("round-trip"), false);
  assert.equal(db.getVisitorLikedSlugs(["round-trip"], "not-a-uuid").get("round-trip"), false);
  assert.equal(db.getVisitorLikedSlugs([], visitorA).size, 0);
});

// degrade path: fresh module instance pointed at an impossible path (file where a dir must go)
const blockerFile = join(tempDir, "blocker");
writeFileSync(blockerFile, "not a directory");
process.env.ARTICLE_LIKES_DB_PATH = join(blockerFile, "nested", "x.db");
const degraded = await import(
  `${pathToFileURL(join(process.cwd(), "src", "lib", "article-likes-db.ts")).href}?degrade=1`
);

check("D5 unavailable FS → degrade: readers empty, writers throw", () => {
  assert.equal(degraded.getArticleLikeCounts(["starup"]).size, 0);
  assert.equal(degraded.getVisitorLikedSlugs(["starup"], visitorA).size, 0);
  assert.throws(() => degraded.incrementArticleLike("starup"), /db unavailable/);
  assert.throws(() => degraded.toggleArticleLike("starup", visitorA), /db unavailable/);
});

delete process.env.ARTICLE_LIKES_DB_PATH;
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the open SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
