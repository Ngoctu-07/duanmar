import assert from "node:assert/strict";

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

const { localizeVouchers, normalizeVoucherLocale } = await import(
  "../../src/lib/vouchers/localize.ts"
);
const { pickPromotionText } = await import("../../src/lib/promotions.ts");

const voucher = {
  id: "v-1",
  promotionId: "promo-1",
  code: "TEST-CODE",
  title: "Tiêu đề lúc nhận",
  description: "Mô tả lúc nhận",
  price: "1.000 ₫",
  originalPrice: null,
  badge: "Ưu đãi",
  validUntil: "2026-12-31",
  tourSlug: "hcm",
  claimedAt: "2026-10-22T10:00:00.000Z",
};

const promo = {
  _id: "promo-1",
  title_en: "English title",
  title_vi: "Tiêu đề tiếng Việt",
  badgeTag_en: "EN BADGE",
  badgeTag_vi: "NHÃN VI",
  description_en: "English description",
  description_vi: "Mô tả tiếng Việt",
  validUntil: "2026-12-31",
};

check("EN locale selects title_en, description_en and badgeTag_en", () => {
  const [row] = localizeVouchers([voucher], [promo], "en");
  assert.equal(row.title, "English title");
  assert.equal(row.description, "English description");
  assert.equal(row.badge, "EN BADGE");
});

check("VI locale selects the Vietnamese fields", () => {
  const [row] = localizeVouchers([voucher], [promo], "vi");
  assert.equal(row.title, "Tiêu đề tiếng Việt");
  assert.equal(row.description, "Mô tả tiếng Việt");
  assert.equal(row.badge, "NHÃN VI");
});

check("missing English copy stays empty — never the Vietnamese field", () => {
  const partial = { ...promo, title_en: "", description_en: "", badgeTag_en: "" };
  const [row] = localizeVouchers([voucher], [partial], "en");
  assert.equal(row.title, "");
  assert.equal(row.description, "");
  assert.equal(row.badge, null);
});

check("missing Vietnamese copy stays empty on the VI site", () => {
  const partial = { ...promo, title_vi: "   ", description_vi: "", badgeTag_vi: null };
  const [row] = localizeVouchers([voucher], [partial], "vi");
  assert.equal(row.title, "");
  assert.equal(row.description, "");
  assert.equal(row.badge, null);
});

check("strict locale normalization maps region tags to a single language", () => {
  assert.equal(normalizeVoucherLocale("vi"), "vi");
  assert.equal(normalizeVoucherLocale("vi-VN"), "vi");
  assert.equal(normalizeVoucherLocale("en-US"), "en");
  assert.equal(normalizeVoucherLocale("fr"), "en");
  assert.equal(normalizeVoucherLocale(""), "en");

  const [enRow] = localizeVouchers([voucher], [promo], "en-US");
  assert.equal(enRow.title, "English title");
  const [viRow] = localizeVouchers([voucher], [promo], "vi-VN");
  assert.equal(viRow.title, "Tiêu đề tiếng Việt");
});

check("the same wallet never mixes languages within one locale", () => {
  // Two vouchers snapshotted in different languages must still render in ONE
  // language on a given request.
  const englishSnapshot = { ...voucher, id: "v-2", promotionId: "promo-1", title: "English snapshot" };
  const rows = localizeVouchers([voucher, englishSnapshot], [promo], "en");
  assert.deepEqual(
    rows.map((row) => row.title),
    ["English title", "English title"]
  );
  const viRows = localizeVouchers([voucher, englishSnapshot], [promo], "vi");
  assert.deepEqual(
    viRows.map((row) => row.title),
    ["Tiêu đề tiếng Việt", "Tiêu đề tiếng Việt"]
  );
});

check("deleted/archived promotion keeps the stored snapshot", () => {
  const [row] = localizeVouchers([voucher], [], "en");
  assert.equal(row.title, "Tiêu đề lúc nhận");
  assert.equal(row.description, "Mô tả lúc nhận");
  assert.equal(row.badge, "Ưu đãi");
});

check("claim contract fields are never rewritten", () => {
  const [row] = localizeVouchers([voucher], [promo], "en");
  assert.equal(row.code, "TEST-CODE");
  assert.equal(row.validUntil, "2026-12-31");
  assert.equal(row.price, "1.000 ₫");
});

check("unknown locale resolves to English, not Vietnamese", () => {
  const text = pickPromotionText(promo as never, "fr");
  assert.equal(text.title, "English title");
  assert.equal(text.description, "English description");
});

check("empty voucher list is returned untouched", () => {
  const rows: unknown[] = [];
  assert.equal(localizeVouchers(rows as never, [promo] as never, "en"), rows);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
