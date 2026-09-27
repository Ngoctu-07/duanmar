# Plan: Fix Inventory Sync Bug & Refactor Daily Capacity Logic

- Created: 2026-09-27 18:04 (bugfix workflow: scout → root cause → plan → **approval required**)
- Status: **awaiting user approval** (read-only scout done, no code changes)
- Reported at: `/vi/booking/checkout?tour=hcm` + Studio doc `tourPricing;3228e597-…` (Sep 29: Studio 7/10 → frontend "Hết chỗ"; other dates show "9 or 10" with no clear logic)

## Root cause (verified by probe, not speculation)

**Two disconnected inventory ledgers with no write-back — not an arithmetic bug.**

1. `tourPricing.occupancy[]` = **manual** daily ledger in Studio (`occupancy-field.ts`) — static,
   never updated when bookings happen ("7/10 in Studio").
2. Device bookings in `localStorage:vn-my-trips:v1` are **merged on top**
   (`mergeDeviceBookings`, booking-form.tsx:62/72).
3. Frontend remaining = `max − (manual CMS + device)`. Reporter's own test bookings stack onto
   the hand-entered 7 (≥3 guests on Sep 29) → 7+3=10 → `remaining=0` → "Hết chỗ" + disabled,
   while Studio still shows 7/10 → looks like a sync bug.
4. "9 or 10 on other dates" = 10 − their device bookings (1-guest tests) — invisible in Studio →
   "no clear logic".
5. **Evidence**: fresh browser probe on live site → Sep 29 badge = "3 chỗ trống", not disabled
   (CMS occupancy 7 queried from Content Lake; `remainingSlots`=10−7=3 ✓). Pipeline correct;
   divergence = dual-ledger design.

Secondary gaps vs required behavior:
- No single source "all successful bookings → Σ guests per date" (manual `occupancy[]` is the anti-pattern to remove).
- Same-tab confirm: calendar unmounts to summary, so remount re-merges (OK) — but merge path must
  stay the *only* ledger after refactor.

## Decisions to confirm with approval (P1–P3)

| # | Decision | Proposed |
|---|----------|----------|
| P1 | Field name in Studio | **Keep `maxCapacity`** (retitle "Max daily capacity (pax/day)") — no write token, rename = user must re-enter value. Alternative: rename `maxDailyCapacity` (data re-entry needed) |
| P2 | Disable rule | **Keep guest-aware**: disabled iff `remaining <= 0 OR remaining < requested guests` (superset of req 3; "Hết chỗ" badge still only at `remaining<=0`). Alternative: literal "disable only at 0" (loses H1 guest-blocking feature + its tests) |
| P3 | Booking scope | bookings = **this device's paid bookings** (localStorage) — no backend/auth per project constraint. True cross-device sync = backend feature, out of scope (stated limitation) |

## Phases

| # | Phase | File | Status |
|---|-------|------|--------|
| 1 | Studio simplify: drop `occupancy[]` schema + query projection; single global `maxCapacity` | `phase-01-studio-schema-simplify.md` | pending approval |
| 2 | Refactor capacity logic: remaining = max − Σ successful bookings only | `phase-02-capacity-logic-refactor.md` | pending approval |
| 3 | Update/extend tests (unit + browser), full regression | `phase-03-tests-regression.md` | pending approval |
| 4 | Changelog + code review + report | `phase-04-docs-code-review.md` | pending approval |

## Key constraints

- No backend / auth / write token (project decisions) → aggregation source = localStorage paid bookings; CMS `occupancy` data becomes orphan+ignored after schema removal (cannot be deleted by us).
- Keep P4: no `maxCapacity` → no badges, no blocking, page never crashes (fail-open).
- Existing CMS value `maxCapacity:10` preserved if field not renamed (P1).
- All tests must pass at the end: `npm test`, `npm run test:browser`, tsc, eslint, next build, parity 701/701.

## Unresolved questions

1. Cross-device inventory (other browsers' bookings) needs a backend — out of scope, confirm acceptance (P3).
2. Old `occupancy` rows stay invisible-but-stored in the CMS doc after field removal — acceptable?
3. If P1=rename chosen: user re-enters `10` in Studio manually (we have no write token).
