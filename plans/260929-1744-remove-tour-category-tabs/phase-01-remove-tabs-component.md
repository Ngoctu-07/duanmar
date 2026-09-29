# Phase 01 — Remove Sub-Tabs from Layout + Delete Component

**Status**: Complete (100%) · **Depends on**: plan approval · **Priority**: High

## Changes
1. `src/app/[locale]/tours/layout.tsx`:
   - Remove `import { TourCategoryTabs } …` (line 2) and `<TourCategoryTabs />` (line 12).
   - Keep container shell `<div className="container mx-auto px-4 py-16">{children}</div>`.
   - Docstring: drop "owns the pill tabs…" clause → shell only, each page runs its own strict category query.
2. Delete `src/components/tours/tour-category-tabs.tsx` (sole consumer removed; grep-verified no other references).
3. Leave untouched: `tour-category-section.tsx`, both `tours/*/page.tsx`, all queries, header components, i18n.

## Verify
- `grep -rn "TourCategoryTabs\|Tour category" src` → 0 hits.
- Visual: `/vi/tours/domestic` shows h1 block immediately inside `py-16`, no pill bar; `/vi/tours/international` same; cards still render per route.

## Todo
- [ ] Strip layout import/render + docstring
- [ ] Delete `tour-category-tabs.tsx`
- [ ] Grep clean + visual check both routes
