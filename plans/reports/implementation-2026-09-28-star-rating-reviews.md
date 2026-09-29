# Implementation Report — Star Rating & Customer Reviews

**Plan**: `plans/260928-0010-star-rating-and-customer-reviews/` · **Date**: 2026-09-28 · **Status**: DONE

## What shipped
- **`src/lib/reviews.ts`** (155 ln): `TourReview`, `isReview`, `listReviews` (SSR/corrupt-safe), `saveReview` (upsert by `${bookingReference}:${tourSlug}`, quota → `false`), `deleteReview`, `reviewsForSlug`, `getAggregate` (null @0), `formatRating`, `hasBookingForSlug`, `downscaleImageToDataUrl` (≤800px JPEG q0.7), event `vn-reviews:changed`.
- **Components** (all <200 ln): `rating/tour-rating-badge.tsx`, `reviews/customer-reviews.tsx`, `review-card.tsx`, `review-avatar.tsx`, `write-review-form.tsx`, `review-image-input.tsx`.
- **Badge surfaces (6)**: detail H1 · destination-card · map list · search row (`type==="destination"` only) · my-trips row · my-trips-detail. No-slug wiring (itineraries ×2, deals) **dropped** per user decision.
- **Section**: mounted on `explore/destinations/[slug]` after `PriceBlock`; page stays server component.
- **Gating**: `listBookings().some(b => b.slug === tourSlug)`; wrapper `aria-disabled` + `pointer-events-none` + control `disabled`; hint only post-hydration when no booking; author prefilled from booking (no new PII inputs).
- **i18n**: `destinations.reviews.*` 14 keys × `en.json` + `vi.json`.
- **Tests**: `tests/unit/reviews.test.ts` (12 checks), `tests/browser/g-reviews.mjs` (30 checks).

## Deviations
1. +1 file `review-image-input.tsx` (outside plan allow-list) → keeps form <200 lines (dev rule wins).
2. `vn-reviews:changed` event — `storage` is cross-tab only; badge/feed/form needed same-tab refresh after submit.
3. `tests/browser/c-booking.mjs` B6 selector scoped `:not(#customer-reviews)` — new star toggles legitimately use `aria-pressed`.

## Verification
| Step | Result |
|---|---|
| `npm run lint` | 0 errors/warnings |
| `npm test` | 12/12 files (i18n parity en↔vi green) |
| `npm run build` | exit 0 |
| `npm run test:browser` | 7/8 — only `revalidate-webhook` fails: missing `SANITY_REVALIDATE_SECRET` in test process (env, pre-existing) |
| Badge sweep (temp script) | 6/6 surfaces show `4.0` badge, 0 horizontal overflow @375px |
| Screenshots | `tests/.output/g-reviews-01..04-clean/disabled/submitted/final.png` |

Manual QA: `http://localhost:3000/vi/explore/destinations/hcm` (dev server running).

## Unresolved questions
1. `revalidate-webhook.mjs` still needs `SANITY_REVALIDATE_SECRET` exported in the test process — want me to wire it (would need approval to read `.env.local`)?
2. Docs: `docs/development-roadmap.md` referenced by plan P4 does not exist — create it?
