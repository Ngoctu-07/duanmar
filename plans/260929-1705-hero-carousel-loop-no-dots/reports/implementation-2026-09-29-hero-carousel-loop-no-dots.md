# Implementation Report — Hero Carousel Infinite Loop + Remove Pagination Dots

**Date**: 2026-09-29 · **Plan**: `plans/260929-1705-hero-carousel-loop-no-dots/` · **Status**: Complete (100%)

## Root cause (empirical, not assumed)
Live probes on `/vi/explore/destinations/hcm` @1280×900:
1. **Loop already worked**: cursor parked off-hero → `0→1→2→3(clone)→snap→0` twice, smooth, snap at +600–700ms.
2. **The perceived "stop at image 3"** = `pause-on-hover` (`onMouseEnter`→`paused`): boundary-crossing probe showed `mouseenter` fires → **0 ticks in 6s while hovered**; `mouseleave` resumes. Focus-pause compounded after dot clicks.
3. **Why tests missed it**: `s-tour-hero-carousel.mjs` deliberately parked the cursor off-hero; CDP first-move-lands-inside never synthesizes `mouseenter`.

## Changes (approved: remove pause entirely)
- `destination-hero-carousel.tsx`: removed `onMouseEnter/onMouseLeave/onFocusCapture/onBlurCapture` + `paused` state → autoplay continuous (endless 1→2→3→1 with cursor anywhere); **kept** `prefers-reduced-motion` autoplay disable (sole WCAG mechanism) and the verified clone+snap loop; removed dots block, `cadence`, `active`, `useTranslations`.
- `src/messages/en.json` + `vi.json`: deleted `destinations.slideLabel` (dots-only; parity preserved).
- `tests/browser/s-tour-hero-carousel.mjs`: S1/S2 dots → `buttons === 0`; autoplay tracked via **active-slide** (`aria-hidden`) instead of `aria-current`; **loop check strengthened** — must observe clone (child == galleryCount) THEN real child 0 (old check passed while clone displayed, blind to a broken snap).

## Files
**Modified (4)**: `src/components/explore/destination-hero-carousel.tsx` (128→78 lines) · `src/messages/en.json` · `src/messages/vi.json` · `tests/browser/s-tour-hero-carousel.mjs` · plus changelog + plan statuses. **Created**: this report. **Schema/queries**: 0.

## Verification (all gates)
- Live probe with cursor ON hero (mouseenter confirmed fired): `0→1→2→3→0→1` keeps cycling — root-cause fix proven
- `s-tour-hero-carousel` **16/16** (incl. `S2 pagination dots removed :: buttons=0`, `S2 infinite loop: clone shown, then real slide 0 resumes :: sawClone=true active=0`)
- lint exit 0 · `npm test` **18/18** (i18n parity after key removal) · `npm run build` exit 0 (dev stopped/restarted) · schema **0 errors**
- `npm run test:browser` **17/18** — sole fail = pre-existing `revalidate-webhook` (missing `SANITY_REVALIDATE_SECRET`)
- Visual: `tests/.output/s-hero-carousel-03-no-dots-desktop.png`, `-04-no-dots-mobile.png` — zero indicators under hero

## Accepted trade-off
Hover/focus pause removed (user decision) — continuous loop guaranteed; `prefers-reduced-motion` remains the pause mechanism.

## Docs impact
minor — changelog bullet + plan statuses + this report.
