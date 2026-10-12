# Phase 03 — Public persistent comments + star ratings (server store)

## Context Links
- `src/lib/reviews.ts` (`TourReview`, `vn-reviews:v1`, `isReview`, `getAggregate`, `saveReview`/`deleteReview`, `isMyReview`, `downscaleImageToDataUrl`)
- `src/lib/edit-window.ts` (`EDIT_WINDOW_MS = 3h`, `isEditWindowExpired` — pure, clock-injectable, fail-closed)
- `src/lib/assistant/rate-limit.ts`, `src/lib/request-ip.ts`, `src/lib/visitor.ts`, `src/lib/db/sqlite-store.ts` (phase 01)
- Route contract style: `src/app/api/articles/[slug]/like/route.ts`, `src/app/api/assistant/route.ts` (content-type/415, 413, 429, 503)
- Consumers of aggregates: `src/components/rating/tour-rating-badge.tsx`, badge call sites (detail/map/cards/search/my-trips)

## Overview
- **Priority**: P0
- **Status**: Not started
- **Description**: Store public reviews in SQLite with server-side validation, owner enforcement, 3h edit window, and a batch `AVG/COUNT` aggregate helper mirroring `getArticleLikeCounts`.

## Key Insights
- One row per `reference = ${bookingReference}:${tourSlug}` (upsert key already exists in localStorage model) → `reference` is the PRIMARY KEY, so "one review per booking per tour" is enforced by the schema.
- `created_at` is immutable (edit-window anchor) — enforced on update, exactly like current `saveReview` behavior; supplied `createdAt` is honored **only on first insert** (needed for migration) and validated `2020-01-01 ≤ t ≤ now+60s` so a client cannot park a future timestamp to keep its window open forever.
- Booking cannot be verified server-side (bookings are device-local) → booking gate remains **client input validation**; server enforces structure, rate limits, ownership and window.
- Ownership: `reviews.visitor` = creating cookie. Edit/delete require matching visitor (403). UI keeps using `isMyReview` (local bookings) so orphan reviews still show no menu (existing K1 expectations hold).
- Images: already downscaled to ≤3 JPEG data URLs client-side; server validates count ≤3, ≤300k chars each, `data:image/(jpeg|png|webp);base64,` prefix only (no SVG, no `dangerouslySetInnerHTML` anywhere — comment rendered as text).
- Aggregate query returns `NULL` avg at 0 rows → helper returns absent entry (mirrors counts map semantics).

## Requirements
### Functional
- [ ] `src/lib/reviews-db.ts`: `upsertReview(input, visitor, nowIso)`, `listReviewsForSlug(slug)` (newest first, ≤100), `deleteReview(reference, visitor)`, `getRatingAggregates(slugs)`.
- [ ] `src/lib/reviews-validation.ts`: payload patterns/caps → typed errors (keeps routes <200 LOC).
- [ ] `GET /api/reviews?slug=` → `{reviews:[…], aggregate:{avg,count}|null}` (no `authorEmail` in payload), `owned` per request visitor, Set-Cookie when absent.
- [ ] `POST /api/reviews` → create (visitor stored, `createdAt` honored if valid) or edit (owner + window enforced) → `{review, aggregate}`.
- [ ] `DELETE /api/reviews/[reference]` → owner-only, any age (matches current UI) → `{reference, aggregate}`.
- [ ] `GET /api/ratings?slugs=` → `{aggregates:{slug:{avg,count}}}` batch (mirrors `getArticleLikeCounts`).
- [ ] Read path degrade: DB down → GET 503 (client keeps `initial*` props), writes → 503.

### Non-functional
- Every route: `runtime="nodejs"`, rate limited (`review:write:<ip>` on POST/DELETE), content-type 415, body caps (POST 1.5MB — image data URLs), slug/reference regex 400.

## Architecture
```
POST /api/reviews ─► 415/413 ─► rate limit ─► ensure visitor ─► validateReviewPayload
        ─► withTransaction: INSERT (no row) | UPDATE (owner + window ok → else 403/409)
        ─► NextResponse.json({review, aggregate})
GET  /api/reviews?slug=      ─► listReviewsForSlug + aggregate (+ Set-Cookie)
GET  /api/ratings?slugs=     ─► getRatingAggregates  (AVG/COUNT SQL)
RSC detail page ─► listReviewsForSlug + getRatingAggregates ─► initial props
```

## Related Code Files
**Create**
- `src/lib/reviews-db.ts` (~170 LOC)
- `src/lib/reviews-validation.ts` (~85 LOC)
- `src/app/api/reviews/route.ts` (~120 LOC: GET + POST)
- `src/app/api/reviews/[reference]/route.ts` (~70 LOC: DELETE + 405s)
- `src/app/api/ratings/route.ts` (~55 LOC)

