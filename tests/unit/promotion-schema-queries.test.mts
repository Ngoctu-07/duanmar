import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { PROMOTIONS_QUERY } = await import("../../src/sanity/queries/promotions.ts");
const {
  pickPromotionText,
  isPromotionLive,
  filterLivePromotions,
  daysUntilValid,
  formatPromoPrice,
  toPromotionCard,
} = await import("../../src/lib/promotions.ts");
const { parse } = await import("groq-js");

const schema = readFileSync(
  new URL("../../src/sanity/schemaTypes/promotion.ts", import.meta.url),
  "utf8"
);
const schemaIndex = readFileSync(
  new URL("../../src/sanity/schemaTypes/index.ts", import.meta.url),
  "utf8"
);
const en = JSON.parse(
  readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")
);
const vi = JSON.parse(
  readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")
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

/* --- schema --- */

check("schema declares every required promotion field", () => {
  for (const field of [
    "title_en", "title_vi", "badgeTag_en", "badgeTag_vi",
    "description_en", "description_vi", "discountedPrice", "originalPrice",
    "currency", "bannerImage", "coverImage", "validUntil", "targetTour", "isActive",
    "promoCode", "maxSlots", "usedCount", "minGuests", "startDate", "endDate",
  ]) {
    assert.ok(schema.includes(`name: "${field}"`), `schema missing ${field}`);
  }
});

check("schema uses bilingual en/vi fieldsets (house pattern A)", () => {
  assert.ok(schema.includes('name: "en"') && schema.includes('name: "vi"'));
  assert.ok(schema.includes('fieldset: "en"') && schema.includes('fieldset: "vi"'));
});

check("coverImage is appended to the existing schema with hotspot + alt", () => {
  const block = schema.split('name: "coverImage"')[1]?.slice(0, 400) ?? "";
  assert.ok(block.includes('type: "image"'), "coverImage must be an image field");
  assert.ok(block.includes("options: { hotspot: true }"));
  assert.ok(block.includes('name: "alt"'), "coverImage must expose an alt string");
  assert.ok(block.includes('type: "string"'));
  // Legacy banner stays optional so existing docs keep validating.
  const banner = schema.split('name: "bannerImage"')[1]?.slice(0, 400) ?? "";
  assert.ok(banner.includes('type: "image"'));
  assert.ok(!banner.includes("rule.required()"), "bannerImage must no longer be required");
});

check("currency enum VND/USD, required, initial VND", () => {
  assert.ok(schema.includes('"VND"') && schema.includes('"USD"'));
  assert.ok(schema.includes('name: "currency"'));
  assert.ok(schema.includes('initialValue: "VND"'));
});

check("validUntil is a required date; isActive is required boolean defaulting true", () => {
  const validUntil = schema.split('name: "validUntil"')[1]?.slice(0, 600) ?? "";
  assert.ok(validUntil.includes('type: "date"'));
  assert.ok(validUntil.includes("rule.required()"));
  const active = schema.split('name: "isActive"')[1]?.slice(0, 400) ?? "";
  assert.ok(active.includes('type: "boolean"'));
  assert.ok(active.includes("initialValue: true"));
  assert.ok(active.includes("rule.required()"));
});

check("targetTour is a reference to destination (no required rule)", () => {
  const rest = schema.split('name: "targetTour"')[1] ?? "";
  const block = rest.slice(0, rest.indexOf("defineField({"));
  assert.ok(block.includes('type: "reference"'), "targetTour must be a reference");
  assert.ok(block.includes('{ type: "destination" }'), "targetTour must point at destination");
  assert.ok(!block.includes("rule.required()"), "targetTour must stay optional");
});

check("promotion is registered in the schema index and has no slug field", () => {
  assert.ok(schemaIndex.includes("promotion"), "promotion not registered");
  assert.ok(!schema.includes('name: "slug"'), "cards key off _id — no slug field");
});

/* --- query --- */

check("PROMOTIONS_QUERY exported and parses with groq-js", () => {
  assert.equal(typeof PROMOTIONS_QUERY, "string");
  parse(PROMOTIONS_QUERY);
});

check("query filters isActive, orders by validUntil, projects all fields", () => {
  assert.ok(PROMOTIONS_QUERY.includes("isActive == true"), "must hide inactive promos");
  assert.ok(PROMOTIONS_QUERY.includes("order(validUntil asc)"));
  for (const field of [
    "_id", "title_en", "title_vi", "badgeTag_en", "badgeTag_vi",
    "description_en", "description_vi", "discountedPrice", "originalPrice",
    "currency", "validUntil", "bannerImage", "coverImage", "targetTour->", "promoCode",
    "maxSlots", "usedCount", "minGuests", "startDate", "endDate", "isActive",
  ]) {
    assert.ok(PROMOTIONS_QUERY.includes(field), `projection missing ${field}`);
  }
  assert.ok(PROMOTIONS_QUERY.includes('"slug": slug.current'), "targetTour must expose slug");
});

check("query carries the shared image fragment", () => {
  const fragment = readFileSync(
    new URL("../../src/sanity/fragments/image.ts", import.meta.url),
    "utf8"
  ).match(/`([^`]+)`/)?.[1];
  assert.ok(fragment, "image fragment source not found");
  assert.ok(PROMOTIONS_QUERY.includes(fragment), "query must interpolate imageFragment");
});

check("GROQ safety: no $ params, no ternary, balanced parens", () => {
  assert.ok(!PROMOTIONS_QUERY.includes("$"), "call site passes {} — no params");
  assert.ok(!PROMOTIONS_QUERY.includes(" ? "), "GROQ has no ternary operator");
  const opens = (PROMOTIONS_QUERY.match(/\(/g) ?? []).length;
  const closes = (PROMOTIONS_QUERY.match(/\)/g) ?? []).length;
  assert.equal(opens, closes, `unbalanced parens: ${opens} vs ${closes}`);
});

/* --- shared lib --- */

const base = {
  _id: "promo-1",
  title_en: "Early Bird: winter departures",
  title_vi: "Ưu đãi đặt sớm",
  badgeTag_en: "20% OFF",
  badgeTag_vi: "Giảm 20%",
  description_en: "Book by 31 Dec.",
  description_vi: "Đặt trước 31/12.",
  discountedPrice: 1_500_000,
  originalPrice: 2_000_000,
  currency: "VND",
  validUntil: "2026-10-05",
  bannerImage: { asset: { url: "https://cdn.sanity.io/banner.jpg" }, alt: "Banner beach" },
  coverImage: { asset: { url: "https://cdn.sanity.io/x.jpg" }, alt: "Beach" },
  targetTour: { _id: "dest-1", slug: "hcm" },
};

check("pickPromotionText: locale pick + blank translation falls back to the other", () => {
  assert.equal(pickPromotionText(base, "vi").title, "Ưu đãi đặt sớm");
  assert.equal(pickPromotionText(base, "en").title, "Early Bird: winter departures");
  assert.equal(pickPromotionText({ ...base, title_vi: "  " }, "vi").title, "Early Bird: winter departures");
  assert.equal(pickPromotionText({ ...base, badgeTag_vi: "" }, "vi").badgeTag, "20% OFF");
  assert.equal(pickPromotionText({ ...base, badgeTag_en: null }, "en").badgeTag, "Giảm 20%");
});

check("isPromotionLive: inclusive last day, hidden after, fail-closed on bad date", () => {
  assert.equal(isPromotionLive(base, new Date("2026-10-05T10:00:00Z")), true);
  assert.equal(isPromotionLive(base, new Date("2026-10-06T00:00:00Z")), false);
  assert.equal(isPromotionLive({ ...base, validUntil: undefined }, new Date()), false);
  assert.equal(isPromotionLive({ ...base, validUntil: "05/10/2026" }, new Date()), false);
  assert.equal(filterLivePromotions([base, { ...base, _id: "old", validUntil: "2020-01-01" }], new Date("2026-10-01T00:00:00Z")).length, 1);
});

check("daysUntilValid: positive, last-day 0, negative for past", () => {
  assert.equal(daysUntilValid("2026-10-05", new Date("2026-10-02T12:00:00Z")), 3);
  assert.equal(daysUntilValid("2026-10-05", new Date("2026-10-05T23:00:00Z")), 0);
  assert.equal(daysUntilValid("2026-10-01", new Date("2026-10-05T00:00:00Z")), -4);
  assert.equal(daysUntilValid(null, new Date()), Number.NEGATIVE_INFINITY);
});

check("formatPromoPrice: doc currency honoured, unusable input → null", () => {
  // Intl puts a NBSP (U+00A0) before the ₫ symbol — match it literally.
  assert.equal(formatPromoPrice(1_500_000, "VND", "vi"), "1.500.000\u00a0₫");
  assert.equal(formatPromoPrice(100, "USD", "en"), "$100");
  assert.equal(formatPromoPrice(100, "XXX", "en"), null, "unknown currency must not invent a symbol");
  assert.equal(formatPromoPrice(-5, "VND", "vi"), null);
  assert.equal(formatPromoPrice(null, "VND", "vi"), null);
});

check("toPromotionCard: localized view model with alt fallback + tour slug", () => {
  const card = toPromotionCard(base, "vi");
  assert.equal(card.title, "Ưu đãi đặt sớm");
  assert.equal(card.badgeTag, "Giảm 20%");
  assert.equal(card.price, "1.500.000\u00a0₫");
  assert.equal(card.originalPrice, "2.000.000\u00a0₫");
  assert.equal(card.tourSlug, "hcm");
  assert.equal(card.coverUrl, "https://cdn.sanity.io/x.jpg");
  assert.equal(card.coverAlt, "Beach");
  assert.equal(card.daysLeft, daysUntilValid(base.validUntil));
  assert.ok(card.dateLabel.length > 0, "dateLabel must render");
  // Cover is preferred; legacy banner is the fallback; missing alt → title.
  const bannerOnly = { ...base, coverImage: null };
  assert.equal(toPromotionCard(bannerOnly, "en").coverUrl, "https://cdn.sanity.io/banner.jpg");
  assert.equal(
    toPromotionCard({ ...base, coverImage: { asset: { url: "u" }, alt: null } }, "en").coverAlt,
    "Early Bird: winter departures"
  );
});

/* --- card structure (source-level; the browser test renders the live page) --- */

const cardSource = readFileSync(
  new URL("../../src/components/deals/promotion-card.tsx", import.meta.url),
  "utf8"
);
const tourCardSource = readFileSync(
  new URL("../../src/components/tours/tour-card.tsx", import.meta.url),
  "utf8"
);
const claimButtonSource = readFileSync(
  new URL("../../src/components/deals/claim-deal-button.tsx", import.meta.url),
  "utf8"
);
const dealsPage = readFileSync(
  new URL("../../src/app/[locale]/deals/page.tsx", import.meta.url),
  "utf8"
);
const CTA_TYPE = "font-condensed text-sm font-medium uppercase tracking-[0.22em]";
const has = (source: string, needles: string[]) => {
  for (const needle of needles) assert.ok(source.includes(needle), `missing: ${needle}`);
};

check("card structure: cover → body (title/description/expiry) → bottom CTA", () => {
  has(cardSource, [
    "aspect-[16/10]",
    "card.coverUrl",
    "card.coverAlt",
    "<h2",
    "line-clamp-3",
    "card.dateLabel",
    "mt-auto",
    "w-full",
    "bg-primary",
  ]);
  assert.ok(cardSource.indexOf("aspect-[16/10]") < cardSource.indexOf("<h2"), "image must precede the body");
  assert.ok(cardSource.indexOf("<h2") < cardSource.indexOf("mt-auto"), "CTA must follow the body");
  assert.ok(cardSource.includes("const href = card.tourSlug"), "CTA target logic missing");
  assert.ok(cardSource.includes("? `/explore/destinations/${card.tourSlug}`"), "tour target missing");
  assert.ok(cardSource.includes(': "/contact"'), "contact fallback missing");
});

check("card CTA reuses the KHÁM PHÁ NGAY typography exactly", () => {
  assert.ok(cardSource.includes("<ClaimDealButton"), "deal CTA must stay the guarded claim action");
  assert.ok(claimButtonSource.includes(CTA_TYPE), "deal CTA typography drifted");
  assert.ok(tourCardSource.includes(CTA_TYPE), "tour CTA typography changed");
});

check("deal titles use Barlow Semi Condensed (font-sans), not the display face", () => {
  const titleClass = cardSource.match(/<h2 className="([^"]+)"/)?.[1] ?? "";
  assert.ok(titleClass.includes("font-sans"), "deal title must use the body sans face");
  assert.ok(!titleClass.includes("font-display"), "decorative display face must be removed");
  assert.ok(/font-(semibold|bold)/.test(titleClass), "deal title needs a solid weight");
  assert.ok(/text-(lg|xl)/.test(titleClass), "deal title needs a standard size");
});

check("deals page renders a responsive 3-column card grid", () => {
  has(dealsPage, [
    "grid-cols-1",
    "md:grid-cols-2",
    "lg:grid-cols-3",
    'claimNowLabel={t("claimNow")}',
  ]);
});

/* --- messages --- */

check("deals.items removed from BOTH message files (hardcoded cards gone)", () => {
  assert.equal(en.deals.items, undefined, "en.deals.items still present");
  assert.equal(vi.deals.items, undefined, "vi.deals.items still present");
});

check("countdown/empty/CTA keys added to both locales; chrome keys kept", () => {
  for (const dict of [en.deals, vi.deals]) {
    for (const key of ["endsInDays", "lastDay", "empty", "claimNow", "title", "subtitle", "disclaimer"]) {
      assert.ok(typeof dict[key] === "string" && dict[key].length > 0, `deals.${key} missing`);
    }
  }
  assert.ok(en.deals.endsInDays.includes("plural"), "EN countdown must be ICU-plural");
  assert.equal(en.deals.title, "Deals & Packages", "browser L4 asserts this title");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
