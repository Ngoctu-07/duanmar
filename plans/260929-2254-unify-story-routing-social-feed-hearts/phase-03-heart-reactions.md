# Phase 03 — Heart Reactions (SQLite counts + per-browser liked state)

**Status:** complete · **Plan:** [plan.md](./plan.md)

## Files
**Create**
1. `src/lib/article-likes-db.ts` (server-only)
   - `node:sqlite` `DatabaseSync` at `data/article-likes.db` (mkdir `data/` recursive; lazy singleton).
   - `incrementArticleLike(slug): number` — `INSERT INTO likes(slug,count) VALUES(?,1) ON CONFLICT(slug) DO UPDATE SET count=count+1 RETURNING count`; slug regex `^[a-z0-9-]{1,120}$` else throw.
   - `getArticleLikeCounts(slugs): Map<string,number>` — one `IN` query.
   - Any open/query error → log once, return 0/degrade (read-only FS resilience).
   - `data/` added to `.gitignore`.

2. `src/lib/article-likes.ts` (client)
   - Key `vn-liked-articles:v1` + event `vn-liked-articles:changed` (reviews pattern).
   - `isArticleLiked(slug)`, `markArticleLiked(slug)` (never un-likes — 1 like/browser, no vote removal per spec), tolerant of bad JSON/private mode.
   - `getLikedArticleSlugs()`.

3. `src/app/api/articles/[slug]/like/route.ts`
   - `runtime="nodejs"`; `POST` only (GET→405).
   - Guards: slug path regex → 400; optional JSON body tolerated (content-type free — accept empty body POST: skip 415 chain, but guard oversize `content-length > 1000` → 413; **no PII**).
   - `incrementArticleLike` → 200 `{slug, count}`; validation/DB error → 400/500 `{error}`.

4. `src/components/blog/heart-button.tsx` (client, `"use client"`)
   - Props `{ slug, initialCount }`.
   - State: `liked` (init from `isArticleLiked` in `useEffect` — SSR-safe), `count` = `initialCount + (optimistic && !servered ? 1 : 0)`:
     - click when `!liked`: `markArticleLiked(slug)`, `setLiked(true)`, `setCount(c => c+1)` **optimistic**, `fetch POST` → on `{count}` reconcile `setCount(count)`; on failure keep optimistic (log console.warn).
     - click when `liked`: no-op (no duplicate vote, stays red).
   - Render: `<button type="button" aria-pressed={liked} aria-label={t(liked?"liked":"like")} data-testid="like-button" className="…">` lucide `<Heart className={liked ? "text-red-500 fill-current" : "text-muted-foreground"} />` + `<span aria-live="polite">{count}</span>`.

**Edit**
- `feed-article-block.tsx` — reaction bar row: `<div className="mt-8 flex items-center gap-2 border-t border-border pt-4"><HeartButton … /></div>`.
- `blog/page.tsx` — server: `getArticleLikeCounts(items.map(i=>i.slug))` → pass `initialLikeCount`.
- `blog/[slug]/page.tsx` — same for single item.
- `src/messages/en.json` + `vi.json` — `blog.like` ("Like this article"/"Thích bài viết"), `blog.liked` ("Liked"/"Đã thích").

## Verify
- POST `/api/articles/<slug>/like` → 200 `{count}`; repeat → +1 each call
- Feed heart: click → red + count+1 instantly; reload → still red; second click → no increment
- `npm run lint` 0; i18n parity 2 keys
