# Tour Detail 2-Column Layout + CMS Itinerary Accordion

**Date**: 2026-09-30
**Type**: Feature Implementation
**Status**: Complete (gates green; build deferred — dev server holds `.next`)

## Executive Summary
Tour detail (`/[locale]/explore/destinations/[slug]`) renders everything in a single
`max-w-3xl` column → dead whitespace on the right. Convert the body to a 2-column CSS Grid,
keep Overview (description/price/rating/reviews) left, and fill the right column with a
CMS-driven day-by-day itinerary accordion (new `itinerary[]` field on the `destination` doc).

## Context Links
- **Target page**: `src/app/[locale]/explore/destinations/[slug]/page.tsx`
- **Schema**: `src/sanity/schemaTypes/destination.ts` (Tour document in Studio) ·
  `src/sanity/queries/destinations.ts`
- **Style precedents**: `PriceBlock` card heading (`text-xs uppercase tracking-widest text-primary`),
  FAQ rows in `src/app/[locale]/support/page.tsx`, icon/focus conventions from `src/components/ui/*`
- **Rich text**: `PT_COMPONENTS` in `src/components/sanity/portable-text.tsx`

## Requirements
- [x] `grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10` container; Overview left, itinerary right
- [x] Studio: `itinerary[]` of `{ dayTitle, meals, details(Portable Text) }`, dayTitle required
- [x] Accordion rows = dayTitle + meals + `ChevronRight`; click → smooth expand + chevron `rotate-90`
- [x] Graceful fallback: no itinerary days → single column (`max-w-3xl`), module hidden
- [x] 0 new a11y regressions: `button[aria-expanded]`, `aria-controls`, reduced-motion safe

## Architecture
```
page.tsx (RSC)
├─ left column  : badges · h1 + rating · description · PriceBlock · CustomerReviews
└─ right column : ItineraryAccordion (RSC, renders PortableText details)
                    └─ ItineraryDayRow ("use client", useState open, chevron + grid-rows animation)
```
RSC/Client split keeps `next-sanity`/PortableText out of the client bundle; only the
disclosure row ships JS.

## Files
- modify: `src/sanity/schemaTypes/destination.ts`, `src/sanity/queries/destinations.ts`,
  `src/app/[locale]/explore/destinations/[slug]/page.tsx`, `src/messages/{en,vi}.json`
- create: `src/components/explore/itinerary-accordion.tsx`,
  `src/components/explore/itinerary-day-row.tsx`,
  `tests/unit/tour-detail-itinerary.test.mts`
- delete: none

## Phases
- [x] P1 Schema + GROQ projection
- [x] P2 Components (accordion server + row client)
- [x] P3 Page grid refactor + i18n keys
- [x] P4 Test + gates (tsc 0 · lint 0 · `npm test` 27/27 · `sanity schemas validate` 0/0 · live dev render)
- [x] P5 Changelog

## Success Criteria
Grid renders 2 columns at `lg` with itinerary data, single column without · rows expand
smoothly (300ms, `motion-reduce` snaps) and chevron rotates 90° · all gates green.

**Verified live** (temporary sample days injected then reverted; dev server at :3000):
- 2-col desktop 604px/604px, expand → panel 74.5px + `rotate-90`, re-click collapses,
  mobile 375 → 1 column, 0 overflow, 0 pageerror (`tests/.output/itinerary-layout-check.mjs` 15/15)
- Existing contracts on fallback branch: `tests/.output/tour-detail-regression-check.mjs` 11/11
- Unit `tests/unit/tour-detail-itinerary.test.mts` 15/15 incl. jsdom click interaction

## Risks
- Browser tests (`s-tour-hero-carousel` S3) assert `.mt-8 > div`, h1 + booking CTA inside
  `.mt-8` → keep wrapper/children contract intact.
- No itinerary data in dev CMS yet → module hidden until an editor fills the field
  (single-column fallback covers it).

## Next Steps
Seed itinerary rows for `hcm` in Studio (editor task, not code).
