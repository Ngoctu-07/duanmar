# Implementation Report — Homepage Prune + `article` Schema + Blog CMS-Only

**Date**: 2026-09-29 · **Plan**: `plans/260929-2151-homepage-prune-article-cms-newspaper-blog/` · **Status**: Complete (100%)

## Approved decisions
- Homepage 10 → 6 sections (Hero → QuickAccess → Featured → AboutUs → Stories → Newsletter); ExperienceCategories/Itineraries/Events/Partners deleted.
- `post` schema → **bilingual `article`**; dataset had 0 post docs → no content migration.
- Newspaper 2-col detail layout built here was **superseded by 1-col feed** in plan 2254 (approved pivot).

## Changes
- `src/app/[locale]/page.tsx`: 6 sections; deleted 4 component files; removed 12 i18n keys bottom-up from en+vi (parity kept).
- Schema: NEW `src/sanity/schemaTypes/article.ts` (bilingual fieldsets, slug from `title_en`, featuredImage/gallery/publishedAt); deleted `post.ts` + `src/sanity/queries/posts.ts`.
- NEW `src/sanity/queries/articles.ts`: `ARTICLES_QUERY [0...12]`, `ARTICLE_BY_SLUG_QUERY`, shared `ARTICLE_FIELDS`.
- `news-content-provider.ts` rewritten CMS-only (signatures kept; static + category dropped); purge messages `news.items`/`news.categories`, keep contract keys; search/sitemap/news-detail repoint to `ARTICLES_QUERY`.
- NEW shared `src/components/sanity/portable-text.tsx` (`PT_COMPONENTS`, `pickLocaleBlocks`, `ArticleRichText`).
- NEW `scripts/seed-articles.mjs` (`npm run migrate:seed-articles`): 4 bilingual articles, idempotent, dry-run default; `--apply` awaits `SANITY_WRITE_TOKEN`.

## Verification
- Unit: NEW `article-schema-queries.test.mts` (groq-js parse of every query + projection/param guards) → runner 18 → **19/19** at the time, 21/21 in combined cycle.
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 (incl. `PT_COMPONENTS` children-optional type fix surfaced by first build) · schema 0 errors · suite 25/26 (sole fail = pre-existing `revalidate-webhook` env).

## Concerns
none — CMS live with 1 article (`starup`); data-driven tests pass at count 1.

## Docs impact
minor — changelog bullet + plan statuses + this report.
