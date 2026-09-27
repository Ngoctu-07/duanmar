# Phase 01 — Studio simplification: single global daily capacity

Context: `plan.md` root cause (manual `occupancy[]` ledger). Priority: P0 · Status: pending approval

## Overview

Remove the manual per-date slot config from Studio; keep exactly one tour-level field:
global max daily capacity (user's `max_daily_capacity` = existing `maxCapacity`).

## Requirements

- FR1: `tourPricing` schema loses `occupancy` field → `src/sanity/schemaTypes/tour-pricing.ts`
  drop `occupancyField()` import/call; **delete** `src/sanity/schemaTypes/occupancy-field.ts`.
- FR2: `maxCapacity` kept (P1 approved variant), title/description clarified:
  "Max daily capacity — total pax allowed per departure date (global for this tour)".
- FR3: `TOUR_PRICING_BY_SLUG_QUERY` (`src/sanity/queries/tour-pricing.ts`) stops projecting
  `occupancy[]` (keeps `maxCapacity` only). Query string change → new fetch cache key (safe).
- FR4: no writes to CMS (no write token) — stored `occupancy` rows become orphan data, ignored
  by schema + app (documented in unresolved questions).

## Related code files

Modify: `src/sanity/schemaTypes/tour-pricing.ts`, `src/sanity/queries/tour-pricing.ts`
Delete: `src/sanity/schemaTypes/occupancy-field.ts`

## Implementation steps

1. Remove field + import from `tour-pricing.ts`; delete `occupancy-field.ts`.
2. Strip `occupancy` projection from `TOUR_PRICING_BY_SLUG_QUERY`.
3. `npx tsc --noEmit` + eslint (Studio build sanity via `next build` in phase 3).

## Success criteria

- `grep -rn occupancy src/` → 0 hits (schema, queries, lib all clean).
- Studio loads (`/studio`) with tourPricing showing tiers + max capacity, no occupancy editor.
