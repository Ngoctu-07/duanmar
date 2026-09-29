# Implementation Report — Strip In-Page Tour Category Tabs

**Date**: 2026-09-29 · **Plan**: `plans/260929-1744-remove-tour-category-tabs/` · **Status**: Complete (100%)

## Root cause
Redundant pill nav ("Tour trong nước"/"Tour nước ngoài" in page body) rendered solely by `src/app/[locale]/tours/layout.tsx` → `<TourCategoryTabs />` (added in Feature 1 as convenience). Header already exposes both routes (locked by `l-navbar` L1/L4).

## Changes
- `tours/layout.tsx`: import + render removed; docstring updated; container shell kept.
- `src/components/tours/tour-category-tabs.tsx`: **deleted** (grep `TourCategoryTabs|Tour category` = 0 hits in src).
- **Untouched (critical)**: `tour-category-section.tsx` (data component), both `tours/*/page.tsx`, `DESTINATIONS_BY_CATEGORY_QUERY` strict `category == $category`, header, i18n.

## Test contract (approved)
`tests/browser/p-tours-category.mjs`:
- P7 → in-page sub-tabs absent (`readTabNav` returns null)
- P8/P9 → header still exposes both category links with i18n labels (domestic + international pages)
- P20 ×2 → `count === 0`
- **NEW P21** → click header `a[href="/vi/tours/international"]` on domestic page → URL + rendered slug set == live GROQ `expectedInternational` (route-based filtering via header proven end-to-end)
- P1–P6, P10–P19 unchanged (live-GROQ set equality = filtering regression net)

## Verification
- `p-tours-category.mjs` standalone: **27/27** (`P21 path=/vi/tours/international expected=[nyc] rendered=[nyc]`; P10 `[hcm,dn]`, P11 `[nyc]` both exact)
- lint exit 0 · `npm test` **18/18**
- Note: first P19 run failed transiently — `nyc.isFeatured` flipped in Studio while homepage served `unstable_cache` (TTL 300s) 2-doc result while the test read CMS directly; re-run after TTL expiry: green. Eventual-consistency window, not code.
- build / schema / full browser suite: executed with the follow-up feature task's gate run (same tree).
- Evidence: `tests/.output/p-tours-01-domestic.png`, `p-tours-02-international.png` (tab-free).

## Docs impact
minor — changelog bullet + plan statuses + this report.
