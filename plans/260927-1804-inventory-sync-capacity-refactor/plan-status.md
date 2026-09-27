# Plan status — 260927-1804 inventory-sync-capacity-refactor

Updated: 2026-09-27 · Status: **DONE (all 4 phases)**

| # | Phase | Status |
|---|-------|--------|
| 1 | Studio schema simplify (`phase-01-studio-schema-simplify.md`) | ✅ done |
| 2 | Capacity logic refactor (`phase-02-capacity-logic-refactor.md`) | ✅ done |
| 3 | Tests & regression (`phase-03-tests-regression.md`) | ✅ done |
| 4 | Docs/code review (`phase-04-docs-code-review.md`) | ✅ done (review report below) |

## Decisions applied (user-approved)

- P1: keep field name `maxCapacity`, title retitled "Max daily capacity (pax per date)"
- P2: guest-aware disable kept (`remaining < requested` also disables); "Hết chỗ" badge iff `remaining === 0`
- P3: ledger = this device's paid bookings (localStorage) — cross-device sync out of scope

## Implementation summary

- Deleted `src/sanity/schemaTypes/occupancy-field.ts`; `tour-pricing.ts` drops `occupancyField()`;
  `TOUR_PRICING_BY_SLUG_QUERY` drops occupancy projection
- `src/lib/tour-capacity.ts`: `mapTourCapacity` = validate maxCapacity only (orphan occupancy
  ignored), `mergeDeviceBookings` = sole aggregation, `remainingSlots = max(0, max − booked)`
- Tests rewritten booking-based: `tour-capacity` 15, `h2-capacity-validation` 15 (capacityOn
  helper), `h6-render-capacity` 11 (bookedOn helper); helper `remainingOn(doc, iso, bookedByDate)`
  + h4 derives device ledger in-page; **new h4 check**: injected confirmed booking → badge
  10 → 9 chỗ trống after reload (dynamic recalc), probe cleaned up after
- Changelog entry appended under 2026-09-27 "Fixed"

## Test results (final gate, fresh dev + fresh .next)

- `npm test` → **11/11 files** (incl. parity EN/VI 701/701)
- `npm run test:browser` → **7/7 files** (h4 = 13 checks incl. recalc probe; revalidate-webhook 10/10)
- `npx tsc --noEmit` → 0 · `npx eslint . --max-warnings=0` → 0 · `npx next build` → 0
- dev restarted with `SANITY_REVALIDATE_SECRET`; curl home/checkout/studio → 200

## Review

- `plans/reports/code-review-inventory-sync-20260927.md` (see below)

## Unresolved (carried)

1. Cross-device inventory needs backend (P3 accepted limitation)
2. Orphan `occupancy` rows stored invisibly in the CMS doc (no write token to delete)
3. Older open questions: maxCapacity for tours ≠ hcm; maxCapacity=0 semantics; blur validation (m14)
