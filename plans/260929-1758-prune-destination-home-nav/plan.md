# Prune "Destination" Block from Tour Pages + Global Nav "Home" Tab

**Date**: 2026-09-29 · **Type**: Feature (UI + nav) · **Status**: Complete · **Progress**: 100%

## Requirements
1. Remove the "Destination" section/wrapper from `/tours/domestic` + `/tours/international` → page goes straight to the tour grid.
2. Header nav 4 → **5 items**: Home, Domestic Tours, International Tours, Offers/Packages, Blog (desktop + mobile sheet).
3. "Home" routes to `/`; when **already on homepage**, clicking it must trigger a refresh/re-fetch instead of a no-op.

## Research findings
**Tour page DOM (hydrated, verified)**:
```
main > div.container(.py-16)
  ├─ div.mb-10.text-center      → h1 (page title) + subtitle          ← page identity (tests P3/P4/P5/P6 lock h1)
  ├─ div.mx-auto.max-w-3xl      → body paragraph ("…điểm đến…") + CTA "Khám phá điểm đến" → /explore/destinations   ← THE destination-promo block
  └─ div.grid(.md:2 lg:3)       → DestinationCard grid (tour list)     ← keep
```
- No `<section>`/heading wraps the grid — the only "destination" content is the **middle promo block** (body + destination CTA). **Decision needed**: remove promo block only (recommended, h1 + filtering tests intact) vs also title block.
- `tours.{domestic,international}.{body,cta}` keys unused by any test (grep) → removal is test-safe; keys can stay in messages (YAGNI: no i18n deletion churn) or be pruned — default: leave messages untouched.

**Header (`src/components/layout/header.tsx`)**:
- `navItems` array (4) rendered TWICE: desktop `<nav>` + mobile Sheet `<nav>` — one array edit covers both.
- `common.home` **already exists** in en.json/vi.json ("Home"/"Trang chủ") → zero i18n changes.
- next-intl `Link` to `/` from `/vi` (or `/en`) = correct locale home; on home itself a plain Link click is a no-op → need explicit handler.
- `usePathname` from `@/i18n/navigation` returns locale-stripped path → `"/"` on home (matches the spec's `pathname === '/'`).

**Self-refresh (decision)**:
- **Hard**: `e.preventDefault(); window.location.reload()` — unmistakable refresh (scrolls to top = natural "Home" UX), trivially testable (window marker wiped).
- **Soft**: `e.preventDefault(); router.refresh()` — RSC/data re-fetch, keeps scroll, but zero visual feedback; test must count RSC requests.

**Test blast radius**:
| File | Assertion | Change |
|---|---|---|
| `l-navbar.mjs` L1 | "exactly 4 links", HREFS/LABELS arrays | → 5; prepend `/vi` + `common.home` |
| L2 | legacy purge | unaffected (`/vi` not in LEGACY) |
| L3 | sheet `slice(-4) === HREFS` | → `slice(-5)` (+ label) |
| L4 | 4×200, "four h1 distinct", index-based i18n h1 checks | → 5 pages, 5 distinct, re-index (home=[0], domestic=[1]…); homepage hero has `<h1>` (CMS heroTitle fallback i18n) |
| L5 | chrome kept | unaffected |
| **NEW L6** | — | self-refresh proof (per chosen mechanism) |
| `p-tours-category.mjs` P8/P9 | `length === 4` + `[0]=/[1]=tours/domestic` indexes | → `length === 5`, home first, category links re-indexed; P21 selector unaffected |
| Other tests | `grep "header nav"` = only these two files | none |

## Phases
1. [phase-01](phase-01-prune-destination-block.md) — remove promo block from both tour pages.
2. [phase-02](phase-02-header-home-nav.md) — `navItems` + Home self-refresh handler (desktop + sheet).
3. [phase-03](phase-03-tests-gates-docs.md) — l-navbar/p-tours updates + L6, all gates, screenshots, changelog, report, statuses.

## Gates (all)
lint 0 · `npm test` **18/18** · `npm run build` 0 (dev stopped/restarted) · `sanity schemas validate` 0 · `npm run test:browser` **17/18** (sole fail = pre-existing `revalidate-webhook` env) — includes re-running tabs task's `p-tours` (27 checks) on the combined tree.

## Files
**Modify**: `src/app/[locale]/tours/domestic/page.tsx` · `src/app/[locale]/tours/international/page.tsx` · `src/components/layout/header.tsx` · `tests/browser/l-navbar.mjs` · `tests/browser/p-tours-category.mjs` · `docs/project-changelog.md` · plan statuses.
**Create**: report. **Delete**: 0. **i18n/schema/queries**: 0.

## Risks
- "Destination section" ambiguity → decision question below (recommend: promo block only; title block is locked by 4 h1 tests and is the page identity).
- Header width at `md` breakpoint with 5 items — visual check (space-x-6, text-sm: fits ≥768).
- Hard reload wipes scroll position on Home click (accepted: natural Home behavior) unless soft option chosen.
- `router.refresh` (soft) has no navigation event → L6 assertion differs; written after decision.

## Success criteria
- Tour pages: h1 + grid only (no destination promo block); cards still segregated per route (P10/P11/P21 green).
- Header (desktop + sheet): exactly 5 links, Home first, labels i18n.
- On `/` (both locales), clicking Home performs the chosen refresh (L6 green); elsewhere it navigates normally.
