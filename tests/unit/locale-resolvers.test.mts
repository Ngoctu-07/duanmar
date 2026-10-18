import assert from "node:assert/strict";
import {
  resolveLocaleBlocks,
  resolveLocaleList,
  resolveLocaleString,
  resolveLocalizedField,
} from "../../src/lib/bilingual-string.ts";

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

check("legacy plain string passes through (both locales)", () => {
  assert.equal(resolveLocaleString("Hà Nội", "vi"), "Hà Nội");
  assert.equal(resolveLocaleString("Hà Nội", "en"), "Hà Nội");
});

check("active locale wins when present", () => {
  const v = { vi: "Hà Nội", en: "Hanoi" };
  assert.equal(resolveLocaleString(v, "vi"), "Hà Nội");
  assert.equal(resolveLocaleString(v, "en"), "Hanoi");
});

check("empty en falls back to vi (never blank)", () => {
  assert.equal(resolveLocaleString({ vi: "Hà Nội", en: "" }, "en"), "Hà Nội");
  assert.equal(resolveLocaleString({ vi: "Hà Nội", en: null }, "en"), "Hà Nội");
  assert.equal(resolveLocaleString({ vi: "Hà Nội" }, "en"), "Hà Nội");
});

check("empty vi falls back to en", () => {
  assert.equal(resolveLocaleString({ vi: "", en: "Hanoi" }, "vi"), "Hanoi");
});

check("both blank → null (callers use ?? fallback)", () => {
  assert.equal(resolveLocaleString({ vi: "  ", en: "" }, "en"), null);
  assert.equal(resolveLocaleString(null, "en"), null);
});

check("unknown locale falls back to vi", () => {
  assert.equal(resolveLocaleString({ vi: "Hà Nội", en: "Hanoi" }, "fr"), "Hà Nội");
});

check("lists: legacy array passes through; empty active falls back to vi", () => {
  assert.deepEqual(resolveLocaleList(["a", "b"], "en"), ["a", "b"]);
  assert.deepEqual(resolveLocaleList({ vi: ["Ăn sáng"], en: [] }, "en"), ["Ăn sáng"]);
  assert.deepEqual(resolveLocaleList({ vi: [], en: ["Breakfast"] }, "vi"), ["Breakfast"]);
  assert.deepEqual(resolveLocaleList(null, "en"), []);
  assert.deepEqual(resolveLocaleList({ vi: ["  ", ""], en: null }, "en"), []);
});

check("blocks: legacy array passes through; empty active falls back to vi", () => {
  const viBlock = { _type: "block", children: [{ _type: "span", text: "Xin chào" }] };
  const enBlock = { _type: "block", children: [{ _type: "span", text: "Hello" }] };
  assert.deepEqual(resolveLocaleBlocks([viBlock] as never, "en"), [viBlock]);
  assert.deepEqual(resolveLocaleBlocks({ vi: [viBlock], en: [] } as never, "en"), [viBlock]);
  assert.deepEqual(resolveLocaleBlocks({ vi: [], en: [enBlock] } as never, "vi"), [enBlock]);
  assert.deepEqual(resolveLocaleBlocks(null, "en"), []);
});

check("resolveLocalizedField: EN renders descriptionEn", () => {
  assert.equal(
    resolveLocalizedField("Mô tả tiếng Việt", "English overview", "en"),
    "English overview"
  );
  assert.equal(resolveLocalizedField("Mô tả tiếng Việt", "  English  ", "en"), "English");
});

check("resolveLocalizedField: empty/missing EN falls back to base (never blank)", () => {
  assert.equal(resolveLocalizedField("Mô tả", null, "en"), "Mô tả");
  assert.equal(resolveLocalizedField("Mô tả", "", "en"), "Mô tả");
  assert.equal(resolveLocalizedField("Mô tả", "   ", "en"), "Mô tả");
  assert.equal(resolveLocalizedField(null, null, "en"), null);
});

check("resolveLocalizedField: VI (and unknown) renders the base only", () => {
  assert.equal(resolveLocalizedField("Mô tả", "English", "vi"), "Mô tả");
  assert.equal(resolveLocalizedField("Mô tả", "English", "fr"), "Mô tả");
});

check("resolveLocalizedField: bilingual base object still resolves per locale", () => {
  const base = { vi: "Mô tả", en: "Overview" };
  assert.equal(resolveLocalizedField(base, "English", "en"), "English");
  assert.equal(resolveLocalizedField(base, null, "en"), "Overview");
  assert.equal(resolveLocalizedField(base, "English", "vi"), "Mô tả");
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
