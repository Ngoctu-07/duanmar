import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Credentials + voucher wallet contracts. Runs against a throwaway SQLite file
 * so the real `data/article-likes.db` is never touched.
 */
const dir = mkdtempSync(join(tmpdir(), "duanmar-auth-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");
delete process.env.TURSO_DATABASE_URL;

const { hashPassword, verifyPassword } = await import("../../src/lib/auth/password.ts");
const { authenticate, createUser, findUserByEmail, normalizeEmail } = await import(
  "../../src/lib/auth/user-store.ts"
);
const {
  claimVoucher,
  countVouchersByPromotion,
  findVoucher,
  generateVoucherCode,
  isValidPromotionId,
  listVouchers,
} = await import("../../src/lib/vouchers/voucher-store.ts");

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

/* --- password hashing --- */

await check("hashPassword produces a tagged scrypt hash that verifies", async () => {
  const stored = hashPassword("correct horse battery");
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(verifyPassword("correct horse battery", stored), true);
  assert.equal(verifyPassword("wrong password", stored), false);
});

await check("verifyPassword fails closed on malformed/empty input", async () => {
  assert.equal(verifyPassword("x", ""), false);
  assert.equal(verifyPassword("x", null), false);
  assert.equal(verifyPassword("x", "bcrypt$aa$bb"), false);
  assert.equal(verifyPassword("x", "scrypt$aa$bb"), false);
});

await check("identical passwords hash differently (per-user salt)", async () => {
  assert.notEqual(hashPassword("same-password"), hashPassword("same-password"));
});

/* --- user store --- */

await check("createUser normalizes email and hides the password hash", async () => {
  const result = await createUser({
    email: "  Visitor@DuanMar.TEST ",
    name: "  Lan Nguyen ",
    password: "hunter2-hunter2",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.user.email, "visitor@duanmar.test");
  assert.equal(result.user.name, "Lan Nguyen");
  assert.equal((result.user as Record<string, unknown>).passwordHash, undefined);
  assert.equal(normalizeEmail("  A@B.CO "), "a@b.co");
  assert.ok(await findUserByEmail("VISITOR@duanmar.TEST"));
});

await check("duplicate email returns a typed duplicate code", async () => {
  const result = await createUser({
    email: "visitor@duanmar.test",
    name: "Other",
    password: "another-password",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "duplicate");
});

await check("authenticate accepts the right password and rejects the rest", async () => {
  assert.equal(
    (await authenticate("visitor@duanmar.test", "hunter2-hunter2"))?.email,
    "visitor@duanmar.test"
  );
  assert.equal(await authenticate("visitor@duanmar.test", "nope-nope-nope"), null);
  assert.equal(await authenticate("missing@duanmar.test", "hunter2-hunter2"), null);
  assert.equal(await authenticate("", ""), null);
});

/* --- vouchers --- */

const user = await findUserByEmail("visitor@duanmar.test");
assert.ok(user, "seed user missing");

const promotion = {
  promotionId: "promo-abc",
  title: "Early bird: winter escapes",
  description: "Book by 31 Dec.",
  price: "1.500.000\u00a0₫",
  originalPrice: "2.000.000\u00a0₫",
  badge: "20% OFF",
  validUntil: "2026-12-31",
  tourSlug: "hcm",
};

await check("claimVoucher stores a full snapshot", async () => {
  const result = await claimVoucher(user.id, promotion, "2026-10-22T10:00:00.000Z");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.created, true);
  assert.equal(result.voucher.title, promotion.title);
  assert.equal(result.voucher.tourSlug, "hcm");
  assert.equal(result.voucher.validUntil, "2026-12-31");
  assert.equal(result.voucher.claimedAt, "2026-10-22T10:00:00.000Z");
  assert.match(result.voucher.code, /^DUAN-[0-9A-F]{6}$/);
});

await check("claiming the same promotion twice is idempotent", async () => {
  const first = await listVouchers(user.id);
  const again = await claimVoucher(user.id, promotion, "2026-10-23T10:00:00.000Z");
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.created, false);
  assert.equal(again.voucher.id, first[0].id);
  assert.equal((await listVouchers(user.id)).length, 1);
});

await check("explicit promo code wins; invalid codes fall back to generated", async () => {
  const explicit = await claimVoucher(
    user.id,
    { ...promotion, promotionId: "promo-code", promoCode: "tet-2027-sale" },
    "2026-10-22T10:00:00.000Z"
  );
  assert.equal(explicit.ok, true);
  if (explicit.ok) assert.equal(explicit.voucher.code, "TET-2027-SALE");

  const invalid = await claimVoucher(
    user.id,
    { ...promotion, promotionId: "promo-bad-code", promoCode: "!!" },
    "2026-10-22T10:00:00.000Z"
  );
  assert.equal(invalid.ok, true);
  if (invalid.ok) assert.equal(invalid.voucher.code, generateVoucherCode("promo-bad-code"));
});

await check("wallet lists newest claims first", async () => {
  const rows = await listVouchers(user.id);
  assert.equal(rows.length, 3);
  assert.ok(rows[0].claimedAt >= rows[1].claimedAt);
});

await check("claimVoucher rejects missing ids and unknown tour slugs", async () => {
  assert.equal((await claimVoucher(user.id, { promotionId: "", title: "x" })).ok, false);
  assert.equal((await claimVoucher(user.id, { promotionId: "bad id!", title: "x" })).ok, false);
  assert.equal((await claimVoucher(user.id, { promotionId: "p-1", title: "" })).ok, false);

  const unsafeSlug = await claimVoucher(user.id, {
    ...promotion,
    promotionId: "promo-slug",
    tourSlug: "../../etc/passwd",
  });
  assert.equal(unsafeSlug.ok, true);
  if (unsafeSlug.ok) assert.equal(unsafeSlug.voucher.tourSlug, null);
});

await check("generateVoucherCode is deterministic and per-promotion", async () => {
  assert.equal(generateVoucherCode("promo-abc"), generateVoucherCode("promo-abc"));
  assert.notEqual(generateVoucherCode("promo-abc"), generateVoucherCode("promo-xyz"));
});

/* --- slot capacity --- */

await check("countVouchersByPromotion counts live claims per promotion, ignores bad ids", async () => {
  const counts = await countVouchersByPromotion([
    "promo-abc",
    "promo-code",
    "bad id!",
    "promo-abc",
  ]);
  assert.equal(counts.get("promo-abc"), 1);
  assert.equal(counts.get("promo-code"), 1);
  assert.equal(counts.has("bad id!"), false);
  assert.equal((await countVouchersByPromotion([])).size, 0);
});

await check("findVoucher returns the wallet row or null", async () => {
  assert.equal((await findVoucher(user.id, "promo-abc"))?.promotionId, "promo-abc");
  assert.equal(await findVoucher(user.id, "promo-unknown"), null);
  assert.equal(await findVoucher(user.id, "bad id!"), null);
  assert.equal(isValidPromotionId("promo-abc"), true);
  assert.equal(isValidPromotionId("bad id!"), false);
});

await check("capacity guard refuses the claim that would exceed maxSlots", async () => {
  const second = await createUser({
    email: "second@duanmar.test",
    name: "Second",
    password: "second-password",
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const limited = { ...promotion, promotionId: "promo-capacity" };
  const first = await claimVoucher(user.id, limited, "2026-10-24T10:00:00.000Z", {
    maxSlots: 1,
    baselineUsed: 0,
  });
  assert.equal(first.ok, true);
  if (first.ok) assert.equal(first.created, true);

  const blocked = await claimVoucher(second.user.id, limited, "2026-10-24T10:00:00.000Z", {
    maxSlots: 1,
    baselineUsed: 0,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, "exhausted");
  assert.equal(await findVoucher(second.user.id, "promo-capacity"), null);

  // Re-claiming an existing wallet row stays idempotent even when sold out.
  const again = await claimVoucher(user.id, limited, "2026-10-25T10:00:00.000Z", {
    maxSlots: 1,
    baselineUsed: 0,
  });
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.created, false);
});

await check("CMS usedCount baseline is subtracted from the available slots", async () => {
  const third = await createUser({
    email: "third@duanmar.test",
    name: "Third",
    password: "third-password",
  });
  assert.equal(third.ok, true);
  if (!third.ok) return;

  const baseline = { ...promotion, promotionId: "promo-baseline" };
  const capacity = { maxSlots: 2, baselineUsed: 1 };
  const allowed = await claimVoucher(third.user.id, baseline, "2026-10-24T10:00:00.000Z", capacity);
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.equal(allowed.created, true);

  const blocked = await claimVoucher(user.id, baseline, "2026-10-24T10:00:00.000Z", capacity);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, "exhausted");
});

await check("null maxSlots means unlimited claims", async () => {
  const unlimited = { ...promotion, promotionId: "promo-unlimited" };
  const result = await claimVoucher(user.id, unlimited, "2026-10-24T10:00:00.000Z", {
    maxSlots: null,
    baselineUsed: 999,
  });
  assert.equal(result.ok, true);
});

// Windows keeps the SQLite handle open for the process lifetime, so the temp
// directory can refuse deletion — leftover files are harmless and OS-cleaned.
try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // ignore EPERM from the still-open node:sqlite handle
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
