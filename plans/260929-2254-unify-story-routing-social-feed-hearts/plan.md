# Plan: Unify Story Routing + Social-Style Feed + Heart Reactions

**Plan ID:** 260929-2254 · **Status:** complete · **Priority:** P1
**URLs:** `http://localhost:3000`, `/vi/blog`

## Current State (research refs)

- **Routing split:** homepage Stories cards → `/news/${slug}` (`stories-section.tsx:34`), nav/footer → `/blog` (`header.tsx:18`, `footer.tsx:13`); `/blog/[slug]` **404s** (no page), detail lives at `/news/[...slug]` (`page.tsx:30`, no featured image, `max-w-3xl` **without mx-auto** → left-hanging text = clustering cause #1). `/news` list also exists (untouched by nav, asserted absent in `l-navbar.mjs:10`).
- **Feed today = newspaper grid:** `newspaper-article.tsx:44` body uses `md:columns-2 md:gap-8 [&>*]:break-inside-avoid text-[15px]` — 2 narrow columns + forced break-avoid = clustering cause #2. No ordinals exist (X5 negative-asserts EN only).
- **No like/heart infra anywhere** (0 hits); Sanity `article` schema has no likes field; precedent = `vn-reviews:v1` localStorage module (`reviews.ts`) + client optimistic state + contact-route POST pattern.
- **Data:** `getNewsList/getNewsArticle/getStories` via `news-content-provider.ts`; `NewsItem {slug,title,date,isoDate,excerpt,content,featuredImageUrl?}` (no id → **slug is the stable key**, shared across en/vi ✓).
- **Node v24.21 → `node:sqlite` built in** (zero npm deps) for the like-count DB.
- **Tests encoding current contract:** `x-blog-newspaper.mjs` X6 (h2 size), **X7** (border-t rules), **X8** (`/news/` hrefs), **X9** (excerpt), **X10** (`columns-2` must exist) — X8/X10 must be rewritten to the new feed contract; X1/h1/Y4/L4/J1/F7 (nav+footer `/blog`, `blog.title` heading) **stay green**.

## Design

### 1. Unified routes
- Canonical: `/blog` = continuous feed · `/blog/[slug]` = single-article detail rendered by the **same** `FeedArticleBlock` (identical oversized title → full-width image → body → reaction bar). Homepage story cards → `/blog/${slug}`.
- `/news` + `/news/[...slug]` **deleted**; `next.config.ts` `redirects()` permanent: `/news` → `/blog`, `/news/:slug` → `/blog/:slug` (old links keep working).
- Href swaps: `stories-section.tsx:34`, `news-item-card.tsx` (href → `/blog/`), `newspaper-article.tsx` link, `sitemap.ts:23-27`, `sitemap/page.tsx:78-83`.

### 2. Social feed layout (replaces newspaper grid)
- `newspaper-article.tsx` → renamed **`feed-article-block.tsx`** (`FeedArticleBlock`), sequence per spec:
  1. Oversized title `text-4xl md:text-5xl font-bold tracking-tight` (link → detail)
  2. **Full-width** featured image (`w-full aspect-video rounded-xl`, when `featuredImageUrl`)
  3. Body: single-column full flow — `max-w-4xl mx-auto` wrapper, `text-lg leading-relaxed`, **no columns**; excerpt lead optional above body
  4. Bottom **reaction bar** (border-t row: heart button + count)
- `/blog/page.tsx`: keeps `h1 = blog.title` (L4/X2/Y4), `max-w-4xl mx-auto` stream, blocks stacked `border-t` divider → article → reaction bar → divider → article. **No ordinals** (EN+VI).

### 3. Heart reactions (1 like per browser, optimistic API)
- **DB:** `node:sqlite` file `data/article-likes.db` (table `likes(slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)`); `data/` gitignored.
- **API:** `POST /api/articles/[slug]/like` (415/400 guards like contact) → atomic `INSERT … ON CONFLICT DO UPDATE count=count+1` → 200 `{slug,count}`. No auth (documented, forgeable — same caveat as reviews).
- **Client storage:** `src/lib/article-likes.ts` — `vn-liked-articles:v1` (slug set) + `isArticleLiked/toggleArticleLiked` + changed-event (reviews precedent). Browser limited to 1 like/slugs.
- **Component:** `HeartButton` (client) in reaction bar: `initialCount`+`slug` props; unliked → fill `text-red-500 fill-current`, count +1 **optimistically**, POST (reconcile count on response, keep optimistic on failure); liked → no re-vote, stays red; `aria-pressed`, data-testid `like-button`, lucide `Heart`.
- Initial counts: feed/detail server components read SQLite → pass down.

### 4. i18n
- 2 new keys both locales: `blog.like` ("Like this article"/"Thích bài viết"), `blog.liked` ("Liked"/"Đã thích") → parity test green. Existing `blog.*`/`news.*` keys untouched (unit contract keeps `news.*`).

## Phases
`phase-01-route-unification.md` · `phase-02-social-feed-layout.md` · `phase-03-heart-reactions.md` · `phase-04-tests-docs.md`

## Sequencing & Gates
Approve → implement phases 1-4 → finish **email phase-04 tests** (plan 2229, still open) → **ONE combined close-out** for all 6 open plans (2114/2135/2151/2207/2229/2254): lint 0 → unit (19 → ~23) → build 0 → schema 0 → full `test:browser` (rewrite X8/X10; expect 21/22, revalidate-webhook env-fail only) → all status flips + reports + changelog bullets + `docs/` updates.

## Risks
- SQLite file path in read-only deploy environments → catch + degrade to count 0 (documented).
- `/news` redirect must not shadow `/news` assets (none exist).
- Optimistic UI can drift if POST fails (accepted per spec "optimistic").
- `x` test rewrite could mask regressions → rewrite asserts feed contract precisely (no columns-2, `/blog/` hrefs, reaction bar present).

**Docs impact:** minor (changelog, `docs/` notes, .gitignore `data/`).
