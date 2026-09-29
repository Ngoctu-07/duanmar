# Phase 2 — Test Checks (R12–R14), Full Pipeline, Changelog

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 1

## Context Links
- `tests/browser/r-entry-popup-cms.mjs:75` (viewport 1280×900), enabled branch `:81-152`, disabled branch `:155-178`, `R11` pageerrors `:180`
- Screenshot convention `:133` → `tests/.output/r-entry-popup-01-enabled.png`
- Contract constraints: `dismissPromo` selector, R3/R4/R5 image attrs, R6 dismiss — untouched
- Rules: no fabricated CMS data; expectations from live dataset; runners untouchable

## Overview
Guard the three ACs with computed-style/geometry checks inside the existing enabled branch, then run the full pipeline and document.

## Key Insights
- R12–R14 must be skipped gracefully when `mode=disabled` (checks live in the enabled branch, same as R2–R7).
- 50.4rem = 806.4px @1280 (90vw = 1152px → cap applies) → tolerance ±2px for subpixel rounding.
- Close-chip visibility: assert bounding box overlaps the image box and sits within its top-right quadrant (proves stacking above the image, not behind it).

## Requirements
- AC1 → R12: computed padding `0px` on all sides, `background-color: rgba(0, 0, 0, 0)`, `border-top-width: 0px`.
- AC2 → R13: popup box width ∈ [804, 809] px @1280 AND width ≤ 0.9 × viewport width.
- AC3 → R14: close button visible, box fully inside image box, in top-right half, computed bg alpha ≥ 0.5.
- Existing R1–R11 unchanged and green.

## Related Code Files
**Modify**: `tests/browser/r-entry-popup-cms.mjs` · `docs/project-changelog.md`
**Create**: screenshots `r-entry-popup-02-frameless.png` (new, alongside existing `-01`)
**Delete**: none

## Implementation Steps
1. Insert R12/R13/R14 in the enabled branch right before the `screenshot` call (`:133`):
   - `page.evaluate` reads: content `getComputedStyle` (padding*, backgroundColor, borderWidth), `getBoundingClientRect()` of popup + img + close button.
   - Assertions per Requirements; details logged as check `detail` strings.
2. Add a second screenshot `tests/.output/r-entry-popup-02-frameless.png` after R12–R14 (evidence of the new look).
3. Run gates: `npm run lint` → `npm test` (**16/16**) → stop dev → `npm run build` (exit 0) → start dev `:3000` → `node tests/browser/r-entry-popup-cms.mjs` (**11/11** enabled) → `npm run test:browser` (**16/17**, sole fail `revalidate-webhook` = env pre-existing).
4. Eyeball screenshots @1280/768/375: frameless image, X chip legible, no viewport overflow (esp. 375px → 90vw=337px).
5. Changelog: `docs/project-changelog.md` EOF `## 2026-09-29` entry (VN style, matches `:261+` format) — bullets: frameless (`p-0 bg-transparent border-0 shadow-none` + `rounded-xl` image), `+20%` width `min(90vw,50.4rem)`, overlay X chip + `closeClassName` prop (additive, lightbox untouched), R12–R14, `Verified:` line, `Docs impact: minor`.
6. Flip plan statuses → Complete/100%; write `plans/260929-1440-promo-modal-frameless-resize/reports/implementation-2026-09-29-promo-modal.md` (status block per orchestration protocol).

## Todo List
- [ ] R12 frameless computed styles · R13 width 806px/≤90vw · R14 X chip geometry
- [ ] New screenshot evidence
- [ ] Full pipeline (lint / unit / build / browser / r-entry standalone)
- [ ] Changelog + plan statuses + report

## Success Criteria
- `r-entry-popup-cms.mjs` 11/11 (enabled) with zero edits to R1–R11; full suite 16/17 (known env fail only).
- Changelog entry at EOF with verified counts.

## Risk Assessment
- R13 depends on fonts/DPR → 2px tolerance; rem→px = 806.4 exact in Chromium.
- If `mode=disabled` when run (CMS toggle off), R12–R14 correctly skipped; re-run when enabled for full coverage.

## Security Considerations
None.

## Next Steps
Docs impact: **minor**. Outstanding: none.
