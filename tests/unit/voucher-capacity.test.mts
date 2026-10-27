import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * C1–C10 cover the voucher slot-limit feature end to end at the pure-logic and
 * source-contract level: capacity math (limit + CMS baseline + live claims),
 * promotion-card wiring, wallet/checkout attachment, exhausted card markup,
 * claim API 409, and bilingual copy.
 */

const { computePromotionCapacity, toPromotionCard } = await import(
  "../../src/lib/promotions.ts"
);
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
const dealCard = readFileSync(
  new URL("../../src/components/deals/promotion-card.tsx", import.meta.url),
  "utf8"
);
const claimButton = readFileSync(
  new URL("../../src/components/deals/claim-deal-button.tsx", import.meta.url),
  "utf8"
);
const voucherCard = readFileSync(
  new URL("../../src/components/booking/booking-voucher-card.tsx", import.meta.url),
  "utf8"
);
const claimRoute = readFileSync(
  new URL("../../src/app/api/vouchers/route.ts", import.meta.url),
  "utf8"
);
const dealsPage = readFileSync(
  new URL("../../src/app/[locale]/deals/page.tsx", import.meta.url),
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

const base = { _id: "promo-1", validUntil: "2026-12-31", currency: "VND" };
const voucher = {
  id: "v-1",
  promotionId: "promo-1",
  code: "TEST-CODE",
  title: "Snapshot",
  description: "",
  price: null,
  originalPrice: null,
  badge: null,
  validUntil: "2026-12-31",
  tourSlug: null,
  claimedAt: "2026-10-27T10:00:00.000Z",
};

check("C1 no limit → unlimited, never exhausted", () => {
  const capacity = computePromotionCapacity(base, 5);
  assert.deepEqual(capacity, {
    maxSlots: null,
    usedCount: 5,
    remainingSlots: null,
    isExhausted: false,
  });
  assert.equal(computePromotionCapacity(null, 3).isExhausted, false);
});

check("C2 usedCount = CMS baseline + online claims; boundary is exhausted", () => {
  const capacity = computePromotionCapacity({ maxSlots: 3, usedCount: 1 }, 2);
  assert.deepEqual(capacity, {
    maxSlots: 3,
    usedCount: 3,
    remainingSlots: 0,
    isExhausted: true,
  });
});

check("C3 one slot left stays claimable", () => {
  const capacity = computePromotionCapacity({ maxSlots: 3, usedCount: 0 }, 2);
  assert.equal(capacity.remainingSlots, 1);
  assert.equal(capacity.isExhausted, false);
});

check("C4 over-limit clamps remaining to 0 and flags exhausted", () => {
  const capacity = computePromotionCapacity({ maxSlots: 2, usedCount: 4 }, 3);
  assert.equal(capacity.usedCount, 7);
  assert.equal(capacity.remainingSlots, 0);
  assert.equal(capacity.isExhausted, true);
});

check("C5 maxSlots 0 is exhausted from the start", () => {
  assert.equal(computePromotionCapacity({ maxSlots: 0 }, 0).isExhausted, true);
});

check("C6 invalid/fractional capacity fails open (unlimited), negatives clamp", () => {
  for (const maxSlots of [-1, 1.5, Number.NaN, "3" as never]) {
    const capacity = computePromotionCapacity({ maxSlots: maxSlots as never }, 1);
    assert.equal(capacity.maxSlots, null, `maxSlots=${String(maxSlots)}`);
    assert.equal(capacity.isExhausted, false);
  }
  const clamped = computePromotionCapacity({ maxSlots: 5, usedCount: -2 }, -3);
  assert.equal(clamped.usedCount, 0);
  assert.equal(clamped.remainingSlots, 5);
});

check("C7 toPromotionCard carries live capacity into the card view model", () => {
  const card = toPromotionCard({ ...base, maxSlots: 2, usedCount: 1 }, "en", 1);
  assert.equal(card.maxSlots, 2);
  assert.equal(card.usedCount, 2);
  assert.equal(card.remainingSlots, 0);
  assert.equal(card.isExhausted, true);
  const open = toPromotionCard({ ...base, maxSlots: 2 }, "en", 0);
  assert.equal(open.isExhausted, false);
});

check("C8 wallet/checkout rows get capacity from live counts; deleted promo fails open", () => {
  const [row] = localizeVouchers(
    [voucher],
    [{ ...base, title_en: "Live deal" } as never],
    "en",
    new Map([["promo-1", 2]])
  );
  assert.equal(row.title, "Live deal");
  assert.equal(row.maxSlots, null);
  assert.equal(row.isExhausted, false);

  const [capped] = localizeVouchers(
    [voucher],
    [{ ...base, maxSlots: 2, usedCount: 0 } as never],
    "en",
    new Map([["promo-1", 2]])
  );
  assert.equal(capped.isExhausted, true);
  assert.equal(capped.remainingSlots, 0);

  const [missing] = localizeVouchers([voucher], [], "en");
  assert.equal(missing.isExhausted, false);
  assert.equal(missing.maxSlots, null);
});

check("C9 schema + GROQ expose maxSlots/usedCount with integer min(0)", () => {
  const maxSlots = schema.split('name: "maxSlots"')[1]?.slice(0, 500) ?? "";
  assert.ok(maxSlots.includes('type: "number"'));
  assert.ok(maxSlots.includes("rule.integer().min(0)"));
  const usedCount = schema.split('name: "usedCount"')[1]?.slice(0, 500) ?? "";
  assert.ok(usedCount.includes('type: "number"'));
  assert.ok(usedCount.includes("initialValue: 0"));
  assert.ok(usedCount.includes("rule.integer().min(0)"));
  assert.ok(query.includes("maxSlots"));
  assert.ok(query.includes("usedCount"));
});

check("C10 exhausted UI: grey card + badge, dead CTA, checkout apply blocked", () => {
  for (const needle of [
    "pointer-events-none",
    "opacity-50",
    "grayscale",
    "deal-exhausted-badge",
    "data-exhausted",
    "outOfSlotsLabel",
  ]) {
    assert.ok(dealCard.includes(needle), `deal card missing ${needle}`);
  }
  for (const needle of ["claim-deal-exhausted", "aria-disabled", "exhausted"]) {
    assert.ok(claimButton.includes(needle), `claim button missing ${needle}`);
  }
  for (const needle of [
    "voucher-exhausted-badge",
    "select-none",
    "voucherOutOfSlots",
    "disabled={!eligible}",
    "data-exhausted",
  ]) {
    assert.ok(voucherCard.includes(needle), `voucher card missing ${needle}`);
  }
  assert.ok(claimRoute.includes('"exhausted"') && claimRoute.includes("409"));
  assert.ok(claimRoute.includes("loadPromotionCapacity"));
  assert.ok(dealsPage.includes("countVouchersByPromotion"));
});

check("C11 out-of-slots copy exists in both locales", () => {
  assert.equal(en.deals.outOfSlots, "Out of Slots");
  assert.equal(vi.deals.outOfSlots, "Hết slot");
  for (const dict of [en, vi]) {
    assert.ok(dict.deals.claimExhausted.length > 0);
    assert.ok(dict.booking.voucherOutOfSlots.length > 0);
    assert.ok(dict.account.outOfSlots.length > 0);
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
