# Implementation Report — Entry Promo Modal: Frameless + 20% + X Chip

**Date**: 2026-09-29 · **Plan**: `plans/260929-1440-promo-modal-frameless-resize/` · **Status**: Complete (100%)

## Scope
Refactor promo modal UI: remove white container frame (p-0 / bg-transparent / border-0 / shadow-none, image edge-to-edge), scale dialog +20% (`w-[min(90vw,50.4rem)]`, 672px → 806.4px @1280), restyle floating X as dark overlay chip. Scoped via new optional `closeClassName` prop — shared dialogs byte-identical.

## Deliverables
| AC | Implementation | Verified |
|----|----------------|----------|
| 1 Frameless | `promo-modal.tsx` `className="w-[min(90vw,50.4rem)] border-0 bg-transparent p-0 shadow-none"`; image `rounded-lg→rounded-xl` (14px radius match) | R12 + smoke: padding `0px`×4, `rgba(0,0,0,0)`, border `0px`, image width == container width (edge-to-edge) |
| 2 +20% | `w-[min(90vw,50.4rem)]` (twMerge overrides base `w-[min(92vw,42rem)]`) | R13 + smoke: 806.4px @1280 (exact +20%), 691.2 @768, 337.5 @375 (=90vw cap, no overflow) |
| 3 Close X | `closeClassName="border-0 bg-black/60 text-white hover:bg-black/80 hover:text-white focus-visible:ring-white/60"`; position unchanged | R14: visible, box trọn trong ảnh + nửa phải, bg alpha 0.6, icon `rgb(255,255,255)` |

## Files
- **Modified (4)**: `src/components/ui/dialog.tsx` (116→~120 LOC, +`closeClassName?: string`) · `src/components/layout/promo-modal.tsx` (53→56 LOC) · `tests/browser/r-entry-popup-cms.mjs` (+R12–R14, +screenshot) · `docs/project-changelog.md` (EOF `## 2026-09-29`)
- **Created**: plan dir (plan.md + 2 phases + this report), screenshots `tests/.output/promo-smoke-{1280,768,375}.png`, `r-entry-popup-02-frameless.png`
- **Deleted**: 0 · **No edits**: lightbox, other tests, runners, i18n (0 new keys), CMS schema/queries

## Verification (gates)
- `npm run lint` exit 0 · `npm test` **16/16** · `npm run build` exit 0 (dev stopped for build, restarted after)
- `node tests/browser/r-entry-popup-cms.mjs` **11/11** (R1–R11 untouched, R12–R14 new) — mode=enabled
- `npm run test:browser` **16/17** — sole fail `revalidate-webhook.mjs` = missing `SANITY_REVALIDATE_SECRET` (pre-existing env, not in `.env.local`, untouched)
- Regression: `g-reviews` 30/30, `n-lightbox-contact` 19/19 (lightbox frame unaffected), `dismissPromo` 39 call sites green across suite

## Deviations from plan
None (3 binding decisions applied as approved: overlay chip, 50.4rem exact, +3 checks).

## Docs impact
minor — changelog EOF entry + plan statuses + this report.

**Status:** DONE
**Summary:** Promo modal is frameless at +20% width with dark X chip; shared DialogContent gained an additive optional prop; 3 new browser checks guard the ACs; full pipeline green except the known env-gated test.
