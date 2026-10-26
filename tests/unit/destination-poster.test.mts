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
const { pickCardImage, pickMainPoster } = await import(
  "../../src/lib/destination-poster.ts"
);
const { parse } = await import("groq-js");

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const schemaSource = read("src/sanity/schemaTypes/destination.ts");
const migrationSource = read("scripts/backfill-tour-dual-images.mjs");
const cardSource = read("src/components/tours/tour-card.tsx");
const posterSource = read("src/components/explore/tour-poster.tsx");
const detailPage = read("src/app/[locale]/explore/destinations/[slug]/page.tsx");

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

check("every destination projection projects both dual-image fields", () => {
  for (const q of QUERIES) {
    assert.ok(q.includes('"cardThumbnail": cardThumbnail'), "cardThumbnail projection missing");
    assert.ok(q.includes('"mainPoster": mainPoster'), "mainPoster projection missing");
    assert.ok(q.includes('"posterImage": posterImage'), "legacy poster fallback projection missing");
    assert.ok(q.includes("metadata"), "fragment metadata missing");
  }
});

check("queries drop the gallery list; gallery[0] survives only as the legacy bridge", () => {
  for (const q of QUERIES) {
    assert.ok(!q.includes("galleryImages[]"), "gallery list projection must be gone");
    assert.ok(!q.includes("image {"), "legacy image projection must be gone");
    assert.ok(
      q.includes('"legacyGalleryImage": galleryImages[0]'),
      "legacy gallery[0] bridge must stay until the dual-image backfill runs"
    );
  }
});

check("DESTINATION_BY_SLUG_QUERY: dual images add no new params", () => {
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

check("schema: landscape cardThumbnail + portrait mainPoster, both hotspot-enabled", () => {
  assert.ok(
    /name: "cardThumbnail",\s*\n\s*title: "Homepage Card Image \(Landscape\)",\s*\n\s*type: "image"/.test(
      schemaSource
    ),
    "cardThumbnail field missing/wrong title"
  );
  assert.ok(
    schemaSource.includes('"Horizontal crop optimized for homepage featured tour cards."'),
    "cardThumbnail description missing"
  );
  assert.ok(
    /name: "mainPoster",\s*\n\s*title: "Main Poster Image \(Portrait \/ Standard\)",\s*\n\s*type: "image"/.test(
      schemaSource
    ),
    "mainPoster field missing/wrong title"
  );
  assert.ok(
    schemaSource.includes('"Standard full-size poster for detail pages and modals."'),
    "mainPoster description missing"
  );
  const hotspotCount = (schemaSource.match(/options: \{ hotspot: true \}/g) || []).length;
  assert.ok(hotspotCount >= 2, `expected hotspot on both fields, found ${hotspotCount}`);
  assert.ok(!schemaSource.includes('name: "galleryImages"'), "gallery array must be removed");
  assert.ok(!schemaSource.includes("rule.min(3)"), "min-3 gallery rule must be removed");
});

check("schema: legacy posterImage hidden/read-only, preview prefers the card crop", () => {
  assert.ok(
    /name: "posterImage"[\s\S]{0,500}hidden: true/.test(schemaSource),
    "legacy posterImage must be hidden"
  );
  assert.ok(
    /name: "posterImage"[\s\S]{0,500}readOnly: true/.test(schemaSource),
    "legacy posterImage must be read-only"
  );
  assert.ok(schemaSource.includes("media: cardThumbnail ?? mainPoster ?? legacyPoster"));
});

check("pickCardImage: cardThumbnail wins, mainPoster is the fallback", () => {
  const thumb = { asset: { url: "thumb.jpg" }, alt: "thumb" };
  const main = { asset: { url: "main.jpg" }, alt: "main" };
  const legacy = { asset: { url: "legacy.jpg" }, alt: "legacy" };
  assert.equal(pickCardImage({ cardThumbnail: thumb, mainPoster: main }), thumb);
  assert.equal(pickCardImage({ mainPoster: main, legacyGalleryImage: legacy }), main);
  assert.equal(pickCardImage({ posterImage: legacy }), legacy);
  assert.equal(pickCardImage({ legacyGalleryImage: legacy }), legacy);
  assert.equal(pickCardImage({}), null);
});

check("pickCardImage skips assets without a URL", () => {
  const main = { asset: { url: "main.jpg" } };
  assert.equal(pickCardImage({ cardThumbnail: { alt: "no asset" }, mainPoster: main }), main);
  assert.equal(pickCardImage({ cardThumbnail: {}, mainPoster: {} }), null);
});

check("pickMainPoster: mainPoster wins, legacy art is the fallback", () => {
  const thumb = { asset: { url: "thumb.jpg" }, alt: "thumb" };
  const main = { asset: { url: "main.jpg" }, alt: "main" };
  const legacy = { asset: { url: "legacy.jpg" }, alt: "legacy" };
  assert.equal(pickMainPoster({ mainPoster: main, cardThumbnail: thumb }), main);
  assert.equal(pickMainPoster({ posterImage: legacy, cardThumbnail: thumb }), legacy);
  assert.equal(pickMainPoster({ cardThumbnail: thumb }), thumb);
  assert.equal(pickMainPoster({}), null);
});

check("card renders cardThumbnail at 16:9 with object-cover", () => {
  assert.ok(cardSource.includes("pickCardImage(destination)"), "card must read pickCardImage");
  assert.ok(cardSource.includes("cardThumbnail?:"), "card Destination must expose cardThumbnail");
  assert.ok(cardSource.includes("mainPoster?:"), "card Destination must expose mainPoster");
  assert.ok(cardSource.includes("aspect-[16/9]"), "card frame must be 16:9");
  assert.ok(cardSource.includes("object-cover"), "card image must use object-cover");
});

check("detail poster renders mainPoster at 2:3 with object-cover", () => {
  assert.ok(detailPage.includes("pickMainPoster(destination)"), "detail must read pickMainPoster");
  assert.ok(posterSource.includes("aspect-[2/3]"), "poster frame must be 2:3");
  assert.ok(posterSource.includes("object-cover"), "poster image must use object-cover");
});

check("migration script copies legacy art into both dual fields, dry-run by default", () => {
  for (const token of ["cardThumbnail", "mainPoster", "posterImage", "galleryImages", "--apply"]) {
    assert.ok(migrationSource.includes(token), `script missing ${token}`);
  }
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
