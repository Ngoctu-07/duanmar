import assert from "node:assert/strict";
import { resolveTierForGuests, type PriceTier } from "../../src/lib/pricing.ts";
import { buildPaymentPayload, PAYMENT_METHODS } from "../../src/lib/payment.ts";

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

const tier = (min: number, max: number | null, price: number): PriceTier => ({
  minGuests: min,
  maxGuests: max,
  pricePerGuest: price,
  groupTotal: price * Math.min(min, 4),
});

const TIERS = [tier(1, 1, 200000), tier(2, 4, 175000), tier(5, null, 150000)];

check("D1 exact match wins", () => {
  assert.equal(resolveTierForGuests(TIERS, 1)?.pricePerGuest, 200000);
  assert.equal(resolveTierForGuests(TIERS, 2)?.pricePerGuest, 175000);
  assert.equal(resolveTierForGuests(TIERS, 4)?.pricePerGuest, 175000);
  assert.equal(resolveTierForGuests(TIERS, 5)?.pricePerGuest, 150000);
  assert.equal(resolveTierForGuests(TIERS, 99)?.pricePerGuest, 150000);
});

check("D1 clamp below smallest tier → first tier", () => {
  const tiers = [tier(3, 5, 100000), tier(6, 9, 90000)];
  assert.equal(resolveTierForGuests(tiers, 1)?.pricePerGuest, 100000);
  assert.equal(resolveTierForGuests(tiers, 2)?.minGuests, 3);
});

check("D1 clamp above largest tier → last tier", () => {
  const tiers = [tier(1, 3, 100000), tier(4, 6, 90000)];
  assert.equal(resolveTierForGuests(tiers, 50)?.pricePerGuest, 90000);
  assert.equal(resolveTierForGuests(tiers, 50)?.maxGuests, 6);
});

check("D1 order independent (unsorted input)", () => {
  const unsorted = [tier(5, null, 150000), tier(1, 1, 200000), tier(2, 4, 175000)];
  assert.equal(resolveTierForGuests(unsorted, 2)?.pricePerGuest, 175000);
  assert.equal(resolveTierForGuests(unsorted, 1)?.pricePerGuest, 200000);
});

check("D1 no tiers / invalid count → null (never invents a price)", () => {
  assert.equal(resolveTierForGuests([], 2), null);
  assert.equal(resolveTierForGuests(TIERS, 0), null);
  assert.equal(resolveTierForGuests(TIERS, -1), null);
  assert.equal(resolveTierForGuests(TIERS, 2.5), null);
  assert.equal(resolveTierForGuests(TIERS, Number.NaN), null);
});

check("D1 total = guests × matched tier rate (spec example)", () => {
  const tier2 = resolveTierForGuests(TIERS, 2);
  assert.equal(tier2 ? 2 * tier2.pricePerGuest : null, 350000);
  const tier1 = resolveTierForGuests(TIERS, 1);
  assert.equal(tier1 ? 1 * tier1.pricePerGuest : null, 200000);
});

check("D1 payload: both methods, amount + reference, distinct payloads", () => {
  assert.equal(PAYMENT_METHODS.length, 2);
  const momo = buildPaymentPayload("momo", 350000, "VN-ABC123");
  const bank = buildPaymentPayload("bank", 350000, "VN-ABC123");
  assert.match(momo, /amount=350000/);
  assert.match(momo, /VN-ABC123/);
  assert.match(momo, /^momo:\/\//);
  assert.match(bank, /amount=350000/);
  assert.match(bank, /VN-ABC123/);
  assert.notEqual(momo, bank);
});

check("D1 payload: reference sanitised (no injection chars)", () => {
  const payload = buildPaymentPayload("bank", 1000, "VN-AB C&<>");
  assert.ok(payload.includes("ref=VN-ABC"), payload);
  assert.ok(!payload.includes("&<>"), payload);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
