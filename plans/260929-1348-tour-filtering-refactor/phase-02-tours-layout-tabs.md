# Phase 2 — Shared /tours Layout, Persistent Tabs, Loading

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 1

## Context Links
- `src/components/tours/tour-category-section.tsx:12-21` (TABS), `:52-73` (SSR nav), `:23-27` (stale tolerant comment)
- Pages: `src/app/[locale]/tours/domestic/page.tsx:15-30` · `international/page.tsx:14-23` (each owns `.container.mx-auto.px-4.py-16`)
- Precedent: `src/components/layout/locale-switcher.tsx` (`usePathname` from `@/i18n/navigation`)
- Test contract: `tests/browser/p-tours-category.mjs:66-75` (`nav[aria-label="Tour category"]`, 2 anchors, href order domestic→international, `aria-current="page"`)
- i18n labels: `common.{domesticTours,internationalTours}` (both `en.json`/`vi.json:86-87`) — **0 new keys**

## Overview
AC4: tabs live in a layout segment so they persist across domestic↔international navigations (no remount/flicker); each page still triggers its own strict server query. Active state derived from pathname (layout has no category param).

## Key Insights
- App Router layouts persist across sibling routes → nav stays mounted; only content swaps.
- Layout cannot render between page content → tabs move ABOVE the h1 (accepted UI change, no test asserts order).
- `usePathname()` returns locale-prefixed path (`/vi/tours/domestic`) → active = `pathname.endsWith(tab.href)` works for `en` + `vi`.
- Container/`py-16` must move to layout to avoid double padding → both pages lose their outer wrapper div.

## Requirements
- Single `nav[aria-label="Tour category"]` per page (no duplicate with section).
- Same markup/classes/labels/`aria-current` as today → P7/P8/P9 keep passing.
- Content area shows skeleton during RSC fetch (`loading.tsx`), no i18n needed.
- Grid/empty-state logic unchanged; stale tolerant comment corrected.

## Related Code Files
**Create**: `src/app/[locale]/tours/layout.tsx` · `src/components/tours/tour-category-tabs.tsx` · `src/app/[locale]/tours/loading.tsx`
**Modify**: `src/components/tours/tour-category-section.tsx` · `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx`
**Delete**: none

## Implementation Steps
1. `src/components/tours/tour-category-tabs.tsx` — `"use client"`:
   - Move `TABS` const verbatim; `usePathname()` from `@/i18n/navigation`; `useTranslations("common")`.
   - Render `<nav aria-label="Tour category" className="mb-8 flex flex-wrap justify-center gap-2">` with the exact existing pill classes; `aria-current={active ? "page" : undefined}`; `Link` from `@/i18n/navigation` with `tab.href`.
2. `src/app/[locale]/tours/layout.tsx` — server component: `<div className="container mx-auto px-4 py-16"><TourCategoryTabs />{children}</div>`.
3. Pages: replace outer `<div className="container mx-auto px-4 py-16">…</div>` with a fragment/`<>` keeping inner blocks byte-identical (h1/subtitle/body/CTA untouched — `l-navbar.mjs:73` + `p-tours P3/P4` contracts).
4. `tour-category-section.tsx`: delete `TABS`, the `<nav>` block, `Link` import, `getTranslations("common")`, `tabsT`; drop `mt-12` (spacing now from layout nav `mb-8`); update doc comment to: filter is strict `category == $category` enforced in GROQ. Keep grid + empty-state + pricing.
5. `src/app/[locale]/tours/loading.tsx`: minimal skeleton — 3 placeholder cards in the same grid classes (`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3`, `aspect-video animate-pulse rounded-md bg-muted`), no text/i18n.
6. Keep file sizes <200 LOC (section drops to ~70, tabs ~50).
7. Gates: `npm run lint` → `npm test` (15/15) → stop dev → `npm run build` (routes `ƒ` for both pages) → start dev → manual smoke: `/vi/tours/domestic` renders one nav above h1; tab click swaps content without nav flicker; `/vi/tours/international` shows empty-state (pre-backfill).

## Todo List
- [ ] `tour-category-tabs.tsx` (client, pathname-active)
- [ ] `tours/layout.tsx` (container + tabs + children)
- [ ] Strip container wrapper from both pages
- [ ] Remove nav/TABS from `tour-category-section.tsx` + fix comment
- [ ] `tours/loading.tsx` skeleton
- [ ] Gates: lint, unit, build, visual smoke

## Success Criteria
- Exactly one `nav[aria-label="Tour category"]` per tours page; `aria-current` correct on both routes.
- h1/subtitle/body/CTA unchanged; both routes `ƒ` in build output.
- Switching tabs does not remount nav (single client component instance) and triggers the strict query for the target category.

## Risk Assessment
| Risk | Mitigation |
|------|------------|
| Double container padding if page wrapper not removed | Step 3 explicit; visual smoke |
| `loading.tsx` skeleton confuses browser tests | `networkidle2` waits for stream; remove file if any check flakes (plan deviation, note in report) |
| Duplicate navs (layout + section) | Step 4 removes section nav; phase-3 test asserts count === 1 |

## Security Considerations
None (no data/auth changes).

## Next Steps
Phase 3 (browser tests, pipeline, backfill run, changelog).
