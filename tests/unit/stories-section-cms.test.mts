import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { STORIES_SECTION_QUERY } = await import(
  "../../src/sanity/queries/stories-section.ts"
);
const { STORIES_SECTION_SUBTITLE_DEFAULT } = await import(
  "../../src/lib/stories-section-copy.ts"
);
const { parse } = await import("groq-js");

const read = (path: string) =>
  readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const schema = read("sanity/schemaTypes/stories-section.ts");
const schemaIndex = read("sanity/schemaTypes/index.ts");
const structure = read("sanity/structure.ts");
const page = read("app/[locale]/page.tsx");
const component = read("components/homepage/stories-section.tsx");

const EXPECTED_SUBTITLE =
  "Mỗi bước chân là một ẩn số, mỗi điểm đến là một bí mật.";

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

/* --- shared fallback copy --- */

check("shared default subtitle matches the requested Vietnamese copy", () => {
  assert.equal(STORIES_SECTION_SUBTITLE_DEFAULT, EXPECTED_SUBTITLE);
});

/* --- Studio schema --- */

check("storiesSection document declares a subtitle string field", () => {
  assert.ok(schema.includes('name: "storiesSection"'));
  assert.ok(schema.includes('type: "document"'));
  assert.ok(schema.includes('name: "subtitle"'));
  assert.ok(/name: "subtitle"[\s\S]*?type: "string"/.test(schema));
});

check("subtitle field seeds the requested default value", () => {
  assert.ok(
    schema.includes("initialValue: STORIES_SECTION_SUBTITLE_DEFAULT"),
    "schema must use the shared default as initialValue"
  );
});

check("storiesSection is registered and exposed as a Studio singleton", () => {
  assert.ok(schemaIndex.includes("import storiesSection from './stories-section'"));
  assert.ok(schemaIndex.includes("storiesSection,"));
  assert.ok(structure.includes(".id('storiesSection')"));
  assert.ok(structure.includes(".documentId('storiesSection')"));
});

/* --- GROQ --- */

check("STORIES_SECTION_QUERY parses and projects the subtitle", () => {
  parse(STORIES_SECTION_QUERY);
  assert.ok(STORIES_SECTION_QUERY.includes('_type == "storiesSection"'));
  assert.ok(STORIES_SECTION_QUERY.includes("subtitle"));
  assert.ok(STORIES_SECTION_QUERY.includes("[0]"));
});

/* --- homepage wiring --- */

check("homepage fetches the CMS subtitle and passes it to the section", () => {
  assert.ok(page.includes("STORIES_SECTION_QUERY"));
  assert.ok(page.includes('tags: ["sanity:stories-section"]'));
  assert.ok(page.includes("storiesSectionData?.subtitle"));
  assert.ok(page.includes("<StoriesSection subtitle="));
});

/* --- component fallback + typography contract --- */

check("component keeps the requested subtitle as its hardcoded fallback", () => {
  assert.ok(component.includes("STORIES_SECTION_SUBTITLE_DEFAULT"));
  assert.ok(component.includes("subtitle = STORIES_SECTION_SUBTITLE_DEFAULT"));
  assert.ok(component.includes("subtitle?: string | null"));
});

check("subtitle uses Barlow body sans, muted dark styling and tracking", () => {
  for (const className of [
    "font-sans",
    "text-neutral-400",
    "opacity-80",
    "tracking-wider",
  ]) {
    assert.ok(component.includes(className), `missing ${className}`);
  }
  assert.ok(
    !component.includes("text-muted-foreground"),
    "legacy muted token must be replaced by text-neutral-400"
  );
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
