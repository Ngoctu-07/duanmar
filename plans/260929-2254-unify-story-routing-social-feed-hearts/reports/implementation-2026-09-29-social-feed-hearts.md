# Implementation Report — Unified Story Routing + Social Feed + Heart Reactions

**Date**: 2026-09-29 · **Plan**: `plans/260929-2254-unify-story-routing-social-feed-hearts/` · **Status**: Complete (100%)

## Approved decisions
- `/news` → `/blog` via **permanent redirects in `next.config.ts`** (incl. `/:locale/…` variants); route files deleted, hrefs swapped.
- Detail page renders the **same `FeedArticleBlock`** as the feed (`single` prop = h1) — one layout system.
- Like counts: **`node:sqlite` file DB** (`data/article-likes.db`, Node 24 built-in, 0 deps); localStorage = identity (one like per browser, append-only).
- 1-col feed (`mx-auto max-w-4xl`) replacing newspaper `md:columns-2` (root cause of clustered text).

## Changes
- Routes: NEW `src/app/[locale]/blog/[slug]/page.tsx`; **deleted** `src/app/[locale]/news/` + `newspaper-article.tsx`; `next.config.ts` 4 redirects (`/news`→`/blog`, `/news/:slug`→`/blog/:slug`, + `/:locale` variants); href swaps in `stories-section.tsx`, search, `sitemap.ts`, sitemap page.
- Feed: NEW `src/components/blog/feed-article-block.tsx` — oversized title `text-4xl md:text-5xl` → full-width `aspect-video rounded-xl` image → 1-col `text-lg leading-relaxed` body → reaction bar; `border-t` dividers; **no ordinals** (EN `Article N` / VI `Bài N` both asserted absent); `blog/page.tsx` streams blocks.
- Hearts: NEW `src/lib/article-likes-db.ts` (sqlite, atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING`), `src/lib/article-likes.ts` (`vn-liked-articles:v1` + changed-event + `storage`), `src/app/api/articles/[slug]/like/route.ts` (slug regex 400, >1KB 413, GET 405, DB-down 503), `src/components/blog/heart-button.tsx` (`useSyncExternalStore`, optimistic +1, `text-red-500 fill-current`, `aria-pressed`, `blog.like`/`blog.liked` keys ×2 locales).
- `.gitignore` +`data/`.

## Verification
- `x-blog-newspaper.mjs` → **`x-blog-feed.mjs` 26/26** (hrefs `/blog/`, anti-columns-2 + wrapper, like-button, 308 redirect, detail unified + back-link, no `Bài \d`).
- NEW `e-social-feed-heart.mjs` **12/12**: API 200/400/405/413; click → pressed+red+count+1; re-click no increment; reload persists (localStorage); count matches server.
- NEW unit `article-likes.test.mts` (storage L1–L6 + sqlite D1–D5 incl. ENOTDIR degrade) → runner **21/21**.
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 · schema 0 errors · suite **25/26** (sole fail = pre-existing `revalidate-webhook` env); suite now 26 files (new `a`, `b`, `e`; renamed `x`; removed `u`).

## Concerns
none — all AC green; live article `starup` exercises feed/detail/heart paths.

## Docs impact
minor — changelog bullet + plan statuses + this report.
