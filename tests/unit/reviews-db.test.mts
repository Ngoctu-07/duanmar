import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ReviewInput } from "../../src/lib/reviews-validation.ts";

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

const tempDir = mkdtempSync(join(tmpdir(), "reviews-db-test-"));
process.env.VN_INTERACTIONS_DB_PATH = join(tempDir, "reviews.db");
delete process.env.ARTICLE_LIKES_DB_PATH;

const db = await import("../../src/lib/reviews-db.ts");
const store = await import("../../src/lib/db/sqlite-store.ts");

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-10-07T12:00:00.000Z";

const input = (overrides: Partial<ReviewInput> = {}): ReviewInput => ({
  reference: "VN-1:hcm",
  tourSlug: "hcm",
  bookingReference: "VN-1",
  authorName: "An Nguyen",
  authorEmail: "an@example.com",
  rating: 4,
  comment: "Great tour",
  images: [],
  ...overrides,
});

const expectStoreError = (fn: () => unknown, code: string) =>
  assert.throws(
    () => fn(),
    (error: unknown) => error instanceof db.ReviewStoreError && error.code === code,
    `expected ReviewStoreError code=${code}`
  );

check("R1 first insert stamps created_at from payload, owned, no PII keys", () => {
  const review = db.upsertReview(input({ createdAt: "2026-10-07T09:30:00.000Z" }), OWNER, NOW);
  assert.equal(review.createdAt, "2026-10-07T09:30:00.000Z");
  assert.equal(review.owned, true);
  assert.equal(review.rating, 4);
  assert.equal("authorEmail" in review, false);
  assert.equal("visitor" in review, false);
});

check("R2 edit within window updates fields but never created_at", () => {
  const edited = db.upsertReview(
    input({ rating: 5, comment: "Better", createdAt: "2026-10-07T11:59:00.000Z" }),
    OWNER, NOW
  );
  assert.equal(edited.createdAt, "2026-10-07T09:30:00.000Z");
  assert.equal(edited.rating, 5);
  assert.equal(edited.comment, "Better");
});

check("R3 non-owner edit → not_owner, row untouched", () => {
  expectStoreError(() => db.upsertReview(input({ rating: 1 }), OTHER, NOW), "not_owner");
  assert.equal(db.listReviewsForSlug("hcm", OWNER)[0].rating, 5);
});

check("R4 window closes exactly at created_at + 3h", () => {
  const justInside = db.upsertReview(input({ rating: 2 }), OWNER, "2026-10-07T12:29:59.999Z");
  assert.equal(justInside.rating, 2);
  expectStoreError(
    () => db.upsertReview(input({ rating: 1 }), OWNER, "2026-10-07T12:30:00.000Z"),
    "window_closed"
  );
  assert.equal(db.listReviewsForSlug("hcm", OWNER)[0].rating, 2);
});

check("R5 migrated createdAt outside window → edit refused, delete still owner-allowed", () => {
  const legacy = { reference: "VN-2:hcm", bookingReference: "VN-2", createdAt: "2026-10-01T00:00:00.000Z" };
  db.upsertReview(input(legacy), OWNER, NOW);
  expectStoreError(
    () => db.upsertReview(input({ ...legacy, rating: 1 }), OWNER, NOW),
    "window_closed"
  );
  assert.deepEqual(db.deleteReview("VN-2:hcm", OWNER), {
    reference: "VN-2:hcm",
    tourSlug: "hcm",
  });
  db.upsertReview(input(legacy), OWNER, NOW);
});

check("R6 list newest first, owned per visitor, no email/visitor serialized", () => {
  db.upsertReview(
    input({ reference: "VN-3:hcm", bookingReference: "VN-3", createdAt: "2026-10-07T10:00:00.000Z" }),
    OWNER, NOW
  );
  const mine = db.listReviewsForSlug("hcm", OWNER);
  assert.deepEqual(
    mine.map((review) => review.reference),
    ["VN-3:hcm", "VN-1:hcm", "VN-2:hcm"]
  );
  assert.ok(mine.every((review) => review.owned));
  assert.ok(db.listReviewsForSlug("hcm", OTHER).every((review) => !review.owned));
  assert.ok(mine.every((review) => !("authorEmail" in review) && !("visitor" in review)));
  assert.deepEqual(db.listReviewsForSlug("dn", OWNER), []);
  assert.throws(() => db.listReviewsForSlug("BAD SLUG", OWNER), /invalid slug/);
});

check("R7 delete is owner-only, 404 unknown, removes the row", () => {
  expectStoreError(() => db.deleteReview("VN-3:hcm", OTHER), "not_owner");
  expectStoreError(() => db.deleteReview("VN-9:hcm", OWNER), "not_found");
  assert.throws(() => db.deleteReview("not-a-reference", OWNER), /invalid reference/);
  assert.deepEqual(db.deleteReview("VN-3:hcm", OWNER), {
    reference: "VN-3:hcm",
    tourSlug: "hcm",
  });
  assert.ok(!db.listReviewsForSlug("hcm", OWNER).some((r) => r.reference === "VN-3:hcm"));
});

check("R8 AVG/COUNT aggregates: ratings 3+4+5 → avg 4, count 3", () => {
  const seeds: Array<[string, number]> = [["BK1", 3], ["BK2", 4], ["BK3", 5]];
  for (const [booking, rating] of seeds) {
    db.upsertReview(
      input({ reference: `${booking}:agg-slug`, tourSlug: "agg-slug", bookingReference: booking, rating }),
      OWNER, NOW
    );
  }
  const aggregates = db.getRatingAggregates(["agg-slug", "no-such-slug", "BAD SLUG"]);
  assert.deepEqual(aggregates.get("agg-slug"), { avg: 4, count: 3 });
  assert.equal(aggregates.has("no-such-slug"), false);
  assert.equal(aggregates.size, 1);
  assert.equal(db.getRatingAggregates([]).size, 0);
  assert.equal(db.getRatingAggregates(["also bad!"]).size, 0);
});

check("R9 storage CHECK constraint rejects rating 0 and 6", () => {
  const raw = store.getDb();
  assert.ok(raw, "expected a connection");
  const insert = raw.prepare(
    "INSERT INTO reviews (reference, tour_slug, booking_reference, visitor, " +
      "author_name, author_email, rating, comment, images, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const rating of [0, 6]) {
    const args = [`X${rating}:hcm`, "hcm", `X${rating}`, OWNER, "Probe", "probe@example.com",
      rating, "probe", "[]", NOW, NOW];
    assert.throws(() => insert.run(...args), /CHECK constraint/i);
  }
  assert.equal(db.listReviewsForSlug("hcm", OWNER).length, 2);
});

// degrade path last: a file where a directory must go latches the shared store
const blockerFile = join(tempDir, "blocker");
writeFileSync(blockerFile, "not a directory");
process.env.VN_INTERACTIONS_DB_PATH = join(blockerFile, "nested", "x.db");
const degraded = await import(
  `${pathToFileURL(join(process.cwd(), "src", "lib", "reviews-db.ts")).href}?degrade=1`
);

check("R10 no DB → list throws, aggregates empty, writes throw db unavailable", () => {
  assert.equal(degraded.getRatingAggregates(["hcm"]).size, 0);
  assert.throws(() => degraded.listReviewsForSlug("hcm", OWNER), /db unavailable/);
  assert.throws(() => degraded.upsertReview(input(), OWNER, NOW), /db unavailable/);
  assert.throws(() => degraded.deleteReview("VN-1:hcm", OWNER), /db unavailable/);
});

delete process.env.VN_INTERACTIONS_DB_PATH;
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the open SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
