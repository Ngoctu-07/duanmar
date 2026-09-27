import assert from "node:assert/strict";
import {
  buildPriceRanges,
  buildPriceRangeLabels,
  formatPriceRange,
  getCurrency,
  mapPricingTiers,
} from "../../src/lib/pricing.ts";

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
}

const tier = (
  vnd: number | null,
  usd: number | null,
  min = 1,
  max: number | null = 3
) => ({
  pricePerGuestVnd: vnd,
  pricePerGuestUsd: usd,
  groupTotalVnd: typeof vnd === "number" && Number.isFinite(vnd) ? vnd * 6 : vnd,
  groupTotalUsd: typeof usd === "number" && Number.isFinite(usd) ? usd * 6 : usd,
  minGuests: min,
  maxGuests: max,
});

check("empty input → {}", () => {
  assert.deepEqual(buildPriceRanges(undefined), {});
  assert.deepEqual(buildPriceRanges(null), {});
  assert.deepEqual(buildPriceRanges([]), {});
});

check("single doc, 2 tiers → min/max per currency", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "hcm", tiers: [tier(1290000, 52), tier(1850000, 75, 4, 7)] },
  ]);
  assert.deepEqual(ranges["hcm"]?.VND, { min: 1290000, max: 1850000 });
  assert.deepEqual(ranges["hcm"]?.USD, { min: 52, max: 75 });
});

check("min === max kept as single value", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "dn", tiers: [tier(500000, 20), tier(500000, 20, 4, 7)] },
  ]);
  assert.deepEqual(ranges["dn"]?.VND, { min: 500000, max: 500000 });
});

check("malformed tier dropped per currency (null / negative / NaN / string)", () => {
  const ranges = buildPriceRanges([
    {
      tourSlug: "x",
      tiers: [tier(null, null), tier(-5, 20), tier(Number.NaN, 30), tier("10" as unknown as number, 40)],
    },
  ]);
  assert.deepEqual(ranges["x"]?.VND, undefined, "VND must be omitted");
  assert.deepEqual(ranges["x"]?.USD, { min: 20, max: 40 });
});

check("missing price in one currency → that currency omitted", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "only-vnd", tiers: [tier(1000000, null)] },
  ]);
  assert.deepEqual(ranges["only-vnd"]?.USD, undefined);
  assert.deepEqual(ranges["only-vnd"]?.VND, { min: 1000000, max: 1000000 });
});

check("duplicate slug → first (newest) doc wins", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "hcm", tiers: [tier(2000000, 80)] },
    { tourSlug: "hcm", tiers: [tier(1000000, 40)] },
  ]);
  assert.deepEqual(ranges["hcm"]?.VND, { min: 2000000, max: 2000000 });
});

check("blank / missing slug skipped", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "   ", tiers: [tier(1, 1)] },
    { tiers: [tier(1, 1)] },
    { tourSlug: "ok", tiers: [tier(1000, 5)] },
  ]);
  assert.deepEqual(Object.keys(ranges), ["ok"]);
});

check("currency: VI→VND, EN/other→USD", () => {
  assert.equal(getCurrency("vi"), "VND");
  assert.equal(getCurrency("en"), "USD");
  assert.equal(getCurrency("fr"), "USD");
});

check("formatPriceRange null when range undefined", () => {
  assert.equal(formatPriceRange(undefined, "vi"), null);
});

check("formatPriceRange min===max → no duplicated range", () => {
  const text = formatPriceRange({ min: 500000, max: 500000 }, "vi");
  assert.ok(text?.includes("500.000"), text);
  assert.ok(text && !text.includes("–"), text);
});

check("formatPriceRange range uses locale currency + en dash", () => {
  const vi = formatPriceRange({ min: 1290000, max: 1850000 }, "vi");
  assert.ok(vi?.includes("1.290.000"), vi);
  assert.ok(vi?.includes("1.850.000"), vi);
  assert.ok(vi?.includes("₫"), vi);
  assert.ok(vi?.includes(" – "), vi);

  const en = formatPriceRange({ min: 52, max: 75 }, "en");
  assert.ok(en?.includes("$52"), en);
  assert.ok(en?.includes("$75"), en);
});

check("buildPriceRangeLabels → locale picks currency, drops unsupported", () => {
  const docs = [
    { tourSlug: "hcm", tiers: [tier(1290000, 52), tier(1850000, 75, 4, 7)] },
    { tourSlug: "only-vnd", tiers: [tier(900000, null)] },
  ];
  const vi = buildPriceRangeLabels(docs, "vi", "Giá tham khảo");
  assert.deepEqual(Object.keys(vi).sort(), ["hcm", "only-vnd"]);
  assert.equal(vi["hcm"]?.label, "Giá tham khảo");
  assert.ok(vi["hcm"]?.text.includes("₫"));

  const en = buildPriceRangeLabels(docs, "en", "Reference price");
  assert.deepEqual(Object.keys(en), ["hcm"]);
  assert.ok(en["hcm"]?.text.includes("$"));
});

check("zero price is unusable (no fake 0 on listing)", () => {
  const docs = [{ tourSlug: "free", tiers: [tier(0, 0), tier(0, null, 4, 7)] }];
  assert.deepEqual(buildPriceRanges(docs), { free: {} });
  assert.deepEqual(buildPriceRangeLabels(docs, "vi", "Giá tham khảo"), {});
  assert.deepEqual(buildPriceRangeLabels(docs, "en", "Reference price"), {});
});

check("newest doc unusable → hidden, no fallback to older doc", () => {
  const ranges = buildPriceRanges([
    { tourSlug: "hcm", tiers: [tier(null, null)] },
    { tourSlug: "hcm", tiers: [tier(1000000, 40)] },
  ]);
  assert.deepEqual(ranges["hcm"], {}, "older doc must not leak");
});

check("regression: mapPricingTiers still filters malformed rows", () => {
  const tiers = mapPricingTiers(
    { tiers: [tier(1000, 5), tier(null, null, 4, 7), tier(Number.NaN, 1, 8, null), tier(0, 0, 8, 9)] },
    "vi"
  );
  assert.equal(tiers.length, 1);
  assert.equal(tiers[0]?.minGuests, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
