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

const { hashPassword, verifyPassword } = await import("../../src/lib/auth/password.ts");
const { authenticate, createUser, findUserByEmail, normalizeEmail } = await import(
  "../../src/lib/auth/user-store.ts"
);
const { claimVoucher, generateVoucherCode, listVouchers } = await import(
  "../../src/lib/vouchers/voucher-store.ts"
);

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

/* --- password hashing --- */

check("hashPassword produces a tagged scrypt hash that verifies", () => {
  const stored = hashPassword("correct horse battery");
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(verifyPassword("correct horse battery", stored), true);
  assert.equal(verifyPassword("wrong password", stored), false);
});

check("verifyPassword fails closed on malformed/empty input", () => {
  assert.equal(verifyPassword("x", ""), false);
  assert.equal(verifyPassword("x", null), false);
  assert.equal(verifyPassword("x", "bcrypt$aa$bb"), false);
  assert.equal(verifyPassword("x", "scrypt$aa$bb"), false);
});

check("identical passwords hash differently (per-user salt)", () => {
  assert.notEqual(hashPassword("same-password"), hashPassword("same-password"));
});

/* --- user store --- */

check("createUser normalizes email and hides the password hash", () => {
  const result = createUser({
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
  assert.ok(findUserByEmail("VISITOR@duanmar.TEST"));
});

check("duplicate email returns a typed duplicate code", () => {
  const result = createUser({
    email: "visitor@duanmar.test",
    name: "Other",
    password: "another-password",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "duplicate");
});

check("authenticate accepts the right password and rejects the rest", () => {
  assert.equal(authenticate("visitor@duanmar.test", "hunter2-hunter2")?.email, "visitor@duanmar.test");
  assert.equal(authenticate("visitor@duanmar.test", "nope-nope-nope"), null);
  assert.equal(authenticate("missing@duanmar.test", "hunter2-hunter2"), null);
  assert.equal(authenticate("", ""), null);
});

/* --- vouchers --- */

const user = findUserByEmail("visitor@duanmar.test");
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

check("claimVoucher stores a full snapshot", () => {
  const result = claimVoucher(user.id, promotion, "2026-10-22T10:00:00.000Z");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.created, true);
  assert.equal(result.voucher.title, promotion.title);
  assert.equal(result.voucher.tourSlug, "hcm");
  assert.equal(result.voucher.validUntil, "2026-12-31");
  assert.equal(result.voucher.claimedAt, "2026-10-22T10:00:00.000Z");
  assert.match(result.voucher.code, /^DUAN-[0-9A-F]{6}$/);
});

check("claiming the same promotion twice is idempotent", () => {
  const first = listVouchers(user.id);
  const again = claimVoucher(user.id, promotion, "2026-10-23T10:00:00.000Z");
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(again.created, false);
  assert.equal(again.voucher.id, first[0].id);
  assert.equal(listVouchers(user.id).length, 1);
});

check("explicit promo code wins; invalid codes fall back to generated", () => {
  const explicit = claimVoucher(
    user.id,
    { ...promotion, promotionId: "promo-code", promoCode: "tet-2027-sale" },
    "2026-10-22T10:00:00.000Z"
  );
  assert.equal(explicit.ok, true);
  if (explicit.ok) assert.equal(explicit.voucher.code, "TET-2027-SALE");

  const invalid = claimVoucher(
    user.id,
    { ...promotion, promotionId: "promo-bad-code", promoCode: "!!" },
    "2026-10-22T10:00:00.000Z"
  );
  assert.equal(invalid.ok, true);
  if (invalid.ok) assert.equal(invalid.voucher.code, generateVoucherCode("promo-bad-code"));
});

check("wallet lists newest claims first", () => {
  const rows = listVouchers(user.id);
  assert.equal(rows.length, 3);
  assert.ok(rows[0].claimedAt >= rows[1].claimedAt);
});

check("claimVoucher rejects missing ids and unknown tour slugs", () => {
  assert.equal(claimVoucher(user.id, { promotionId: "", title: "x" }).ok, false);
  assert.equal(claimVoucher(user.id, { promotionId: "bad id!", title: "x" }).ok, false);
  assert.equal(claimVoucher(user.id, { promotionId: "p-1", title: "" }).ok, false);

  const unsafeSlug = claimVoucher(user.id, {
    ...promotion,
    promotionId: "promo-slug",
    tourSlug: "../../etc/passwd",
  });
  assert.equal(unsafeSlug.ok, true);
  if (unsafeSlug.ok) assert.equal(unsafeSlug.voucher.tourSlug, null);
});

check("generateVoucherCode is deterministic and per-promotion", () => {
  assert.equal(generateVoucherCode("promo-abc"), generateVoucherCode("promo-abc"));
  assert.notEqual(generateVoucherCode("promo-abc"), generateVoucherCode("promo-xyz"));
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
