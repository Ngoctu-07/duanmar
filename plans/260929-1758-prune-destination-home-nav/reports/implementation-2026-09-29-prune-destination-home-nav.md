# Implementation Report — Prune "Destination" Block + Header "Home" Nav (Self-Refresh)

**Date**: 2026-09-29 · **Plan**: `plans/260929-1758-prune-destination-home-nav/` · **Status**: Complete (100%)

## Approved decisions
- Scope = **promo block only** (body + CTA; h1/subtitle/grid kept — P3–P6 h1 locks stay green).
- Refresh = **hard reload** (`window.location.reload()`), not `router.refresh()`.

## Changes
- `src/app/[locale]/tours/domestic/page.tsx`: removed middle `div.mx-auto.max-w-3xl` (body + `/explore/destinations` CTA) + unused `Link` import.
- `src/app/[locale]/tours/international/page.tsx`: removed redundant "coming soon" body `<p>` (duplicates subtitle).
- `src/components/layout/header.tsx`: `navItems` 4 → 5 with `{key:"home", href:"/"}` first (`common.home` already in both locales — 0 i18n edits); `usePathname` from `@/i18n/navigation` (locale-stripped `"/"` on home); `handleHomeClick` attached to BOTH desktop nav and Sheet renders: on home → `preventDefault` + hard reload; elsewhere → normal navigation.
- `tests/browser/l-navbar.mjs`: HREFS/LABELS +5, L1 `exactly 5`, L3 `slice(-5)`, L4 five URLs/5 distinct h1s (index-shifted i18n asserts, home = hero CMS fallback non-empty), **new L6** = marker `__l6` wiped on `/vi` click (reload) + preserved from `/tours/domestic` (refresh only on home).
- `tests/browser/p-tours-category.mjs`: P8/P9 `length===5`, `[0]=/vi + common.home`; P21 unchanged.

## Verification
- Targeted: `l-navbar` **23/23**, `p-tours` **27/27** first run.
- Gates: lint 0 · unit **18/18** · build 0 (dev stopped/restarted) · schema **0 errors** · suite **19/20** (sole fail = pre-existing `revalidate-webhook` env).
- Screenshots: `tests/.output/l-navbar-01-desktop.png`, `l-navbar-02-sheet.png` (5 items), `p-tours-01/02-*.png` (grid after title, no promo).

## Concerns
none — all AC green.

## Docs impact
minor — changelog bullet + plan statuses + this report.
