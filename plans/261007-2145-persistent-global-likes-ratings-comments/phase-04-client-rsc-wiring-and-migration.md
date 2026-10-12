# Phase 04 — Client + RSC wiring, localStorage → SQLite migration

## Context Links
- Components: `customer-reviews.tsx`, `write-review-form.tsx`, `review-actions-menu.tsx`, `use-write-review-state.ts`, `use-edit-window-gate.ts`, `tour-rating-badge.tsx`, `review-card.tsx`
- Badge consumers: `explore/destinations/[slug]/page.tsx:96`, `explore/map/page.tsx:78`, `explore/destinations/page.tsx` (via `destination-card.tsx:74`), `search-client.tsx:100`, `my-trips-client.tsx:87`, `my-trips-detail.tsx:88`
- Events: `vn-reviews:changed` (same-tab) + `storage` (cross-tab, bookings) — keep both
- i18n: `src/messages/en.json` / `vi.json` → `destinations.reviews.*`
- Tests driving UX: `g-reviews.mjs` (R1-R10), `k-review-actions.mjs` (K1-K6), `n-lightbox-contact.mjs`

## Overview
- **Priority**: P0
- **Status**: Not started
- **Description**: Move every review read/write to the API, hydrate detail/map/list surfaces from RSC with server aggregates, keep client-only surfaces fetching `/api/ratings`, and migrate `vn-reviews:v1` into SQLite exactly once.

