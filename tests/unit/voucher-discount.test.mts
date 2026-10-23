import assert from "node:assert/strict";
import type { Voucher } from "../../src/lib/vouchers/voucher-store";
import {
  isVoucherApplicable,
  isVoucherExpired,
  parseVoucherPercent,
  resolveVoucherDiscount,
  voucherPercent,
} from "../../src/lib/vouchers/voucher-discount";

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

const voucher = (overrides: Partial<Voucher> = {}): Voucher => ({
  id: "v1",
  promotionId: "promo-1",
  code: "DUAN-TEST01",
  title: "Summer escape",
  description: "",
  price: null,
  originalPrice: null,
  badge: null,
  validUntil: null,
  tourSlug: null,
  claimedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

/* --- percentage parsing --- */

check("parses a percentage from the badge", () => {
  assert.equal(parseVoucherPercent("Giảm 20%"), 20);
  assert.equal(parseVoucherPercent("10 % OFF"), 10);
  assert.equal(parseVoucherPercent("Giảm 12,5%"), 12.5);
});

check("ignores missing / malformed / out-of-range values", () => {
  assert.equal(parseVoucherPercent(null), null);
  assert.equal(parseVoucherPercent(""), null);
  assert.equal(parseVoucherPercent("Free drink"), null);
  assert.equal(parseVoucherPercent("0%"), null);
  assert.equal(parseVoucherPercent("150%"), 100);
});

check("badge wins over the title", () => {
  const v = voucher({ badge: "Giảm 15%", title: "Save 30% this week" });
  assert.equal(voucherPercent(v), 15);
});

check("falls back to the promo price ratio", () => {
  const v = voucher({ price: "2.000.000 ₫", originalPrice: "2.500.000 ₫" });
  assert.equal(voucherPercent(v), 20);
});

check("no derivable rule means no discount", () => {
  assert.equal(voucherPercent(voucher()), null);
  assert.equal(voucherPercent(voucher({ price: "1.000 ₫", originalPrice: "500 ₫" })), null);
});

/* --- expiry + applicability --- */

check("expiry is inclusive of the last valid day", () => {
  const v = voucher({ validUntil: "2026-10-22" });
  assert.equal(isVoucherExpired(v, "2026-10-22"), false);
  assert.equal(isVoucherExpired(v, "2026-10-23"), true);
  assert.equal(isVoucherExpired(voucher({ validUntil: null }), "2030-01-01"), false);
});

check("tour-targeted vouchers only apply to their tour", () => {
  const targeted = voucher({ tourSlug: "ha-long-bay" });
  assert.equal(isVoucherApplicable(targeted, "ha-long-bay", "2026-10-22"), true);
  assert.equal(isVoucherApplicable(targeted, "sapa", "2026-10-22"), false);
  assert.equal(isVoucherApplicable(voucher(), "sapa", "2026-10-22"), true);
  assert.equal(
    isVoucherApplicable(voucher({ validUntil: "2026-01-01" }), "sapa", "2026-10-22"),
    false
  );
});

/* --- order math --- */

check("10% off a 200,000 VND ticket pays 180,000", () => {
  const result = resolveVoucherDiscount(voucher({ badge: "Giảm 10%" }), 200_000);
  assert.deepEqual(result, { percent: 10, amount: 20_000, total: 180_000 });
});

check("no voucher leaves the subtotal untouched", () => {
  assert.deepEqual(resolveVoucherDiscount(null, 200_000), {
    percent: 0,
    amount: 0,
    total: 200_000,
  });
});

check("discount rounds to 2 decimals and never goes negative", () => {
  const result = resolveVoucherDiscount(voucher({ badge: "Giảm 33%" }), 99.99);
  assert.equal(result.amount, 33);
  assert.equal(result.total, 66.99);
  assert.equal(resolveVoucherDiscount(voucher({ badge: "Giảm 100%" }), 500).total, 0);
});

check("switching vouchers replaces the previous discount (single voucher)", () => {
  const ten = voucher({ id: "a", badge: "Giảm 10%" });
  const twentyFive = voucher({ id: "b", badge: "Giảm 25%" });
  const first = resolveVoucherDiscount(ten, 200_000);
  const second = resolveVoucherDiscount(twentyFive, 200_000);
  assert.equal(first.total, 180_000);
  assert.equal(second.total, 150_000);
  assert.notEqual(first.total, second.total);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
