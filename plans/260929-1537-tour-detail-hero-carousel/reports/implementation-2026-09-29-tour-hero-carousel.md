# Implementation Report — Tour Detail Hero Carousel & −20% Footprint

**Date**: 2026-09-29 · **Plan**: `plans/260929-1537-tour-detail-hero-carousel/` · **Status**: Complete (100%)

## Scope
(1) `destination.image` → `galleryImages[]` (min 3) with `galleryImages[0]` as universal card cover; (2) auto-playing hero carousel on tour detail (3000ms, infinite, smooth horizontal slide); (3) hero footprint → 80% so CTA/highlights/pricing sit above the fold.

## Deliverables
| AC | Implementation | Verified |
|----|----------------|----------|
| 1 Gallery schema | `destination.ts`: `galleryImages` array (`rule.min(3).required()`, hotspot), legacy `image` removed from schema, preview `media: "galleryImages"`; all 4 GROQ queries project `galleryImages[] { … }` **with commas** while keeping legacy `image { … }` fallback (D1); `src/lib/destination-gallery.ts` helpers | `sanity schemas validate` 0 errors; unit: projections + schema source + **groq-js parse of every query**; dry-run backfill 3 pending |
| 2 Carousel | `destination-hero-carousel.tsx` (client): 3000ms interval, translateX + 700ms `cubic-bezier(0.4,0,0.2,1)`, clone-first-slide seamless wrap (snap + 1-frame transition off), hover/focus pause, `prefers-reduced-motion` kill-switch, dots `aria-current` (never `aria-pressed`), slide-0 `priority`, others eager; wired in `explore/destinations/[slug]/page.tsx` via `pickGalleryImages` (fallback = legacy `image`) | browser `s-tour-hero-carousel` S2 branches (multi: clone+dots+3s tick+full cycle; static: 1 img, 0 dots); i18n key `destinations.slideLabel` en+vi |
| 3 Sizing | `aspect-video` → **`aspect-[20/9]`** (702→562px @1248w = exact 80%) + detail shell `py-16`→`py-8` (D3) | live measure @1280×900: hero ratio **0.4503**, CTA **739** / h1 **779** / PriceBlock **887** — all < 900 (previously 911 / 1059, below fold); mobile 375×812 ratio held; `main .mt-8 > div` intact |

## Files
- **Modified (9)**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/destinations.ts` · `src/sanity/queries/homepage.ts` · `src/components/explore/destination-card.tsx` · `src/app/[locale]/explore/destinations/[slug]/page.tsx` · `src/messages/{en,vi}.json` · `tests/unit/tour-category-queries.test.mts` · `docs/project-changelog.md`
- **Created (5)**: `src/lib/destination-gallery.ts` · `src/components/explore/destination-hero-carousel.tsx` · `scripts/backfill-destination-gallery.mjs` (+npm `migrate:destination-gallery`) · `tests/unit/destination-gallery.test.mts` · `tests/browser/s-tour-hero-carousel.mjs` (+ this plan dir)
- **Deleted**: 0 (legacy `image` projection deliberately kept in GROQ)

## Verification (gates)
- `npm run lint` exit 0 · `npm test` **18/18** · `npm run build` exit 0 (dev stopped/restarted around build) · `npx sanity schemas validate` 0 errors
- `node tests/browser/s-tour-hero-carousel.mjs` exit 0 (**12/12**) · `npm run test:browser` **16/17** (sole fail = pre-existing `revalidate-webhook` missing `SANITY_REVALIDATE_SECRET`)
- Evidence: `tests/.output/s-hero-carousel-01-desktop.png`, `s-hero-carousel-02-mobile.png`, `s-hero-carousel-smoke.png`

## Bug found & fixed during dev
GROQ projection attributes **need commas** — newline-only separation between `image { … }` and `galleryImages[] { … }` produced `expected '}' following object body` → `fetchPublished` fail-open → detail page **404**. Fixed with commas; guarded by new unit check parsing all queries through `groq-js`.

## Deviations from plan
- None. D1/D3 as approved; wrap-snap implemented via `setTimeout(TRANSITION_MS)` effect instead of `transitionend` (avoids `react-hooks/refs` lint error from render-time ref writes).

## Outstanding (user action)
1. Studio → each destination → add ≥2 more gallery images (min-3 rule); multi-slide branch of `s-tour-hero-carousel` activates automatically.
2. `SANITY_WRITE_TOKEN` → `npm run migrate:destination-gallery -- --apply` (dry-run already shows 3 pending). Same token also unblocks the earlier tour-filter backfill.
3. Autoplay multi-slide path verified structurally + timing logic only — first live run after gallery fill.

## Docs impact
minor — changelog bullet under `## 2026-09-29` + plan statuses + this report.

**Status:** DONE
**Summary:** Gallery schema, seamless 3s auto-carousel, and exact-80% hero with CTA+h1+pricing all above the fold; 18/18 unit, 12/12 new browser test, 16/17 suite (known env fail).
