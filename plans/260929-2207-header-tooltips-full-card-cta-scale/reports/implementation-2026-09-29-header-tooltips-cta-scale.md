# Implementation Report — Header Tooltips + Full-Card Click + CTA Scale

**Date**: 2026-09-29 · **Plan**: `plans/260929-2207-header-tooltips-full-card-cta-scale/` · **Status**: Complete (100%)

## Approved decisions
- CSS-only tooltip component (no popover lib); labels reused from existing i18n keys (**0 new keys**).
- Full-card click via **overlay `<Link absolute inset-0 z-10>`** (stretched-link pattern), CTA becomes non-interactive `<span>` — matches `p-tours` P14 detection (`closest('[data-slot=card]')` → exactly 1 destination anchor/card).
- CTA scale ~1.5× via padding + text size only (same button components).

## Changes
- NEW `src/components/ui/hover-tooltip.tsx`: wrap children + hidden `aria-hidden` label; visible on `group-hover` **and** `group-focus-within`, `opacity-0` idle; positioned absolute below.
- `src/components/layout/header.tsx`: wrap desktop Search + My-trips icons (`common.search`, `myTrips.navLabel`).
- `src/components/explore/destination-card.tsx`: root `group relative cursor-pointer transition-shadow hover:shadow-lg`; overlay Link with `aria-label={name}`; CTA `<Link>` → `<span className="… px-6 py-3 text-base">`.
- Hero (`hero-section.tsx`) + About CTA (`about-us-section.tsx`): `px-8 py-4 text-lg` (twMerge `cn` overrides default size).

## Verification
- NEW `tests/browser/a-ux-microinteractions.mjs` **26/26**: tooltips aria/label ×2 locale, hover+focus reveal, card body → `/vi/explore/destinations/hcm`, CTA computed py≥16px / font-size≥18px ×2 locale, mobile 375 no overflow, 0 pageerror.
- Regressions `f`, `g`, `j` green.
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 · schema 0 errors · suite 25/26 (sole fail = pre-existing `revalidate-webhook` env).

## Concerns
none — all AC green.

## Docs impact
minor — changelog bullet + plan statuses + this report.