## Key Insights
- No SWR/React Query in repo → plain `fetch` + the existing `vn-reviews:changed` event: `saveReviewApi`/`deleteReviewApi` dispatch it on success; badge + list subscribe and refetch (same pattern as today's localStorage event).
- Migration must be **idempotent, retry-safe and non-destructive on failure**: import entry-by-entry; drop entries the server accepts or rejects as 403/409/400/413 (server copy is canonical), stop on 429/5xx/503 (retry next mount), clear the key when done. Module-level in-flight promise prevents concurrent runs (badge mounts many times).
- Stale-local-overwrite hazard: after a successful API save, drop that `reference` from localStorage so a later migration cannot re-upload old content over a fresh save.
- Badge rendering: optional `initialAggregate` prop — RSC passes `{avg,count}|null` → badge renders synchronously (no slot flash); client-only surfaces leave it `undefined` → existing slot placeholder + fetch (testids/slot unchanged).
- Edit window stays double-gated: client (`useEditWindowGate` vs `/api/server-time`, keeps `editWindowClosed` hint) + server (409) — same user-visible copy as today.

## Requirements
### Functional
- [ ] `src/lib/reviews-api.ts` (~95 LOC): `fetchReviews(slug)`, `fetchRatingAggregates(slugs)`, `saveReviewApi(review)`, `deleteReviewApi(reference)`, `migrateLegacyReviews()` (once-guarded).
- [ ] `CustomerReviews`: `initialReviews` prop + `owned` flags; `refresh()` = `fetchReviews`; keeps bookings `storage` listener + `vn-reviews:changed`.
- [ ] `WriteReviewForm`: async API submit; errors → `errorSave` copy; 409 → `editWindowClosed`; booking gate unchanged (disabled wrapper + hint, no hint in SSR).
- [ ] `ReviewActionsMenu`: Delete → `deleteReviewApi` (owner), confirm copy unchanged; Edit still scrolls/focuses form.
- [ ] `useWriteReviewState`: existing review comes from fetched list (not localStorage); prefill/clear semantics preserved.
- [ ] `TourRatingBadge`: `initialAggregate` optional prop + API refetch on `vn-reviews:changed`; `tour-rating-badge` / `tour-rating-badge-slot` testids preserved; renders nothing at 0.
- [ ] RSC wiring: detail page passes `initialAggregate` + `initialReviews`; map page + destinations listing pass batch aggregates; search/my-trips keep client fetch (no RSC parent).
- [ ] i18n: new/updated copy exists in **both** `en.json` and `vi.json` (parity test green).

### Non-functional
- Every touched file <200 LOC (split hook if `write-review-form.tsx` would exceed).
- Booking gate behavior, 3h window copy, empty state, count text, order (section below price) unchanged.

## Architecture
```
RSC detail page ─► listReviewsForSlug + getRatingAggregates ─► initialReviews / initialAggregate props
CustomerReviews ─► fetch /api/reviews?slug=  ◄── refresh on vn-reviews:changed
WriteReviewForm ─► POST /api/reviews ─► dropLocalReview + dispatch event ─► refresh
Badge (RSC prop) ─► renders immediately; on event ─► GET /api/ratings (refetch)
Badge (no prop)  ─► slot placeholder ─► GET /api/ratings
mount(badge|reviews section) ─► migrateLegacyReviews() once ─► POST per legacy entry ─► clear key
```

## Related Code Files
**Create**: `src/lib/reviews-api.ts` (~95 LOC); optionally `src/components/reviews/use-submit-review.ts` (~60 LOC) if the form exceeds 200 LOC.

**Modify**
- `src/lib/reviews.ts` (remove `saveReview`/`deleteReview`/`getAggregate`; add `dropLocalReview`; keep read-only migration reader)
- `src/components/reviews/customer-reviews.tsx` (~140 LOC)
- `src/components/reviews/write-review-form.tsx` (~185 LOC)
- `src/components/reviews/review-actions-menu.tsx` (~125 LOC)
- `src/components/reviews/use-write-review-state.ts` (~95 LOC)
- `src/components/rating/tour-rating-badge.tsx` (~115 LOC)
- `src/app/[locale]/explore/destinations/[slug]/page.tsx` (aggregate + reviews props)
- `src/app/[locale]/explore/map/page.tsx` (batch aggregate), `src/app/[locale]/explore/destinations/page.tsx` + `destination-card.tsx` (optional `aggregate` prop)
- `src/messages/en.json`, `src/messages/vi.json`

**Delete**: none

## Implementation Steps
1. `reviews-api.ts`:
   - `fetchReviews(slug)` → typed `{reviews, aggregate}` (throws on non-ok → caller keeps prior state).
   - `saveReviewApi(review)` → POST; on 2xx `dropLocalReview(review.reference)` + `notifyChanged()` (reuse `vn-reviews:changed` dispatch from `reviews.ts`).
   - `deleteReviewApi(reference)` → DELETE + `dropLocalReview` + notify.
   - `migrateLegacyReviews()`: module `let inflight: Promise<void> | null`; run `listReviews()`; per entry POST with original `createdAt`; success/400/403/409/413 → `dropLocalReview`; 429/5xx → return (retry next mount); when list empties → `localStorage.removeItem(REVIEWS_STORAGE_KEY)`.
2. `tour-rating-badge.tsx`: add `initialAggregate?: {avg;count} | null`:
   - prop present → `loaded=true` immediately, render (or null at 0/absent);
   - prop absent → current slot + fetch `/api/ratings?slugs=slug`;
   - both paths subscribe to `vn-reviews:changed` → refetch API (no localStorage read anywhere); cross-tab `storage` listener only triggers refetch when `vn-reviews:v1` changes pre-migration (keep for one release, cheap).
3. `customer-reviews.tsx`: props `initialReviews?: (TourReview & {owned?: boolean})[]`; `refresh()` = async fetch; initial render uses props (SSR list + count, no empty flash); ownership set = `row.owned && isMyReview(row)`; call `void migrateLegacyReviews()` before first refresh.
4. `write-review-form.tsx`: `onSubmit` → `await saveReviewApi({...})`; map status → `errorSave` (400/500/503) / `editWindowClosed` (409) / generic; keep `onSaved()` → parent refresh; keep disabled/hint/gate semantics.
5. `review-actions-menu.tsx`: `onDelete` → `await deleteReviewApi(review.reference)`; confirm dialog first (copy unchanged); failure → no UI change (list refetch shows truth).
6. `use-write-review-state.ts`: `existing` looked up from parent-provided fetched list (prop `reviews`) instead of `listReviews()`; keep bookings `storage` listener.
7. RSC wiring:
   - detail page: `const visitor = readVisitor(await cookies())`; `listReviewsForSlug(slug)` + `getRatingAggregates([slug])` → `<CustomerReviews initialReviews … />`, `<TourRatingBadge slug initialAggregate … />`.
   - map page: `getRatingAggregates(itemSlugs)` → pass per item.
   - destinations listing page: batch aggregates → optional `aggregate` prop on `DestinationCard`.
8. i18n: add `destinations.reviews.errorSave` in **both** locales (en: "Could not save — please try again later.", vi: equivalent); leave all other keys untouched (parity test must pass).

## Todo List
- [ ] `src/lib/reviews-api.ts` (fetch/save/delete/migrate + once-guard)
- [ ] `reviews.ts` slim-down + `dropLocalReview`
- [ ] Badge `initialAggregate` + API refetch
- [ ] `CustomerReviews` props/fetch/ownership
- [ ] `WriteReviewForm` async submit + error mapping
- [ ] `ReviewActionsMenu` API delete
- [ ] `useWriteReviewState` server-sourced `existing`
- [ ] RSC wiring (detail, map, destinations list) + cookie read
- [ ] i18n keys ×2 locales
- [ ] `npx tsc --noEmit` + `npm run lint`

## Success Criteria
- Two browsers on the same tour page render identical badge numbers and identical review lists.
- Detail page SSR HTML contains the badge + review cards (no empty→populated flash).
- Submit/edit/delete work end-to-end; edits blocked after 3h (client hint + server 409).
- Legacy `vn-reviews:v1` entries appear in SQLite after one visit and the key is removed; a failed migration keeps data and retries later.
- Testids unchanged: `write-review-form`, `review-card`, `review-actions-*`, `tour-rating-badge`, `tour-rating-badge-slot`, `review-image-thumb`.

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration re-uploads stale copy over fresh save | High | `dropLocalReview` on every successful save/delete + full-key clear when migration completes |
| Concurrent badge mounts race migration | Medium | module-level in-flight promise |
| Props vs client fetch mismatch on soft nav | Low | state initialized from props; refetch on event |
| File size creep (>200 LOC) | Medium | extract `use-submit-review.ts` if needed |

## Security Considerations
- No `dangerouslySetInnerHTML`; comment rendered as text (React escapes).
- Booking gate remains client-side input validation — documented as non-authz; server still validates everything structural + ownership + window.
- Client never sees/stores the visitor id (HttpOnly); no email in list payloads.
- Image data URLs validated again server-side (defense in depth).

## Next Steps
→ `phase-05-tests.md`
