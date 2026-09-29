# Homepage Section Pruning + CMS Article Schema + Newspaper Blog Refactor

**Date**: 2026-09-29 · **Type**: Feature (3-part) · **Status**: Complete · **Progress**: 100%

## Requirements
1. **Prune 4 homepage sections**: Đối tác & Truyền thông (`TradeCtaBand`), Sự kiện & lễ hội (`EventsTicker`), Hành trình gợi ý (`TrendingItineraries`), Loại hình trải nghiệm (`ExperienceCategories`) — keep **Câu chuyện & cảm hứng** (`StoriesSection`) with its current summary-widget layout (`NewsItemCard` grid), re-fed from the new article endpoint.
2. **CMS**: purge legacy mock stories · new `article` doc (title, slug, excerpt, content=Rich Text, featuredImage, gallery, publishedAt) · homepage summary pulls latest published articles.
3. **Blog `/blog` → editorial newspaper feed** (ref: image_701f46.jpg — not in workspace; designed from spec): multi-column, large headline, styled excerpt, rich body in CSS multi-columns, inline images, dividing rule lines, continuous stream (no "Article 1/2" labels), **modern red/black/white palette** (no sepia).

## Research key facts
- `page.tsx:38-53` renders 10 sections → post-prune 6: Hero → QuickAccess → Featured → AboutUs → **Stories** → Newsletter. Research: **0 tests** assert the 4 removed sections; `priceRanges`/queries stay (Featured uses them); next sibling of Stories = Newsletter.
- Orphaned i18n keys (delete from BOTH locales, parity test enforces): `home.trade.*`(110-114), `home.experienceCategories`+`nature/culture/food/beaches/wellness/nightlife`(96-102), `home.trendingViewAll`(103), `events.tickerTitle`(1164). **Keep** shared: `events.viewCalendar`, `festivals.*`, `itineraries.*`, `blog.*`.
- Mock stories = 4 static `news.items` in en/vi messages (926-971) + CMS `post` docs — **dataset verified empty of `post` docs** → purge = i18n only, zero CMS migration.
- Data layer: `news-content-provider.ts` (getNewsList/getNewsArticle/getStories) over `POSTS_QUERY` `_type=="post"`, static merge + category filter. Consumers: `/blog`, `/news`(+`[...slug]` detail), homepage StoriesSection, `search/page.tsx:105-114`, `sitemap/page.tsx:73-77`.
- PT precedent: `about-narrative.tsx` renderer + `next-sanity` PortableText (typed re-export, 0 new deps); narrative fields on homepage singleton.
- Tests: `l-navbar` L4 asserts `/vi/blog` h1 == `blog.title` (keep h1); `j`/`m` assert /blog links (keep). Browser files now 20 (u deleted, w added); free letters **x, y**.

## Decisions (via questions)
- **D1 localization**: bilingual fieldsets `title_en/_vi`, `excerpt_en/_vi`, `content_en/_vi` (PT blocks) — post precedent; featuredImage/gallery/publishedAt locale-neutral. *Alt*: single-locale literal fields.
- **D2 type fate**: **replace** `post` → `article` (delete `post.ts`, repoint all queries; no docs exist → no data migration; URLs `/news/[...slug]` unchanged). *Alt*: coexist.
- **D3 mock purge**: delete `news.items` (+ orphaned `news.categories` if unreferenced) from both messages; repoint search/sitemap to provider. Seeding option via question 4.
- **D4 blog layout**: bespoke `newspaper-article.tsx` feed blocks: `time` kicker (primary, uppercase) → huge `h2` → styled excerpt (`text-lg italic? muted`) → inline featuredImage figure → PT body in `md:columns-2 gap-8` (`break-inside-avoid`) → `border-t` rule between articles; empty state kept; h1 unchanged.

## Phases
1. [phase-01](phase-01-homepage-pruning.md) — delete 4 components + imports + i18n keys (both locales).
2. [phase-02](phase-02-article-schema-data-layer.md) — `article` schema, ARTICLES_QUERY×2, provider rewrite CMS-only, delete post schema/queries, repoint news detail/search/sitemap, purge static mocks.
3. [phase-03](phase-03-newspaper-blog-feed.md) — shared PT typography module, `newspaper-article.tsx`, blog page feed refactor, StoriesSection now serves latest articles.
4. [phase-04](phase-04-tests-gates-docs.md) — unit `article-schema-queries`, new `x-blog-newspaper` + `y-homepage-prune`, full gates (build+suite **also closes owed `260929-2135` gates**), docs for all 3 pending features.

## Gates
lint 0 · unit **19/19** (18+1) · build 0 · schema validate 0 · suite **21/22** (+x,+y; sole fail = revalidate env).

## Risks / Success
- Homepage Stories hidden until ≥1 article exists (empty → section renders null) → seed decision (Q4) mitigates; blog shows kept empty state.
- Search/sitemap reading deleted `news.items` → repointed in P2 (crash guard).
- Success: 4 sections + their keys gone; Studio has `article` type; homepage/blog serve CMS articles; newspaper feed on `/blog` (continuous, no ordinals, brand palette); all gates green; owed purge feature documented + closed.
