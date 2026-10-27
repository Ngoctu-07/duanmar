import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Conditional voucher eligibility engine + single-voucher radio model.
 *
 * E1–E10 exercise the pure evaluator (guest count, inclusive date windows,
 * missing date, blocker priority, fail-open normalization).
 * E11 checks that live CMS rules are attached to wallet rows.
 * E12–E13 lock the checkout wiring: radio group, disabled/grey card, reason
 * labels, instant re-evaluation props, and bilingual copy.
 */

const {
  evaluateVoucherEligibility,
  normalizeVoucherRequirements,
  normalizeEligibilityDay,
} = await import("../../src/lib/vouchers/voucher-eligibility.ts");
const { localizeVouchers } = await import("../../src/lib/vouchers/localize.ts");

const en = JSON.parse(
  readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")
);
const vi = JSON.parse(
  readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")
);
const schema = readFileSync(
  new URL("../../src/sanity/schemaTypes/promotion.ts", import.meta.url),
  "utf8"
);
const query = readFileSync(
  new URL("../../src/sanity/queries/promotions.ts", import.meta.url),
  "utf8"
);
const card = readFileSync(
  new URL("../../src/components/booking/booking-voucher-card.tsx", import.meta.url),
  "utf8"
);
const section = readFileSync(
  new URL("../../src/components/booking/booking-voucher-section.tsx", import.meta.url),
  "utf8"
);
const form = readFileSync(
  new URL("../../src/components/booking/booking-form.tsx", import.meta.url),
  "utf8"
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

const target = (overrides = {}) => ({
  minGuests: null,
  startDate: null,
  endDate: null,
  tourSlug: null,
  validUntil: null,
  isExhausted: false,
  ...overrides,
});
const context = (overrides = {}) => ({
  guests: 2,
  bookingDate: "2026-11-10",
  tourSlug: "tour-a",
  today: "2026-10-27",
  ...overrides,
});

check("E1 no requirements → eligible for any party/date", () => {
  const result = evaluateVoucherEligibility(target(), context());
  assert.equal(result.isGuestEligible, true);
  assert.equal(result.isDateEligible, true);
  assert.equal(result.isEligible, true);
  assert.equal(result.reason, null);
  assert.deepEqual(result.reasons, []);
});

check("E2 minGuests is inclusive and needs a usable guest count", () => {
  const voucher = target({ minGuests: 5 });
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: 4 })).isGuestEligible, false);
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: 4 })).reason, "guests");
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: 5 })).isEligible, true);
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: 9 })).isEligible, true);
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: Number.NaN })).isGuestEligible, false);
  assert.equal(evaluateVoucherEligibility(voucher, context({ guests: 0 })).isGuestEligible, false);
});

check("E3 startDate is inclusive (booking date on/after unlocks)", () => {
  const voucher = target({ startDate: "2026-11-10" });
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-09" })).isDateEligible, false);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-10" })).isEligible, true);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-12-01" })).isEligible, true);
});

check("E4 endDate is inclusive (booking date on/before expires)", () => {
  const voucher = target({ endDate: "2026-11-10" });
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-11" })).isDateEligible, false);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-10" })).isEligible, true);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-01" })).isEligible, true);
});

check("E5 a start/end window accepts only inside days", () => {
  const voucher = target({ startDate: "2026-11-01", endDate: "2026-11-30" });
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-10-31" })).isEligible, false);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-11-15" })).isEligible, true);
  assert.equal(evaluateVoucherEligibility(voucher, context({ bookingDate: "2026-12-01" })).isEligible, false);
});

check("E6 date rules without a selected booking date → not eligible", () => {
  const voucher = target({ startDate: "2026-11-01" });
  for (const bookingDate of [null, undefined, "", "not-a-date"]) {
    const result = evaluateVoucherEligibility(voucher, context({ bookingDate }));
    assert.equal(result.isDateEligible, false, String(bookingDate));
    assert.equal(result.reason, "date");
  }
});

check("E7 no date rules → a missing booking date is fine", () => {
  const result = evaluateVoucherEligibility(target(), context({ bookingDate: null }));
  assert.equal(result.isEligible, true);
});

check("E8 blocker priority: exhausted → expired → tour → guests → date", () => {
  const result = evaluateVoucherEligibility(
    target({
      minGuests: 9,
      startDate: "2026-12-01",
      tourSlug: "tour-b",
      validUntil: "2026-10-01",
      isExhausted: true,
    }),
    context({ guests: 2 })
  );
  assert.equal(result.isEligible, false);
  assert.equal(result.reason, "exhausted");
  assert.deepEqual(result.reasons, ["exhausted", "expired", "tour", "guests", "date"]);

  const onlyRequirements = evaluateVoucherEligibility(
    target({ minGuests: 9, startDate: "2026-12-01" }),
    context({ guests: 2 })
  );
  assert.deepEqual(onlyRequirements.reasons, ["guests", "date"]);
  assert.equal(onlyRequirements.reason, "guests");
});

