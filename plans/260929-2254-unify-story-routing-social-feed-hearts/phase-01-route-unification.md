# Phase 01 — Route Unification (blog detail + news redirects)

**Status:** complete · **Plan:** [plan.md](./plan.md)

## Files
**Create**
- `src/app/[locale]/blog/[slug]/page.tsx` — moved from `src/app/[locale]/news/[...slug]/page.tsx` (catch-all → single segment):
  - `generateMetadata` (title from article, locale), `notFound()` when `getNewsArticle(slug, locale)` null.
  - Renders shared `FeedArticleBlock` (phase-02) in `single` mode + back-link to `/blog` (`blog.backToBlog` — reuse `news.backToList`? Keep `news.backToList` value "Back to articles"/"Quay lại bài viết" to avoid new keys; link href `/blog`).
  - Fix clustering: article container `mx-auto max-w-4xl` (was `max-w-3xl` no-mx-auto).
  - Include featured image + `<time>` (parity with feed block).

**Delete**
- `src/app/[locale]/news/[...slug]/page.tsx` (+ dir)
- `src/app/[locale]/news/page.tsx` (legacy list — reachable only by URL; nav-tested-absent in `l-navbar.mjs:10`)

**Edit**
- `next.config.ts` — add `async redirects() { return [{ source: "/news", destination: "/blog", permanent: true }, { source: "/news/:slug", destination: "/blog/:slug", permanent: true }] }` (locale-prefixed `/vi/news` handled by next-intl matcher? verify: next-intl rewrites `/vi/*` before redirects — if redirects don't see locale prefix, add `{ source: "/:locale(vi|en)/news", destination: "/:locale/blog" }` + slug variant; verify with curl 308 test both `/news` and `/vi/news`).
- `src/components/homepage/stories-section.tsx:34` — `/news/${slug}` → `/blog/${slug}`
- `src/components/news/news-item-card.tsx` — href → `/blog/${item.slug}`
- `src/app/sitemap.ts` — `/news` entry → `/blog`
- `src/app/[locale]/sitemap/page.tsx:78-83` — list `/news/<slug>` → `/blog/<slug>` (source stays `getNewsList`)
- `src/components/blog/newspaper-article.tsx:25` — link → `/blog/${slug}` (file renamed in phase-02; do href swap there if rename lands first)

## Verify
- `curl -I /news` + `/vi/news` + `/news/<slug>` → 308/301 → `/blog…` 200
- `/vi/blog/<slug>` 200 renders; `/vi/blog/missing` 404
- Old `x-blog-newspaper` X8 will fail until phase-04 rewrite (expected mid-flight)
