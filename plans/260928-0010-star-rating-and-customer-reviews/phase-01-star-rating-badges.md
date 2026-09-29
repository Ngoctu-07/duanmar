# Phase 1: Star Rating Badges

## Context Links
- Plan: `plan.md` P1 · Research: `research/research-summary.md` §1-2, §4
- Files: `src/lib/reviews.ts` (new), `src/components/rating/tour-rating-badge.tsx` (new), 9 surface edits, `src/messages/{en,vi}.json`

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day
- Pure aggregation lib (unit-testable, no DOM) + client badge component + badge placement on every name-bearing tour surface. Badge shows avg of device-local reviews; 0 reviews / no slug → renders nothing.

## Key Insights
- Rating data does not exist (0 `Star` usage, no Sanity rating field) → aggregate from `vn-reviews:v1`; lib must be importable in `npx tsx` unit tests (no top-level `window`; `listReviews()` guards `typeof window === "undefined"` → `[]`).
- Only destination slugs are bookable (`book-ticket-button.tsx:15`) → itinerary/deal/search-non-dest cards pass **no slug** → null (no dead UI, no cross-slug bleed).
- Detail H1 (:87) has no flex row → wrap `flex items-start justify-between gap-3`; card rows get `flex items-start justify-between gap-2`.
- Brand red = tokens only (`text-primary`, `bg-primary/10`) — crimson plan `260927-2100` PENDING.

## Architecture
```
surface (server/client) ──slug?──▶ TourRatingBadge ("use client")
                                     │ useEffect → listReviews() + storage listener
                                     ▼
                       reviews.ts: getAggregate(reviews, slug) → {avg,count}|null
                                     │ 0 reviews / !slug → null (after load)
                                     ▼
                       <span class="bg-primary/10 text-primary">3.5 ★</span>
```
- SSR: renders reserved empty `<span data-testid="tour-rating-badge-slot">` (min-width) **only when slug present**; post-load with reviews → badge; post-load with 0 reviews → `null`.

## Requirements
**Functional**
- `src/lib/reviews.ts`: `interface TourReview { reference; tourSlug; authorName; authorEmail; rating: 1-5; comment; images: string[]; createdAt; bookingReference }`, `REVIEWS_STORAGE_KEY = "vn-reviews:v1"`, `isReview()` guard (mirrors `booking-history.ts:29-55`: string fields, integer rating 1-5, `Array.isArray(images)`, all entries string), `listReviews()` (silent `[]`, newest first `createdAt` desc), `saveReview()` (upsert by `reference`, try/catch → returns `boolean`), `deleteReview()`, `reviewsForSlug(reviews, slug)`, **`getAggregate(reviews, slug) → {avg, count} | null`** (null at 0), **`formatRating(avg) → "4.5"`** (`toFixed(1)` → `4.0` for whole numbers), `hasBookingForSlug(bookings, slug)`.
- `tour-rating-badge.tsx`: `"use client"`, props `{ slug?: string }`; `useTranslations("destinations")` for `reviews.ratingAria`; lucide `Star` (`fill-current`); **MUST** use `text-primary` / `bg-primary/10` (no hex/`red-*`); cross-tab `storage` listener filtered to `REVIEWS_STORAGE_KEY` (pattern `booking-form.tsx:68-77`); `data-testid="tour-rating-badge"`.
- Surface edits (9 total — 6 with bookable slug, 3 no-slug wiring): detail H1 `page.tsx:87` (wrap flex), `destination-card.tsx:46`, `map/page.tsx:73`, `search-client.tsx:94` (slug only when `result.type === "destination"` → last `href` segment), `my-trips-client.tsx:80` (between info block and `→` arrow), `my-trips-detail.tsx:85`, plus no-slug wiring `trending-itineraries.tsx:51`, `itineraries/page.tsx:48`, `deals/page.tsx:33`.
- i18n: add `destinations.reviews.ratingAria` to **BOTH** `en.json` (`"{avg} out of 5 from {count} reviews"`) and `vi.json` (`"{avg}/5 từ {count} đánh giá"`).

**Non-functional**: `reviews.ts` < 190 lines, badge < 90 lines, no new deps, Sanity untouched, no layout overflow at 375px.

