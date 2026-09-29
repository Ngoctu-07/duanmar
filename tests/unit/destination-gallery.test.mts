import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  DESTINATIONS_QUERY,
  DESTINATION_BY_SLUG_QUERY,
  DESTINATIONS_BY_CATEGORY_QUERY,
} = await import("../../src/sanity/queries/destinations.ts");
const { FEATURED_DESTINATIONS_QUERY } = await import(
  "../../src/sanity/queries/homepage.ts"
);
const { pickCoverImage, pickGalleryImages } = await import(
  "../../src/lib/destination-gallery.ts"
);
const { parse } = await import("groq-js");

const schemaSource = readFileSync(
  new URL("../../src/sanity/schemaTypes/destination.ts", import.meta.url),
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

const QUERIES = [
  DESTINATIONS_QUERY,
  DESTINATION_BY_SLUG_QUERY,
  DESTINATIONS_BY_CATEGORY_QUERY,
  FEATURED_DESTINATIONS_QUERY,
];

check("all destination projections project galleryImages[] with image fragment", () => {
  for (const q of QUERIES) {
    assert.ok(q.includes("galleryImages[] {"), "galleryImages[] projection missing");
    assert.ok(q.includes("metadata"), "fragment metadata missing");
  }
});

check("legacy image projection kept as fallback during migration (D1)", () => {
  for (const q of QUERIES) {
    assert.ok(q.includes("image {"), "legacy image fragment missing");
  }
});

check("DESTINATION_BY_SLUG_QUERY: gallery adds no new params", () => {
  const dollars = DESTINATION_BY_SLUG_QUERY.match(/\$[a-zA-Z]+/g) ?? [];
  assert.deepEqual([...new Set(dollars)], ["$slug"]);
});

check("all destination queries parse with groq-js (projection commas)", () => {
  const names: Record<string, string> = {
    DESTINATIONS_QUERY,
    DESTINATION_BY_SLUG_QUERY,
    DESTINATIONS_BY_CATEGORY_QUERY,
    FEATURED_DESTINATIONS_QUERY,
  };
  for (const [name, query] of Object.entries(names)) {
    try {
      parse(query);
    } catch (error) {
      throw new Error(`${name}: ${(error as Error).message}`);
    }
  }
});

check("schema replaces image field with galleryImages array (min 3, required)", () => {
  assert.ok(schemaSource.includes('name: "galleryImages"'), "galleryImages field missing");
  assert.ok(schemaSource.includes("rule.min(3).required()"), "min-3 validation missing");
  assert.ok(!schemaSource.includes('name: "image"'), "legacy image field still in schema");
  assert.ok(
    schemaSource.includes('media: "galleryImages"'),
    "preview media must point at gallery"
  );
});

check("pickCoverImage: gallery[0] wins, legacy image fallback, null otherwise", () => {
  const g = { asset: { url: "g.jpg" }, alt: "g" };
  const i = { asset: { url: "i.jpg" }, alt: "i" };
  assert.equal(pickCoverImage({ name: "x", galleryImages: [g, i], image: i }), g);
  assert.equal(pickCoverImage({ name: "x", galleryImages: [], image: i }), i);
  assert.equal(pickCoverImage({ name: "x", image: i }), i);
  assert.equal(pickCoverImage({ name: "x" }), null);
});

check("pickGalleryImages: gallery list, legacy singleton, empty last resort", () => {
  const a = { asset: { url: "a.jpg" } };
  const b = { asset: { url: "b.jpg" } };
  const bad = { alt: "no asset" };
  const legacy = { asset: { url: "legacy.jpg" } };
  assert.deepEqual(pickGalleryImages({ name: "x", galleryImages: [a, b] }), [a, b]);
  assert.deepEqual(
    pickGalleryImages({ name: "x", galleryImages: [a, bad], image: legacy }),
    [a],
    "entries without asset.url are dropped"
  );
  assert.deepEqual(pickGalleryImages({ name: "x", galleryImages: [], image: legacy }), [
    legacy,
  ]);
  assert.deepEqual(pickGalleryImages({ name: "x" }), []);
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
