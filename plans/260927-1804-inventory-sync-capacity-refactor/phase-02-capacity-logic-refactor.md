# Phase 02 — Refactor daily capacity logic (single booking ledger)

Context: `plan.md` root cause + user formula `remaining = max_daily_capacity − total_booked_guests`.
Priority: P0 · Status: pending approval

## Overview

`src/lib/tour-capacity.ts` becomes the single aggregation path: capacity comes from ONE tour-level
number; booked guests come ONLY from successful bookings (paid, validated, this device).

## Requirements

- FR1: `mapTourCapacity(doc)` — validate `maxCapacity` only (unchanged guards: integer 1..999,
  safe integer, else `null`/P4). Stop reading `occupancy`; returns `{ maxCapacity, bookedByDate: {} }`.
- FR2: `mergeDeviceBookings(capacity, slug, bookings)` = THE aggregation step (renamed semantics,
  doc-comment updated): for each valid paid `TripBooking` matching `slug` with a `travelDate`,
  `bookedByDate[date] += guests` → `total_booked_guests` per date.
- FR3: `remainingSlots(capacity, iso) = max(0, max − bookedByDate[iso])` — unchanged formula,
  `remaining <= 0` ⇒ 0 (badge "Hết chỗ" iff 0).
- FR4: `isDateBookable` — P2 decision: keep `requested <= remaining` (guest-aware); "Hết chỗ"
  label condition stays `remaining === 0`.
- FR5: recalc triggers preserved: post-mount merge + cross-tab `storage` listener
  (booking-form.tsx:59-77); calendar remounts after confirm so same-tab booking is picked up —
  add an explicit re-merge after `saveBooking` if a same-tab path exists (verify during impl;
  BookingSummary is terminal in current flow).
- FR6: P4 fail-open unchanged — `maxCapacity` missing/invalid ⇒ `null` ⇒ no badges, no blocking.
- FR7: signature/API shape unchanged where possible (`TourCapacity`, `mapTourCapacity`,
  `mergeDeviceBookings`, `remainingSlots`, `isDateBookable`) to minimize blast radius;
  booking-form/checkout call sites keep working.

## Related code files

Modify: `src/lib/tour-capacity.ts` (core), `src/components/booking/booking-form.tsx` (comments only
unless FR5 adds re-merge), `src/app/[locale]/booking/checkout/page.tsx` (no change expected)
No change: `travel-date-field.tsx` (already consumes `remainingSlots`/`isDateBookable`).

## Implementation steps

1. Rewrite `mapTourCapacity`: drop occupancy parsing + `CapacityDoc.occupancy`.
2. Update `mergeDeviceBookings` doc-comment: sole ledger = successful bookings; logic unchanged
   (filter slug, floor guests, skip invalid).
3. Grep `occupancy|bookedByDate` across src → confirm single write path.
4. tsc + eslint.

## Success criteria

- Fresh browser: Sep 29 badge = "10 chỗ trống" (manual 7 no longer counts); booking 3 guests on a
  date → badge drops to `max−3`; booking to full → "Hết chỗ" + disabled (req 2 + 3).
- `grep -rn occupancy src/` = 0; unit suite (phase 3) green.

## Risks

- User's entered 7/10 data stops counting (intended by req 1) — they must understand bookings are
  now the only deduction source (stated in changelog + review).
- Cross-device bookings still invisible (P3 limitation).
