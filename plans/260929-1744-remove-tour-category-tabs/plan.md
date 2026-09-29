# Strip Redundant In-Page Tour Category Tabs (Preserve Route-Based Filtering)

**Date**: 2026-09-29 · **Type**: Bug-fix / UI clean-up · **Status**: Complete · **Progress**: 100%

## Reported issue
`/vi/tours/domestic` + `/vi/tours/international` render a redundant in-page pill tab bar ("Tour trong nước" / "Tour nước ngoài") inside the page body. The 4-link top global header is sufficient → strip the sub-tabs; **do not touch** data fetching / state / route-based filtering.

## Root cause (researched)
- The pills are rendered by exactly ONE place: `src/app/[locale]/tours/layout.tsx:12` → `<TourCategoryTabs />` (`src/components/tours/tour-category-tabs.tsx`, 49 lines, pill `<nav aria-label="Tour category">` with `aria-current` from pathname).
- The tour pages themselves contain **no other in-page toggles** — each page = h1/subtitle/body/CTA + `<TourCategorySection category="…" />` (the strict `category == $category` GROQ data component — untouched).
- This component was added in Feature 1 (`260929-14xx tour filtering`) as a convenience nav; the header already exposes the same 4 links (`l-navbar.mjs` L1 locks them: `/vi/tours/domestic`, `/vi/tours/international`, `/vi/deals`, `/vi/blog`; L4 locks 200 + distinct h1 per route).

## Remediation

### A. Remove the sub-tabs
1. `tours/layout.tsx`: drop the import + `<TourCategoryTabs />` render; update docstring (it currently says the layout "owns the pill tabs"). Keep the `container mx-auto px-4 py-16` shell — it is the shared page frame; children unchanged.
2. **Delete** `src/components/tours/tour-category-tabs.tsx` (single consumer, becomes dead code). `grep TourCategoryTabs` = only layout.
3. **Do NOT modify**: `tour-category-section.tsx` (data component), both `page.tsx` files, all GROQ queries (`DESTINATIONS_BY_CATEGORY_QUERY`), `src/lib/*`, header/nav components, i18n keys (`common.domesticTours/internationalTours` remain the header labels).

### B. Test contract updates (`tests/browser/p-tours-category.mjs`) — needs approval
| Check | Action |
|---|---|
| P7 "tab nav: 2 links…" (via `readTabNav`) | **Repurposed** → "in-page category sub-tabs removed" (`nav[aria-label="Tour category"]` count === 0 on domestic); `readTabNav` helper deleted |
| P8 "domestic aria-current…" | **Repurposed** → header nav on the domestic page still exposes both tour links (hrefs from `HREFS[0..1]`, labels from i18n) |
| P9 "international aria-current…" | **Repurposed** → same header-links assertion on the international page |
| P20 "exactly one category nav" ×2 | **Flipped** → `count === 0` (both pages) |
| **NEW P21** | Click-through proof of the CRITICAL requirement: on `/vi/tours/domestic`, click `header nav a[href="/vi/tours/international"]` → URL becomes `/vi/tours/international` AND rendered card slugs == live GROQ `expectedInternational` set (route-based filtering driven by header preserved end-to-end) |
| P1–P6, P10–P19 (dataset segregation, h1s, badges, empty states, EN routes, detail SSR) | **Unchanged** — they are the filtering/routing regression net |

No other file selects `nav[aria-label="Tour category"]` (grep-verified). Unit `tour-category-queries.test.mts` (GROQ strict-category + groq-js parse) untouched.

## Phases
1. [phase-01](phase-01-remove-tabs-component.md) — strip layout usage, delete component file.
2. [phase-02](phase-02-test-contract-updates.md) — p-tours rewrite (P7/P8/P9 repurposed, P20 flipped, +P21 click-through).
3. [phase-03](phase-03-gates-docs.md) — targeted runs (p-tours, l-navbar), all gates, screenshots, changelog, report, statuses.

## Gates (all)
lint 0 · `npm test` **18/18** · `npm run build` 0 (dev stopped/restarted) · `sanity schemas validate` 0 · `npm run test:browser` **17/18** (sole fail = pre-existing `revalidate-webhook` / missing `SANITY_REVALIDATE_SECRET`).

## Files
**Modify**: `src/app/[locale]/tours/layout.tsx` · `tests/browser/p-tours-category.mjs` · `docs/project-changelog.md` · plan/phase statuses.
**Delete**: `src/components/tours/tour-category-tabs.tsx`.
**Create**: report. **i18n/schema/queries**: 0.

## Risks
- Spacing: `mb-8` gap under tabs disappears → h1 sits closer to top edge inside existing `py-16` (intended; visual check in phase 3).
- Route filtering must remain byte-identical — enforced by unchanged P10/P11/P12 (live GROQ set equality) + new P21 click-through.
- Mobile sheet nav (`l-navbar` sheet-trigger branch) untouched — it links the same routes.

## Success criteria
- Zero in-page category pills/navs on both tour pages (`count === 0`); header still shows both category links.
- Header click → correct segregated dataset (P21 green).
- All gates green; screenshots `p-tours-01/02` show tab-free listings.
