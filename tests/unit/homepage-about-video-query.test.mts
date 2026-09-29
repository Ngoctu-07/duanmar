import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { HOMEPAGE_QUERY, FEATURED_DESTINATIONS_QUERY } = await import(
  "../../src/sanity/queries/homepage.ts"
);
const schemaSource = readFileSync(
  new URL("../../src/sanity/schemaTypes/homepage.ts", import.meta.url),
  "utf8"
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

check("HOMEPAGE_QUERY exported and non-empty", () => {
  assert.equal(typeof HOMEPAGE_QUERY, "string");
  assert.ok(HOMEPAGE_QUERY.length > 0);
});

check('singleton accessor: _type == "homepage" + [0]', () => {
  assert.ok(HOMEPAGE_QUERY.includes('_type == "homepage"'));
  assert.ok(HOMEPAGE_QUERY.includes("[0]"));
});

check("projects aboutUsVideo file asset url", () => {
  assert.ok(HOMEPAGE_QUERY.includes("aboutUsVideo"));
  assert.ok(HOMEPAGE_QUERY.includes("asset->{url}"));
});

check("projects aboutUsVideoStreamUrl", () => {
  assert.ok(HOMEPAGE_QUERY.includes("aboutUsVideoStreamUrl"));
});

check("projects aboutUsVideoPoster with url + dimensions", () => {
  assert.ok(HOMEPAGE_QUERY.includes("aboutUsVideoPoster"));
  assert.ok(HOMEPAGE_QUERY.includes("metadata{dimensions{width, height}}"));
});

check("hero projection untouched", () => {
  for (const field of ["title", "heroTitle", "heroSubtitle", "heroImage"]) {
    assert.ok(HOMEPAGE_QUERY.includes(field), `${field} missing`);
  }
  assert.ok(HOMEPAGE_QUERY.includes("heroImage {"));
});

check("no $ params (page.tsx call site passes {})", () => {
  assert.ok(!HOMEPAGE_QUERY.includes("$"));
});

check("no ternary + balanced parens (GROQ parse safety)", () => {
  assert.ok(!HOMEPAGE_QUERY.includes(" ? "));
  const opens = (HOMEPAGE_QUERY.match(/\(/g) ?? []).length;
  const closes = (HOMEPAGE_QUERY.match(/\)/g) ?? []).length;
  assert.equal(opens, closes, `unbalanced parens: ${opens} vs ${closes}`);
});

check("FEATURED query untouched by this feature (still no params)", () => {
  assert.ok(!FEATURED_DESTINATIONS_QUERY.includes("$"));
  assert.ok(FEATURED_DESTINATIONS_QUERY.includes("isFeatured == true"));
});

check("schema defines aboutUsVideo (file), stream url, poster (image)", () => {
  for (const field of ["aboutUsVideo", "aboutUsVideoStreamUrl", "aboutUsVideoPoster"]) {
    assert.ok(schemaSource.includes(`name: "${field}"`), `${field} missing in schema`);
  }
  assert.ok(schemaSource.includes('type: "file"'));
  assert.ok(schemaSource.includes('accept: "video/mp4,video/webm"'));
  assert.ok(schemaSource.includes('name: "aboutUsVideoStreamUrl"')
    && schemaSource.includes('type: "url"'));
});

check("teamGallery fully purged from query + schema (plan 260929-2135)", () => {
  assert.ok(
    !HOMEPAGE_QUERY.includes("teamGallery"),
    "teamGallery projection must be removed from HOMEPAGE_QUERY"
  );
  assert.ok(
    !schemaSource.includes("teamGallery"),
    "teamGallery field must be removed from homepage schema"
  );
  assert.ok(
    !schemaSource.includes("rule.required().length(3)"),
    "gallery length(3) validation must be removed"
  );
});

check("HOMEPAGE_QUERY still interpolates image fragment (hero media)", () => {
  assert.ok(HOMEPAGE_QUERY.includes("asset->{ _id, url,"), "image fragment missing");
});

check("HOMEPAGE_QUERY projects narrativeStory_en + narrativeStory_vi", () => {
  assert.ok(HOMEPAGE_QUERY.includes("narrativeStory_en"), "narrativeStory_en missing");
  assert.ok(HOMEPAGE_QUERY.includes("narrativeStory_vi"), "narrativeStory_vi missing");
});

check("schema defines bilingual Portable Text narrative fields", () => {
  for (const field of ["narrativeStory_en", "narrativeStory_vi"]) {
    assert.ok(schemaSource.includes(`name: "${field}"`), `${field} missing`);
  }
  assert.ok(
    (schemaSource.match(/of: \[\{ type: "block" \}\]/g) ?? []).length >= 2,
    "both narrative fields must be Portable Text block arrays"
  );
});

check("placeholder copy removed from messages (en + vi parity)", () => {
  for (const loc of ["en", "vi"]) {
    const src = readFileSync(
      new URL(`../../src/messages/${loc}.json`, import.meta.url),
      "utf8"
    );
    assert.ok(
      !/"aboutSection"\s*:\s*\{[^}]*"body"/s.test(src),
      `${loc}: aboutSection.body placeholder still present`
    );
  }
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
