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
const { pickPosterImage } = await import("../../src/lib/destination-poster.ts");
const { parse } = await import("groq-js");

const schemaSource = readFileSync(
  new URL("../../src/sanity/schemaTypes/destination.ts", import.meta.url),
  "utf8"
);
const migrationSource = readFileSync(
  new URL("../../scripts/backfill-destination-poster.mjs", import.meta.url),
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

check("all destination projections project one posterImage object", () => {
  for (const q of QUERIES) {
    assert.ok(q.includes('"posterImage":'), "posterImage projection missing");
    assert.ok(q.includes("coalesce(posterImage"), "poster must resolve a single object");
    assert.ok(q.includes("metadata"), "fragment metadata missing");
  }
});

check("queries drop the gallery list; gallery[0] survives only as the backfill bridge", () => {
  for (const q of QUERIES) {
    assert.ok(!q.includes("galleryImages[]"), "gallery list projection must be gone");
    assert.ok(!q.includes("image {"), "legacy image projection must be gone");
    assert.ok(
      q.includes("coalesce(posterImage, galleryImages[0])"),
      "legacy gallery[0] bridge must stay until the backfill runs"
    );
  }
});

check("DESTINATION_BY_SLUG_QUERY: poster adds no new params", () => {
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

check("schema: single required posterImage replaces the gallery array", () => {
  assert.ok(schemaSource.includes('name: "posterImage"'), "posterImage field missing");
  assert.ok(schemaSource.includes('type: "image"'), "posterImage must be an image asset");
  assert.ok(schemaSource.includes("options: { hotspot: true }"), "hotspot missing");
  assert.ok(
    /name: "posterImage"[\s\S]{0,400}rule\.required\(\)/.test(schemaSource),
    "posterImage must be required"
  );
  assert.ok(!schemaSource.includes('name: "galleryImages"'), "gallery array must be removed");
  assert.ok(!schemaSource.includes("rule.min(3)"), "min-3 gallery rule must be removed");
  assert.ok(
    schemaSource.includes('media: "posterImage"'),
    "preview media must point at the poster"
  );
});

check("pickPosterImage: asset URL wins, empty/missing asset returns null", () => {
  const poster = { asset: { url: "p.jpg" }, alt: "p" };
  assert.equal(pickPosterImage({ name: "x", posterImage: poster }), poster);
  assert.equal(pickPosterImage({ name: "x", posterImage: { alt: "no asset" } }), null);
  assert.equal(pickPosterImage({ name: "x", posterImage: {} }), null);
  assert.equal(pickPosterImage({ name: "x" }), null);
});

check("migration script maps the first gallery asset into posterImage", () => {
  assert.ok(migrationSource.includes("galleryImages"), "script must read the old gallery");
  assert.ok(migrationSource.includes("posterImage"), "script must write posterImage");
  assert.ok(migrationSource.includes("--apply"), "script must stay dry-run by default");
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