check("E9 blank/1/invalid minGuests mean any party size; 2+ is enforced", () => {
  for (const minGuests of [null, undefined, 0, 1, -2, 1.5, Number.NaN, "5"]) {
    assert.equal(
      normalizeVoucherRequirements({ minGuests: minGuests as never }).minGuests,
      null,
      `minGuests=${String(minGuests)}`
    );
  }
  assert.equal(normalizeVoucherRequirements({ minGuests: 2 }).minGuests, 2);
});

check("E10 malformed CMS dates are ignored; ISO datetimes use the day part", () => {
  assert.equal(normalizeEligibilityDay("2026-11-10"), "2026-11-10");
  assert.equal(normalizeEligibilityDay("2026-11-10T00:00:00Z"), "2026-11-10");
  assert.equal(normalizeEligibilityDay("10/11/2026"), null);
  assert.equal(normalizeEligibilityDay(20261110), null);
  const requirements = normalizeVoucherRequirements({
    startDate: "2026-11-01T09:30:00Z",
    endDate: "oops",
  });
  assert.equal(requirements.startDate, "2026-11-01");
  assert.equal(requirements.endDate, null);
});

check("E11 live CMS rules are attached to wallet rows; deleted promo fails open", () => {
  const voucher = {
    id: "v-1",
    promotionId: "promo-1",
    code: "TEST-CODE",
    title: "Snapshot",
    description: "",
    price: null,
    originalPrice: null,
    badge: null,
    validUntil: null,
    tourSlug: null,
    claimedAt: "2026-10-27T10:00:00.000Z",
  };
  const promo = {
    _id: "promo-1",
    title_en: "Live deal",
    minGuests: 5,
    startDate: "2026-11-01",
    endDate: "2026-11-30",
  };
  const [row] = localizeVouchers([voucher], [promo as never], "en");
  assert.equal(row.title, "Live deal");
  assert.equal(row.minGuests, 5);
  assert.equal(row.startDate, "2026-11-01");
  assert.equal(row.endDate, "2026-11-30");

  const [missing] = localizeVouchers([voucher], [], "en");
  assert.equal(missing.minGuests, null);
  assert.equal(missing.startDate, null);
  assert.equal(missing.endDate, null);
});

check("E12 schema + GROQ expose the conditional fields", () => {
  const minGuests = schema.split('name: "minGuests"')[1]?.slice(0, 400) ?? "";
  assert.ok(minGuests.includes('type: "number"'));
  assert.ok(minGuests.includes("rule.integer().min(1)"));
  for (const field of ["startDate", "endDate"]) {
    const block = schema.split(`name: "${field}"`)[1]?.slice(0, 400) ?? "";
    assert.ok(block.includes('type: "date"'), `${field} must be a date`);
  }
  for (const field of ["minGuests", "startDate", "endDate"]) {
    assert.ok(query.includes(field), `GROQ missing ${field}`);
  }
});

check("E13 checkout: radio group, disabled grey card, reason labels, live state", () => {
  for (const needle of [
    'type="radio"',
    'name="booking-voucher"',
    "checked={applied}",
    "disabled={!eligible}",
    "voucher-guest-requirement",
    "voucher-date-requirement",
    "voucherMinGuests",
    "voucherDateInvalid",
    "voucherDateRequired",
    "opacity-60 grayscale",
    "data-eligible",
    "data-guest-eligible",
    "data-date-eligible",
  ]) {
    assert.ok(card.includes(needle), `voucher card missing ${needle}`);
  }
  for (const needle of ["guestCount", "bookingDate", "onSelect={onSelect}"]) {
    assert.ok(section.includes(needle), `voucher section missing ${needle}`);
  }
  for (const needle of [
    "evaluateVoucherEligibility",
    "guestCount={guestCount}",
    "bookingDate={values.travelDate || null}",
    "setSelectedVoucher(null)",
    "onSelect={setSelectedVoucher}",
  ]) {
    assert.ok(form.includes(needle), `booking form missing ${needle}`);
  }
});

check("E14 conditional copy exists in both locales", () => {
  for (const dict of [en, vi]) {
    for (const key of [
      "voucherMinGuests",
      "voucherDateRequired",
      "voucherDateInvalid",
      "voucherNotEligible",
      "voucherSelectLabel",
    ]) {
      assert.ok(
        typeof dict.booking[key] === "string" && dict.booking[key].length > 0,
        `missing booking.${key}`
      );
    }
  }
  assert.equal(en.booking.voucherMinGuests, "Requires min. {count} guests");
  assert.equal(vi.booking.voucherMinGuests, "Yêu cầu tối thiểu {count} khách");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
