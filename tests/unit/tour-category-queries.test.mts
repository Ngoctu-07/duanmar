import assert from "node:assert/strict";

const {
  DESTINATIONS_QUERY,
  DESTINATION_BY_SLUG_QUERY,
  DESTINATIONS_BY_CATEGORY_QUERY,
  DESTINATION_SLUGS_QUERY,
  DESTINATIONS_BY_SLUGS_QUERY,
} = await import("../../src/sanity/queries/destinations.ts");
const { FEATURED_DESTINATIONS_QUERY } = await import(
  "../../src/sanity/queries/homepage.ts"
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

check("category query exported and non-empty", () => {
  assert.equal(typeof DESTINATIONS_BY_CATEGORY_QUERY, "string");
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.length > 0);
});

check("category query takes $category param", () => {
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes("$category"));
});

check("category query strict equality on $category", () => {
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes("category == $category"));
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes("$category"));
});

check("category query strictly excludes legacy/uncategorized docs", () => {
  assert.ok(
    !DESTINATIONS_BY_CATEGORY_QUERY.includes("!defined(category)"),
    "legacy-tolerant branch must be gone"
  );
  assert.ok(
    !DESTINATIONS_BY_CATEGORY_QUERY.includes("defined(category)"),
    "no defined(category) fallback of any kind"
  );
});

check("category query orders by name asc", () => {
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes("| order(name asc)"));
});

check("category query projects isSpecialTour", () => {
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes("isSpecialTour"));
});

check("DESTINATIONS_QUERY projection gained isSpecialTour", () => {
  assert.ok(DESTINATIONS_QUERY.includes("isSpecialTour"));
});

check("DESTINATIONS_QUERY call-site safety: $region kept, $category absent", () => {
  assert.ok(DESTINATIONS_QUERY.includes("$region"));
  assert.ok(!DESTINATIONS_QUERY.includes("$category"));
});

check("DESTINATION_BY_SLUG_QUERY: no difficultyLevel, isSpecialTour + $slug, no $category", () => {
  assert.ok(!DESTINATION_BY_SLUG_QUERY.includes("difficultyLevel"));
  assert.ok(DESTINATION_BY_SLUG_QUERY.includes("isSpecialTour"));
  assert.ok(DESTINATION_BY_SLUG_QUERY.includes("$slug"));
  assert.ok(!DESTINATION_BY_SLUG_QUERY.includes("$category"));
});

check("FEATURED_DESTINATIONS_QUERY: strict isFeatured == true, no old field, no params", () => {
  assert.ok(!FEATURED_DESTINATIONS_QUERY.includes("difficultyLevel"));
  assert.ok(FEATURED_DESTINATIONS_QUERY.includes("isSpecialTour"));
  assert.ok(FEATURED_DESTINATIONS_QUERY.includes("isFeatured == true"));
  assert.ok(
    !/\bfeatured\s*==/.test(FEATURED_DESTINATIONS_QUERY),
    "legacy `featured` field must not be queried"
  );
  assert.ok(!FEATURED_DESTINATIONS_QUERY.includes("$"));
});

check("projection queries keep image fragment + core fields, never difficultyLevel", () => {
  for (const q of [
    DESTINATIONS_QUERY,
    DESTINATION_BY_SLUG_QUERY,
    DESTINATIONS_BY_CATEGORY_QUERY,
    FEATURED_DESTINATIONS_QUERY,
  ]) {
    assert.ok(q.includes("image {"), "image fragment missing");
    assert.ok(q.includes("galleryImages[] {"), "galleryImages[] projection missing");
    assert.ok(!q.includes("difficultyLevel"), "difficultyLevel removed from schema");
    for (const field of ["_id", "name", "slug", "region"]) {
      assert.ok(q.includes(field), `${field} missing`);
    }
  }
});

check("card/chip queries project country->{vi,en} + category (locale rendering)", () => {
  for (const [name, q] of Object.entries({
    DESTINATIONS_QUERY,
    DESTINATION_BY_SLUG_QUERY,
    DESTINATIONS_BY_CATEGORY_QUERY,
    FEATURED_DESTINATIONS_QUERY,
  })) {
    assert.ok(q.includes("country->{"), `${name}: country-> projection missing`);
    assert.ok(q.includes('"vi": name.vi'), `${name}: vi name missing`);
    assert.ok(q.includes('"en": name.en'), `${name}: en name missing`);
    assert.ok(/\bcategory\b/.test(q), `${name}: category missing (domestic fallback)`);
  }
});

check("slug queries untouched (no category fields/params)", () => {
  for (const q of [DESTINATION_SLUGS_QUERY, DESTINATIONS_BY_SLUGS_QUERY]) {
    assert.ok(!q.includes("$category"));
    assert.ok(!q.includes("difficultyLevel"));
    assert.ok(!q.includes("isSpecialTour"));
  }
});

check("category query filters destination type", () => {
  assert.ok(DESTINATIONS_BY_CATEGORY_QUERY.includes('_type == "destination"'));
});

check("category query: no ternary, balanced parens (GROQ parse safety)", () => {
  assert.ok(
    !DESTINATIONS_BY_CATEGORY_QUERY.includes(" ? "),
    "GROQ has no ternary operator — use boolean logic"
  );
  const opens = (DESTINATIONS_BY_CATEGORY_QUERY.match(/\(/g) ?? []).length;
  const closes = (DESTINATIONS_BY_CATEGORY_QUERY.match(/\)/g) ?? []).length;
  assert.equal(opens, closes, `unbalanced parens: ${opens} vs ${closes}`);
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
