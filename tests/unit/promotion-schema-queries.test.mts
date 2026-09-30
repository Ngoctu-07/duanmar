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
    "currency", "bannerImage", "validUntil", "targetTour", "isActive",
  ]) {
    assert.ok(schema.includes(`name: "${field}"`), `schema missing ${field}`);
  }
});

check("schema uses bilingual en/vi fieldsets (house pattern A)", () => {
  assert.ok(schema.includes('name: "en"') && schema.includes('name: "vi"'));
  assert.ok(schema.includes('fieldset: "en"') && schema.includes('fieldset: "vi"'));
});

check("bannerImage has hotspot + required editable alt (first alt precedent)", () => {
  assert.ok(schema.includes('name: "bannerImage"'));
  assert.ok(schema.includes("options: { hotspot: true }"));
  const altBlock = schema.split('name: "alt"')[1]?.slice(0, 300) ?? "";
  assert.ok(altBlock.includes('type: "string"'), "bannerImage must expose an alt string");
  assert.ok(altBlock.includes("rule.required()"), "bannerImage alt must be required");
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
    "currency", "validUntil", "bannerImage", "targetTour->",
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
  bannerImage: { asset: { url: "https://cdn.sanity.io/x.jpg" }, alt: "Beach" },
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
  assert.equal(card.bannerUrl, "https://cdn.sanity.io/x.jpg");
  assert.equal(card.bannerAlt, "Beach");
  assert.equal(card.daysLeft, daysUntilValid(base.validUntil));
  assert.ok(card.dateLabel.length > 0, "dateLabel must render");
  assert.equal(toPromotionCard({ ...base, bannerImage: { asset: { url: "u" }, alt: null } }, "en").bannerAlt, "Early Bird: winter departures");
});

/* --- card render (static markup) --- */

const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { PromotionCard } = await import("../../src/components/deals/promotion-card.tsx");

const fixtureCard = toPromotionCard(
  {
    ...base,
    bannerImage: { asset: { url: "/images/logo-duanmar-white.png" }, alt: "Beach" },
    targetTour: null,
  },
  "vi"
);

check("card renders badge, prices (struck original), countdown and alt text", () => {
  const html = renderToStaticMarkup(
    React.createElement(PromotionCard as never, {
      card: { ...fixtureCard, daysLeft: 3, dateLabel: "5 thg 10, 2026" },
      countdownLabel: "còn 3 ngày",
      viewTourLabel: "Xem tour",
    })
  );
  assert.ok(html.includes("Giảm 20%"), "badge missing");
  assert.ok(html.includes('alt="Beach"'), "banner alt missing");
  assert.ok(html.includes("1.500.000"), "discounted price missing");
  assert.ok(html.includes("line-through"), "original price must be struck through");
  assert.ok(html.includes("còn 3 ngày"), "countdown label missing");
  assert.ok(html.includes("2026"), "valid-until date missing");
});

check("card without a target tour renders no tour link; source keeps the branch", () => {
  const html = renderToStaticMarkup(
    React.createElement(PromotionCard as never, {
      card: fixtureCard,
      countdownLabel: "Last day today",
      viewTourLabel: "View tour",
    })
  );
  assert.ok(!html.includes("/explore/destinations/"), "tour link must not render without slug");
  const source = readFileSync(
    new URL("../../src/components/deals/promotion-card.tsx", import.meta.url),
    "utf8"
  );
  assert.ok(source.includes("card.tourSlug &&"), "tour link guard missing");
  assert.ok(
    source.includes("href={`/explore/destinations/${card.tourSlug}`}"),
    "tour link must route to the destination detail page"
  );
});

check("card without a banner omits the image block", () => {
  const html = renderToStaticMarkup(
    React.createElement(PromotionCard as never, {
      card: { ...fixtureCard, bannerUrl: null },
      countdownLabel: "Last day today",
      viewTourLabel: "View tour",
    })
  );
  assert.ok(!html.includes("<img"), "img must not render without a banner");
});

/* --- messages --- */

check("deals.items removed from BOTH message files (hardcoded cards gone)", () => {
  assert.equal(en.deals.items, undefined, "en.deals.items still present");
  assert.equal(vi.deals.items, undefined, "vi.deals.items still present");
});

check("countdown/empty/CTA keys added to both locales; chrome keys kept", () => {
  for (const dict of [en.deals, vi.deals]) {
    for (const key of ["endsInDays", "lastDay", "empty", "viewTour", "title", "subtitle", "disclaimer"]) {
      assert.ok(typeof dict[key] === "string" && dict[key].length > 0, `deals.${key} missing`);
    }
  }
  assert.ok(en.deals.endsInDays.includes("plural"), "EN countdown must be ICU-plural");
  assert.equal(en.deals.title, "Deals & Packages", "browser L4 asserts this title");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
