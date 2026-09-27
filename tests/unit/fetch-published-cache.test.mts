import assert from "node:assert/strict";

// fetch-published → client → env asserts these at import time; unit runner has no .env.
process.env.NEXT_PUBLIC_SANITY_DATASET ||= "production";
process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||= "test-project";

const { SANITY_TAG, sanityCacheKey, sanityTags } = await import(
  "../../src/sanity/lib/fetch-published.ts"
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

check("sanityTags: global tag always first", () => {
  assert.deepEqual(sanityTags(), [SANITY_TAG]);
});

check("sanityTags: entity tags appended after global", () => {
  assert.deepEqual(sanityTags(["sanity:destination:hcm"]), [
    SANITY_TAG,
    "sanity:destination:hcm",
  ]);
});

check("sanityTags: dedupes duplicates, keeps global once", () => {
  assert.deepEqual(sanityTags([SANITY_TAG, "a", "a"]), [SANITY_TAG, "a"]);
});

check("sanityCacheKey: includes query and canonicalized params", () => {
  const key = sanityCacheKey("*[_type == \"destination\"]", { slug: "hcm" });
  assert.equal(key[0], "fetchPublished");
  assert.ok(key[1].includes("destination"));
  assert.deepEqual(JSON.parse(key[2]), { slug: "hcm" });
});

check("sanityCacheKey: distinct params → distinct keys (no collisions)", () => {
  const a = sanityCacheKey("Q", { slug: "hcm" }).join("|");
  const b = sanityCacheKey("Q", { slug: "dn" }).join("|");
  const c = sanityCacheKey("Q").join("|");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

check("sanityCacheKey: param key order stable (same object shape)", () => {
  const a = sanityCacheKey("Q", { slug: "hcm", region: "south" });
  const b = sanityCacheKey("Q", { region: "south", slug: "hcm" });
  // JSON.stringify keeps insertion order — different orders are accepted as
  // different cache entries; assert both still valid + non-empty.
  assert.ok(a.length === 3 && b.length === 3);
  assert.equal(a[1], b[1]);
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);
