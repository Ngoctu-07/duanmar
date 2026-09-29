# Plan — Tour Detail Auto-Playing Hero Carousel & −20% Hero Footprint

**Date**: 2026-09-29 · **Status**: Complete · **Progress**: 100% · **Priority**: High

## Problem
Tour detail hero (`aspect-video`, 1248×702 @1280×900) ends at y=879/900 — booking CTA lands at y=911, pricing at y=1059, i.e. **everything below the fold**. Hero is one static CMS image (`destination.image`); no gallery, no carousel, no slider lib in repo.

## Scope (from brief)
1. **Schema**: replace single `image` field on `destination` with `galleryImages: Image[]` (`min(3).required()`); `galleryImages[0]` = cover for ALL listing cards.
2. **Carousel**: tour detail hero = auto-playing slider, **3000ms** interval, infinite 1→2→3→1, subtle smooth horizontal slide (cubic-bezier), replaces static hero.
3. **Sizing**: hero container → **~80%** of current footprint so pricing + highlights + booking CTA are above the fold.

## Key Research Findings
- **Route** (there is no `/tours/[slug]`): `src/app/[locale]/explore/destinations/[slug]/page.tsx:71-79` = hero block; content wrapper `:83` `mt-8`; CTA in chip row `:91`; `PriceBlock` `:103`.
- **Field**: `src/sanity/schemaTypes/destination.ts:70-75` `image` (no validation); preview `media: "image"` `:100`.
- **Projections**: `image { ${imageFragment} }` in `src/sanity/queries/destinations.ts:14,28,42` + `src/sanity/queries/homepage.ts:24`. Fragment = `src/sanity/fragments/image.ts:1`.
- **Consumers**: only `src/components/explore/destination-card.tsx:33-42` (grid cards → listing, homepage featured, /tours/domestic, /tours/international) + detail hero + Studio preview. Type at `destination-card.tsx:10-18`.
- **No carousel** exists; no slider dep in `package.json`; `src/components/ui/` has no carousel. Precedent for client comps: `"use client"` line 1.
- **80% math**: `aspect-video` (0.5625w) → **`aspect-[20/9]`** (0.45w = exactly 80%). Live measurement @1280×900: hero 177→879 (h702) ⇒ new h≈562 ⇒ hero bottom ≈741 (or ≈709 with shell padding trim), CTA ≈741/709 ✓, PriceBlock ≈900/868 — **folds only if padding also trimmed** (decision below).
- **Test tripwires**: `p-tours-category.mjs:297` selector `main .mt-8 > div` (content wrapper MUST stay `mt-8`, hero must NOT become `mt-8`) · `c-booking.mjs:79-82` **0 `button[aria-pressed]` outside `#customer-reviews`** (dots must use `aria-current`) · `tour-category-queries.test.mts:94` `image {` projection · `g-reviews.mjs:145-152` PriceBlock before `#customer-reviews` · i18n parity = en+vi only.
- **CMS reality**: 3 live docs have `image` only, **0 `galleryImages`** → fallback required (cards must not go blank). `SANITY_WRITE_TOKEN` still missing → backfill optional/dry-run-safe.

## Decisions (proposed → confirm in approval)
| # | Decision | Recommendation |
|---|----------|----------------|
| D1 | Field strategy | Replace in schema (brief), **keep legacy `image` in GROQ as fallback** (`galleryImages[0] ?? image`) until backfill/Studio edits — no blank cards, unit `:94` keeps passing |
| D2 | Carousel tech | **Hand-rolled client component** (zero new deps): translate track + `setInterval(3000)` + clone-first-slide for seamless wrap; no swiper/embla |
| D3 | 80% sizing | **`aspect-[20/9]` + shell `py-16`→`py-8`** (exact 80% height, CTA+pricing above fold at ≥864px viewports) |

## Phases
| # | Phase | Status | Progress | Gate |
|---|-------|--------|----------|------|
| 1 | Schema `galleryImages` + GROQ projections + types + backfill script + unit tests | Complete | 100% | [phase-01](phase-01-schema-queries-types.md) · lint 0 · unit **18/18** (groq-js parse) · schema 0 errors · dry-run 3 pending |
| 2 | Hero carousel client component + detail page integration + −20% sizing | Complete | 100% | [phase-02](phase-02-carousel-hero-sizing.md) · lint 0 · unit 18/18 · smoke: ratio **0.4503** (562px), CTA 739 / h1 779 / price **887** all < 900 |
| 3 | Browser test + full pipeline + Studio check + changelog/report | Complete | 100% | [phase-03](phase-03-tests-verification-changelog.md) · `s-tour-hero-carousel` **12/12** · build 0 · browser **16/17** (sole fail = pre-existing `revalidate-webhook`) · changelog EOF |

## Gate Expectations
`npm run lint` 0 · `npm test` **18/18** (runner 17→18) · `npm run build` 0 (dev stopped for build) · `npm run test:browser` **16/17** (sole fail = pre-existing `revalidate-webhook`/missing `SANITY_REVALIDATE_SECRET`) · `sanity schemas validate` 0 errors.

## Risks & Mitigations
- **Empty gallery live** → fallback `image` (D1) + data-driven browser test (assert carousel branch only when ≥2 gallery imgs).
- **Seamless wrap jank** → clone-first pattern: index N→0 without transition (`transition: none` frame), then re-enable.
- **a11y**: pause on hover/focus, `prefers-reduced-motion` ⇒ no autoplay, dots `aria-current` (never `aria-pressed`), alt = `img.alt || name`, 1 new i18n key in **both** en/vi.
- **Fold math varies by viewport** → verify with puppeteer measure @1280×900 (+375 mobile) in P3; adjust D3 only if gate fails.
- Backfill (`--apply`) blocked on write token → **not a blocker** (fallback covers); dry-run still runnable.

## Out of Scope
New `/tours/[slug]` route · related-tours/reviews image galleries · lightbox on hero · new npm dependencies · homepage hero changes.

## Docs impact
minor — changelog bullet + this plan + report.
