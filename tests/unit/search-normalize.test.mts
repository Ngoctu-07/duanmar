import { normalizeSearchText } from "../../src/lib/search-normalize.ts";

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

check("strips Vietnamese diacritics (NFD)", () => {
  if (normalizeSearchText("Hà Nội") !== "ha noi") throw new Error(normalizeSearchText("Hà Nội"));
});

check("đ/Đ folds to d/D", () => {
  if (normalizeSearchText("Đà Lạt") !== "da lat") throw new Error(normalizeSearchText("Đà Lạt"));
});

check("lowercases ASCII + accented letters", () => {
  if (normalizeSearchText("Ha Long BAY") !== "ha long bay") throw new Error(normalizeSearchText("Ha Long BAY"));
});

check("mixed cased Vietnamese", () => {
  if (normalizeSearchText("Vịnh Hạ Long") !== "vinh ha long") throw new Error(normalizeSearchText("Vịnh Hạ Long"));
});

check("idempotent", () => {
  const once = normalizeSearchText("Cà Mau trải nghiệm");
  if (normalizeSearchText(once) !== once) throw new Error("second pass changed output");
});

check("empty string stays empty", () => {
  if (normalizeSearchText("") !== "") throw new Error("expected empty");
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
