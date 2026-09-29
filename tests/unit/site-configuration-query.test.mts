import assert from "node:assert/strict";

const { SITE_CONFIGURATION_QUERY } = await import(
  "../../src/sanity/queries/site-configuration.ts"
);
const { parse } = await import("groq-js");

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

check("SITE_CONFIGURATION_QUERY exported and non-empty", () => {
  assert.equal(typeof SITE_CONFIGURATION_QUERY, "string");
  assert.ok(SITE_CONFIGURATION_QUERY.length > 0);
});

check('singleton accessor: _type == "siteConfiguration" + [0]', () => {
  assert.ok(SITE_CONFIGURATION_QUERY.includes('_type == "siteConfiguration"'));
  assert.ok(SITE_CONFIGURATION_QUERY.includes("[0]"));
});

check("projects enableEntryPopup", () => {
  assert.ok(SITE_CONFIGURATION_QUERY.includes("enableEntryPopup"));
});

check("projects entryPopupImage with image fragment (url + metadata)", () => {
  assert.ok(SITE_CONFIGURATION_QUERY.includes("entryPopupImage"));
  assert.ok(SITE_CONFIGURATION_QUERY.includes("asset"));
  assert.ok(SITE_CONFIGURATION_QUERY.includes("url"));
  assert.ok(SITE_CONFIGURATION_QUERY.includes("metadata"));
});

check("projects per-locale promo assets popupImage_vi + popupImage_en (plan 260929-1617)", () => {
  assert.ok(SITE_CONFIGURATION_QUERY.includes("popupImage_vi {"));
  assert.ok(SITE_CONFIGURATION_QUERY.includes("popupImage_en {"));
});

check("query parses with groq-js (projection commas)", () => {
  parse(SITE_CONFIGURATION_QUERY);
});

check("no $ params (layout call site passes {})", () => {
  assert.ok(!SITE_CONFIGURATION_QUERY.includes("$"));
});

check("no ternary (GROQ parse safety)", () => {
  assert.ok(
    !SITE_CONFIGURATION_QUERY.includes(" ? "),
    "GROQ has no ternary operator — use boolean logic"
  );
});

check("balanced parens", () => {
  const opens = (SITE_CONFIGURATION_QUERY.match(/\(/g) ?? []).length;
  const closes = (SITE_CONFIGURATION_QUERY.match(/\)/g) ?? []).length;
  assert.equal(opens, closes, `unbalanced parens: ${opens} vs ${closes}`);
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
