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

// ---- window fakes for the client storage module ----
class FakeStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}
(globalThis as Record<string, unknown>).window = {
  localStorage: new FakeStorage(),
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const likes = await import("../../src/lib/article-likes.ts");

check("L1 fresh store → no liked slugs", () => {
  assert.deepEqual(likes.getLikedArticleSlugs(), []);
  assert.equal(likes.isArticleLiked("starup"), false);
});

check("L2 first mark → true, persisted, liked", () => {
  assert.equal(likes.markArticleLiked("starup"), true);
  assert.equal(likes.isArticleLiked("starup"), true);
  assert.deepEqual(likes.getLikedArticleSlugs(), ["starup"]);
});

check("L3 second mark → false (1 like per browser, no re-vote)", () => {
  assert.equal(likes.markArticleLiked("starup"), false);
  assert.deepEqual(likes.getLikedArticleSlugs(), ["starup"]);
});

check("L4 multiple distinct slugs accumulate", () => {
  assert.equal(likes.markArticleLiked("ha-giang-loop"), true);
  assert.deepEqual(likes.getLikedArticleSlugs(), ["starup", "ha-giang-loop"]);
});

check("L5 corrupted JSON → [] (tolerant)", () => {
  window.localStorage.setItem(likes.LIKED_ARTICLES_STORAGE_KEY, "{not json");
  assert.deepEqual(likes.getLikedArticleSlugs(), []);
});

check("L6 non-array / mixed entries → filtered strings only", () => {
  window.localStorage.setItem(likes.LIKED_ARTICLES_STORAGE_KEY, JSON.stringify({ a: 1 }));
  assert.deepEqual(likes.getLikedArticleSlugs(), []);
  window.localStorage.setItem(
    likes.LIKED_ARTICLES_STORAGE_KEY,
    JSON.stringify(["ok-slug", 42, null, "second"])
  );
  assert.deepEqual(likes.getLikedArticleSlugs(), ["ok-slug", "second"]);
});

// ---- SQLite store (own temp DB; fresh module instance via query-string import) ----
const tempDir = mkdtempSync(join(tmpdir(), "likes-test-"));
const dbFile = join(tempDir, "test-likes.db");
process.env.ARTICLE_LIKES_DB_PATH = dbFile;

const db = await import("../../src/lib/article-likes-db.ts");

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
  // invalid slugs are filtered from batch lookups (no query, no result)
  assert.equal(db.getArticleLikeCounts(["BAD!", "also bad"]).size, 0);
});

check("D4 empty/invalid slug list → empty map, no query", () => {
  assert.equal(db.getArticleLikeCounts([]).size, 0);
  assert.equal(db.getArticleLikeCounts(["BAD SLUG", "also bad!"]).size, 0);
});

// degrade path: fresh module instance pointed at an impossible path (file where a dir must go)
const blockerFile = join(tempDir, "blocker");
writeFileSync(blockerFile, "not a directory");
process.env.ARTICLE_LIKES_DB_PATH = join(blockerFile, "nested", "x.db");
const degraded = await import(
  `${pathToFileURL(join(process.cwd(), "src", "lib", "article-likes-db.ts")).href}?degrade=1`
);

check("D5 read-only/unavailable FS → degrade: counts empty, increment throws", () => {
  assert.equal(degraded.getArticleLikeCounts(["starup"]).size, 0);
  assert.throws(() => degraded.incrementArticleLike("starup"), /db unavailable/);
});

delete process.env.ARTICLE_LIKES_DB_PATH;
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the open SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
