# Phase 05 — Tests (unit + browser)

## Context Links
- Runner: `npm test` → `tests/run-unit.mjs` (discovers `tests/unit/*.test.{ts,mts}`, `npx tsx`, `node:assert/strict` + local `check()`, exit 1)
- Browser: `npm run test:browser` → `tests/run-browser.mjs` (needs `npm run dev` on :3000, runs `tests/browser/*.mjs` alphabetical)
- Existing: `tests/unit/article-likes.test.mts`, `tests/unit/reviews.test.ts`, `tests/unit/edit-window.test.ts`, `tests/browser/e-social-feed-heart.mjs`, `g-reviews.mjs`, `k-review-actions.mjs`, `n-lightbox-contact.mjs`, `x-blog-feed.mjs`
- Constraints: keep testids; no mocks/fakes to pass; temp-DB + fresh-import degrade pattern from `article-likes.test.mts`

## Overview
- **Priority**: P1
- **Status**: Not started
- **Description**: Prove the new server semantics (toggle atomicity, true averages, ownership/window) and rewrite the browser assertions that encoded device-local storage behavior — same testids, updated expectations, no weakened coverage.

## Key Insights
- DB-persistence tests need a **deterministic visitor cookie** convention so cleanup is possible (DELETE is owner-only): helper sets `vn_visitor=<fixed uuid>` per test file via `page.setCookie` / explicit `Cookie` header on Node `fetch`.
- Cross-test DB pollution: review browser tests must clean their probe references **before and after** (finally-block); `g-reviews` R1 needs `hcm` empty → pre-clean + post-clean via API using the fixed cookie.
- Old storage assertions (R9 localStorage payload, K4 storage payload, E9 "localStorage") become API assertions — coverage is preserved, mechanism changes.
- E8/E9/E10 semantics flip from "no re-vote" to "toggle": second click **unlikes** (count-1, `aria-pressed=false`), reload still shows server truth.

## Requirements
- [ ] Unit: new coverage for sqlite-store, visitor cookie, reviews-db (incl. AVG 4.0), validation, likes toggle.
- [ ] Unit: rewrite/remove tests whose subject was removed (`article-likes` L1-L6 localStorage votes, `reviews.ts` `saveReview`/`deleteReview`/`getAggregate` tests); keep pure-helper tests.
- [ ] Browser: update `e-social-feed-heart.mjs` (toggle + cookie + GET counts), `g-reviews.mjs` (R9/R10 API), `k-review-actions.mjs` (seed/cleanup via API+migration, orphan ownership), `n-lightbox-contact.mjs` (server cleanup).
- [ ] Browser: NEW `g2-global-ratings.mjs` proving cross-session identical averages.
- [ ] `x-blog-feed.mjs`, `c-booking.mjs` must stay green untouched.

## Architecture
```
tests/helpers/reviews-api.mjs   (shared: fixed visitor cookie, list/delete-all for a slug,
                                 seedReview(ref, slug, rating, ageMs), waitForBadge)
unit tests ─► temp DB via env + fresh module import (?query) ─► real node:sqlite, no mocks
browser tests ─► localhost:3000 API (Node fetch with Cookie header) + page.setCookie
```

## Related Code Files
**Create**
- `tests/helpers/reviews-api.mjs` (~110 LOC)
- `tests/unit/sqlite-store.test.mts`, `tests/unit/visitor.test.mts` (from phase 01)
- `tests/unit/reviews-db.test.mts` (~150 LOC), `tests/unit/reviews-validation.test.mts` (~90 LOC)
- `tests/browser/g2-global-ratings.mjs` (~150 LOC)

**Modify**: `tests/unit/article-likes.test.mts`, `tests/unit/reviews.test.ts`, `tests/browser/e-social-feed-heart.mjs`, `g-reviews.mjs`, `k-review-actions.mjs`, `n-lightbox-contact.mjs`

**Delete**: none (assertions replaced in place)

## Implementation Steps
1. **Unit — likes toggle** (`article-likes.test.mts`, keep temp-DB D1-D5 style):
   - like → `{count:1,isLiked:true}`; unlike → `{count:0,isLiked:false}` + `likes` row removed; re-like → 1.
   - two visitors: A likes (1), B likes (2), A unlikes (1), B still liked.
   - floor: force stale `likes.count=0` with a vote present → unlike stays 0, no negative.
   - invariant: `count == SELECT COUNT(*) FROM like_votes WHERE slug=?` after random sequences.
   - `getVisitorLikedSlugs` batch + invalid visitor → all false; degrade path unchanged.
   - replace L1-L6: now test `postLikeToggle`-adjacent client helpers that exist (`clearLegacyLikedArticles` removes key, tolerant of private-mode throw).
