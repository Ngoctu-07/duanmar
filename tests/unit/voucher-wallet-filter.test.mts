import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Wallet ↔ master-promotion validation + orphan cleanup.
 *
 * W1–W7 exercise the pure filter (missing master, inactive master, legacy docs,
 * mixed order, dedupe, localization handoff).
 * W8–W12 lock the server wiring: the GROQ projection exposes `isActive`, the
 * loader fails open on a failed CMS read and never purges then, only orphaned
 * rows are deleted (scoped to the user), and both wallet consumers + the JSON
 * API go through the loader.
 */

const { filterWalletVouchers, isLiveMasterPromotion } = await import(
  "../../src/lib/vouchers/wallet-filter.ts"
);
const { localizeVouchers } = await import("../../src/lib/vouchers/localize.ts");

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");
const query = read("../../src/sanity/queries/promotions.ts");
const loader = read("../../src/lib/vouchers/load-voucher-wallet.ts");
const store = read("../../src/lib/vouchers/voucher-store.ts");
const account = read("../../src/app/[locale]/account/page.tsx");
const checkout = read("../../src/app/[locale]/booking/checkout/page.tsx");
const api = read("../../src/app/api/vouchers/route.ts");
const wallet = read("../../src/components/account/voucher-wallet.tsx");

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

const voucher = (overrides = {}) => ({
  id: "v-1",
  promotionId: "promo-1",
  code: "CODE-1",
  title: "Claim snapshot",
  description: "",
  price: null,
  originalPrice: null,
  badge: null,
  validUntil: null,
  tourSlug: null,
  claimedAt: "2026-10-27T10:00:00.000Z",
  ...overrides,
});

const promo = (overrides = {}) => ({
  _id: "promo-1",
  title_en: "Live deal",
  isActive: true,
  ...overrides,
});

check("W1 missing master → hidden and reported as orphaned", () => {
  const result = filterWalletVouchers([voucher()], []);
  assert.equal(result.visible.length, 0);
  assert.deepEqual(result.orphanedPromotionIds, ["promo-1"]);
  assert.deepEqual(result.inactivePromotionIds, []);
});

check("W2 inactive master → hidden, kept (not orphaned)", () => {
  const result = filterWalletVouchers([voucher()], [promo({ isActive: false })]);
  assert.equal(result.visible.length, 0);
  assert.deepEqual(result.orphanedPromotionIds, []);
  assert.deepEqual(result.inactivePromotionIds, ["promo-1"]);
});

check("W3 active master → visible with its live promotion", () => {
  const result = filterWalletVouchers([voucher()], [promo()]);
  assert.deepEqual(result.visible.map((row) => row.id), ["v-1"]);
  assert.deepEqual(result.livePromotions.map((row) => row._id), ["promo-1"]);
});

check("W4 legacy docs without isActive count as live; explicit false does not", () => {
  assert.equal(isLiveMasterPromotion({ _id: "p" }), true);
  assert.equal(isLiveMasterPromotion({ _id: "p", isActive: null }), true);
  assert.equal(isLiveMasterPromotion({ _id: "p", isActive: undefined }), true);
  assert.equal(isLiveMasterPromotion({ _id: "p", isActive: true }), true);
  assert.equal(isLiveMasterPromotion({ _id: "p", isActive: false }), false);
  assert.equal(isLiveMasterPromotion({ _id: "" }), false);
  assert.equal(isLiveMasterPromotion(null), false);
});

check("W5 mixed wallet keeps order and separates orphaned from inactive", () => {
  const rows = [
    voucher({ id: "v-1", promotionId: "promo-1" }),
    voucher({ id: "v-2", promotionId: "promo-2" }),
    voucher({ id: "v-3", promotionId: "promo-3" }),
    voucher({ id: "v-4", promotionId: "promo-4" }),
  ];
  const result = filterWalletVouchers(rows, [
    promo({ _id: "promo-1" }),
    promo({ _id: "promo-3", isActive: false }),
    promo({ _id: "promo-4" }),
  ]);
  assert.deepEqual(result.visible.map((row) => row.id), ["v-1", "v-4"]);
  assert.deepEqual(result.orphanedPromotionIds, ["promo-2"]);
  assert.deepEqual(result.inactivePromotionIds, ["promo-3"]);
});

check("W6 orphan/inactive IDs are deduped", () => {
  const rows = [
    voucher({ id: "v-1", promotionId: "gone" }),
    voucher({ id: "v-2", promotionId: "gone" }),
    voucher({ id: "v-3", promotionId: "off" }),
    voucher({ id: "v-4", promotionId: "off" }),
  ];
  const result = filterWalletVouchers(rows, [promo({ _id: "off", isActive: false })]);
  assert.deepEqual(result.orphanedPromotionIds, ["gone"]);
  assert.deepEqual(result.inactivePromotionIds, ["off"]);
});

check("W7 localization only receives live masters, so hidden rows cannot leak", () => {
  const rows = [
    voucher({ id: "v-1", promotionId: "promo-1" }),
    voucher({ id: "v-2", promotionId: "promo-deleted" }),
  ];
  const filtered = filterWalletVouchers(rows, [promo({ title_en: "Live title" })]);
  const views = localizeVouchers(filtered.visible, filtered.livePromotions, "en");
  assert.deepEqual(views.map((row) => row.id), ["v-1"]);
  assert.equal(views[0].title, "Live title");
});

check("W8 GROQ projects isActive for wallet master validation", () => {
  assert.ok(query.includes("isActive,"), "promotion projection must include isActive");
  assert.ok(
    query.includes("*[_type == \"promotion\" && _id in $ids]"),
    "wallet lookup must stay id-based"
  );
});

check("W9 loader hides stale rows and purges only orphaned IDs, scoped to the user", () => {
  assert.ok(loader.includes("filterWalletVouchers("));
  assert.ok(loader.includes("deleteVouchersByPromotionIds(userId, orphanedPromotionIds)"));
  assert.ok(loader.includes("purgeOrphans && orphanedPromotionIds.length > 0"));
  assert.ok(store.includes("DELETE FROM vouchers WHERE user_id = ? AND promotion_id IN"));
  assert.ok(!loader.includes("deleteVouchersByPromotionIds(userId, inactivePromotionIds)"));
});

check("W10 failed CMS read fails open and never purges", () => {
  const failOpen = loader.indexOf("if (promotions === null)");
  const filter = loader.indexOf("filterWalletVouchers(");
  assert.ok(failOpen > -1 && failOpen < filter, "null read must return before filtering");
  assert.match(
    loader.slice(failOpen, filter),
    /vouchers: wallet,\s*promotions: \[\],\s*degraded: true,\s*purgedCount: 0/s
  );
});

check("W11 account + checkout + JSON API all use the master-validated loader", () => {
  assert.ok(account.includes("loadVoucherWallet"));
  assert.ok(account.includes("purgeOrphans: true"), "dashboard must purge orphans");
  assert.ok(checkout.includes("loadVoucherWallet"));
  assert.ok(!checkout.includes("purgeOrphans"), "checkout GET must stay read-only");
  assert.ok(api.includes("loadWalletRows"));
  assert.ok(!api.includes("listVouchers"), "API must not return raw snapshots");
});

check("W12 wallet render strips malformed/orphaned payloads without throwing", () => {
  for (const needle of [
    "isRenderableVoucher",
    "vouchers.filter(isRenderableVoucher)",
    "renderable.length === 0",
    "renderable.map((voucher)",
  ]) {
    assert.ok(wallet.includes(needle), `voucher wallet missing ${needle}`);
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
