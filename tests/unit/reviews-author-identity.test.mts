import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReviewInput } from "../../src/lib/reviews-validation.ts";

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

const tempDir = mkdtempSync(join(tmpdir(), "reviews-identity-test-"));
process.env.VN_INTERACTIONS_DB_PATH = join(tempDir, "reviews-identity.db");
delete process.env.ARTICLE_LIKES_DB_PATH;
delete process.env.TURSO_DATABASE_URL;

const db = await import("../../src/lib/reviews-db.ts");
const store = await import("../../src/lib/db/sqlite-store.ts");
const users = await import("../../src/lib/auth/user-store.ts");

const NOW = "2026-10-28T12:00:00.000Z";
const GUEST_A = "guest-a";
const GUEST_B = "guest-b";
const GUEST_C = "guest-c";

const input = (overrides: Partial<ReviewInput> = {}): ReviewInput => ({
  reference: "BK-1:identity",
  tourSlug: "identity",
  bookingReference: "BK-1",
  rating: 4,
  comment: "Identity probe",
  images: [],
  ...overrides,
});

const byReference = (rows: Awaited<ReturnType<typeof db.listReviewsForSlug>>) =>
  new Map(rows.map((row) => [row.reference, row]));

await check("guest pseudonyms are ordered by booking completion, not insert order", async () => {
  // Insert B first, then A (older booking), then C. A must still be Decoder 01.
  await db.upsertReview(
    input({
      reference: "BK-B:identity",
      bookingReference: "BK-B",
      bookingPaidAt: "2026-10-02T09:00:00.000Z",
    }),
    GUEST_B,
    NOW
  );
  await db.upsertReview(
    input({
      reference: "BK-A:identity",
      bookingReference: "BK-A",
      bookingPaidAt: "2026-10-01T09:00:00.000Z",
    }),
    GUEST_A,
    NOW
  );
  await db.upsertReview(
    input({
      reference: "BK-C:identity",
      bookingReference: "BK-C",
      bookingPaidAt: "2026-10-03T09:00:00.000Z",
    }),
    GUEST_C,
    NOW
  );

  const rows = byReference(await db.listReviewsForSlug("identity", GUEST_A));
  assert.equal(rows.get("BK-A:identity")?.authorName, "Decoder 01");
  assert.equal(rows.get("BK-B:identity")?.authorName, "Decoder 02");
  assert.equal(rows.get("BK-C:identity")?.authorName, "Decoder 03");
  assert.equal(rows.get("BK-A:identity")?.guestNumber, 1);
  assert.equal(rows.get("BK-B:identity")?.guestNumber, 2);
  assert.equal(rows.get("BK-C:identity")?.guestNumber, 3);
  for (const row of rows.values()) {
    assert.equal(row.isGuest, true);
    assert.equal(row.authorAvatarUrl, null);
    assert.equal("authorEmail" in row, false);
    assert.equal("visitor" in row, false);
  }
});

await check("one guest visitor keeps the same pseudonym across tours", async () => {
  const review = await db.upsertReview(
    input({
      reference: "BK-A2:identity-two",
      tourSlug: "identity-two",
      bookingReference: "BK-A2",
      bookingPaidAt: "2026-10-04T09:00:00.000Z",
    }),
    GUEST_A,
    NOW
  );
  assert.equal(review.authorName, "Decoder 01");
  assert.equal(review.guestNumber, 1);
});

await check("registered reviews join live name and avatar and never store a snapshot", async () => {
  const created = await users.createUser({
    email: "identity-live@example.test",
    name: "Live Account",
    password: "identity-password-123",
  });
  assert.equal(created.ok, true);
  const account = created.ok ? created.user : null;
  assert.ok(account);

  const written = await db.upsertReview(
    input({
      reference: "BK-R:account",
      tourSlug: "account",
      bookingReference: "BK-R",
    }),
    "guest-r",
    NOW,
    account.id
  );
  assert.equal(written.authorName, "Live Account");
  assert.equal(written.authorAvatarUrl, null);
  assert.equal(written.isGuest, false);
  assert.equal(written.guestNumber, null);
  assert.equal(written.authorId, account.id);

  const raw = await store.getDb();
  assert.ok(raw);
  const row = await store.queryRow<{ author_name: string; author_email: string }>(
    raw,
    "SELECT author_name, author_email FROM reviews WHERE reference = ?",
    ["BK-R:account"]
  );
  assert.deepEqual(row, { author_name: "", author_email: "" });
});

await check("updating the account name or avatar updates historical review reads", async () => {
  const account = await users.findUserById(
    (await users.findUserByEmail("identity-live@example.test"))?.id ?? ""
  );
  assert.ok(account);

  const avatarUrl = "https://cdn.sanity.io/images/demo/live-avatar.webp";
  const updated = await users.updateUserAvatar(account.id, {
    presetId: "preset-live",
    url: avatarUrl,
  });
  assert.equal(updated?.avatarUrl, avatarUrl);

  const raw = await store.getDb();
  assert.ok(raw);
  await store.runStatement(raw, "UPDATE users SET name = ? WHERE id = ?", [
    "Renamed Account",
    account.id,
  ]);

  const history = await db.listReviewsForAuthor(account.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].authorName, "Renamed Account");
  assert.equal(history[0].authorAvatarUrl, avatarUrl);
  assert.equal(history[0].isGuest, false);
  assert.equal(history[0].guestNumber, null);
});

await check("guest rows without booking_paid_at fall back to created_at ordering", async () => {
  const late = "guest-late";
  const early = "guest-early";
  await db.upsertReview(
    input({
      reference: "BK-L:fallback",
      tourSlug: "fallback",
      bookingReference: "BK-L",
      createdAt: "2026-10-20T09:00:00.000Z",
    }),
    late,
    NOW
  );
  await db.upsertReview(
    input({
      reference: "BK-E:fallback",
      tourSlug: "fallback",
      bookingReference: "BK-E",
      createdAt: "2026-10-10T09:00:00.000Z",
    }),
    early,
    NOW
  );
  const rows = byReference(await db.listReviewsForSlug("fallback", early));
  assert.equal(rows.get("BK-E:fallback")?.authorName, "Decoder 04");
  assert.equal(rows.get("BK-L:fallback")?.authorName, "Decoder 05");
});

try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle locked — temp cleanup is best-effort.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