## Related Code Files
**Tạo**: `src/lib/reviews.ts`, `src/components/rating/tour-rating-badge.tsx`
**Sửa**: `src/app/[locale]/explore/destinations/[slug]/page.tsx`, `src/components/explore/destination-card.tsx`, `src/components/homepage/trending-itineraries.tsx`, `src/app/[locale]/explore/itineraries/page.tsx`, `src/app/[locale]/explore/map/page.tsx`, `src/app/[locale]/deals/page.tsx`, `src/components/search/search-client.tsx`, `src/components/my-trips/my-trips-client.tsx`, `src/components/my-trips/my-trips-detail.tsx`, `src/messages/en.json`, `src/messages/vi.json`
**Không sửa**: `booking-history.ts`, Sanity queries/schemas, `news-item-card.tsx`, events/festivals cards (non-tour — excluded with rationale)

## Implementation Steps
1. `src/lib/reviews.ts`: types + `REVIEWS_STORAGE_KEY` + `isReview` + `listReviews` (window-guarded, try/catch, `createdAt` desc) + `saveReview` (upsert by `reference`, try/catch returns false on quota/private mode) + `deleteReview` + `reviewsForSlug` + `getAggregate` + `formatRating` + `hasBookingForSlug`. No downscale yet (Phase 3).
2. `tour-rating-badge.tsx`: `loaded` state → `useEffect` reads `listReviews()` + storage listener; render logic `!slug → null` / `!loaded → <span data-testid="tour-rating-badge-slot" className="inline-block h-6 min-w-[4.5rem]" aria-hidden />` / aggregate null → `null` / else badge `<span data-testid="tour-rating-badge" aria-label={t("ratingAria", …)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary tabular-nums">{formatRating(avg)} <Star className="h-3 w-3 fill-current" aria-hidden /></span>`.
3. Surface edits per table (wrap title rows in flex, keep existing hover classes; my-trips badge placed before arrow span; search slug derived only for `type === "destination"`).
4. i18n: add `destinations.reviews.ratingAria` to `en.json` + `vi.json` (insert `reviews` object inside `destinations`, both files stay line-aligned).

## Todo List
- [ ] `src/lib/reviews.ts` core (storage + aggregate)
- [ ] `tour-rating-badge.tsx` (SSR slot → load → null/badge, storage listener)
- [ ] 9 surface edits (6 with bookable slug incl. detail H1, 3 no-slug wiring)
- [ ] i18n `ratingAria` in en + vi
- [ ] Verify: `npm run lint` · `npm test` · `npm run build`

## Success Criteria
- 0 reviews anywhere → **no** `[data-testid="tour-rating-badge"]` in DOM (slot only before hydration, then removed) · after seeding 1 review via console → badge shows 1-decimal avg + `Star`, classes contain `text-primary` and `bg-primary/10`, zero hex/`red-*` in diff.
- `grep -rn "red-\|#[fF][0-9a-fA-F]\{3\}" <diff files>` → no theme literals introduced.
- `npm test` green (i18n parity en↔vi) · `npm run build` green.

## Risk Assessment
- **R1 layout shift**: 0-review slot collapses post-load → minor shift; accepted (binding: badge renders nothing at 0). Mitigate: slot width only when `slug` present, `min-w` ≈ final badge width.
- **R2 card title rows overflow** at 375px → `gap-2/3` + `min-w-0` + badge `shrink-0`; verify `destination-card`/`my-trips` on mobile.
- **R3 my-trips arrow collision** → badge inserted *before* arrow, row keeps `justify-between`; screenshot 375px.
- **R4 ISR mismatch**: page HTML cached 300s, badge is client-read → always fresh; slot guarantees no wrong value server-side.
- **R5 i18n parity failure**: add key to BOTH files in same commit, `npm test` runs parity.

## Security Considerations
- No PII in badge (only avg/count) · no new storage keys beyond `vn-reviews:v1` · no Sanity writes · user emails never rendered in badge.

## Next Steps
- Phase 2 consumes `listReviews`/`reviewsForSlug` from `src/lib/reviews.ts` for the detail section.

## Decisions already made
Derived ratings from reviews (no fixtures) · localStorage `vn-reviews:v1` persistence · slug-only booking eligibility · badge surfaces = all name-bearing tour cards (optional slug, null when absent) · tokens not hex · news/events cards excluded (non-tour).