**Modify**
- `src/lib/reviews.ts` (184 → ~145 LOC: drop `saveReview`/`deleteReview`/`getAggregate`, keep `isReview`/`listReviews` (migration reader)/`reviewsForSlug`/`formatRating`/`hasBookingForSlug`/`isMyReview`/`downscale…`, add `dropLocalReview(reference)` helper)

**Delete**: none

## Implementation Steps
1. `reviews-validation.ts`: constants + validators —
   `TOUR_SLUG_RE = /^[a-z0-9-]{1,120}$/`, `BOOKING_REF_RE = /^[A-Za-z0-9-]{1,40}$/`,
   `REFERENCE_RE = /^[A-Za-z0-9-]{1,40}:[a-z0-9-]{1,120}$/` (prefix must equal `bookingReference`),
   `rating` integer 1-5, `comment` 1..2000 chars (trimmed), `authorName` 1..80, `authorEmail` ≤200 + contains `@`,
   `images` array ≤3, each ≤300_000 chars matching `^data:image/(jpeg|png|webp);base64,`,
   `createdAt?` parseable, `≤ now+60_000`, `≥ 2020-01-01`.
2. `reviews-db.ts`:
   - `upsertReview`: validate caller already did it; `withTransaction` → select by `reference`;
     - missing → `INSERT` (all fields, `visitor`, `created_at = createdAt ?? now`, `updated_at = now`)
     - exists + `visitor !== input` → throw `not owner` (403)
     - exists + `isEditWindowExpired(row.created_at, now)` → throw `edit window closed` (409)
     - else `UPDATE author_name, author_email, rating, comment, images, updated_at` (created_at/tour_slug/booking_reference/visitor untouched)
   - `listReviewsForSlug(slug)`: pattern-check → `SELECT … ORDER BY created_at DESC LIMIT 100`, `images` JSON.parse tolerant → `TourReview & {owned?}` mapped without `authorEmail` in API output.
   - `deleteReview(reference, visitor)`: select → `not found` / `not owner` → `DELETE`.
   - `getRatingAggregates(slugs)`:
     ```sql
     SELECT tour_slug, AVG(rating) AS avg, COUNT(*) AS n
     FROM reviews WHERE tour_slug IN (?,?,…) GROUP BY tour_slug
     ```
     → `Map<string, {avg:number; count:number}>`, invalid slugs filtered, DB down → empty map. (3+4+5 → avg 4.0, count 3.)
3. Routes: follow the like-route error matrix; use `NextResponse.json` whenever a cookie may be set; log only `{slug|reference, status}` (no comment/author/email).
4. `GET /api/reviews` builds `owned = row.visitor === requestVisitor`; `authorEmail` never serialized.
5. `reviews.ts` cleanup: replace `saveReview`/`deleteReview` call sites are phase 04 — **this phase must keep the repo compiling**: keep the old functions as thin deprecated wrappers? No (YAGNI/duplication) → land phase 03 + 04 together if `tsc` would otherwise break; otherwise keep wrappers for one commit. Decision: implement phase 03 modules + routes first (pure additions → compiles), delete old functions in phase 04 with the call sites.

## Todo List
- [ ] `reviews-validation.ts` + unit-testable pure API
- [ ] `reviews-db.ts` (upsert/list/delete/aggregates, transaction, degrade)
- [ ] `GET+POST /api/reviews`, `DELETE /api/reviews/[reference]`, `GET /api/ratings`
- [ ] rate limit + visitor issuance on all three route files
- [ ] `npx tsc --noEmit` + `npm run lint`

## Success Criteria
- `getRatingAggregates` returns `{avg:4, count:3}` for ratings 3,4,5 (unit-proven).
- Edit window enforced server-side (409 after 3h, based on stored `created_at`, not client clock).
- Non-owner edit/delete → 403; unknown reference delete → 404; bad payload → 400; oversize → 413; no JSON → 415; over limit → 429; DB down → 503.
- API list payload contains no `authorEmail`, no visitor id.

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Image data URLs blow body cap | Medium | 1.5MB cap + ≤3×300k validation; 413 with clear error |
| Legacy localStorage rows fail validation on migrate | Medium | migration drops unimportable entries (phase 04), never blocks the rest |
| Two writers (multi-tab submit) | Low | `BEGIN IMMEDIATE` + PK upsert |
| PII leak via API/logs | High | omit email from responses; never log body contents |

## Security Considerations
- XSS: comment/author rendered as React text only — no markdown, no `dangerouslySetInnerHTML`; data-URL image prefix allow-list excludes `image/svg+xml`.
- Spam: rate limit (60/min/ip) + body caps + length caps + booking gate client-side (documented as input validation, not auth).
- Ownership: server-enforced `visitor` match on edit/delete; window enforced against server clock.
- Slug/reference regex prevents path/query injection into SQL identifiers (all SQL is parameterized anyway).

## Next Steps
→ `phase-04-client-rsc-wiring-and-migration.md`
