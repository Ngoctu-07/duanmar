# Phase 02 — `article` Schema + Data-Layer Repoint + Mock Purge

**Status**: Complete · **Depends on**: Phase 1 · **Priority**: High

## Schema `src/sanity/schemaTypes/article.ts` (replaces `post.ts`)
- `name: "article"`, title "Articles", document; fieldsets EN/VI (post precedent); `preview` (title + publishedAt).
- Fields: `title_en`/`title_vi` (string, required, fieldset) · `slug` (slug, source `title_en`, required, maxLength 96) · `excerpt_en`/`excerpt_vi` (text, rows 3, fieldset) · `content_en`/`content_vi` (**`type: "array", of:[{type:"block"}]`** Rich Text, fieldset) · `featuredImage` (image, hotspot, no validation) · `gallery` (array of images, hotspot, optional) · `publishedAt` (date, required, initialValue today) · `orderings: publishedAtDesc`.
- Register in `schemaTypes/index.ts`; **delete `post.ts`** + its import (D2).
- (If D1 single-locale chosen: single `title/slug/excerpt/content` + slug source `title`, no fieldsets.)

## Queries `src/sanity/queries/articles.ts` (delete `posts.ts`)
```
ARTICLES_QUERY      *[_type == "article" && defined(slug.current) && publishedAt <= now()] | order(publishedAt desc)[0...12]{ _id, title_en, title_vi, excerpt_en, excerpt_vi, slug, publishedAt, featuredImage { ${imageFragment} }, content_en, content_vi }
ARTICLE_BY_SLUG_QUERY *[_type == "article" && slug.current == $slug][0]{ …same… }
```
Tags unchanged: `sanity:news` / `sanity:news:${slug}` (webhook global revalidate model).

## Provider rewrite `src/lib/news-content-provider.ts` (CMS-only, KISS)
- `getNewsList` → `fetchPublished(ARTICLES_QUERY, {}, { tags:["sanity:news"] })`; **drop** static merge, dedupe, category resolution, `getStaticItems`, `resolveCategory`/`labelToCategoryKey`, `formatNewsDate` keep.
- `getNewsArticle` → `ARTICLE_BY_SLUG_QUERY`, no static fallback (detail `notFound()` already handles null).
- `getStories(locale, limit)` → latest articles (no category filter), locale pick for title/excerpt/content with other-locale fallback → StoriesSection + `/blog` unchanged call sites.
- `NewsItem`: drop `category` (or make optional) — verify `news-item-card.tsx` pill guard uses `item.category` truthiness (not just `showCategory`) so `/news` list doesn't render empty pills; adjust card/news page if needed.

## Consumers repoint
- `src/app/[locale]/news/[...slug]/page.tsx` — body: PT blocks → render via shared typography module (P3 `article-rich-text`), not `string[]` map; excerpt/title from provider (already).
- `src/app/[locale]/search/page.tsx:105-114` — replace `messages.news.items` loop with `await getNewsList()` (type "article", href `/news/${slug}`).
- `src/app/[locale]/sitemap/page.tsx:73-77` — same repoint (keep `/blog` links; `itineraries` untouched).

## Mock purge (D3)
- Delete `news.items` (926-971) from **both** messages; grep-recheck `news.categories` consumers → if only provider/card used it, delete from both too; keep `news.title/subtitle/viewArticle/backToList`.
- CMS: verified `*[_type=="post"]` = [] → nothing to delete; optional seed script per Q4.

## Verify
- `grep -rn "_type == \"post\"\|news.items\|POSTS_QUERY" src` → 0; `npx sanity schemas validate` → 0; Studio desk shows **Articles** (no "News & Stories"); create draft article in Studio → appears in `/news` list.
