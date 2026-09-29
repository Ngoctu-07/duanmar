# Star Rating & Customer Reviews — Implementation Plan

**Date**: 2026-09-28 · **Type**: Feature Implementation · **Status**: Complete · **Context Tokens**: ~180 words

## Executive Summary
Show a derived star-rating badge ("3.5 ★") on every name-bearing tour surface and a "Customer Reviews" section on the tour detail page, with a booking-gated write-review form. No backend: ratings aggregate from device-local reviews in `localStorage` (`vn-reviews:v1`), eligibility derives from existing `vn-my-trips:v1` bookings. Next.js 16 server pages, Tailwind v4, shadcn, `next-intl`, Sanity READ-only.

## Context Links
- **Related Plans**: `plans/260927-2100-global-theme-redesign-brand-migration/` (PENDING — use `text-primary`/`bg-primary/10`, NEVER hex/`red-*`) · `plans/260927-0034-booking-checkout-flow/` (bookings) · `plans/260927-0141-travel-date-and-my-trips/`
- **Dependencies**: `src/lib/booking-history.ts` (eligibility + storage pattern), `src/messages/{en,vi}.json` + `tests/unit/i18n-parity.test.ts`, chrome-devtools browser harness
- **Reference Docs**: `docs/code-standards.md`, `docs/design-guidelines.md` · **Research**: `research/research-summary.md`

## Binding Decisions (do not re-ask)
1. **Rating = derived from reviews**: avg over `vn-reviews:v1` for slug; **0 reviews → badge renders NOTHING**, section shows empty state.
2. **Persistence = device-local localStorage**, key `vn-reviews:v1`, mirrors `booking-history.ts` (versioned key, `isReview` guard, list/upsert/delete, silent quota catch → surfaced error to user).
3. **Eligibility = slug match only**: `listBookings().some(b => b.slug === tourSlug)`; strictly disabled until `loaded` (no false "not booked" flash); `aria-disabled` + `pointer-events-none` + grayed.
4. **Badge surfaces = all name-bearing tour cards** below; `slug` prop optional → renders null when absent/empty.
5. One review per booking per tour (upsert key `${reference}:${tourSlug}`); images capped 3, downscaled client-side; Sanity stays read-only.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Rating badges (lib core + badge + 9 surface edits) | Complete | 100% | [phase-01](phase-01-star-rating-badges.md) | — | `npm run lint`, `npm test` (i18n parity), `npm run build` |
| 2 | Reviews data + Customer Reviews section (cards/avatar) | Complete | 100% | [phase-02](phase-02-reviews-data-and-section.md) | P1 (`src/lib/reviews.ts`) | lint, `npm test`, build, manual `/vi/explore/destinations/hcm` empty state |
| 3 | Write-review form + booking gating | Complete | 100% | [phase-03](phase-03-write-review-gating.md) | P1 (lib), P2 (section mounts form) | lint, `npm test`, build, manual disabled/enabled probe |
| 4 | Tests + full verification | Complete | 100% | [phase-04](phase-04-tests-and-verification.md) | P1–P3 | `npm test`, `npm run build`, `npm run test:browser`, manual checklist |

## New Files (exact allow-list; all others = edits to existing files)
- `src/lib/reviews.ts` — types, `isReview`, list/upsert/delete, `getAggregate`, `formatRating`, `reviewsForSlug`, `hasBookingForSlug`, `downscaleImageToDataUrl` (keeps form <200 lines)
- `src/components/rating/tour-rating-badge.tsx` · `src/components/reviews/customer-reviews.tsx` · `src/components/reviews/review-card.tsx` · `src/components/reviews/write-review-form.tsx` · `src/components/reviews/review-avatar.tsx` (NOT merged: avatar reused by card + "posting as" row; every file stays <200 lines)
- Tests: `tests/unit/reviews.test.ts`, `tests/browser/g-reviews.mjs`
- **NO** duplicate `*-enhanced` files; i18n keys added to BOTH `en.json`/`vi.json` under `destinations.reviews.*` (14 keys, listed per phase)

## Global Verification (every phase)
`npm run lint` → `npm test` (includes i18n parity) → `npm run build` → (`npm run dev` on :3000) `npm run test:browser` (P4) → manual: `http://localhost:3000/vi` (badges on cards) + `/vi/explore/destinations/hcm` (no booking → form disabled; seed booking → enabled; submit → badge + card persist across reload).

## Key Risks
localStorage = device-local only (no cross-device) · image quota (~3×800px JPEG ≈ 300 KB/review) · hydration flash / 0-review badge collapse after load · card title-row layout shift & my-trips arrow conflict · i18n parity failure · ISR page (300s) vs client localStorage freshness. Mitigations per phase files.

## Unresolved Questions — RESOLVED (user decisions 2026-09-28)
1. Non-tour cards (itineraries ×2, deals): **DROP** the 3 no-slug edits → 6 badge surfaces only.
2. Edit-after-submit: **ALLOW** — upsert pre-fills existing review.
3. Images: **cap 3, JPEG q0.7 @ 800px** accepted.
4. Both `reference` (composite) + `bookingReference` fields: **kept** (spec as-written).
5. i18n keys: **keep all 14** (incl. `ratingAria`, `errorStorage`).

## Completion Notes (2026-09-28)
- **Deviation**: +1 file `src/components/reviews/review-image-input.tsx` (outside allow-list) to keep `write-review-form.tsx` <200 lines (dev rule > plan allow-list).
- **Deviation**: `vn-reviews:changed` window event added in `src/lib/reviews.ts` — `storage` events are cross-tab only, badge/feed/form wouldn't refresh after same-tab submit.
- **Test fix**: `tests/browser/c-booking.mjs` B6 selector scoped `:not(#customer-reviews)` (new star toggles use `aria-pressed`).
- Verified: lint 0 · `npm test` 12/12 · `npm run build` 0 · `npm run test:browser` 7/8 (only `revalidate-webhook` fails — missing `SANITY_REVALIDATE_SECRET` env, pre-existing) · badge sweep 6/6 surfaces + no 375px overflow.
