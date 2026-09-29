# Refactor Entry Promo Modal UI — Frameless + 20% Enlargement — Plan

**Date**: 2026-09-29 · **Type**: Refactor (UI styling) · **Status**: Complete · **Progress**: 100%

## Executive Summary
Strip the white card frame from the entry promo modal (p-0 / bg-transparent / border-0, image edge-to-edge), scale the dialog width +20% to `min(90vw, 50.4rem)`, and restyle the floating X as a dark translucent chip overlaying the image's top-right. Scoped to the promo modal only — shared `DialogContent` defaults untouched (additive prop).

## Context Links
- `src/components/layout/promo-modal.tsx:34-48` — passes no `className` → inherits full frame
- `src/components/ui/dialog.tsx:56-57` (base popup: `w-[min(92vw,42rem)] max-h-[80vh] rounded-xl border bg-card p-3 shadow-soft`) · `:63-77` (close btn `absolute top-2 right-2 bg-card`, hardcoded)
- Other `DialogContent` consumer: `src/components/reviews/review-image-lightbox.tsx:27` — must keep current frame
- Render: `src/app/[locale]/layout.tsx:18` → `PromoModal` (CMS `siteConfiguration.entryPopupImage`, live 1376×768)
- Tests: `tests/browser/r-entry-popup-cms.mjs` (8 enabled + 3 disabled checks, viewport 1280×900) · `tests/helpers/promo.mjs` (`dismissPromo` clicks `[data-slot="promo-modal-close"]`, 39 call sites in 14 files)
- `cn` = tailwind-merge drop-in → later classes win conflict groups (p-3→p-0, bg-card→bg-transparent, border→border-0, w-…→w-…, shadow-soft→shadow-none)
- Rules: `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, <200 LOC)

## Binding Decisions (user answered 2026-09-29)
1. **Close X** = overlay chip on image: keep `top-2 right-2`, restyle `bg-black/60 text-white border-0 hover:bg-black/80`.
2. **Width** = exact +20%: `w-[min(90vw,50.4rem)]` (42rem → 50.4rem = 806.4px; 90vw cap for tablet/mobile).
3. **Tests** = add 3 checks (R12–R14) to `r-entry-popup-cms.mjs` enabled branch.

## Key Insights
- Changes ride on the existing `className`/new `closeClassName` merge → **zero behavior change** for lightbox/other dialogs.
- Base `border` sets width, `bg-card` sets color, `p-3` padding, `w-[min(92vw,42rem)]` width, `shadow-soft` shadow — all single twMerge groups → overrides are one-liners.
- `rounded-xl` on container + image radius must match (image currently `rounded-lg`) or corners show a seam when bg is transparent.
- `dismissPromo` selector `data-slot` is unchanged → 39 call sites unaffected; close button stays in-bounds (overlay mode) so clicks never land outside the popup.
- No existing assertion inspects promo frame/width/close styling → R1–R11 stay green.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Verification (actual) |
|---|-------|--------|----------|-----------|------------------------|
| 1 | Frameless styling + 50.4rem sizing + overlay close chip | Complete | 100% | [phase-01](phase-01-frameless-sizing-close.md) | lint 0 · unit 16/16 · smoke @1280/768/375: 806.4/691.2/337.5px, padding 0, bg transparent, border 0, X chip alpha 0.6 inside image |
| 2 | R12–R14 checks + full pipeline + changelog | Complete | 100% | [phase-02](phase-02-tests-pipeline-changelog.md) | r-entry **11/11** · lint 0 · unit 16/16 · build exit 0 · browser **16/17** (sole fail = pre-existing `revalidate-webhook` env) · changelog EOF |

## File Allow-List (exact)
- **Modify (4)**: `src/components/ui/dialog.tsx` (+1 optional prop) · `src/components/layout/promo-modal.tsx` · `tests/browser/r-entry-popup-cms.mjs` · `docs/project-changelog.md` (EOF `## 2026-09-29`)
- **Create (3)**: plan dir (this + 2 phases) · screenshots `tests/.output/r-entry-popup-0{1,2}-*.png`
- **Delete: 0.** NO edit: `review-image-lightbox.tsx`, other dialogs/buttons, i18n files (0 new keys), Sanity schema/queries, runners, other tests.

## Global Verification (every phase)
`npm run lint` → `npm test` (**16/16**) → stop dev → `npm run build` (exit 0) → start dev `:3000` → `node tests/browser/r-entry-popup-cms.mjs` (enabled branch **11/11**) → `npm run test:browser` (**16/17**; sole fail = pre-existing `revalidate-webhook` env).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared DialogContent regression (lightbox) | Med | New `closeClassName` prop optional, defaults byte-identical; lightbox untouched; `f-ui`/`g-reviews` in suite |
| Close chip not clickable / hidden behind image | Low | Chip rendered after image in DOM (stacks above); R14 asserts visibility + overlap |
| Transparent box + leftover shadow reads as a frame | Low | `shadow-none` override (frameless = no container chrome) |
| `dismissPromo` (39 sites) breaks | Low | `data-slot` + position unchanged; full suite is the guard |
| 806px modal taller than small screens | Low | `min(90vw,…)` + existing `max-h-[80vh] overflow-y-auto` |

## Unresolved Questions
None (3 decisions binding).
