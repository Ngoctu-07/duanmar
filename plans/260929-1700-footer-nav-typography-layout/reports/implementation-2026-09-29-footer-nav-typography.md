# Implementation Report — Footer Nav Typography Upscaling & Layout Redistribution

**Date**: 2026-09-29 · **Plan**: `plans/260929-1700-footer-nav-typography-layout/` · **Status**: Complete (100%)

## Problem → Root cause
Nav columns too small (headings inherit 16px, links `text-sm` 14px) and clustered center-right with dead space at the sides: grid `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` collapsed the 3 nav columns into `auto` tracks (313px cluster = 25% of grid, 312px right margin @1280).

## Changes (approved decisions: mild scale + O5b amendment)
| Item | Before | After |
|------|--------|-------|
| Grid (`footer.tsx:30`) | `md:grid-cols-[1fr_0_auto_auto_auto_0.5fr]` | `md:grid-cols-[minmax(210px,1.5fr)_0_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(64px,0.35fr)]` |
| Headings ×3 | `font-semibold mb-4` (16px) | `text-2xl font-semibold mb-5` (24px ×1.5) |
| Links ×3 lists | `text-sm` (14px) | `text-lg` (18px ×1.29) |
| List spacing ×3 | `space-y-2` | `space-y-3` |
| `o-footer-refinement.mjs` O5b | cluster ≤ 55% grid | **≤ 65% grid** (1 line, explicitly approved) |

Kept (contracts): `0` spacer track (brandGap 48, ratio 1:2), `md:gap-x-6` 24px, base `grid-cols-2`, 4-child DOM, `<h3>` elements, wordmark classes, `mt-8` bottom bar, brand/logo untouched. Prior plans `260928-2030`/`260928-2223` compact-cluster ACs superseded (documented in changelog).

## Files
**Modified (4)**: `src/components/layout/footer.tsx` · `tests/browser/o-footer-refinement.mjs` · `docs/project-changelog.md` · plan/phase statuses. **Created**: this report. **i18n/schema**: 0.

## Verification (all gates)
- `m-footer-brand` **24/24** · `o-footer-refinement` **19/19** · `q-footer-asym-layout` **20/20** (gap/center/right-margin contracts all held at 1280/768/375 — no fr tuning needed)
- lint exit 0 · `npm test` **18/18** · `npm run build` exit 0 (dev stopped/restarted) · schema **0 errors**
- `npm run test:browser` **17/17** (sole fail = pre-existing `revalidate-webhook` / missing `SANITY_REVALIDATE_SECRET`)
- Visual: screenshots `tests/.output/footer-typography-{1280,768,375}-vi.png`, `-1280-en.png` — columns visibly distributed, type scaled, asymmetry retained

## Risks/outcomes
- Tablet @768 headroom was the binding constraint — passed without tuning (wrapped min-content + `minmax` floors absorbed it).
- O5b amendment is the only test edit; all other prior contracts intact.

## Docs impact
minor — changelog bullet + plan statuses + this report.
