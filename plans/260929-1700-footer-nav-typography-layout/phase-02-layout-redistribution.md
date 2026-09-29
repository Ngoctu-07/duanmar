# Phase 02 — Layout Redistribution (grid tracks + contract amendment)

**Status**: Complete (100%) · **Depends on**: Phase 1 · **Priority**: High

## Changes
1. `footer.tsx:30` grid class:
   - From: `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_0_auto_auto_auto_0.5fr] md:gap-x-6`
   - To: `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[minmax(210px,1.5fr)_0_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(64px,0.35fr)] md:gap-x-6`
   - Preserved: `0` spacer track (brandGap 48 = Q2), `md:gap-x-6` 24px (Q3/Q4/Q5), base `grid-cols-2` (mobile contracts).
2. `tests/browser/o-footer-refinement.mjs` (~line 111): O5b threshold `0.55` → `0.65` (**1 line, requires approval** — allows cluster ≤65% for 2.5–3× spread).

## Measurement checklist (live browser, before commit)
| Viewport | Threshold to confirm | Test |
|----------|---------------------|------|
| 1280 | brandGap 48±2, nav gaps 24±2, ratio 1.9–2.1, center ≥+50, right margin ≥60, cluster ≤65%, wordmark ≤ brand track | Q2–Q7, O4b/O5b, Q10 |
| 768 | same gaps + right margin ≥60 + overflow ≤1 + brand right ≤ nav1 left | Q12, Q13, O6b |
| 375 | overflow ≤1, brand spans grid ±2, wordmark 36px | Q14–Q16, O7 |

Tuning rule: if Q7/Q13 fails → raise trailing track (0.35fr→0.5fr); if O5b fails → lower trailing/brand ratio; if wordmark spills → raise brand floor (210→230px).

## Todo
- [ ] Apply grid class change
- [ ] Amend O5b threshold (after approval)
- [ ] Measure @1280 / @768 / @375, tune fr if needed
- [ ] Run m/o/q footer tests targeted
