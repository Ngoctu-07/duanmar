# Phase 03 — Tests & full regression

Context: phases 01-02. Priority: P0 · Status: pending approval

## Overview

Update every occupancy-based fixture/assertion to the booking-aggregation model; prove the
refactored formula end-to-end; run the whole gate.

## Test changes

### Unit (`npm test`, currently 11/11 files)

1. `tests/unit/tour-capacity.test.mts` (14): replace occupancy cases with booking cases —
   Σ multiple bookings same date, slug filter, invalid/zero guests skipped, `booked > max`
   clamps to 0 remaining, map with only `maxCapacity`, map ignores unknown fields,
   P4 null matrix kept.
2. `tests/unit/h2-capacity-validation.test.mts` (15): fixtures `{occupancy:[…]}` → build
   capacity via `mapTourCapacity({maxCapacity})` + `mergeDeviceBookings(…bookings)` (or direct
   `TourCapacity` literals) — same expectations (guest-count blocking, dateFull, past max).
3. `tests/unit/h6-render-capacity.test.mts` (11): render fixture occupancy → booking-built capacity.
4. `tests/unit/h4`-related? (h4 is browser-only) — no change to pricing/booking/payment unit tests.

### Browser (`npm run test:browser`, currently 7/7)

5. `tests/helpers/cms-expectations.mjs`: `remainingOn(doc, iso)` reads `occupancy` → replace with
   `expectedRemaining(maxCapacity, iso, page)` computing `max − Σ guests` from **in-page
   localStorage** `vn-my-trips:v1` (test files share one browser session → device ledger carries
   across files; expectations must be localStorage-derived, not hardcoded).
6. `tests/browser/h4-p4-e2e.mjs`: Sep 29 no longer has CMS occupancy → assertions switch to
   `max − deviceBookings` model: badge count, `remaining(tomorrow)`/`guestCount=99` expectations
   derived from in-page bookings; keep P4 branch when `maxCapacity` absent.
7. **New check** (h4 or c-payment): after a confirmed booking of N guests on date D, badge for D
   drops by N (dynamic recalc, req 2) — read localStorage for expected value.
8. `c-booking`/`c-payment`: no direct occupancy deps (verified) — re-run only.

### Full gate (mandatory)

- `npm test` (≥11/11) · `npm run test:browser` (7/7) · `npx tsc --noEmit` 0 ·
  `npx eslint . --max-warnings=0` 0 · `npx next build` 0 (kill dev → build → `rm -rf .next` →
  restart dev w/ `SANITY_REVALIDATE_SECRET`) · EN/VI parity 701/701 (no message keys touched).

## Success criteria

All rows green; no fake data/mocks to pass — expectations computed from live CMS maxCapacity +
in-page bookings.

## Risks

- Shared browser session accumulates device bookings within a run → any hardcoded "10 slots"
  assertion breaks; rule: derive, don't hardcode.
