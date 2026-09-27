import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const loadMessages = (locale: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(new URL(`../../src/messages/${locale}.json`, import.meta.url), "utf8")
  ) as Record<string, unknown>;

const flattenKeys = (value: unknown, prefix: string, out: string[]) => {
  if (value !== null && typeof value === "object" && Object.keys(value as object).length > 0) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out.push(prefix);
};

const flatten = (locale: string) => {
  const keys: string[] = [];
  flattenKeys(loadMessages(locale), "", keys);
  return keys.sort();
};

const enKeys = flatten("en");
const viKeys = flatten("vi");
const missingInVi = enKeys.filter((key) => !viKeys.includes(key));
const missingInEn = viKeys.filter((key) => !enKeys.includes(key));

check("i18n en/vi message files are non-empty", () => {
  assert.ok(enKeys.length > 0, "en keys empty");
  assert.ok(viKeys.length > 0, "vi keys empty");
});

check("i18n en/vi flattened key counts match", () => {
  assert.equal(enKeys.length, viKeys.length, `en=${enKeys.length} vi=${viKeys.length}`);
});

check("i18n no keys missing in vi", () => {
  assert.deepEqual(missingInVi, []);
});

check("i18n no keys missing in en", () => {
  assert.deepEqual(missingInEn, []);
});

console.log(`\nen=${enKeys.length} vi=${viKeys.length} missingInVi=${missingInVi.length} missingInEn=${missingInEn.length}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