2. **Unit — `reviews-db.test.mts`**: temp DB; upsert create; `created_at` preserved on edit (original not self-extended); non-owner edit throws `not owner`; edit after 3h throws `edit window closed` (inject `now`); delete owner/foreign/not-found; `getRatingAggregates` → 3,4,5 ⇒ `{avg:4,count:3}` (assert `avg === 4.0`), batch with unknown/invalid slugs absent, DB-down ⇒ empty map; rating CHECK rejects 0/6; images JSON round-trip.
3. **Unit — `reviews-validation.test.mts`**: each cap/pattern boundary (comment 2000/2001, reference regex, future `createdAt` rejected, SVG data URL rejected, >3 images rejected).
4. **Unit — `reviews.test.ts`**: drop `saveReview`/`deleteReview`/`getAggregate` blocks; keep `isReview` (migration guard), `listReviews` (corrupt/private-mode), `formatRating`, `reviewsForSlug`, `hasBookingForSlug`, `isMyReview`, `downscaleImageToDataUrl`; add `dropLocalReview` removes only target reference.
5. **Browser — `e-social-feed-heart.mjs`**: keep E0-E3 (contract), E4-E7 (feed/click/optimistic); rewrite E8 → second click unlikes (`pressed=false`, count = before-1, ≥0); E9 → reload keeps state from **server cookie** (assert `vn_visitor` present via Node `fetch` response `set-cookie`: `HttpOnly`, `Path=/`, `SameSite=Lax`); E10 → SSR count equals last server count; add E12: `GET /api/articles/likes?slugs=<probe>` → `{counts,liked}` matches button.
6. **Browser — `g-reviews.mjs`**: pre-clean `hcm` (helper deletes probe refs with fixed cookie); R9 storage check → `GET /api/reviews?slug=hcm` shows 1 review, ≤3 JPEG images; R10 cleanup → `DELETE` API (page.evaluate fetch, cookie auto-sent) + clear localStorage → reload → empty state + badge gone; add check that migration path still imports a seeded `vn-reviews:v1` entry (R5 unchanged otherwise).
7. **Browser — `k-review-actions.mjs`**: seed via localStorage+reload (migration) as today; K1 orphan semantics unchanged (UI gate); K4 storage assertion → API assertion (0 rows after delete); final cleanup deletes server rows too.
8. **Browser — `n-lightbox-contact.mjs`**: cleanup helper also deletes `VN-N-*` rows server-side (otherwise g/k isolation breaks).
9. **Browser — NEW `g2-global-ratings.mjs`**: Node `fetch` seeds 3 reviews (ratings 3,4,5) on slug `hcmc` with 3 distinct `vn_visitor` cookies; `GET /api/ratings?slugs=hcmc` ⇒ `{avg:4,count:3}` from a **4th** cookieless session; browser (fresh profile) loads `/vi/explore/destinations/hcmc` → `tour-rating-badge` text starts `4.0`; second fresh profile → identical text; cleanup deletes all 3 rows (finally) + asserts 0 left.

## Todo List
- [ ] `tests/helpers/reviews-api.mjs`
- [ ] unit: sqlite-store / visitor / reviews-db / reviews-validation
- [ ] unit: update `article-likes.test.mts`, `reviews.test.ts`
- [ ] browser: update e / g / k / n
- [ ] browser: NEW `g2-global-ratings.mjs`
- [ ] run `npm test` (all files) and `npm run test:browser` (all files) green

## Success Criteria
- `npm test` → 100% files pass (no skipped/faked assertions).
- `npm run test:browser` → all files pass, including untouched `x-blog-feed`, `c-booking`, `n-lightbox-contact`.
- Average rendered in two independent sessions is byte-identical (g2).
- No test asserts localStorage as the source of truth for likes/reviews anymore (except migration-reader tests).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| DB leftovers from crashed runs break R1 "0 reviews" | Medium | pre-clean in helper; fixed visitor cookie so rows are deletable; document residual risk |
| g2 pollutes badges used by g/k (slug `hcmc`, not `hcm`) | Medium | use non-`hcm` slug + finally-block cleanup with assertion |
| Timing flakiness (async fetch after click) | Medium | `waitForFunction` on rendered text instead of fixed sleeps where possible |
| Dev server env without `data/` write access | Low | degrade path already unit-tested; browser tests fail loudly (correct) |

## Security Considerations
- Tests must not ship credentials; only generated UUID cookies.
- Assertions must not require PII (email never in API payload).

## Next Steps
→ `phase-06-docs-and-verification.md`
