# Phase 02 — Global persistent like/heart system

## Context Links
- `src/lib/article-likes-db.ts` (likes table, `ARTICLE_LIKES_SLUG_PATTERN`, degrade path)
- `src/lib/article-likes.ts` (legacy localStorage `vn-liked-articles:v1` — to be retired)
- `src/app/api/articles/[slug]/like/route.ts` (POST-only +1, no actor, 400/413/405/503 contract)
- `src/components/blog/heart-button.tsx` (`useSyncExternalStore` + optimistic POST, `data-testid="like-button"`)
- Hydration sites: `src/app/[locale]/blog/page.tsx:24`, `src/app/[locale]/blog/[slug]/page.tsx:38`, `src/components/blog/feed-article-block.tsx:68`
- Rate limit: `src/lib/assistant/rate-limit.ts`; IP: `src/lib/request-ip.ts` (phase 01)
- Browser test contract: `tests/browser/e-social-feed-heart.mjs` (E0-E11), `tests/browser/x-blog-feed.mjs` (X10b button-per-block)

## Overview
- **Priority**: P0
- **Status**: Not started
- **Description**: Turn the heart into a real, atomic, visitor-scoped toggle on the shared SQLite store, with a batch GET endpoint, server-rendered counts + liked state, and optimistic UI that reconciles with (and reverts on) the server.

## Key Insights
- Two tables: `likes(slug,count)` stays the fast read model; `like_votes(slug,visitor)` is the source of truth for "did THIS visitor vote". Toggle runs in one `BEGIN IMMEDIATE` transaction so concurrent visitors cannot corrupt the count.
- Unlike semantics: delete vote row, `count = MAX(count-1, 0)`, and `DELETE FROM likes WHERE slug=? AND count=0` (clean empty rows; readers treat missing row as 0).
- `initialLiked` in RSC requires `cookies()` → blog pages render dynamically (already dynamic: prerender-manifest has only 4 routes). No `force-dynamic` needed; verify build output anyway.
- Cookie is issued by the like POST (first-ever click) — before that the visitor is anonymous, so SSR correctly renders unliked.
- Existing test E8 ("second click keeps same count") encodes old no-revote semantics → must be rewritten to toggle semantics in phase 05 (testids unchanged).

## Requirements
### Functional
- [ ] `toggleArticleLike(slug, visitor)` → `{ count, isLiked }`, atomic, idempotent per visitor, floor at 0, no duplicate votes.
- [ ] `getArticleLikeCounts(slugs)` unchanged semantics (absent = 0).
- [ ] `getVisitorLikedSlugs(slugs, visitor)` batch lookup → `Map<string, boolean>`; no visitor → all `false`.
- [ ] `POST /api/articles/[slug]/like` returns `{slug,count,isLiked}`, issues `vn_visitor` when missing, rate limited.
- [ ] `GET /api/articles/likes?slugs=a,b` returns `{counts:{},liked:{}}` (≤50 slugs).
- [ ] HeartButton toggles both ways, optimistic, reconciles with server, reverts on failure.
- [ ] Legacy `vn-liked-articles:v1` cleared once client-side (server is source of truth).

### Non-functional
- Existing route contract preserved: bad slug 400, body >1KB 413, `GET /api/articles/[slug]/like` 405, DB down 503 (E0-E3 keep passing).

## Architecture
```
HeartButton click ─► POST /api/articles/[slug]/like ─► rate limit ─► ensure visitor ─► toggleArticleLike
                                          └─ Set-Cookie vn_visitor (if new)
RSC blog pages ─► cookies() ─► readVisitor ─► getArticleLikeCounts + getVisitorLikedSlugs ─► props
```

## Related Code Files
**Create**
- `src/app/api/articles/likes/route.ts` (~60 LOC)

**Modify**
- `src/lib/article-likes-db.ts` (73 → ~130 LOC: add toggle + liked lookup, use `withTransaction`)
- `src/lib/article-likes.ts` (43 → ~70 LOC: client API — `postLikeToggle(slug)`, `clearLegacyLikedArticles()`, remove localStorage vote flag logic)
- `src/app/api/articles/[slug]/like/route.ts` (47 → ~85 LOC: visitor + rate limit + toggle result)
- `src/components/blog/heart-button.tsx` (77 → ~115 LOC: toggle, `initialLiked` prop, revert-on-error)
- `src/components/blog/feed-article-block.tsx` (+`initialLiked` prop pass-through)
- `src/app/[locale]/blog/page.tsx`, `src/app/[locale]/blog/[slug]/page.tsx` (read cookie, compute liked map, pass prop)

**Delete**: none (legacy helpers removed from `article-likes.ts`, their unit tests rewritten in phase 05)

