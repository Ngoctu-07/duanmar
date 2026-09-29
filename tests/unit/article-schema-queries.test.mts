import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { ARTICLES_QUERY, ARTICLE_BY_SLUG_QUERY } = await import(
  "../../src/sanity/queries/articles.ts"
);
const { parse } = await import("groq-js");

const articleSchema = readFileSync(
  new URL("../../src/sanity/schemaTypes/article.ts", import.meta.url),
  "utf8"
);
const schemaIndex = readFileSync(
  new URL("../../src/sanity/schemaTypes/index.ts", import.meta.url),
  "utf8"
);
const readLocale = (loc: string) =>
  readFileSync(new URL(`../../src/messages/${loc}.json`, import.meta.url), "utf8");

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

check("both article queries exported and parse with groq-js", () => {
  assert.equal(typeof ARTICLES_QUERY, "string");
  assert.equal(typeof ARTICLE_BY_SLUG_QUERY, "string");
  parse(ARTICLES_QUERY);
  parse(ARTICLE_BY_SLUG_QUERY);
});

check('list query: _type == "article" + publish window + order desc', () => {
  assert.ok(ARTICLES_QUERY.includes('_type == "article"'));
  assert.ok(ARTICLES_QUERY.includes("publishedAt <= now()"));
  assert.ok(ARTICLES_QUERY.includes("order(publishedAt desc)"));
  assert.ok(ARTICLES_QUERY.includes("defined(slug.current)"));
});

check("by-slug query binds $slug param", () => {
  assert.ok(ARTICLE_BY_SLUG_QUERY.includes('slug.current == $slug'));
  assert.ok(ARTICLE_BY_SLUG_QUERY.includes("[0]"));
});

check("projection covers all article fields incl. featuredImage fragment", () => {
  for (const field of [
    "title_en", "title_vi", "excerpt_en", "excerpt_vi",
    "content_en", "content_vi", "slug", "publishedAt", "featuredImage",
  ]) {
    assert.ok(ARTICLES_QUERY.includes(field), `list projection missing ${field}`);
    assert.ok(ARTICLE_BY_SLUG_QUERY.includes(field), `slug projection missing ${field}`);
  }
  assert.ok(ARTICLES_QUERY.includes("asset->{ _id, url,"), "image fragment missing");
});

check("schema defines all required fields (title/slug/excerpt/content/featuredImage/gallery/publishedAt)", () => {
  for (const field of [
    "title_en", "title_vi", "slug", "excerpt_en", "excerpt_vi",
    "content_en", "content_vi", "featuredImage", "gallery", "publishedAt",
  ]) {
    assert.ok(articleSchema.includes(`name: "${field}"`), `schema missing ${field}`);
  }
  assert.ok(
    (articleSchema.match(/of: \[\{ type: "block" \}\]/g) ?? []).length >= 2,
    "content fields must be Portable Text block arrays"
  );
  assert.ok(articleSchema.includes('fieldset: "en"') && articleSchema.includes('fieldset: "vi"'),
    "bilingual fieldsets missing");
});

check("post type fully replaced: post.ts + POSTS_QUERY gone, article registered", () => {
  assert.ok(!schemaIndex.includes("'post'") && !schemaIndex.includes('"post"'),
    "post must not be registered in schema index");
  assert.ok(schemaIndex.includes("article"), "article must be registered");
  let postExists = true;
  try {
    readFileSync(new URL("../../src/sanity/schemaTypes/post.ts", import.meta.url));
  } catch {
    postExists = false;
  }
  assert.ok(!postExists, "post.ts must be deleted");
  let postsQueryExists = true;
  try {
    readFileSync(new URL("../../src/sanity/queries/posts.ts", import.meta.url));
  } catch {
    postsQueryExists = false;
  }
  assert.ok(!postsQueryExists, "queries/posts.ts must be deleted");
});

check("legacy mock stories purged from en+vi messages (parity kept)", () => {
  for (const loc of ["en", "vi"]) {
    const src = readLocale(loc);
    assert.ok(!/"items"\s*:\s*\{[^}]*record-arrivals/s.test(src), `${loc}: news.items mocks still present`);
    const parsed = JSON.parse(src);
    assert.ok(!("items" in parsed.news), `${loc}: news.items key must be gone`);
    assert.ok(!("categories" in parsed.news), `${loc}: news.categories key must be gone`);
    for (const key of ["title", "subtitle", "viewArticle", "backToList"]) {
      assert.ok(key in parsed.news, `${loc}: news.${key} must remain`);
    }
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);