## Implementation Steps
1. `article-likes-db.ts` — add:
   ```ts
   export function toggleArticleLike(slug: string, visitor: string): { count: number; isLiked: boolean }
   ```
   validate slug + visitor (else throw `invalid slug` / `invalid visitor`); `getDb()` null → throw `db unavailable`;
   inside `withTransaction`: `SELECT 1 FROM like_votes WHERE slug=? AND visitor=?` →
   - exists → `DELETE FROM like_votes …`; `UPDATE likes SET count = MAX(count-1,0) WHERE slug=?`; `DELETE FROM likes WHERE slug=? AND count=0` → `{count: 0, isLiked: false}` (or the decremented count).
   - absent → `INSERT INTO like_votes … ON CONFLICT DO NOTHING`; `INSERT INTO likes(slug,count) VALUES(?,1) ON CONFLICT(slug) DO UPDATE SET count=count+1 RETURNING count` → `{count, isLiked:true}`.
   Add `getVisitorLikedSlugs(slugs, visitor): Map<string, boolean>` (visitor invalid → all false; chunked `IN` list like counts).
2. `POST /api/articles/[slug]/like` route: slug check 400 → content-length 413 → `checkRateLimit("like:"+resolveClientKey(req))` 429 → `issueVisitor` → `toggleArticleLike` → `NextResponse.json({slug,count,isLiked})` (cookie attached) → errors: `db unavailable` 503, other 500. Keep `runtime="nodejs"`, keep no-PII logging (slug/count only).
3. `GET /api/articles/likes/route.ts`: parse `?slugs=` (comma, ≤50, all must match pattern else 400) → counts + liked maps → 200 (degrade: empty maps, still 200) + cookie issuance when absent. Unknown/invalid slugs are filtered, never queried.
4. RSC hydration: in both blog pages `const visitor = readVisitor(await cookies())`; `getVisitorLikedSlugs(slugs, visitor)`; pass `initialLiked` through `FeedArticleBlock` → `HeartButton`.
5. `heart-button.tsx`: `useState(initialCount)` / `useState(initialLiked)`; click handler:
   - optimistic: `setLiked(!liked)`, `setCount(c => c + (liked ? -1 : 1))` (floor 0)
   - `await postLikeToggle(slug)` → on ok: `setCount(data.count)`, `setLiked(data.isLiked)` (authoritative)
   - on error/network: revert both to pre-click values.
   Keep `data-testid="like-button"`, `aria-pressed`, `aria-label` from `blog.like`/`blog.liked`, count in the existing `<span aria-live="polite">`. On mount call `clearLegacyLikedArticles()` (removes `vn-liked-articles:v1`, guarded try/catch).
6. `article-likes.ts` becomes the small client API (`postLikeToggle` → `fetch(POST)`, typed result, throws on non-ok) — no `useSyncExternalStore` dependency remains.

## Todo List
- [ ] toggle + liked lookup in `article-likes-db.ts`
- [ ] POST route: visitor + rate limit + `{slug,count,isLiked}` + Set-Cookie
- [ ] GET `/api/articles/likes` batch route
- [ ] blog RSC pages read cookie + pass `initialLiked`
- [ ] `FeedArticleBlock` / `HeartButton` toggle UI + optimistic revert
- [ ] `article-likes.ts` client rewrite + legacy key cleanup
- [ ] `npx tsc --noEmit` + `npm run lint`

## Success Criteria
- Two different browsers see the **same** count; each sees its own `isLiked`.
- Like → unlike → like round trip leaves count correct (no drift, floor 0, rows cleaned at 0).
- E0-E7, E11 pass unchanged; E8-E10 rewritten for toggle (phase 05) and pass.
- Concurrent/double-click cannot double-count (single transaction; client disables during in-flight).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Count drifts from `like_votes` cardinality | High | all writes go through `toggleArticleLike`; unit test asserts `count == COUNT(like_votes)` |
| Cookie blocked (private mode) | Medium | each request mints a fresh visitor → toggle self-balances; rate limit caps abuse; documented |
| Page becomes dynamic | Low | already dynamic; verify `next build` route is `ƒ` |
| Optimistic UI diverges after failure | Medium | revert to pre-click state on any failure (no silent lie) |

## Security Considerations
- Rate limit **before** DB work (spam consumes budget first); key = `like:<ip>` (own prefix, 60/min).
- Body cap 1KB; slug regex `^[a-z0-9-]{1,120}$`; visitor UUID validated server-side.
- HttpOnly cookie → client JS cannot spoof identity by reading it (forging still possible by sending arbitrary cookies — documented demo trust model, same as before).
- No PII in logs/payloads.

## Next Steps
→ `phase-03-reviews-ratings-server-store.md`
